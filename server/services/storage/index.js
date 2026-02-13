'use strict';

const LocalDiskProvider = require('./LocalDiskProvider');
const S3Provider = require('./S3Provider');

/**
 * Storage factory — returns a singleton storage provider instance
 * based on the STORAGE_PROVIDER environment variable.
 *
 *   "s3"    -> S3Provider  (requires AWS credentials + SDK)
 *   default -> LocalDiskProvider
 *
 * The returned instance is cached so every consumer shares the same
 * provider (and therefore the same S3 client connection pool).
 */

let _instance = null;

function getStorageProvider() {
  if (_instance) return _instance;

  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  switch (provider) {
    case 's3':
      _instance = new S3Provider();
      break;

    case 'local':
    default:
      _instance = new LocalDiskProvider();
      break;
  }

  return _instance;
}

module.exports = {
  getStorageProvider,
  LocalDiskProvider,
  S3Provider,
};
