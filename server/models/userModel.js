const db = require('../config/db');

const userModel = {
  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query(
      'SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ email, passwordHash, firstName, lastName, role }) {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
      [email, passwordHash, firstName, lastName, role || 'viewer']
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['first_name', 'last_name', 'email'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
      values
    );
    return rows[0];
  },

  async findAll({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      `SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM users');
    return { users: rows, total: parseInt(countRows[0].count, 10) };
  },
};

module.exports = userModel;
