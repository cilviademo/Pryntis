'use strict';

const express = require('express');
const multer = require('multer');
const mediaController = require('../controllers/mediaController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

const { AppError } = require('../middleware/errorHandler');

// ── Multer configuration ─────────────────────────────────────────────
// Use memory storage so the buffer is available on req.file.buffer for
// checksum computation and storage-provider upload.
const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_MB || '100', 10) * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/flac',
  'audio/x-wav', 'audio/x-m4a', 'audio/webm',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError(
          `File type ${file.mimetype} is not allowed. Accepted: audio, video, PDF.`,
          400,
          'INVALID_FILE_TYPE'
        ),
        false
      );
    }
    cb(null, true);
  },
});

// All routes require authentication
router.use(authenticate);

// ── Routes ───────────────────────────────────────────────────────────

// Upload a new media file
router.post(
  '/upload',
  authorize('admin', 'owner', 'manager', 'audio_engineer'),
  upload.single('file'),
  mediaController.uploadMedia
);

// Stream / download a media file (any authenticated user)
router.get('/:id/stream', mediaController.streamMedia);

// List media files (filterable by owner_type + owner_id)
router.get('/', mediaController.listMedia);

// Upload a new version of an existing media file
router.post(
  '/:id/new-version',
  authorize('admin', 'owner', 'manager'),
  upload.single('file'),
  mediaController.uploadNewVersion
);

// Set a specific version as the current one
router.put(
  '/:id/set-current',
  authorize('admin', 'owner', 'manager'),
  mediaController.setCurrentVersion
);

module.exports = router;
