const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

const healthController = {
  // ── Health Scores ──────────────────────────────────────────────────
  // GET /api/v1/panel/health
  async getHealthScores(req, res, next) {
    try {
      const { status } = req.query;

      const conditions = ['a.is_deleted = false'];
      const params = [];
      let paramIdx = 1;

      if (status) {
        conditions.push(`a.status = $${paramIdx++}`);
        params.push(status);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Compute a 0-100 health score per artist using lateral sub-selects
      // for each scoring dimension.
      const { rows } = await db.query(
        `SELECT
           a.id,
           a.name,
           a.stage_name,
           a.genre,
           -- Individual dimension flags
           CASE WHEN sub_active.has_sub THEN 20 ELSE 0 END   AS pts_subscription,
           CASE WHEN recent_assets.has_assets THEN 20 ELSE 0 END AS pts_assets,
           CASE WHEN recent_place.has_placement THEN 20 ELSE 0 END AS pts_placements,
           CASE WHEN overdue.has_overdue THEN 0 ELSE 10 END  AS pts_no_overdue,
           CASE WHEN recent_rev.has_revenue THEN 15 ELSE 0 END AS pts_revenue,
           CASE WHEN owns.has_ownership THEN 15 ELSE 0 END   AS pts_ownership,
           -- Total
           (CASE WHEN sub_active.has_sub THEN 20 ELSE 0 END
            + CASE WHEN recent_assets.has_assets THEN 20 ELSE 0 END
            + CASE WHEN recent_place.has_placement THEN 20 ELSE 0 END
            + CASE WHEN overdue.has_overdue THEN 0 ELSE 10 END
            + CASE WHEN recent_rev.has_revenue THEN 15 ELSE 0 END
            + CASE WHEN owns.has_ownership THEN 15 ELSE 0 END
           ) AS health_score
         FROM artists a

         -- 1. Active subscription (20 pts)
         LEFT JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1 FROM artist_subscriptions asub
             WHERE asub.artist_id = a.id AND asub.status = 'active'
           ) AS has_sub
         ) sub_active ON true

         -- 2. Assets created in the last 90 days (20 pts)
         LEFT JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1 FROM assets ast
             WHERE ast.artist_id = a.id
               AND ast.is_deleted = false
               AND ast.created_at >= NOW() - INTERVAL '90 days'
           ) AS has_assets
         ) recent_assets ON true

         -- 3. Placement (pending/confirmed/completed) in last 180 days (20 pts)
         LEFT JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1 FROM placements p
             JOIN assets ast ON ast.id = p.asset_id
             WHERE ast.artist_id = a.id
               AND p.is_deleted = false
               AND p.status IN ('pending', 'confirmed', 'completed')
               AND p.created_at >= NOW() - INTERVAL '180 days'
           ) AS has_placement
         ) recent_place ON true

         -- 4. No overdue tasks (10 pts — awarded when there are NONE)
         LEFT JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1 FROM tasks t
             WHERE t.artist_id = a.id
               AND t.status NOT IN ('done', 'cancelled')
               AND t.due_date < NOW()
           ) AS has_overdue
         ) overdue ON true

         -- 5. Revenue events in last 180 days (15 pts)
         LEFT JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1 FROM revenue_events re
             WHERE re.artist_id = a.id
               AND re.event_date >= CURRENT_DATE - INTERVAL '180 days'
           ) AS has_revenue
         ) recent_rev ON true

         -- 6. Ownership records (15 pts)
         LEFT JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1 FROM ownership_records o
             JOIN assets ast ON ast.id = o.asset_id
             WHERE ast.artist_id = a.id
           ) AS has_ownership
         ) owns ON true

         ${whereClause}
         ORDER BY health_score DESC, a.name ASC
         LIMIT 50`,
        params
      );

      const data = rows.map((r) => ({
        id: r.id,
        name: r.name,
        stage_name: r.stage_name,
        genre: r.genre,
        health_score: parseInt(r.health_score, 10),
        breakdown: {
          subscription: parseInt(r.pts_subscription, 10),
          assets: parseInt(r.pts_assets, 10),
          placements: parseInt(r.pts_placements, 10),
          no_overdue_tasks: parseInt(r.pts_no_overdue, 10),
          revenue: parseInt(r.pts_revenue, 10),
          ownership: parseInt(r.pts_ownership, 10),
        },
      }));

      success(res, data, 'Artist health scores retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Momentum Trends ────────────────────────────────────────────────
  // GET /api/v1/panel/momentum
  async getMomentumTrends(req, res, next) {
    try {
      // Generate the last 6 calendar months as a series so every month
      // appears in the output even when there is no activity.
      const { rows } = await db.query(
        `WITH months AS (
           SELECT TO_CHAR(d, 'YYYY-MM') AS month
           FROM generate_series(
             DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
             DATE_TRUNC('month', NOW()),
             INTERVAL '1 month'
           ) d
         ),
         monthly_assets AS (
           SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
           FROM assets
           WHERE is_deleted = false
             AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
           GROUP BY 1
         ),
         monthly_placements AS (
           SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
           FROM placements
           WHERE is_deleted = false
             AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
           GROUP BY 1
         ),
         monthly_revenue AS (
           SELECT TO_CHAR(event_date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS total
           FROM revenue_events
           WHERE event_date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
           GROUP BY 1
         ),
         monthly_projects AS (
           SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
           FROM projects
           WHERE is_deleted = false
             AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
           GROUP BY 1
         )
         SELECT
           m.month,
           COALESCE(ma.count, 0)::int  AS new_assets,
           COALESCE(mp.count, 0)::int  AS new_placements,
           COALESCE(mr.total, 0)       AS revenue,
           COALESCE(mpr.count, 0)::int AS new_projects
         FROM months m
         LEFT JOIN monthly_assets     ma  ON ma.month  = m.month
         LEFT JOIN monthly_placements mp  ON mp.month  = m.month
         LEFT JOIN monthly_revenue    mr  ON mr.month  = m.month
         LEFT JOIN monthly_projects   mpr ON mpr.month = m.month
         ORDER BY m.month ASC`
      );

      const data = rows.map((r) => ({
        month: r.month,
        new_assets: parseInt(r.new_assets, 10),
        new_placements: parseInt(r.new_placements, 10),
        revenue: parseFloat(r.revenue),
        new_projects: parseInt(r.new_projects, 10),
      }));

      success(res, data, 'Momentum trends retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Next Actions ───────────────────────────────────────────────────
  // GET /api/v1/panel/actions
  async getNextActions(req, res, next) {
    try {
      // Collect up to 20 actionable items from four sources,
      // ordered by priority (high first) then by date.
      const { rows } = await db.query(
        `(
           -- 1. Overdue tasks
           SELECT
             'overdue_task'          AS type,
             CASE t.priority
               WHEN 'urgent' THEN 'high'
               WHEN 'high'   THEN 'high'
               WHEN 'medium' THEN 'medium'
               ELSE 'low'
             END                    AS priority,
             'Overdue task: ' || t.title AS title,
             'Task due on ' || TO_CHAR(t.due_date, 'YYYY-MM-DD')
               || COALESCE(' for artist ' || a.stage_name, '')
                                    AS description,
             t.id                   AS entity_id,
             'task'                 AS entity_type,
             t.due_date             AS sort_date
           FROM tasks t
           LEFT JOIN artists a ON a.id = t.artist_id
           WHERE t.status NOT IN ('done', 'cancelled')
             AND t.due_date < NOW()
           ORDER BY t.due_date ASC
           LIMIT 20
         )
         UNION ALL
         (
           -- 2. Pending placements needing attention
           SELECT
             'pending_placement'    AS type,
             'medium'               AS priority,
             'Pending placement: ' || ast.title AS title,
             'Placement with ' || COALESCE(p.placed_with, 'unknown')
               || ' awaiting action'
                                    AS description,
             p.id                   AS entity_id,
             'placement'            AS entity_type,
             p.created_at::date     AS sort_date
           FROM placements p
           JOIN assets ast ON ast.id = p.asset_id
           WHERE p.status = 'pending'
             AND p.is_deleted = false
           ORDER BY p.created_at ASC
           LIMIT 20
         )
         UNION ALL
         (
           -- 3. Expiring subscriptions (within next 30 days)
           SELECT
             'expiring_subscription' AS type,
             'high'                  AS priority,
             'Subscription expiring: ' || a.stage_name AS title,
             st.name || ' subscription ends on '
               || TO_CHAR(asub.end_date, 'YYYY-MM-DD')
                                     AS description,
             asub.id                 AS entity_id,
             'artist_subscription'   AS entity_type,
             asub.end_date           AS sort_date
           FROM artist_subscriptions asub
           JOIN artists a ON a.id = asub.artist_id
           JOIN subscription_tiers st ON st.id = asub.tier_id
           WHERE asub.status = 'active'
             AND asub.end_date IS NOT NULL
             AND asub.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
           ORDER BY asub.end_date ASC
           LIMIT 20
         )
         UNION ALL
         (
           -- 4. Artists with compliance-related notes
           SELECT
             'compliance_note'       AS type,
             'high'                  AS priority,
             'Compliance attention: ' || a.stage_name AS title,
             'Artist notes contain compliance keywords requiring review' AS description,
             a.id                    AS entity_id,
             'artist'                AS entity_type,
             a.updated_at::date      AS sort_date
           FROM artists a
           WHERE a.is_deleted = false
             AND a.notes IS NOT NULL
             AND (
               LOWER(a.notes) LIKE '%dispute%'
               OR LOWER(a.notes) LIKE '%audit%'
               OR LOWER(a.notes) LIKE '%compliance%'
               OR LOWER(a.notes) LIKE '%unclear%'
             )
           ORDER BY a.updated_at DESC
           LIMIT 20
         )
         ORDER BY
           CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           sort_date ASC
         LIMIT 20`
      );

      const data = rows.map((r) => ({
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description,
        entity_id: r.entity_id,
        entity_type: r.entity_type,
      }));

      success(res, data, 'Next actions retrieved');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = healthController;
