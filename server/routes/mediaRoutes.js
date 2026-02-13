'use strict';

const express = require('express');
const multer = require('multer');
const mediaController = require('../controllers/mediaController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// ── Multer configuration ─────────────────────────────────────────────
// Use memory storage so the buffer is available on req.file.buffer for
// checksum computation and storage-provider upload.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter(_req, file, cb) {
    const allowedPrefixes = ['audio/', 'video/', 'application/pdf'];
    const allowed = allowedPrefixes.some((prefix) =>
      file.mimetype.startsWith(prefix)
    );

    if (!allowed) {
      return cb(
        new Error('Only audio, video, and PDF files are accepted'),
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
