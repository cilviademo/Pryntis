const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const taskController = {
  // GET /api/v1/tasks
  async list(req, res, next) {
    try {
      const {
        status,
        priority,
        assigned_to,
        artist_id,
        sortBy = 'created_at',
        sortDir = 'DESC',
        page = 1,
        limit = 25,
      } = req.query;

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;
      const direction = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const safeSortBy = /^[\w.]+$/.test(sortBy) ? sortBy : 'created_at';

      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (status) {
        conditions.push(`t.status = $${paramIdx++}`);
        params.push(status);
      }

      if (priority) {
        conditions.push(`t.priority = $${paramIdx++}`);
        params.push(priority);
      }

      if (assigned_to) {
        conditions.push(`t.assigned_to = $${paramIdx++}`);
        params.push(assigned_to);
      }

      if (artist_id) {
        conditions.push(`t.artist_id = $${paramIdx++}`);
        params.push(artist_id);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Count
      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM tasks t ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      // Data with assignee and creator joins
      const { rows } = await db.query(
        `SELECT t.*,
                assignee.first_name AS assignee_first_name,
                assignee.last_name AS assignee_last_name,
                creator.first_name AS creator_first_name,
                creator.last_name AS creator_last_name,
                a.name AS artist_name
         FROM tasks t
         LEFT JOIN users assignee ON assignee.id = t.assigned_to
         LEFT JOIN users creator ON creator.id = t.created_by
         LEFT JOIN artists a ON a.id = t.artist_id
         ${whereClause}
         ORDER BY t.${safeSortBy} ${direction}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Tasks retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/tasks/:id
  async getById(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT t.*,
                assignee.first_name AS assignee_first_name,
                assignee.last_name AS assignee_last_name,
                creator.first_name AS creator_first_name,
                creator.last_name AS creator_last_name,
                a.name AS artist_name
         FROM tasks t
         LEFT JOIN users assignee ON assignee.id = t.assigned_to
         LEFT JOIN users creator ON creator.id = t.created_by
         LEFT JOIN artists a ON a.id = t.artist_id
         WHERE t.id = $1`,
        [req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Task not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Task retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/tasks
  async create(req, res, next) {
    try {
      const {
        title, description, status, priority, due_date,
        assigned_to, related_entity_type, related_entity_id, artist_id,
      } = req.body;

      const { rows } = await db.query(
        `INSERT INTO tasks
           (title, description, status, priority, due_date, assigned_to,
            related_entity_type, related_entity_id, artist_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          title,
          description || null,
          status || 'open',
          priority || 'medium',
          due_date || null,
          assigned_to || null,
          related_entity_type || null,
          related_entity_id || null,
          artist_id || null,
          req.user.id,
        ]
      );

      created(res, rows[0], 'Task created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/tasks/:id
  async update(req, res, next) {
    try {
      const allowedFields = [
        'title', 'description', 'status', 'priority', 'due_date',
        'assigned_to', 'related_entity_type', 'related_entity_id', 'artist_id',
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

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Task not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Task updated successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = taskController;
