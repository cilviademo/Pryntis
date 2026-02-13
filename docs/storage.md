# Storage Configuration

Pryntis supports two storage backends for media files (audio, video, PDF).

## Local Disk (Default)

Files are stored in `/server/uploads/` directory. No configuration needed.

```env
STORAGE_PROVIDER=local
```

The local provider:
- Creates the uploads directory automatically on first use
- Stores files at `uploads/{owner_type}/{owner_id}/{timestamp}-{filename}`
- Supports HTTP Range requests for streaming playback
- Suitable for development and single-server deployments

## Amazon S3 (Production)

For production deployments, use S3 for scalable, durable file storage.

```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=pryntis-media
```

The S3 provider:
- Requires `@aws-sdk/client-s3` package: `npm install @aws-sdk/client-s3`
- Uses the same storage key structure as local
- Supports signed URLs for secure streaming
- Falls back to local storage if credentials are not configured

## File Upload Limits

- Maximum file size: 100 MB
- Accepted MIME types:
  - Audio: mp3, wav, ogg, flac, aac
  - Video: mp4, webm, quicktime
  - Documents: pdf

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/media/upload` | Upload a file (multipart/form-data) |
| GET | `/api/v1/media/:id/stream` | Stream a file (supports Range) |
| GET | `/api/v1/media?owner_type=&owner_id=` | List files for an entity |
| POST | `/api/v1/media/:id/new-version` | Upload a new version |
| PUT | `/api/v1/media/:id/set-current` | Set a version as current |

## Versioning

Each uploaded file gets a version number. When uploading a new version:
1. All existing files for the same owner are marked `is_current = false`
2. The new file gets `version = max(existing) + 1` and `is_current = true`
3. Previous versions remain accessible for audit/comparison
