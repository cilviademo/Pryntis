const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

const dashboardController = {
  // GET /api/v1/dashboard/summary
  async summary(req, res, next) {
    try {
      const role = req.user ? req.user.role : 'viewer';

      const [
        artistCountResult,
        artistsByStatusResult,
        projectCountResult,
        projectsByStatusResult,
        assetCountResult,
        placementsByStatusResult,
        subscriptionDistResult,
        grossRevenueResult,
        recoupableBalanceResult,
        pipelineValueResult,
        atRiskResult,
        payableResult,
        projectThroughputResult,
      ] = await Promise.all([
        db.query("SELECT COUNT(*) AS total FROM artists WHERE is_deleted = false"),
        db.query("SELECT status, COUNT(*) AS count FROM artists WHERE is_deleted = false GROUP BY status"),
        db.query("SELECT COUNT(*) AS total FROM projects WHERE is_deleted = false"),
        db.query("SELECT status::text, COUNT(*) AS count FROM projects WHERE is_deleted = false GROUP BY status"),
        db.query("SELECT COUNT(*) AS total FROM assets WHERE is_deleted = false"),
        db.query("SELECT status::text, COUNT(*) AS count FROM placements WHERE is_deleted = false GROUP BY status"),
        db.query(`
          SELECT st.name AS tier_name, st.access_level, COUNT(asub.id) AS subscriber_count
          FROM subscription_tiers st
          LEFT JOIN artist_subscriptions asub ON asub.tier_id = st.id AND asub.status = 'active'
          WHERE st.is_active = true
          GROUP BY st.id, st.name, st.access_level
          ORDER BY st.access_level
        `),
        db.query("SELECT COALESCE(SUM(amount), 0) AS gross_revenue FROM revenue_events"),
        db.query(`
          SELECT
            COALESCE((SELECT SUM(amount) FROM recoupable_expenses), 0)
            - COALESCE((SELECT SUM(amount_applied_to_recoupment) FROM revenue_events), 0)
            AS recoupable_balance
        `),
        db.query(`
          SELECT COALESCE(SUM(
            CASE status::text
              WHEN 'pending' THEN expected_value * 0.25
              WHEN 'confirmed' THEN expected_value * 0.6
              WHEN 'completed' THEN expected_value * 1.0
              ELSE 0
            END
          ), 0) AS pipeline_value
          FROM placements
          WHERE is_deleted = false AND status IN ('pending', 'confirmed', 'completed')
        `),
        db.query(`
          SELECT COALESCE(SUM(expected_value * 0.25), 0) AS at_risk_revenue
          FROM placements
          WHERE is_deleted = false AND status = 'pending'
        `),
        // Payable = sum of (applied_to_recoupment - expenses) per fully-recouped artist, clamped >= 0
        db.query(`
          SELECT COALESCE(SUM(GREATEST(applied - expenses, 0)), 0) AS payable_now
          FROM (
            SELECT
              a.id,
              COALESCE((SELECT SUM(amount_applied_to_recoupment) FROM revenue_events WHERE artist_id = a.id), 0) AS applied,
              COALESCE((SELECT SUM(amount) FROM recoupable_expenses WHERE artist_id = a.id), 0) AS expenses
            FROM artists a WHERE a.is_deleted = false
          ) sub
          WHERE applied > expenses
        `),
        // Project throughput — completed per month (last 12 months)
        db.query(`
          SELECT TO_CHAR(DATE_TRUNC('month', p.updated_at), 'YYYY-MM') AS month,
                 COUNT(*) AS count
          FROM projects p
          WHERE p.status = 'completed'
            AND p.is_deleted = false
            AND p.updated_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', p.updated_at)
          ORDER BY month
        `),
      ]);

      const artistsByStatus = {};
      for (const row of artistsByStatusResult.rows) {
        artistsByStatus[row.status] = parseInt(row.count, 10);
      }

      const projectsByStatus = {};
      for (const row of projectsByStatusResult.rows) {
        projectsByStatus[row.status] = parseInt(row.count, 10);
      }

      const placementsByStatus = {};
      for (const row of placementsByStatusResult.rows) {
        placementsByStatus[row.status] = parseInt(row.count, 10);
      }

      const subscriptionDistribution = subscriptionDistResult.rows.map((row) => ({
        tier_name: row.tier_name,
        access_level: row.access_level,
        subscriber_count: parseInt(row.subscriber_count, 10),
      }));

      const grossRevenue = parseFloat(grossRevenueResult.rows[0].gross_revenue);
      const recoupableBalance = parseFloat(recoupableBalanceResult.rows[0].recoupable_balance);
      const pipelineValue = parseFloat(pipelineValueResult.rows[0].pipeline_value);
      const atRiskRevenue = parseFloat(atRiskResult.rows[0].at_risk_revenue);
      const payableNow = parseFloat(payableResult.rows[0].payable_now);
      const unrecoupedBalance = Math.max(0, recoupableBalance);
      const recoupedAmount = Math.max(0, -recoupableBalance);

      const base = {
        artists: {
          total: parseInt(artistCountResult.rows[0].total, 10),
          byStatus: artistsByStatus,
        },
        projects: {
          total: parseInt(projectCountResult.rows[0].total, 10),
          byStatus: projectsByStatus,
        },
        assets: {
          total: parseInt(assetCountResult.rows[0].total, 10),
        },
        placements: {
          byStatus: placementsByStatus,
        },
        subscriptionDistribution,
        kpiSnapshot: {
          grossRevenue,
          recoupableBalance,
          recoupedAmount,
          unrecoupedBalance,
          recouped: recoupableBalance <= 0,
          pipelineValue,
          atRiskRevenue,
          payableNow,
        },
        role,
      };

      // Manager/admin get additional data
      if (role === 'admin' || role === 'manager') {
        base.projectThroughput = projectThroughputResult.rows.map((r) => ({
          month: r.month,
          count: parseInt(r.count, 10),
        }));
      }

      success(res, base, 'Dashboard summary retrieved');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/dashboard/recent-activity
  async recentActivity(req, res, next) {
    try {
      const { rows } = await db.query(`
        SELECT af.id, af.event_type, af.actor_user_id, af.entity_type, af.entity_id,
               af.summary, af.metadata, af.created_at,
               u.first_name AS actor_first_name, u.last_name AS actor_last_name,
               (SELECT json_agg(json_build_object(
                  'reaction', ar.reaction, 'count',
                  (SELECT COUNT(*) FROM activity_reactions ar2 WHERE ar2.activity_id = af.id AND ar2.reaction = ar.reaction)
               ))
               FROM (SELECT DISTINCT reaction FROM activity_reactions WHERE activity_id = af.id) ar
               ) AS reactions,
               (SELECT COUNT(*) FROM activity_comments WHERE activity_id = af.id) AS comment_count
        FROM activity_feed af
        LEFT JOIN users u ON u.id = af.actor_user_id
        ORDER BY af.created_at DESC
        LIMIT 20
      `);

      success(res, rows, 'Recent activity retrieved');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
