'use strict';

const StorageProvider = require('./StorageProvider');

/**
 * Attempt to load the AWS SDK v3 S3 client.
 * This is an **optional** dependency — the provider gracefully degrades
 * when the package is not installed.
 */
let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand;
let getSignedUrl;
let sdkAvailable = false;

try {
  ({
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
  } = require('@aws-sdk/client-s3'));
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  sdkAvailable = true;
} catch (_) {
  // AWS SDK is not installed — S3Provider will throw informative errors.
}

/**
 * Returns true when the environment has enough configuration to use S3.
 */
function isConfigured() {
  return (
    process.env.STORAGE_PROVIDER === 's3' &&
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_S3_BUCKET
  );
}

/**
 * S3Provider — stores files in Amazon S3 (or any S3-compatible service).
 *
 * Feature-flagged:
 *   1. STORAGE_PROVIDER env var must equal "s3".
 *   2. AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET must be set.
 *   3. @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner must be installed.
 *
 * If any of these conditions is not met, every method throws a clear error.
 */
class S3Provider extends StorageProvider {
  constructor() {
    super();

    if (!sdkAvailable) {
      this._disabled = true;
      this._disabledReason =
        'S3 not configured: @aws-sdk/client-s3 is not installed. ' +
        'Run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` to enable S3 storage.';
      return;
    }

    if (!isConfigured()) {
      this._disabled = true;
      this._disabledReason =
        'S3 not configured: ensure STORAGE_PROVIDER=s3, AWS_ACCESS_KEY_ID, ' +
        'AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables are set.';
      return;
    }

    this._disabled = false;
    this._disabledReason = null;

    this.bucket = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION || 'us-east-1';

    const clientConfig = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };

    // Support custom endpoint for S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
    if (process.env.AWS_S3_ENDPOINT) {
      clientConfig.endpoint = process.env.AWS_S3_ENDPOINT;
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
  }

  /** @private — guard that throws when the provider is not ready. */
  _assertReady() {
    if (this._disabled) {
      throw new Error(this._disabledReason);
    }
  }

  /** @override */
  async upload(buffer, key, mimeType) {
    this._assertReady();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.client.send(command);

    return { key, size: buffer.length };
  }

  /** @override */
  async getStream(key, opts = {}) {
    this._assertReady();

    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    // Support byte-range requests.
    if (opts.start !== undefined || opts.end !== undefined) {
      const start = opts.start !== undefined ? opts.start : 0;
      const end = opts.end !== undefined ? opts.end : '';
      params.Range = `bytes=${start}-${end}`;
    }

    const command = new GetObjectCommand(params);
    const response = await this.client.send(command);

    // response.Body is a Readable stream in the AWS SDK v3.
    return response.Body;
  }

  /** @override */
  async getSignedUrl(key, expiresInSec = 3600) {
    this._assertReady();

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSec });
  }

  /** @override */
  async delete(key) {
    this._assertReady();

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /** @override */
  async exists(key) {
    this._assertReady();

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}

module.exports = S3Provider;
