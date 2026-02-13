'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const StorageProvider = require('./StorageProvider');

/**
 * UPLOADS_DIR — absolute path to the local uploads directory.
 * Created eagerly so every other method can rely on its existence.
 */
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

// Ensure the uploads directory exists at module load time.
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * LocalDiskProvider — stores files on the local filesystem under
 * /home/user/Pryntis/server/uploads/.
 *
 * Suitable for development and single-server deployments.
 */
class LocalDiskProvider extends StorageProvider {
  constructor() {
    super();
    this.basePath = UPLOADS_DIR;
  }

  /**
   * Resolve a storage key to an absolute path, creating intermediate
   * directories as needed.
   * @private
   */
  _resolve(key) {
    // Prevent directory traversal attacks
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalized);
  }

  /** @override */
  async upload(buffer, key, mimeType) {
    const filePath = this._resolve(key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write atomically: buffer -> temp file -> rename is overkill for
    // single-server, so we just write directly.
    await fs.promises.writeFile(filePath, buffer);

    return { key, size: buffer.length };
  }

  /** @override */
  async getStream(key, opts = {}) {
    const filePath = this._resolve(key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }

    const streamOpts = {};
    if (opts.start !== undefined) streamOpts.start = opts.start;
    if (opts.end !== undefined) streamOpts.end = opts.end;

    return fs.createReadStream(filePath, streamOpts);
  }

  /**
   * For local disk there is no concept of pre-signed URLs.
   * Return the API streaming endpoint instead.
   * @override
   */
  async getSignedUrl(key, expiresInSec = 3600) {
    // Extract the media file id from the key if possible, otherwise return
    // the raw key so the caller can build the URL themselves.
    return `/api/v1/media/${encodeURIComponent(key)}/stream`;
  }

  /** @override */
  async delete(key) {
    const filePath = this._resolve(key);

    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      // Swallow ENOENT — deleting a non-existent file is a no-op.
      if (err.code !== 'ENOENT') throw err;
    }
  }

  /** @override */
  async exists(key) {
    const filePath = this._resolve(key);
    return fs.existsSync(filePath);
  }
}

module.exports = LocalDiskProvider;
