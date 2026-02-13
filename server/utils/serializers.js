'use strict';

/**
 * Safe serializers — strip sensitive / unnecessary fields from API responses.
 * Each function takes a raw DB row and returns a sanitized object.
 */

function safeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Minimal user for public-facing contexts where PII must be hidden
 * (e.g. activity feeds seen by non-admin users).
 */
function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    first_name: row.first_name,
    role: row.role,
  };
}

function safeArtist(row, { includePII = false } = {}) {
  if (!row) return null;
  const safe = {
    id: row.id,
    name: row.name,
    stage_name: row.stage_name,
    genre: row.genre,
    status: row.status,
    bio: row.bio,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // aggregates / computed
    ...(row.rank !== undefined && { rank: row.rank }),
    ...(row.health_score !== undefined && { health_score: row.health_score }),
    ...(row.subscription_tier !== undefined && { subscription_tier: row.subscription_tier }),
    ...(row.access_level !== undefined && { access_level: row.access_level }),
  };
  if (includePII) {
    safe.email = row.email;
    safe.phone = row.phone;
  }
  return safe;
}

function safeContact(row, { includePII = false } = {}) {
  if (!row) return null;
  const safe = {
    id: row.id,
    name: row.name,
    organization: row.organization,
    role: row.role,
    relationship_strength: row.relationship_strength,
    tags: row.tags,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (includePII) {
    safe.email = row.email;
    safe.phone = row.phone;
  }
  return safe;
}

function safeNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

function safeCalendarEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    start_time: row.start_time,
    end_time: row.end_time,
    event_type: row.event_type,
    artist_id: row.artist_id,
    project_id: row.project_id,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // joined fields
    ...(row.artist_name !== undefined && { artist_name: row.artist_name }),
    ...(row.project_title !== undefined && { project_title: row.project_title }),
    ...(row.creator_name !== undefined && { creator_name: row.creator_name }),
  };
}

function safeMediaFile(row) {
  if (!row) return null;
  return {
    id: row.id,
    owner_type: row.owner_type,
    owner_id: row.owner_id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    version: row.version,
    is_current: row.is_current,
    checksum_sha256: row.checksum_sha256,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  safeUser,
  publicUser,
  safeArtist,
  safeContact,
  safeNotification,
  safeCalendarEvent,
  safeMediaFile,
};
