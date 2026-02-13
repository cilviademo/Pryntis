const db = require('../config/db');

const exportController = {
  // GET /api/v1/export/:entity?format=csv
  async exportData(req, res, next) {
    try {
      const { entity } = req.params;
      const format = req.query.format || 'csv';

      let query, filename;
      switch (entity) {
        case 'artists':
          query = `SELECT name, stage_name, email, phone, genre, status, created_at FROM artists WHERE is_deleted = false ORDER BY name`;
          filename = 'pryntis-artists';
          break;
        case 'projects':
          query = `SELECT p.title, p.status::text, p.start_date, p.target_completion_date, a.stage_name AS artist FROM projects p LEFT JOIN artists a ON a.id = p.artist_id WHERE p.is_deleted = false ORDER BY p.title`;
          filename = 'pryntis-projects';
          break;
        case 'assets':
          query = `SELECT a.title, a.file_type::text, a.genre, a.bpm, a.key_signature, a.duration_seconds, ar.stage_name AS artist FROM assets a LEFT JOIN artists ar ON ar.id = a.artist_id WHERE a.is_deleted = false ORDER BY a.title`;
          filename = 'pryntis-assets';
          break;
        case 'placements':
          query = `SELECT a.title AS asset, pl.placement_type::text, pl.status::text, pl.placed_with, pl.expected_value, pl.placement_date FROM placements pl JOIN assets a ON a.id = pl.asset_id WHERE pl.is_deleted = false ORDER BY pl.placement_date DESC`;
          filename = 'pryntis-placements';
          break;
        case 'revenue':
          query = `SELECT ar.stage_name AS artist, re.amount, re.amount_applied_to_recoupment, re.source, re.description, re.event_date FROM revenue_events re JOIN artists ar ON ar.id = re.artist_id ORDER BY re.event_date DESC`;
          filename = 'pryntis-revenue';
          break;
        case 'contacts':
          query = `SELECT name, organization, role, email, phone, relationship_strength FROM contacts ORDER BY name`;
          filename = 'pryntis-contacts';
          break;
        case 'tasks':
          query = `SELECT t.title, t.status::text, t.priority::text, t.due_date, u.first_name || ' ' || u.last_name AS assigned_to FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to ORDER BY t.due_date`;
          filename = 'pryntis-tasks';
          break;
        case 'audit':
          query = `SELECT al.action, al.entity_type, al.entity_id, al.created_at, u.first_name || ' ' || u.last_name AS user_name FROM audit_log al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT 500`;
          filename = 'pryntis-audit-log';
          break;
        default:
          return res.status(400).json({ success: false, error: { message: 'Unknown entity type' } });
      }

      const { rows } = await db.query(query);

      if (rows.length === 0) {
        return res.status(200).json({ success: true, data: '', message: 'No data to export' });
      }

      // Generate CSV
      const headers = Object.keys(rows[0]);
      const csvRows = [headers.join(',')];
      for (const row of rows) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape CSV fields with quotes, commas, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        });
        csvRows.push(values.join(','));
      }

      const csv = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/export/audit-trail
  async getAuditTrail(req, res, next) {
    try {
      const { page = 1, limit = 50, entity_type, action } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (entity_type) {
        conditions.push(`al.entity_type = $${paramIdx++}`);
        params.push(entity_type);
      }
      if (action) {
        conditions.push(`al.action ILIKE $${paramIdx++}`);
        params.push(`%${action}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM audit_log al ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.created_at,
                u.first_name, u.last_name, u.email AS user_email
         FROM audit_log al
         LEFT JOIN users u ON u.id = al.user_id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const { success: successFn } = require('../utils/response');
      successFn(res, rows, 'Audit trail retrieved', 200, {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = exportController;
