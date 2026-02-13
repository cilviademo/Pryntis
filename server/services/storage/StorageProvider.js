'use strict';

/**
 * StorageProvider — abstract base class for file storage backends.
 *
 * Every concrete provider (LocalDisk, S3, GCS, etc.) must implement
 * the five methods below.  Calling any method on this base class
 * directly will throw, making missing implementations obvious.
 */
class StorageProvider {
  /**
   * Upload a file buffer to the storage backend.
   *
   * @param {Buffer} buffer   - Raw file bytes.
   * @param {string} key      - Unique storage key (path-like, e.g. "artist/uuid/file.wav").
   * @param {string} mimeType - MIME type of the file (e.g. "audio/wav").
   * @returns {Promise<{ key: string, size: number }>}
   */
  async upload(buffer, key, mimeType) {
    throw new Error('StorageProvider.upload() must be implemented by subclass');
  }

  /**
   * Return a readable stream for the stored object.
   *
   * @param {string} key          - Storage key.
   * @param {object} [opts]       - Optional range options.
   * @param {number} [opts.start] - Byte offset to start reading.
   * @param {number} [opts.end]   - Byte offset to stop reading (inclusive).
   * @returns {Promise<import('stream').Readable>}
   */
  async getStream(key, opts) {
    throw new Error('StorageProvider.getStream() must be implemented by subclass');
  }

  /**
   * Return a pre-signed (or equivalent) URL that grants temporary
   * read access to the object.
   *
   * @param {string} key              - Storage key.
   * @param {number} [expiresInSec]   - URL lifetime in seconds (default 3600).
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresInSec = 3600) {
    throw new Error('StorageProvider.getSignedUrl() must be implemented by subclass');
  }

  /**
   * Permanently delete an object from storage.
   *
   * @param {string} key - Storage key.
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('StorageProvider.delete() must be implemented by subclass');
  }

  /**
   * Check whether an object exists in storage.
   *
   * @param {string} key - Storage key.
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('StorageProvider.exists() must be implemented by subclass');
  }
}

module.exports = StorageProvider;
