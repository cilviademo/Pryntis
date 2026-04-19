const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

/* ── Dimension weights (must sum to 100) ─────────────────────────── */
const DIMENSIONS = {
  momentum:   { weight: 20, label: 'Momentum' },
  delivery:   { weight: 20, label: 'Delivery Reliability' },
  revenue:    { weight: 20, label: 'Revenue Trajectory' },
  audience:   { weight: 15, label: 'Audience Signals' },
  engagement: { weight: 15, label: 'Team Engagement' },
  compliance: { weight: 10, label: 'Compliance' },
};

/* ── Scoring helpers (return 0-1 ratio) ──────────────────────────── */

function scoreMomentum(m) {
  // assets_90d: up to 0.5 (3+ = full), placements_180d: up to 0.5 (2+ = full)
  const assetRatio = Math.min(parseInt(m.assets_90d, 10) || 0, 3) / 3;
  const placeRatio = Math.min(parseInt(m.placements_180d, 10) || 0, 2) / 2;
  return assetRatio * 0.5 + placeRatio * 0.5;
}

function scoreDelivery(m) {
  const total = parseInt(m.total_tasks, 10) || 0;
  const completed = parseInt(m.completed_tasks, 10) || 0;
  const overdue = parseInt(m.overdue_tasks, 10) || 0;
  if (total === 0) return 1; // no tasks = no risk
  const completionRatio = total > 0 ? completed / total : 0;
  const overduePenalty = Math.min(overdue * 0.15, 0.6); // up to -60%
  return Math.max(completionRatio * 0.7 + (1 - overduePenalty) * 0.3, 0);
}

function scoreRevenue(m) {
  const recent = parseFloat(m.revenue_90d) || 0;
  const prev = parseFloat(m.revenue_prev_90d) || 0;
  const pending = parseInt(m.pending_placements, 10) || 0;
  // Revenue magnitude: up to 0.5 (scaled to $5000 threshold)
  const magnitudeRatio = Math.min(recent / 5000, 1) * 0.5;
  // Growth trend: up to 0.3
  let growthRatio = 0;
  if (prev > 0) {
    const growth = (recent - prev) / prev;
    growthRatio = Math.min(Math.max(growth, -1), 1) * 0.5 + 0.5; // normalize -1..1 to 0..1
  } else if (recent > 0) {
    growthRatio = 1;
  }
  // Pipeline: up to 0.2 (2+ pending = full)
  const pipelineRatio = Math.min(pending, 2) / 2;
  return magnitudeRatio + growthRatio * 0.3 + pipelineRatio * 0.2;
}

function scoreAudience(m) {
  // Proxy via active placements + revenue event count
  const activePlacements = parseInt(m.active_placements, 10) || 0;
  const revEvents = parseInt(m.revenue_event_count, 10) || 0;
  const placeRatio = Math.min(activePlacements, 4) / 4;
  const eventRatio = Math.min(revEvents, 6) / 6;
  return placeRatio * 0.6 + eventRatio * 0.4;
}

function scoreEngagement(m) {
  // Comments in last 90 days + activity feed entries
  const comments = parseInt(m.comments_90d, 10) || 0;
  const activities = parseInt(m.activities_90d, 10) || 0;
  const commentRatio = Math.min(comments, 5) / 5;
  const activityRatio = Math.min(activities, 8) / 8;
  return commentRatio * 0.5 + activityRatio * 0.5;
}

function scoreCompliance(m) {
  // Profile completeness (bio, genre, email, phone — 4 fields) = 0.4
  const profileFields = parseInt(m.profile_fields, 10) || 0;
  const profileRatio = profileFields / 4;
  // Ownership records = 0.3
  const hasOwnership = m.has_ownership === true || m.has_ownership === 't';
  // Active subscription = 0.3
  const hasSub = m.has_sub === true || m.has_sub === 't';
  return profileRatio * 0.4 + (hasOwnership ? 0.3 : 0) + (hasSub ? 0.3 : 0);
}

function generateActions(breakdown) {
  const actions = [];
  if (breakdown.momentum.ratio < 0.5) {
    actions.push({ dimension: 'momentum', action: 'Upload new assets or pursue placement opportunities to boost activity' });
  }
  if (breakdown.delivery.ratio < 0.5) {
    actions.push({ dimension: 'delivery', action: 'Review and resolve overdue tasks to improve delivery reliability' });
  }
  if (breakdown.revenue.ratio < 0.5) {
    actions.push({ dimension: 'revenue', action: 'Follow up on pending payments and explore new revenue channels' });
  }
  if (breakdown.audience.ratio < 0.5) {
    actions.push({ dimension: 'audience', action: 'Increase distribution reach through additional placements' });
  }
  if (breakdown.engagement.ratio < 0.5) {
    actions.push({ dimension: 'engagement', action: 'Encourage team collaboration through comments and activity updates' });
  }
  if (breakdown.compliance.ratio < 0.5) {
    actions.push({ dimension: 'compliance', action: 'Complete artist profile, ownership docs, and subscription setup' });
  }
  return actions;
}

const healthController = {
  // Health Scores
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

      // Fetch raw metrics per artist via lateral sub-selects, then score in JS
      const { rows } = await db.query(
        `SELECT
           a.id,
           a.name,
           a.stage_name,
           a.genre,

           -- Momentum: asset count (90d) + placement count (180d)
           mom.assets_90d,
           mom.placements_180d,

           -- Delivery: task completion stats
           del.total_tasks,
           del.completed_tasks,
           del.overdue_tasks,

           -- Revenue: recent vs previous 90-day windows + pipeline
           rev.revenue_90d,
           rev.revenue_prev_90d,
           rev.pending_placements,

           -- Audience: active placement count + revenue event count
           aud.active_placements,
           aud.revenue_event_count,

           -- Engagement: comments + activity entries (90d)
           eng.comments_90d,
           eng.activities_90d,

           -- Compliance: profile completeness + ownership + subscription
           comp.profile_fields,
           comp.has_ownership,
           comp.has_sub

         FROM artists a

         -- Momentum metrics
         LEFT JOIN LATERAL (
           SELECT
             (SELECT COUNT(*) FROM assets ast
              WHERE ast.artist_id = a.id AND ast.is_deleted = false
              AND ast.created_at >= NOW() - INTERVAL '90 days') AS assets_90d,
             (SELECT COUNT(*) FROM placements p
              JOIN assets ast ON ast.id = p.asset_id
              WHERE ast.artist_id = a.id AND p.is_deleted = false
              AND p.status IN ('pending','confirmed','completed')
              AND p.created_at >= NOW() - INTERVAL '180 days') AS placements_180d
         ) mom ON true

         -- Delivery metrics
         LEFT JOIN LATERAL (
           SELECT
             (SELECT COUNT(*) FROM tasks t WHERE t.artist_id = a.id) AS total_tasks,
             (SELECT COUNT(*) FROM tasks t WHERE t.artist_id = a.id AND t.status = 'done') AS completed_tasks,
             (SELECT COUNT(*) FROM tasks t WHERE t.artist_id = a.id
              AND t.status NOT IN ('done','cancelled') AND t.due_date < NOW()) AS overdue_tasks
         ) del ON true

         -- Revenue metrics
         LEFT JOIN LATERAL (
           SELECT
             COALESCE((SELECT SUM(re.amount) FROM revenue_events re
              WHERE re.artist_id = a.id
              AND re.event_date >= CURRENT_DATE - INTERVAL '90 days'), 0) AS revenue_90d,
             COALESCE((SELECT SUM(re.amount) FROM revenue_events re
              WHERE re.artist_id = a.id
              AND re.event_date >= CURRENT_DATE - INTERVAL '180 days'
              AND re.event_date < CURRENT_DATE - INTERVAL '90 days'), 0) AS revenue_prev_90d,
             (SELECT COUNT(*) FROM placements p
              JOIN assets ast ON ast.id = p.asset_id
              WHERE ast.artist_id = a.id AND p.is_deleted = false
              AND p.status = 'pending') AS pending_placements
         ) rev ON true

         -- Audience metrics
         LEFT JOIN LATERAL (
           SELECT
             (SELECT COUNT(*) FROM placements p
              JOIN assets ast ON ast.id = p.asset_id
              WHERE ast.artist_id = a.id AND p.is_deleted = false
              AND p.status IN ('confirmed','completed')) AS active_placements,
             (SELECT COUNT(*) FROM revenue_events re
              WHERE re.artist_id = a.id
              AND re.event_date >= CURRENT_DATE - INTERVAL '180 days') AS revenue_event_count
         ) aud ON true

         -- Engagement metrics
         LEFT JOIN LATERAL (
           SELECT
             (SELECT COUNT(*) FROM entity_comments ec
              WHERE ec.entity_type = 'artist' AND ec.entity_id = a.id
              AND ec.created_at >= NOW() - INTERVAL '90 days') AS comments_90d,
             (SELECT COUNT(*) FROM activity_feed af
              WHERE af.entity_type = 'artist' AND af.entity_id = a.id
              AND af.created_at >= NOW() - INTERVAL '90 days') AS activities_90d
         ) eng ON true

         -- Compliance metrics
         LEFT JOIN LATERAL (
           SELECT
             ((CASE WHEN a.bio IS NOT NULL AND a.bio != '' THEN 1 ELSE 0 END)
              + (CASE WHEN a.genre IS NOT NULL AND a.genre != '' THEN 1 ELSE 0 END)
              + (CASE WHEN a.email IS NOT NULL AND a.email != '' THEN 1 ELSE 0 END)
              + (CASE WHEN a.phone IS NOT NULL AND a.phone != '' THEN 1 ELSE 0 END)) AS profile_fields,
             EXISTS (
               SELECT 1 FROM ownership_records o
               JOIN assets ast ON ast.id = o.asset_id
               WHERE ast.artist_id = a.id
             ) AS has_ownership,
             EXISTS (
               SELECT 1 FROM artist_subscriptions asub
               WHERE asub.artist_id = a.id AND asub.status = 'active'
             ) AS has_sub
         ) comp ON true

         ${whereClause}
         ORDER BY a.name ASC
         LIMIT 50`,
        params
      );

      // Score each artist in JS for clarity and maintainability
      const data = rows.map((r) => {
        const momRatio = scoreMomentum(r);
        const delRatio = scoreDelivery(r);
        const revRatio = scoreRevenue(r);
        const audRatio = scoreAudience(r);
        const engRatio = scoreEngagement(r);
        const compRatio = scoreCompliance(r);

        const breakdown = {
          momentum:   { score: Math.round(momRatio * DIMENSIONS.momentum.weight), max: DIMENSIONS.momentum.weight, ratio: momRatio, label: DIMENSIONS.momentum.label },
          delivery:   { score: Math.round(delRatio * DIMENSIONS.delivery.weight), max: DIMENSIONS.delivery.weight, ratio: delRatio, label: DIMENSIONS.delivery.label },
          revenue:    { score: Math.round(revRatio * DIMENSIONS.revenue.weight), max: DIMENSIONS.revenue.weight, ratio: revRatio, label: DIMENSIONS.revenue.label },
          audience:   { score: Math.round(audRatio * DIMENSIONS.audience.weight), max: DIMENSIONS.audience.weight, ratio: audRatio, label: DIMENSIONS.audience.label },
          engagement: { score: Math.round(engRatio * DIMENSIONS.engagement.weight), max: DIMENSIONS.engagement.weight, ratio: engRatio, label: DIMENSIONS.engagement.label },
          compliance: { score: Math.round(compRatio * DIMENSIONS.compliance.weight), max: DIMENSIONS.compliance.weight, ratio: compRatio, label: DIMENSIONS.compliance.label },
        };

        const healthScore = breakdown.momentum.score + breakdown.delivery.score
          + breakdown.revenue.score + breakdown.audience.score
          + breakdown.engagement.score + breakdown.compliance.score;

        return {
          id: r.id,
          name: r.name,
          stage_name: r.stage_name,
          genre: r.genre,
          health_score: healthScore,
          breakdown,
          actions: generateActions(breakdown),
        };
      });

      // Sort by health score descending
      data.sort((a, b) => b.health_score - a.health_score);

      success(res, data, 'Artist health scores retrieved');
    } catch (err) {
      next(err);
    }
  },

  // Momentum Trends
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

  // Next Actions
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
