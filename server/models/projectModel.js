const db = require('../config/db');

const projectModel = {
  async findAll({ page = 1, limit = 20, search, status, artist_id }) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conditions.push(`p.status = $${idx}`);
      values.push(status);
      idx++;
    }
    if (artist_id) {
      conditions.push(`p.artist_id = $${idx}`);
      values.push(artist_id);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    values.push(limit, offset);
    const { rows } = await db.query(
      `SELECT p.*, a.name as artist_name, a.stage_name as artist_stage_name
       FROM projects p
       LEFT JOIN artists a ON p.artist_id = a.id
       ${where}
       ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countValues = values.slice(0, idx - 1);
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM projects p ${where}`,
      countValues
    );

    return { projects: rows, total: parseInt(countRows[0].count, 10) };
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT p.*, a.name as artist_name, a.stage_name as artist_stage_name
       FROM projects p
       LEFT JOIN artists a ON p.artist_id = a.id
       WHERE p.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const { title, description, artist_id, status, start_date, target_completion_date } = data;
    const { rows } = await db.query(
      `INSERT INTO projects (title, description, artist_id, status, start_date, target_completion_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, artist_id, status || 'draft', start_date, target_completion_date]
    );
    return rows[0];
  },

  async update(id, data) {
    const allowed = ['title', 'description', 'artist_id', 'status', 'start_date', 'target_completion_date'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  // Soft delete by setting status to archived
  async softDelete(id) {
    const { rows } = await db.query(
      `UPDATE projects SET status = 'archived' WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  // Collaborator management
  async getCollaborators(projectId) {
    const { rows } = await db.query(
      `SELECT pc.*, a.name as artist_name, a.stage_name as artist_stage_name
       FROM project_collaborators pc
       JOIN artists a ON pc.artist_id = a.id
       WHERE pc.project_id = $1
       ORDER BY pc.created_at`,
      [projectId]
    );
    return rows;
  },

  async addCollaborator(projectId, artistId, roleDescription) {
    const { rows } = await db.query(
      `INSERT INTO project_collaborators (project_id, artist_id, role_description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, artistId, roleDescription]
    );
    return rows[0];
  },

  async removeCollaborator(projectId, artistId) {
    const { rowCount } = await db.query(
      'DELETE FROM project_collaborators WHERE project_id = $1 AND artist_id = $2',
      [projectId, artistId]
    );
    return rowCount > 0;
  },

  async count() {
    const { rows } = await db.query('SELECT COUNT(*) FROM projects');
    return parseInt(rows[0].count, 10);
  },

  async countByStatus() {
    const { rows } = await db.query(
      'SELECT status, COUNT(*) as count FROM projects GROUP BY status'
    );
    return rows;
  },
};

module.exports = projectModel;
