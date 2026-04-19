const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

const analyticsController = {
  // ════════════════════════════════════════════════════════════════════
  // PLACEMENT ANALYTICS
  // GET /api/v1/port/analytics/placements
  // ════════════════════════════════════════════════════════════════════

  async getPlacementAnalytics(req, res, next) {
    try {
      const { artist_id, status, from, to } = req.query;

      // Build dynamic WHERE clause
      // Placements link to artists through assets.artist_id
      const conditions = ['pl.is_deleted = false'];
      const params = [];
      let paramIdx = 1;

      if (artist_id) {
        conditions.push(`a.artist_id = $${paramIdx++}`);
        params.push(artist_id);
      }

      if (status) {
        conditions.push(`pl.status = $${paramIdx++}`);
        params.push(status);
      }

      if (from) {
        conditions.push(`pl.placement_date >= $${paramIdx++}`);
        params.push(from);
      }

      if (to) {
        conditions.push(`pl.placement_date <= $${paramIdx++}`);
        params.push(to);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const joinClause = 'JOIN assets a ON a.id = pl.asset_id';

      // ── Totals ──────────────────────────────────────────────────────
      const { rows: totalRows } = await db.query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(pl.expected_value), 0) AS total_value
         FROM placements pl
         ${joinClause}
         ${whereClause}`,
        params
      );

      const totals = {
        count: parseInt(totalRows[0].count, 10),
        total_value: parseFloat(totalRows[0].total_value),
      };

      // ── By status ───────────────────────────────────────────────────
      const { rows: byStatus } = await db.query(
        `SELECT pl.status,
                COUNT(*) AS count,
                COALESCE(SUM(pl.expected_value), 0) AS total_value
         FROM placements pl
         ${joinClause}
         ${whereClause}
         GROUP BY pl.status
         ORDER BY pl.status`,
        params
      );

      const by_status = byStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
        total_value: parseFloat(r.total_value),
      }));

      // ── By type ─────────────────────────────────────────────────────
      const { rows: byType } = await db.query(
        `SELECT pl.placement_type,
                COUNT(*) AS count,
                COALESCE(SUM(pl.expected_value), 0) AS total_value
         FROM placements pl
         ${joinClause}
         ${whereClause}
         GROUP BY pl.placement_type
         ORDER BY pl.placement_type`,
        params
      );

      const by_type = byType.map((r) => ({
        placement_type: r.placement_type,
        count: parseInt(r.count, 10),
        total_value: parseFloat(r.total_value),
      }));

      // ── Monthly values (last 12 months) ─────────────────────────────
      const { rows: monthly } = await db.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', pl.placement_date), 'YYYY-MM') AS month,
                COUNT(*) AS count,
                COALESCE(SUM(pl.expected_value), 0) AS value
         FROM placements pl
         ${joinClause}
         ${whereClause}
           AND pl.placement_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
         GROUP BY DATE_TRUNC('month', pl.placement_date)
         ORDER BY DATE_TRUNC('month', pl.placement_date)`,
        params
      );

      const monthly_values = monthly.map((r) => ({
        month: r.month,
        count: parseInt(r.count, 10),
        value: parseFloat(r.value),
      }));

      // ── Top 5 artists by placement value ────────────────────────────
      const { rows: topArtists } = await db.query(
        `SELECT a.artist_id,
                art.name AS artist_name,
                art.stage_name,
                COUNT(*) AS placement_count,
                COALESCE(SUM(pl.expected_value), 0) AS total_value
         FROM placements pl
         ${joinClause}
         LEFT JOIN artists art ON art.id = a.artist_id
         ${whereClause}
           AND a.artist_id IS NOT NULL
         GROUP BY a.artist_id, art.name, art.stage_name
         ORDER BY total_value DESC
         LIMIT 5`,
        params
      );

      const top_artists = topArtists.map((r) => ({
        artist_id: r.artist_id,
        artist_name: r.artist_name,
        stage_name: r.stage_name,
        placement_count: parseInt(r.placement_count, 10),
        total_value: parseFloat(r.total_value),
      }));

      success(res, {
        totals,
        by_status,
        by_type,
        monthly_values,
        top_artists,
      }, 'Placement analytics retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // ASSET ANALYTICS
  // GET /api/v1/port/analytics/assets
  // ════════════════════════════════════════════════════════════════════

  async getAssetAnalytics(req, res, next) {
    try {
      // ── Total count ─────────────────────────────────────────────────
      const { rows: totalRows } = await db.query(
        `SELECT COUNT(*) AS count FROM assets WHERE is_deleted = false`
      );

      const total_count = parseInt(totalRows[0].count, 10);

      // ── By file_type ────────────────────────────────────────────────
      const { rows: byFileType } = await db.query(
        `SELECT file_type,
                COUNT(*) AS count
         FROM assets
         WHERE is_deleted = false
         GROUP BY file_type
         ORDER BY file_type`
      );

      const by_file_type = byFileType.map((r) => ({
        file_type: r.file_type,
        count: parseInt(r.count, 10),
      }));

      // ── By genre ────────────────────────────────────────────────────
      const { rows: byGenre } = await db.query(
        `SELECT COALESCE(genre, 'unspecified') AS genre,
                COUNT(*) AS count
         FROM assets
         WHERE is_deleted = false
         GROUP BY genre
         ORDER BY count DESC`
      );

      const by_genre = byGenre.map((r) => ({
        genre: r.genre,
        count: parseInt(r.count, 10),
      }));

      // ── Monthly new assets (last 12 months) ─────────────────────────
      const { rows: monthly } = await db.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                COUNT(*) AS count
         FROM assets
         WHERE is_deleted = false
           AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`
      );

      const monthly_new_assets = monthly.map((r) => ({
        month: r.month,
        count: parseInt(r.count, 10),
      }));

      // ── Assets with most placements (top 10) ────────────────────────
      const { rows: topAssets } = await db.query(
        `SELECT a.id AS asset_id,
                a.title,
                a.file_type,
                a.genre,
                art.name AS artist_name,
                COUNT(pl.id) AS placement_count,
                COALESCE(SUM(pl.expected_value), 0) AS total_placement_value
         FROM assets a
         JOIN placements pl ON pl.asset_id = a.id AND pl.is_deleted = false
         LEFT JOIN artists art ON art.id = a.artist_id
         WHERE a.is_deleted = false
         GROUP BY a.id, a.title, a.file_type, a.genre, art.name
         ORDER BY placement_count DESC, total_placement_value DESC
         LIMIT 10`
      );

      const top_placed_assets = topAssets.map((r) => ({
        asset_id: r.asset_id,
        title: r.title,
        file_type: r.file_type,
        genre: r.genre,
        artist_name: r.artist_name,
        placement_count: parseInt(r.placement_count, 10),
        total_placement_value: parseFloat(r.total_placement_value),
      }));

      success(res, {
        total_count,
        by_file_type,
        by_genre,
        monthly_new_assets,
        top_placed_assets,
      }, 'Asset analytics retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // REVENUE ANALYTICS
  // GET /api/v1/port/analytics/revenue
  // ════════════════════════════════════════════════════════════════════

  async getRevenueAnalytics(req, res, next) {
    try {
      // ── Total revenue ───────────────────────────────────────────────
      const { rows: totalRows } = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM revenue_events`
      );

      const total_revenue = parseFloat(totalRows[0].total_revenue);

      // ── Monthly revenue (last 12 months) ────────────────────────────
      const { rows: monthly } = await db.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', event_date), 'YYYY-MM') AS month,
                COALESCE(SUM(amount), 0) AS revenue
         FROM revenue_events
         WHERE event_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
         GROUP BY DATE_TRUNC('month', event_date)
         ORDER BY DATE_TRUNC('month', event_date)`
      );

      const monthly_revenue = monthly.map((r) => ({
        month: r.month,
        revenue: parseFloat(r.revenue),
      }));

      // ── Revenue by source type ──────────────────────────────────────
      const { rows: bySource } = await db.query(
        `SELECT COALESCE(source, 'unspecified') AS source,
                COUNT(*) AS event_count,
                COALESCE(SUM(amount), 0) AS total_amount
         FROM revenue_events
         GROUP BY source
         ORDER BY total_amount DESC`
      );

      const by_source = bySource.map((r) => ({
        source: r.source,
        event_count: parseInt(r.event_count, 10),
        total_amount: parseFloat(r.total_amount),
      }));

      // ── Top 5 earning artists ───────────────────────────────────────
      const { rows: topArtists } = await db.query(
        `SELECT re.artist_id,
                art.name AS artist_name,
                art.stage_name,
                COUNT(*) AS event_count,
                COALESCE(SUM(re.amount), 0) AS total_earned
         FROM revenue_events re
         JOIN artists art ON art.id = re.artist_id
         GROUP BY re.artist_id, art.name, art.stage_name
         ORDER BY total_earned DESC
         LIMIT 5`
      );

      const top_earning_artists = topArtists.map((r) => ({
        artist_id: r.artist_id,
        artist_name: r.artist_name,
        stage_name: r.stage_name,
        event_count: parseInt(r.event_count, 10),
        total_earned: parseFloat(r.total_earned),
      }));

      // ── Revenue vs expenses comparison ──────────────────────────────
      const { rows: expenseRows } = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM recoupable_expenses`
      );

      const total_expenses = parseFloat(expenseRows[0].total_expenses);

      const revenue_vs_expenses = {
        total_revenue,
        total_expenses,
        net: parseFloat((total_revenue - total_expenses).toFixed(2)),
      };

      success(res, {
        total_revenue,
        monthly_revenue,
        by_source,
        top_earning_artists,
        revenue_vs_expenses,
      }, 'Revenue analytics retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // DELIVERY TRACKING
  // GET /api/v1/port/analytics/deliveries
  // ════════════════════════════════════════════════════════════════════

  async getDeliveryTracking(req, res, next) {
    try {
      // ── Projects by status ──────────────────────────────────────────
      const { rows: projectsByStatus } = await db.query(
        `SELECT status,
                COUNT(*) AS count
         FROM projects
         WHERE is_deleted = false
         GROUP BY status
         ORDER BY status`
      );

      const projects_by_status = projectsByStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      }));

      // ── Tasks by status ─────────────────────────────────────────────
      const { rows: tasksByStatus } = await db.query(
        `SELECT status,
                COUNT(*) AS count
         FROM tasks
         GROUP BY status
         ORDER BY status`
      );

      const tasks_by_status = tasksByStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      }));

      // ── Average project duration for completed projects ─────────────
      // Duration = difference between start_date and the date the project
      // was marked completed (approximated by updated_at for status = 'completed')
      const { rows: avgDurationRows } = await db.query(
        `SELECT COALESCE(
                  ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - start_date)) / 86400), 1),
                  0
                ) AS avg_days
         FROM projects
         WHERE is_deleted = false
           AND status = 'completed'
           AND start_date IS NOT NULL`
      );

      const avg_project_duration_days = parseFloat(avgDurationRows[0].avg_days);

      // ── Overdue tasks count ─────────────────────────────────────────
      const { rows: overdueRows } = await db.query(
        `SELECT COUNT(*) AS count
         FROM tasks
         WHERE status IN ('open', 'in_progress')
           AND due_date < CURRENT_DATE`
      );

      const overdue_tasks_count = parseInt(overdueRows[0].count, 10);

      success(res, {
        projects_by_status,
        tasks_by_status,
        avg_project_duration_days,
        overdue_tasks_count,
      }, 'Delivery tracking analytics retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // ADVANCED ANALYTICS — COVERAGE MATRIX
  // GET /api/v1/port/analytics/coverage
  // ════════════════════════════════════════════════════════════════════
  async getCoverageMatrix(req, res, next) {
    try {
      // Per-artist metadata completeness
      const { rows: artistCoverage } = await db.query(
        `SELECT
           ar.id AS artist_id,
           ar.name AS artist_name,
           ar.stage_name,
           COUNT(a.id) AS total_assets,
           COUNT(CASE WHEN a.file_name IS NOT NULL AND a.file_name != '' THEN 1 END) AS has_file,
           COUNT(CASE WHEN a.storage_key IS NOT NULL AND a.storage_key != '' THEN 1 END) AS has_storage,
           COUNT(CASE WHEN a.genre IS NOT NULL AND a.genre != '' THEN 1 END) AS has_genre,
           COUNT(CASE WHEN a.bpm IS NOT NULL THEN 1 END) AS has_bpm,
           COUNT(CASE WHEN a.key_signature IS NOT NULL AND a.key_signature != '' THEN 1 END) AS has_key,
           COUNT(CASE WHEN a.duration_seconds IS NOT NULL THEN 1 END) AS has_duration
         FROM artists ar
         LEFT JOIN assets a ON a.artist_id = ar.id AND a.is_deleted = false
         WHERE ar.is_deleted = false
         GROUP BY ar.id, ar.name, ar.stage_name
         HAVING COUNT(a.id) > 0
         ORDER BY ar.name`
      );

      const coverage = artistCoverage.map((r) => {
        const total = parseInt(r.total_assets, 10) || 1;
        return {
          artist_id: r.artist_id,
          artist_name: r.artist_name,
          stage_name: r.stage_name,
          total_assets: parseInt(r.total_assets, 10),
          file_pct: Math.round((parseInt(r.has_file, 10) / total) * 100),
          storage_pct: Math.round((parseInt(r.has_storage, 10) / total) * 100),
          genre_pct: Math.round((parseInt(r.has_genre, 10) / total) * 100),
          bpm_pct: Math.round((parseInt(r.has_bpm, 10) / total) * 100),
          key_pct: Math.round((parseInt(r.has_key, 10) / total) * 100),
          duration_pct: Math.round((parseInt(r.has_duration, 10) / total) * 100),
        };
      });

      // Overall coverage score
      const totalAssets = coverage.reduce((s, c) => s + c.total_assets, 0);
      const avgCoverage = coverage.length > 0
        ? Math.round(coverage.reduce((s, c) => {
            const fields = [c.file_pct, c.storage_pct, c.genre_pct, c.bpm_pct, c.key_pct, c.duration_pct];
            return s + (fields.reduce((a, b) => a + b, 0) / fields.length);
          }, 0) / coverage.length)
        : 0;

      success(res, {
        artists: coverage,
        summary: { total_artists: coverage.length, total_assets: totalAssets, avg_coverage_pct: avgCoverage },
      }, 'Coverage matrix retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // ADVANCED ANALYTICS — CROSS-MODULE INSIGHTS
  // GET /api/v1/port/analytics/insights
  // ════════════════════════════════════════════════════════════════════
  async getCrossModuleInsights(req, res, next) {
    try {
      // Revenue waterfall: gross → expenses → recouped → net
      const { rows: waterfallRows } = await db.query(
        `SELECT
           COALESCE((SELECT SUM(amount) FROM revenue_events), 0) AS gross_revenue,
           COALESCE((SELECT SUM(amount) FROM recoupable_expenses), 0) AS total_expenses,
           COALESCE((SELECT SUM(amount_applied_to_recoupment) FROM revenue_events), 0) AS applied_to_recoupment`
      );
      const wf = waterfallRows[0];
      const waterfall = {
        gross_revenue: parseFloat(wf.gross_revenue),
        total_expenses: parseFloat(wf.total_expenses),
        applied_to_recoupment: parseFloat(wf.applied_to_recoupment),
        net_payable: Math.max(0, parseFloat(wf.applied_to_recoupment) - parseFloat(wf.total_expenses)),
      };

      // Placement funnel
      const { rows: funnelRows } = await db.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(expected_value), 0) AS value
         FROM placements WHERE is_deleted = false
         GROUP BY status
         ORDER BY CASE status
           WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2
           WHEN 'completed' THEN 3 WHEN 'declined' THEN 4 ELSE 5 END`
      );
      const funnel = funnelRows.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
        value: parseFloat(r.value),
      }));

      // Revenue by month with expenses overlay
      const { rows: monthlyRows } = await db.query(
        `SELECT m.month,
                COALESCE(rev.amount, 0) AS revenue,
                COALESCE(exp.amount, 0) AS expenses
         FROM (
           SELECT TO_CHAR(d, 'YYYY-MM') AS month
           FROM generate_series(
             DATE_TRUNC('month', NOW()) - INTERVAL '11 months',
             DATE_TRUNC('month', NOW()),
             '1 month'
           ) d
         ) m
         LEFT JOIN (
           SELECT TO_CHAR(DATE_TRUNC('month', event_date), 'YYYY-MM') AS month,
                  SUM(amount) AS amount
           FROM revenue_events
           WHERE event_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
           GROUP BY 1
         ) rev ON rev.month = m.month
         LEFT JOIN (
           SELECT TO_CHAR(DATE_TRUNC('month', expense_date), 'YYYY-MM') AS month,
                  SUM(amount) AS amount
           FROM recoupable_expenses
           WHERE expense_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
           GROUP BY 1
         ) exp ON exp.month = m.month
         ORDER BY m.month`
      );
      const monthly_comparison = monthlyRows.map((r) => ({
        month: r.month,
        revenue: parseFloat(r.revenue),
        expenses: parseFloat(r.expenses),
      }));

      // Subscription tier vs revenue correlation
      const { rows: tierRevRows } = await db.query(
        `SELECT st.name AS tier_name,
                COUNT(DISTINCT ar.id) AS artist_count,
                COALESCE(SUM(re.amount), 0) AS total_revenue
         FROM subscription_tiers st
         JOIN artist_subscriptions asub ON asub.tier_id = st.id AND asub.status = 'active'
         JOIN artists ar ON ar.id = asub.artist_id
         LEFT JOIN revenue_events re ON re.artist_id = ar.id
         GROUP BY st.id, st.name, st.access_level
         ORDER BY st.access_level`
      );
      const tier_revenue = tierRevRows.map((r) => ({
        tier_name: r.tier_name,
        artist_count: parseInt(r.artist_count, 10),
        total_revenue: parseFloat(r.total_revenue),
        avg_revenue: parseInt(r.artist_count, 10) > 0
          ? Math.round(parseFloat(r.total_revenue) / parseInt(r.artist_count, 10))
          : 0,
      }));

      // Top ownership conflicts
      const { rows: conflicts } = await db.query(
        `SELECT a.id AS asset_id, a.title AS asset_title,
                SUM(o.percentage) AS total_pct,
                COUNT(o.id) AS owner_count
         FROM assets a
         JOIN ownership_records o ON o.asset_id = a.id
         WHERE a.is_deleted = false
         GROUP BY a.id, a.title
         HAVING SUM(o.percentage) > 100
         ORDER BY SUM(o.percentage) DESC
         LIMIT 10`
      );
      const ownership_conflicts = conflicts.map((r) => ({
        asset_id: r.asset_id,
        asset_title: r.asset_title,
        total_pct: parseFloat(r.total_pct),
        owner_count: parseInt(r.owner_count, 10),
      }));

      success(res, {
        waterfall,
        funnel,
        monthly_comparison,
        tier_revenue,
        ownership_conflicts,
      }, 'Cross-module insights retrieved');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = analyticsController;
