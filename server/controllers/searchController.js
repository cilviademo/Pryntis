const db = require('../config/db');
const { success } = require('../utils/response');

const searchController = {
  // GET /api/v1/search?q=term&type=all|artists|projects|assets|contacts
  async globalSearch(req, res, next) {
    try {
      const { q, type = 'all' } = req.query;
      if (!q || q.trim().length < 2) {
        return success(res, { results: [] }, 'Search requires at least 2 characters');
      }
      const term = q.trim();
      const like = `%${term}%`;
      const results = {};

      if (type === 'all' || type === 'artists') {
        const { rows } = await db.query(
          `SELECT id, name, stage_name, genre, status, 'artist' AS entity_type
           FROM artists WHERE is_deleted = false
           AND (name ILIKE $1 OR stage_name ILIKE $1 OR genre ILIKE $1 OR email ILIKE $1)
           ORDER BY name LIMIT 10`,
          [like]
        );
        results.artists = rows;
      }

      if (type === 'all' || type === 'projects') {
        const { rows } = await db.query(
          `SELECT p.id, p.title, p.status::text, a.stage_name AS artist_name, 'project' AS entity_type
           FROM projects p
           LEFT JOIN artists a ON a.id = p.artist_id
           WHERE p.is_deleted = false
           AND (p.title ILIKE $1 OR p.description ILIKE $1)
           ORDER BY p.title LIMIT 10`,
          [like]
        );
        results.projects = rows;
      }

      if (type === 'all' || type === 'assets') {
        const { rows } = await db.query(
          `SELECT a.id, a.title, a.file_type::text, a.genre, ar.stage_name AS artist_name, 'asset' AS entity_type
           FROM assets a
           LEFT JOIN artists ar ON ar.id = a.artist_id
           WHERE a.is_deleted = false
           AND (a.title ILIKE $1 OR a.genre ILIKE $1 OR a.notes ILIKE $1)
           ORDER BY a.title LIMIT 10`,
          [like]
        );
        results.assets = rows;
      }

      if (type === 'all' || type === 'contacts') {
        const { rows } = await db.query(
          `SELECT id, name, organization, role, email, 'contact' AS entity_type
           FROM contacts
           WHERE name ILIKE $1 OR organization ILIKE $1 OR email ILIKE $1
           ORDER BY name LIMIT 10`,
          [like]
        );
        results.contacts = rows;
      }

      if (type === 'all' || type === 'templates') {
        const { rows } = await db.query(
          `SELECT id, title, category, 'template' AS entity_type
           FROM templates
           WHERE title ILIKE $1 OR category ILIKE $1 OR body ILIKE $1
           ORDER BY title LIMIT 10`,
          [like]
        );
        results.templates = rows;
      }

      const totalCount = Object.values(results).reduce((s, arr) => s + arr.length, 0);
      success(res, { results, total: totalCount, query: term }, 'Search completed');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = searchController;
