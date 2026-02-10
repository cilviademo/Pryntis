const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const portController = {
  // ════════════════════════════════════════════════════════════════════
  // ASSETS
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/port/assets
  async listAssets(req, res, next) {
    try {
      const {
        q,
        file_type,
        genre,
        artist_id,
        project_id,
        sortBy = 'created_at',
        sortDir = 'DESC',
        page = 1,
        limit = 25,
      } = req.query;

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;
      const direction = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const safeSortBy = /^[\w.]+$/.test(sortBy) ? sortBy : 'created_at';

      const conditions = ['a.is_deleted = false'];
      const params = [];
      let paramIdx = 1;
      let selectExtra = '';
      let orderClause = `ORDER BY a.${safeSortBy} ${direction}`;

      // Simple ILIKE search on title (assets don't have search_vector)
      if (q && q.trim()) {
        conditions.push(`a.title ILIKE $${paramIdx}`);
        params.push(`%${q.trim()}%`);
        paramIdx++;
      }

      if (file_type) {
        conditions.push(`a.file_type = $${paramIdx++}`);
        params.push(file_type);
      }

      if (genre) {
        conditions.push(`a.genre = $${paramIdx++}`);
        params.push(genre);
      }

      if (artist_id) {
        conditions.push(`a.artist_id = $${paramIdx++}`);
        params.push(artist_id);
      }

      if (project_id) {
        conditions.push(`a.project_id = $${paramIdx++}`);
        params.push(project_id);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Count
      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM assets a ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      // Data with artist/project joins
      const { rows } = await db.query(
        `SELECT a.*${selectExtra},
                art.name AS artist_name,
                p.title AS project_title
         FROM assets a
         LEFT JOIN artists art ON art.id = a.artist_id
         LEFT JOIN projects p ON p.id = a.project_id
         ${whereClause}
         ${orderClause}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Assets retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/port/assets/:id
  async getAsset(req, res, next) {
    try {
      const assetId = req.params.id;

      const { rows: assetRows } = await db.query(
        `SELECT a.*,
                art.name AS artist_name,
                p.title AS project_title
         FROM assets a
         LEFT JOIN artists art ON art.id = a.artist_id
         LEFT JOIN projects p ON p.id = a.project_id
         WHERE a.id = $1 AND a.is_deleted = false`,
        [assetId]
      );

      if (!assetRows[0]) {
        throw new AppError('Asset not found', 404, 'NOT_FOUND');
      }

      // Fetch related data in parallel
      const [tagsResult, placementsResult, ownershipResult, usageResult] = await Promise.all([
        db.query('SELECT id, tag FROM asset_tags WHERE asset_id = $1 ORDER BY tag', [assetId]),
        db.query(
          `SELECT * FROM placements WHERE asset_id = $1 AND is_deleted = false ORDER BY placement_date DESC`,
          [assetId]
        ),
        db.query(
          'SELECT * FROM ownership_records WHERE asset_id = $1 ORDER BY ownership_type, owner_name',
          [assetId]
        ),
        db.query(
          'SELECT * FROM usage_records WHERE asset_id = $1 ORDER BY date_recorded DESC LIMIT 100',
          [assetId]
        ),
      ]);

      success(res, {
        ...assetRows[0],
        tags: tagsResult.rows,
        placements: placementsResult.rows,
        ownership: ownershipResult.rows,
        usage: usageResult.rows,
      }, 'Asset retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/port/assets
  async createAsset(req, res, next) {
    try {
      const {
        title, file_type, file_name, storage_key, genre, bpm,
        key_signature, duration_seconds, artist_id, project_id,
        external_url, notes,
      } = req.body;

      const { rows } = await db.query(
        `INSERT INTO assets
           (title, file_type, file_name, storage_key, genre, bpm, key_signature,
            duration_seconds, artist_id, project_id, external_url, notes, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          title, file_type, file_name || null, storage_key || null, genre || null,
          bpm || null, key_signature || null, duration_seconds || null,
          artist_id || null, project_id || null, external_url || null,
          notes || null, req.user.id,
        ]
      );

      created(res, rows[0], 'Asset created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/port/assets/:id
  async updateAsset(req, res, next) {
    try {
      const allowedFields = [
        'title', 'file_type', 'file_name', 'storage_key', 'genre', 'bpm',
        'key_signature', 'duration_seconds', 'artist_id', 'project_id',
        'external_url', 'notes',
      ];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
      }

      sets.push(`updated_by = $${idx++}`);
      values.push(req.user.id);

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE assets SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND is_deleted = false
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Asset not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Asset updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/port/assets/:id — soft delete
  async softDeleteAsset(req, res, next) {
    try {
      const { rows } = await db.query(
        `UPDATE assets SET is_deleted = true, deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = false
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Asset not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Asset archived successfully');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/port/assets/:id/restore
  async restoreAsset(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        throw new AppError('Only admins can restore assets', 403, 'FORBIDDEN');
      }

      const { rows } = await db.query(
        `UPDATE assets SET is_deleted = false, deleted_at = NULL, updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = true
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Deleted asset not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Asset restored successfully');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // ASSET TAGS
  // ════════════════════════════════════════════════════════════════════

  // POST /api/v1/port/assets/:id/tags — bulk add
  async addTags(req, res, next) {
    try {
      const assetId = req.params.id;
      const { tags } = req.body;

      if (!Array.isArray(tags) || tags.length === 0) {
        throw new AppError('tags must be a non-empty array of strings', 400, 'VALIDATION_ERROR');
      }

      // Verify asset exists
      const { rows: assetCheck } = await db.query(
        'SELECT id FROM assets WHERE id = $1 AND is_deleted = false',
        [assetId]
      );
      if (!assetCheck[0]) {
        throw new AppError('Asset not found', 404, 'NOT_FOUND');
      }

      // Build bulk insert with ON CONFLICT DO NOTHING
      const valuePlaceholders = [];
      const params = [assetId];
      let paramIdx = 2;

      for (const tag of tags) {
        valuePlaceholders.push(`($1, $${paramIdx++})`);
        params.push(tag.trim());
      }

      const { rows } = await db.query(
        `INSERT INTO asset_tags (asset_id, tag)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (asset_id, tag) DO NOTHING
         RETURNING *`,
        params
      );

      created(res, rows, `${rows.length} tag(s) added`);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/port/assets/:id/tags/:tag
  async removeTag(req, res, next) {
    try {
      const { rows } = await db.query(
        'DELETE FROM asset_tags WHERE asset_id = $1 AND tag = $2 RETURNING *',
        [req.params.id, req.params.tag]
      );

      if (!rows[0]) {
        throw new AppError('Tag not found on this asset', 404, 'NOT_FOUND');
      }

      success(res, null, 'Tag removed successfully');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // PLACEMENTS
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/port/placements
  async listPlacements(req, res, next) {
    try {
      const { asset_id, status, placement_type, page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = ['pl.is_deleted = false'];
      const params = [];
      let paramIdx = 1;

      if (asset_id) {
        conditions.push(`pl.asset_id = $${paramIdx++}`);
        params.push(asset_id);
      }

      if (status) {
        conditions.push(`pl.status = $${paramIdx++}`);
        params.push(status);
      }

      if (placement_type) {
        conditions.push(`pl.placement_type = $${paramIdx++}`);
        params.push(placement_type);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM placements pl ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT pl.*, a.title AS asset_title
         FROM placements pl
         LEFT JOIN assets a ON a.id = pl.asset_id
         ${whereClause}
         ORDER BY pl.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Placements retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/port/placements
  async createPlacement(req, res, next) {
    try {
      const { asset_id, placement_type, status, placed_with, placement_date, expected_value, notes } = req.body;

      const { rows } = await db.query(
        `INSERT INTO placements (asset_id, placement_type, status, placed_with, placement_date, expected_value, notes, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [asset_id, placement_type, status || 'pending', placed_with || null, placement_date || null, expected_value || null, notes || null, req.user.id]
      );

      created(res, rows[0], 'Placement created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/port/placements/:id
  async updatePlacement(req, res, next) {
    try {
      const allowedFields = ['placement_type', 'status', 'placed_with', 'placement_date', 'expected_value', 'notes'];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
      }

      sets.push(`updated_by = $${idx++}`);
      values.push(req.user.id);

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE placements SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND is_deleted = false
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Placement not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Placement updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // OWNERSHIP RECORDS
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/port/assets/:id/ownership
  async listOwnership(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT * FROM ownership_records
         WHERE asset_id = $1
         ORDER BY ownership_type, owner_name`,
        [req.params.id]
      );

      success(res, rows, 'Ownership records retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/port/assets/:id/ownership
  async createOwnership(req, res, next) {
    try {
      const assetId = req.params.id;
      const { owner_name, ownership_type, percentage, pro_affiliation, ipi_number, notes } = req.body;

      // Validate split totals: current total + new percentage must not exceed 100
      const { rows: existingRows } = await db.query(
        `SELECT COALESCE(SUM(percentage), 0) AS current_total
         FROM ownership_records
         WHERE asset_id = $1 AND ownership_type = $2`,
        [assetId, ownership_type]
      );

      const currentTotal = parseFloat(existingRows[0].current_total);
      const newPercentage = parseFloat(percentage);

      if (currentTotal + newPercentage > 100) {
        throw new AppError(
          `Cannot add ${newPercentage}% — total ${ownership_type} ownership would be ${currentTotal + newPercentage}% (max 100%)`,
          400,
          'OWNERSHIP_EXCEEDS_LIMIT'
        );
      }

      const { rows } = await db.query(
        `INSERT INTO ownership_records (asset_id, owner_name, ownership_type, percentage, pro_affiliation, ipi_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [assetId, owner_name, ownership_type, newPercentage, pro_affiliation || null, ipi_number || null, notes || null]
      );

      created(res, rows[0], 'Ownership record created successfully');
    } catch (err) {
      if (err.code === '23505') {
        return next(new AppError('Duplicate ownership record for this asset, owner, and type', 409, 'DUPLICATE'));
      }
      next(err);
    }
  },

  // PUT /api/v1/port/ownership/:id
  async updateOwnership(req, res, next) {
    try {
      // Fetch existing record first
      const { rows: existingRecord } = await db.query(
        'SELECT * FROM ownership_records WHERE id = $1',
        [req.params.id]
      );

      if (!existingRecord[0]) {
        throw new AppError('Ownership record not found', 404, 'NOT_FOUND');
      }

      const record = existingRecord[0];
      const allowedFields = ['owner_name', 'ownership_type', 'percentage', 'pro_affiliation', 'ipi_number', 'notes'];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
      }

      // Validate percentage if it changed
      const newPercentage = req.body.percentage !== undefined ? parseFloat(req.body.percentage) : record.percentage;
      const newOwnershipType = req.body.ownership_type !== undefined ? req.body.ownership_type : record.ownership_type;

      // Check total for the type, excluding the current record
      const { rows: sumRows } = await db.query(
        `SELECT COALESCE(SUM(percentage), 0) AS current_total
         FROM ownership_records
         WHERE asset_id = $1 AND ownership_type = $2 AND id != $3`,
        [record.asset_id, newOwnershipType, req.params.id]
      );

      const othersTotal = parseFloat(sumRows[0].current_total);
      if (othersTotal + newPercentage > 100) {
        throw new AppError(
          `Cannot set ${newPercentage}% — total ${newOwnershipType} ownership would be ${othersTotal + newPercentage}% (max 100%)`,
          400,
          'OWNERSHIP_EXCEEDS_LIMIT'
        );
      }

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE ownership_records SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING *`,
        values
      );

      success(res, rows[0], 'Ownership record updated successfully');
    } catch (err) {
      if (err.code === '23505') {
        return next(new AppError('Duplicate ownership record for this asset, owner, and type', 409, 'DUPLICATE'));
      }
      next(err);
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // USAGE RECORDS
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/port/assets/:id/usage
  async listUsage(req, res, next) {
    try {
      const { usage_type, platform, page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = ['asset_id = $1'];
      const params = [req.params.id];
      let paramIdx = 2;

      if (usage_type) {
        conditions.push(`usage_type = $${paramIdx++}`);
        params.push(usage_type);
      }

      if (platform) {
        conditions.push(`platform = $${paramIdx++}`);
        params.push(platform);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM usage_records ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT * FROM usage_records
         ${whereClause}
         ORDER BY date_recorded DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Usage records retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/port/assets/:id/usage
  async createUsage(req, res, next) {
    try {
      const assetId = req.params.id;
      const { usage_type, platform, date_recorded, count, revenue, notes } = req.body;

      // Verify asset exists
      const { rows: assetCheck } = await db.query(
        'SELECT id FROM assets WHERE id = $1 AND is_deleted = false',
        [assetId]
      );
      if (!assetCheck[0]) {
        throw new AppError('Asset not found', 404, 'NOT_FOUND');
      }

      const { rows } = await db.query(
        `INSERT INTO usage_records (asset_id, usage_type, platform, date_recorded, count, revenue, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [assetId, usage_type, platform || null, date_recorded || null, count || 0, revenue || null, notes || null]
      );

      created(res, rows[0], 'Usage record created successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = portController;
