const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');
const { createNotification } = require('./notificationController');

const VALID_EVENT_TYPES = ['session', 'deadline', 'meeting', 'release', 'task'];

/**
 * Check whether a proposed time range overlaps with any existing
 * scheduled event for the given user.
 *
 * @param {string}  assignedTo - UUID of the user to check
 * @param {string}  startAt    - ISO 8601 start timestamp
 * @param {string}  endAt      - ISO 8601 end timestamp
 * @param {string}  [excludeEventId] - Event UUID to exclude (for updates)
 * @returns {object|null} The conflicting event row, or null
 */
async function detectConflict(assignedTo, startAt, endAt, excludeEventId) {
  const conditions = [
    "assigned_to = $1",
    "status = 'scheduled'",
    "start_at < $2",
    "end_at > $3",
  ];
  const params = [assignedTo, endAt, startAt];
  let paramIdx = 4;

  if (excludeEventId) {
    conditions.push(`id != $${paramIdx}`);
    params.push(excludeEventId);
  }

  const { rows } = await db.query(
    `SELECT id, title, start_at, end_at
     FROM calendar_events
     WHERE ${conditions.join(' AND ')}
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

const calendarController = {
  // GET /api/v1/calendar/events?from=&to=&owner_type=&owner_id=&assigned_to=
  async listEvents(req, res, next) {
    try {
      const { from, to, owner_type, owner_id, assigned_to } = req.query;

      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (from) {
        conditions.push(`ce.start_at >= $${paramIdx++}`);
        params.push(from);
      }

      if (to) {
        conditions.push(`ce.end_at <= $${paramIdx++}`);
        params.push(to);
      }

      if (owner_type) {
        conditions.push(`ce.owner_type = $${paramIdx++}`);
        params.push(owner_type);
      }

      if (owner_id) {
        conditions.push(`ce.owner_id = $${paramIdx++}`);
        params.push(owner_id);
      }

      if (assigned_to) {
        conditions.push(`ce.assigned_to = $${paramIdx++}`);
        params.push(assigned_to);
      }

      // Never return canceled events in the default listing
      conditions.push("ce.status != 'canceled'");

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const { rows } = await db.query(
        `SELECT ce.*,
                creator.first_name  AS creator_first_name,
                creator.last_name   AS creator_last_name,
                assignee.first_name AS assignee_first_name,
                assignee.last_name  AS assignee_last_name
         FROM calendar_events ce
         LEFT JOIN users creator  ON creator.id  = ce.created_by
         LEFT JOIN users assignee ON assignee.id = ce.assigned_to
         ${whereClause}
         ORDER BY ce.start_at ASC`,
        params
      );

      success(res, rows, 'Events retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/calendar/events
  async createEvent(req, res, next) {
    try {
      const {
        title,
        description,
        event_type,
        start_at,
        end_at,
        timezone,
        owner_type,
        owner_id,
        assigned_to,
      } = req.body;

      if (!title || !start_at || !end_at) {
        throw new AppError('title, start_at, and end_at are required', 400, 'VALIDATION_ERROR');
      }

      if (new Date(start_at) >= new Date(end_at)) {
        throw new AppError('start_at must be before end_at', 400, 'VALIDATION_ERROR');
      }

      const safeEventType = VALID_EVENT_TYPES.includes(event_type) ? event_type : 'meeting';

      // Conflict detection
      if (assigned_to) {
        const conflict = await detectConflict(assigned_to, start_at, end_at);
        if (conflict) {
          throw new AppError(
            'Schedule conflict: the assigned user already has an overlapping event',
            409,
            'SCHEDULE_CONFLICT',
            [{
              conflicting_event_id: conflict.id,
              conflicting_title: conflict.title,
              conflicting_start: conflict.start_at,
              conflicting_end: conflict.end_at,
            }]
          );
        }
      }

      // Insert event
      const { rows } = await db.query(
        `INSERT INTO calendar_events
           (title, description, event_type, start_at, end_at, timezone,
            owner_type, owner_id, assigned_to, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING *`,
        [
          title,
          description || null,
          safeEventType,
          start_at,
          end_at,
          timezone || 'UTC',
          owner_type || null,
          owner_id || null,
          assigned_to || null,
          req.user.id,
        ]
      );

      // Notify assigned user (if different from creator)
      if (assigned_to && assigned_to !== req.user.id) {
        // Fire-and-forget; don't let a notification failure break event creation
        createNotification(
          assigned_to,
          'info',
          `New Event: ${title}`,
          'You have been assigned to a new calendar event.',
          '/calendar'
        ).catch((err) => {
          // Log but do not propagate
          console.error('Failed to create assignment notification:', err.message);
        });
      }

      created(res, rows[0], 'Event created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/calendar/events/:id
  async updateEvent(req, res, next) {
    try {
      // Fetch the existing event first (needed for conflict detection context)
      const { rows: existing } = await db.query(
        'SELECT * FROM calendar_events WHERE id = $1',
        [req.params.id]
      );

      if (!existing[0]) {
        throw new AppError('Event not found', 404, 'NOT_FOUND');
      }

      const event = existing[0];

      const allowedFields = [
        'title', 'description', 'start_at', 'end_at', 'status', 'assigned_to',
      ];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
      }

      // Determine effective times for conflict detection
      const effectiveStart = req.body.start_at || event.start_at;
      const effectiveEnd = req.body.end_at || event.end_at;
      const effectiveAssigned = req.body.assigned_to !== undefined
        ? req.body.assigned_to
        : event.assigned_to;

      if (new Date(effectiveStart) >= new Date(effectiveEnd)) {
        throw new AppError('start_at must be before end_at', 400, 'VALIDATION_ERROR');
      }

      // Re-run conflict detection when times or assignee changed
      const timesChanged = req.body.start_at !== undefined || req.body.end_at !== undefined || req.body.assigned_to !== undefined;
      if (timesChanged && effectiveAssigned) {
        const conflict = await detectConflict(
          effectiveAssigned,
          effectiveStart,
          effectiveEnd,
          req.params.id // exclude the event being updated
        );
        if (conflict) {
          throw new AppError(
            'Schedule conflict: the assigned user already has an overlapping event',
            409,
            'SCHEDULE_CONFLICT',
            [{
              conflicting_event_id: conflict.id,
              conflicting_title: conflict.title,
              conflicting_start: conflict.start_at,
              conflicting_end: conflict.end_at,
            }]
          );
        }
      }

      // Always stamp the updater
      sets.push(`updated_by = $${idx++}`);
      values.push(req.user.id);

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE calendar_events
         SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Event not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Event updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/calendar/events/:id  (soft delete)
  async deleteEvent(req, res, next) {
    try {
      // Fetch event to authorize the delete
      const { rows: existing } = await db.query(
        'SELECT id, created_by, assigned_to FROM calendar_events WHERE id = $1',
        [req.params.id]
      );

      if (!existing[0]) {
        throw new AppError('Event not found', 404, 'NOT_FOUND');
      }

      const event = existing[0];
      const userRole = req.user.role;
      const userId = req.user.id;

      // Only the creator, the assigned user, or admin/manager may cancel
      const isCreator = event.created_by === userId;
      const isAssigned = event.assigned_to === userId;
      const isPrivileged = userRole === 'admin' || userRole === 'manager';

      if (!isCreator && !isAssigned && !isPrivileged) {
        throw new AppError(
          'You do not have permission to delete this event',
          403,
          'FORBIDDEN'
        );
      }

      const { rows } = await db.query(
        `UPDATE calendar_events
         SET status = 'canceled', updated_by = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [userId, req.params.id]
      );

      success(res, rows[0], 'Event canceled successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = calendarController;
