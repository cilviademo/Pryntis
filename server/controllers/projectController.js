const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const projectController = {
  // GET /api/v1/projects
  async list(req, res, next) {
    try {
      const {
        q,
        status,
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

      const conditions = ['p.is_deleted = false'];
      const params = [];
      let paramIdx = 1;
      let selectExtra = '';
      let orderClause = `ORDER BY p.${safeSortBy} ${direction}`;

      // Full-text search
      if (q && q.trim()) {
        conditions.push(`p.search_vector @@ plainto_tsquery('english', $${paramIdx})`);
        selectExtra = `, ts_rank(p.search_vector, plainto_tsquery('english', $${paramIdx})) AS rank`;
        params.push(q.trim());
        paramIdx++;
        orderClause = `ORDER BY rank DESC, p.${safeSortBy} ${direction}`;
      }

      if (status) {
        conditions.push(`p.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      if (artist_id) {
        conditions.push(`p.artist_id = $${paramIdx}`);
        params.push(artist_id);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Count query
      const countSql = `SELECT COUNT(*) AS total FROM projects p ${whereClause}`;
      const { rows: countRows } = await db.query(countSql, params);
      const total = parseInt(countRows[0].total, 10);

      // Data query with artist join
      const dataSql = `
        SELECT p.*${selectExtra}, a.name AS artist_name
        FROM projects p
        LEFT JOIN artists a ON a.id = p.artist_id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      const { rows } = await db.query(dataSql, [...params, parsedLimit, offset]);

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Projects retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/projects/:id
  async getById(req, res, next) {
    try {
      const { rows: projectRows } = await db.query(
        `SELECT p.*, a.name AS artist_name
         FROM projects p
         LEFT JOIN artists a ON a.id = p.artist_id
         WHERE p.id = $1 AND p.is_deleted = false`,
        [req.params.id]
      );

      if (!projectRows[0]) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      // Fetch collaborators
      const { rows: collaborators } = await db.query(
        `SELECT pc.id, pc.artist_id, pc.role_description, pc.created_at,
                a.name AS artist_name, a.stage_name
         FROM project_collaborators pc
         JOIN artists a ON a.id = pc.artist_id
         WHERE pc.project_id = $1`,
        [req.params.id]
      );

      success(res, { ...projectRows[0], collaborators }, 'Project retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/projects
  async create(req, res, next) {
    try {
      const { title, description, artist_id, status, start_date, target_completion_date } = req.body;

      const { rows } = await db.query(
        `INSERT INTO projects (title, description, artist_id, status, start_date, target_completion_date, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, description || null, artist_id || null, status || 'draft', start_date || null, target_completion_date || null, req.user.id]
      );

      created(res, rows[0], 'Project created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/projects/:id
  async update(req, res, next) {
    try {
      const allowedFields = ['title', 'description', 'artist_id', 'status', 'start_date', 'target_completion_date'];
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

      // Always set updated_by
      sets.push(`updated_by = $${idx++}`);
      values.push(req.user.id);

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE projects SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND is_deleted = false
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Project updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/projects/:id — soft delete
  async softDelete(req, res, next) {
    try {
      const { rows } = await db.query(
        `UPDATE projects SET is_deleted = true, deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = false
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Project archived successfully');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/projects/:id/restore — admin only
  async restore(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        throw new AppError('Only admins can restore projects', 403, 'FORBIDDEN');
      }

      const { rows } = await db.query(
        `UPDATE projects SET is_deleted = false, deleted_at = NULL, updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = true
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Deleted project not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Project restored successfully');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/projects/:id/collaborators
  async addCollaborator(req, res, next) {
    try {
      // Verify project exists
      const { rows: projectRows } = await db.query(
        'SELECT id FROM projects WHERE id = $1 AND is_deleted = false',
        [req.params.id]
      );
      if (!projectRows[0]) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      const { artist_id, role_description } = req.body;

      const { rows } = await db.query(
        `INSERT INTO project_collaborators (project_id, artist_id, role_description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.params.id, artist_id, role_description || null]
      );

      created(res, rows[0], 'Collaborator added successfully');
    } catch (err) {
      if (err.code === '23505') {
        return next(new AppError('Artist is already a collaborator on this project', 409, 'DUPLICATE'));
      }
      next(err);
    }
  },

  // DELETE /api/v1/projects/:id/collaborators/:artistId
  async removeCollaborator(req, res, next) {
    try {
      const { rows } = await db.query(
        `DELETE FROM project_collaborators
         WHERE project_id = $1 AND artist_id = $2
         RETURNING *`,
        [req.params.id, req.params.artistId]
      );

      if (!rows[0]) {
        throw new AppError('Collaborator not found', 404, 'NOT_FOUND');
      }

      success(res, null, 'Collaborator removed successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = projectController;
