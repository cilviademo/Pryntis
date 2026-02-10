const db = require('../config/db');

const artistModel = {
  async findAll({ page = 1, limit = 20, search, status, genre }) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR stage_name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conditions.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }
    if (genre) {
      conditions.push(`genre ILIKE $${idx}`);
      values.push(`%${genre}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    values.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM artists ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countValues = values.slice(0, idx - 1);
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM artists ${where}`,
      countValues
    );

    return { artists: rows, total: parseInt(countRows[0].count, 10) };
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM artists WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { name, stage_name, email, phone, bio, genre, status, notes } = data;
    const { rows } = await db.query(
      `INSERT INTO artists (name, stage_name, email, phone, bio, genre, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, stage_name, email, phone, bio, genre, status || 'active', notes]
    );
    return rows[0];
  },

  async update(id, data) {
    const allowed = ['name', 'stage_name', 'email', 'phone', 'bio', 'genre', 'status', 'notes'];
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
      `UPDATE artists SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  // Soft delete by setting status to archived
  async softDelete(id) {
    const { rows } = await db.query(
      `UPDATE artists SET status = 'archived' WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  async count() {
    const { rows } = await db.query('SELECT COUNT(*) FROM artists');
    return parseInt(rows[0].count, 10);
  },

  async countByStatus() {
    const { rows } = await db.query(
      'SELECT status, COUNT(*) as count FROM artists GROUP BY status'
    );
    return rows;
  },
};

module.exports = artistModel;
