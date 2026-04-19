# Pryntis Roadmap

## Current Release (v1.0)

### Implemented Features
- **Panel**: Executive KPI dashboard with health scores, insights, ROI projections
- **Pass**: Splice-like producer library, engineering services, subscription management
- **Port**: Asset catalog, placements, contacts, templates (15 fully-seeded)
- **Calendar**: Month/Week/Day views with event CRUD and scheduling
- **Media**: Real file upload/streaming with versioning (local + S3-ready)
- **Notifications**: In-app notification system with bell icon
- **PDF Export**: Template and royalty statement PDF generation
- **WebSocket**: Real-time presence indicators
- **Theme**: Light/Dark mode with localStorage persistence
- **Admin**: User impersonation with audit trail
- **Analytics**: Built-in KPI dashboard + Deep Analytics (cross-module insights)
- **RBAC**: 6-role system (owner, admin, manager, audio_engineer, contributor, viewer)

---

## Planned Features

### Two-Factor Authentication (2FA)
**Status**: Stub implemented, feature-flagged
**Priority**: High
**Environment Variable**: `TWO_FACTOR_ENABLED=true`

Implementation plan:
1. TOTP support via `otplib` package
   - Generate secret per user, stored encrypted in `users.totp_secret`
   - QR code enrollment flow via `qrcode` package
   - 6-digit code verification on login
2. Backup codes
   - 10 single-use codes generated on enrollment
   - Stored hashed in `users.backup_codes` JSONB column
3. WebAuthn hardware key support
   - `@simplewebauthn/server` for registration and verification
   - Support YubiKey, Touch ID, Windows Hello
4. Recovery flow
   - Admin can disable 2FA for a user (audit logged)
   - Backup codes as fallback

### Email Notifications
**Status**: Stub implemented, feature-flagged
**Priority**: Medium
**Environment Variables**: `EMAIL_PROVIDER=smtp|sendgrid`

Implementation plan:
1. Provider abstraction (already in place)
   - SMTP via `nodemailer`
   - SendGrid via `@sendgrid/mail`
2. Email templates
   - Welcome email on account creation
   - Calendar event reminders
   - Placement status changes
   - Royalty statement delivery
   - Task assignment notifications
3. Digest preferences
   - Instant: send immediately
   - Daily: batch at 9 AM user's timezone
   - Weekly: batch on Monday morning
4. Unsubscribe management
   - Per-category opt-out
   - Global email disable

### Advanced Collaboration
**Status**: Foundation in place (WebSocket presence)
**Priority**: Medium

Planned additions:
- Live cursor tracking on shared views
- Real-time comment threads on assets
- Shared playlist/crate collaboration
- @mention notifications in comments
- File annotation (timestamped audio comments)

### Mobile App
**Status**: Not started
**Priority**: Low

- React Native or PWA approach
- Push notifications via Firebase Cloud Messaging
- Offline-first with sync queue

---

## Architecture Notes

### Storage
See `docs/storage.md` for local and S3 configuration.

### Real-Time
See `docs/realtime.md` for WebSocket architecture.

### Calendar
See `docs/calendar.md` for calendar system documentation.

### Exports
See `docs/exports.md` for PDF/CSV export documentation.

### Analytics
Built-in Deep Analytics module provides metadata coverage, health radar, revenue waterfall, and pipeline funnel.
For external BI tools, see `docs/architecture.md` (read-only database role).
