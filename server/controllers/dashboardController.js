const artistModel = require('../models/artistModel');
const projectModel = require('../models/projectModel');
const db = require('../config/db');

const dashboardController = {
  // GET /api/v1/dashboard/summary
  async summary(req, res, next) {
    try {
      const [totalArtists, artistsByStatus, totalProjects, projectsByStatus] = await Promise.all([
        artistModel.count(),
        artistModel.countByStatus(),
        projectModel.count(),
        projectModel.countByStatus(),
      ]);

      res.json({
        success: true,
        data: {
          artists: { total: totalArtists, byStatus: artistsByStatus },
          projects: { total: totalProjects, byStatus: projectsByStatus },
        },
        message: 'Dashboard summary retrieved',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/dashboard/recent-activity
  async recentActivity(req, res, next) {
    try {
      const { rows } = await db.query(`
        (SELECT 'artist' as type, id, name as title, status, created_at, updated_at
         FROM artists ORDER BY updated_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'project' as type, id, title, status::text, created_at, updated_at
         FROM projects ORDER BY updated_at DESC LIMIT 5)
        ORDER BY updated_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: rows,
        message: 'Recent activity retrieved',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
