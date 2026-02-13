'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');
const { getStorageProvider } = require('../services/storage');

/**
 * Allowed owner types for media files.
 */
const VALID_OWNER_TYPES = ['artist', 'project', 'asset', 'template'];

/**
 * Derive the current storage provider name for the DB record.
 */
function providerName() {
  return (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
}

const mediaController = {
  // ──────────────────────────────────────────────────────────────────
  // POST /api/v1/media/upload
  // ──────────────────────────────────────────────────────────────────
  async uploadMedia(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400, 'MISSING_FILE');
      }

      const { owner_type, owner_id } = req.body;

      if (!owner_type || !VALID_OWNER_TYPES.includes(owner_type)) {
        throw new AppError(
          `owner_type must be one of: ${VALID_OWNER_TYPES.join(', ')}`,
          400,
          'INVALID_OWNER_TYPE'
        );
      }

      if (!owner_id) {
        throw new AppError('owner_id is required', 400, 'MISSING_OWNER_ID');
      }

      // Build a unique storage key
      const timestamp = Date.now();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${owner_type}/${owner_id}/${timestamp}-${safeName}`;

      // Compute SHA-256 checksum from buffer
      const checksum = crypto
        .createHash('sha256')
        .update(req.file.buffer)
        .digest('hex');

      // Upload to storage backend
      const storage = getStorageProvider();
      await storage.upload(req.file.buffer, storageKey, req.file.mimetype);

      // Persist metadata in the database
      const { rows } = await db.query(
        `INSERT INTO media_files
           (owner_type, owner_id, file_name, mime_type, size_bytes,
            storage_key, storage_provider, checksum_sha256, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          owner_type,
          owner_id,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          storageKey,
          providerName(),
          checksum,
          req.user.id,
        ]
      );

      created(res, rows[0], 'File uploaded successfully');
    } catch (err) {
      next(err);
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // GET /api/v1/media/:id/stream
  // ──────────────────────────────────────────────────────────────────
  async streamMedia(req, res, next) {
    try {
      const { rows } = await db.query(
        'SELECT * FROM media_files WHERE id = $1',
        [req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Media file not found', 404, 'NOT_FOUND');
      }

      const media = rows[0];
      const storage = getStorageProvider();
      const fileSize = Number(media.size_bytes);

      // ── HTTP Range handling ───────────────────────────────────────
      const rangeHeader = req.headers.range;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).end();
        }

        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': media.mime_type,
        });

        const stream = await storage.getStream(media.storage_key, { start, end });
        stream.pipe(res);
      } else {
        // Full file response
        res.writeHead(200, {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize,
          'Content-Type': media.mime_type,
          'Content-Disposition': `inline; filename="${encodeURIComponent(media.file_name)}"`,
        });

        const stream = await storage.getStream(media.storage_key);
        stream.pipe(res);
      }
    } catch (err) {
      // If headers have already been sent (mid-stream error), destroy the
      // response so the client doesn't hang.
      if (res.headersSent) {
        return res.destroy();
      }
      next(err);
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // GET /api/v1/media?owner_type=&owner_id=
  // ──────────────────────────────────────────────────────────────────
  async listMedia(req, res, next) {
    try {
      const { owner_type, owner_id } = req.query;

      const conditions = [];
      const params = [];
      let idx = 1;

      if (owner_type) {
        if (!VALID_OWNER_TYPES.includes(owner_type)) {
          throw new AppError(
            `owner_type must be one of: ${VALID_OWNER_TYPES.join(', ')}`,
            400,
            'INVALID_OWNER_TYPE'
          );
        }
        conditions.push(`owner_type = $${idx++}`);
        params.push(owner_type);
      }

      if (owner_id) {
        conditions.push(`owner_id = $${idx++}`);
        params.push(owner_id);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const { rows } = await db.query(
        `SELECT * FROM media_files ${whereClause} ORDER BY created_at DESC`,
        params
      );

      success(res, rows, 'Media files retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // POST /api/v1/media/:id/new-version
  // ──────────────────────────────────────────────────────────────────
  async uploadNewVersion(req, res, next) {
    const client = await db.pool.connect();
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400, 'MISSING_FILE');
      }

      // Look up the existing media record to inherit owner context
      const { rows: existing } = await client.query(
        'SELECT * FROM media_files WHERE id = $1',
        [req.params.id]
      );

      if (!existing[0]) {
        throw new AppError('Media file not found', 404, 'NOT_FOUND');
      }

      const original = existing[0];

      await client.query('BEGIN');

      // Get the highest version number for this logical group
      const { rows: versionRows } = await client.query(
        `SELECT COALESCE(MAX(version), 0) AS max_version
         FROM media_files
         WHERE owner_type = $1 AND owner_id = $2 AND file_name = $3`,
        [original.owner_type, original.owner_id, original.file_name]
      );
      const nextVersion = versionRows[0].max_version + 1;

      // Set all existing versions in this group to not current
      await client.query(
        `UPDATE media_files
         SET is_current = false, updated_at = NOW()
         WHERE owner_type = $1 AND owner_id = $2 AND file_name = $3`,
        [original.owner_type, original.owner_id, original.file_name]
      );

      // Upload new file to storage
      const timestamp = Date.now();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${original.owner_type}/${original.owner_id}/${timestamp}-${safeName}`;

      const checksum = crypto
        .createHash('sha256')
        .update(req.file.buffer)
        .digest('hex');

      const storage = getStorageProvider();
      await storage.upload(req.file.buffer, storageKey, req.file.mimetype);

      // Insert the new version record
      const { rows: newRows } = await client.query(
        `INSERT INTO media_files
           (owner_type, owner_id, file_name, mime_type, size_bytes,
            storage_key, storage_provider, version, checksum_sha256,
            uploaded_by, is_current)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         RETURNING *`,
        [
          original.owner_type,
          original.owner_id,
          original.file_name,
          req.file.mimetype,
          req.file.size,
          storageKey,
          providerName(),
          nextVersion,
          checksum,
          req.user.id,
        ]
      );

      await client.query('COMMIT');

      created(res, newRows[0], 'New version uploaded successfully');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // PUT /api/v1/media/:id/set-current
  // ──────────────────────────────────────────────────────────────────
  async setCurrentVersion(req, res, next) {
    const client = await db.pool.connect();
    try {
      const { rows: existing } = await client.query(
        'SELECT * FROM media_files WHERE id = $1',
        [req.params.id]
      );

      if (!existing[0]) {
        throw new AppError('Media file not found', 404, 'NOT_FOUND');
      }

      const target = existing[0];

      await client.query('BEGIN');

      // Un-mark all versions in this logical group
      await client.query(
        `UPDATE media_files
         SET is_current = false, updated_at = NOW()
         WHERE owner_type = $1 AND owner_id = $2 AND file_name = $3`,
        [target.owner_type, target.owner_id, target.file_name]
      );

      // Mark the requested version as current
      const { rows: updated } = await client.query(
        `UPDATE media_files
         SET is_current = true, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
      );

      await client.query('COMMIT');

      success(res, updated[0], 'Current version updated successfully');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  },
};

module.exports = mediaController;
