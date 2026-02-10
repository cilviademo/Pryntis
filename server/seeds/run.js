const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config();

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await db.query('DELETE FROM project_collaborators');
  await db.query('DELETE FROM projects');
  await db.query('DELETE FROM artists');
  await db.query('DELETE FROM users');

  // ============================================
  // USERS (5 accounts)
  // ============================================
  const passwordHash = await bcrypt.hash('password123', 12);

  const { rows: users } = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
      ('admin@pryntis.com', $1, 'Marc', 'Miller-Nelson', 'admin'),
      ('admin2@pryntis.com', $1, 'Jordan', 'Hayes', 'admin'),
      ('manager@pryntis.com', $1, 'Taylor', 'Brooks', 'manager'),
      ('manager2@pryntis.com', $1, 'Casey', 'Reeves', 'manager'),
      ('viewer@pryntis.com', $1, 'Riley', 'Chen', 'viewer')
    RETURNING id, email, role`,
    [passwordHash]
  );
  console.log(`Created ${users.length} users`);

  // ============================================
  // ARTISTS (25 records)
  // ============================================
  const { rows: artists } = await db.query(`
    INSERT INTO artists (name, stage_name, email, phone, bio, genre, status, notes) VALUES
      ('Marcus Thompson', 'MVRK', 'mvrk@email.com', '520-555-0101', 'Arizona-based hip-hop producer known for heavy 808 patterns', 'Hip-Hop', 'active', 'Primary roster artist'),
      ('Alicia Reyes', 'Luna Rey', 'lunarey@email.com', '602-555-0102', 'Bilingual R&B vocalist and songwriter from Phoenix', 'R&B', 'active', 'New signing, high priority'),
      ('Derek Washington', 'D-Wash', 'dwash@email.com', '310-555-0103', 'LA transplant, specializes in West Coast beats', 'Hip-Hop', 'active', NULL),
      ('Samantha Chen', 'Sable', 'sable@email.com', '415-555-0104', 'Electronic producer blending ambient textures with trap', 'Electronic', 'active', 'Collab with MVRK pending'),
      ('James Okafor', 'JO Beats', 'jobeats@email.com', '713-555-0105', 'Houston producer, heavy on Southern rap production', 'Hip-Hop', 'active', NULL),
      ('Maya Patel', 'Mayavision', 'maya@email.com', '520-555-0106', 'Multi-instrumentalist specializing in neo-soul production', 'Neo-Soul', 'active', 'Studio A regular'),
      ('Chris Rodriguez', 'Crux', 'crux@email.com', '480-555-0107', 'Latin trap and reggaeton producer', 'Latin', 'active', NULL),
      ('Brianna Lee', 'Bree Wave', 'breewave@email.com', '646-555-0108', 'NYC-based vocalist, lo-fi R&B aesthetic', 'R&B', 'active', 'Remote sessions only'),
      ('Tyler Morrison', 'Ty Morr', 'tymorr@email.com', '520-555-0109', 'Tucson local, indie hip-hop production', 'Hip-Hop', 'active', NULL),
      ('Keisha Brown', 'K.B.', 'kb@email.com', '404-555-0110', 'Atlanta vocalist, trap-soul style', 'Trap-Soul', 'active', 'Looking for beat placements'),
      ('Nathan Wolfe', 'Nate Wolfe', 'natewolfe@email.com', '312-555-0111', 'Chicago drill producer transitioning to melodic production', 'Hip-Hop', 'active', NULL),
      ('Olivia Grant', 'Liv G', 'livg@email.com', '206-555-0112', 'Seattle-based pop producer and topliner', 'Pop', 'active', 'Strong social media presence'),
      ('Rashid Ali', 'Ra$h', 'rash@email.com', '248-555-0113', 'Detroit beatmaker, dark and atmospheric', 'Hip-Hop', 'inactive', 'On hiatus - personal reasons'),
      ('Emma Fitzgerald', 'E.Fitz', 'efitz@email.com', '617-555-0114', 'Boston singer-songwriter, folk-electronic fusion', 'Indie', 'inactive', 'Contract under review'),
      ('Daniel Kim', 'DK Sounds', 'dksounds@email.com', '213-555-0115', 'K-pop influenced production, crossover potential', 'Pop', 'active', NULL),
      ('Jasmine Howard', 'Jazz H', 'jazzh@email.com', '504-555-0116', 'New Orleans jazz-influenced R&B', 'Jazz', 'active', 'Session musician connections'),
      ('Anthony Russo', 'Tone Russo', 'tonerusso@email.com', '718-555-0117', 'Boom-bap revivalist producer', 'Hip-Hop', 'active', NULL),
      ('Mia Chang', 'Mia C', 'miac@email.com', '408-555-0118', 'Bay Area electronic artist, experimental sound design', 'Electronic', 'archived', 'Moved to different label'),
      ('William Davis', 'Will D', 'willd@email.com', '901-555-0119', 'Memphis producer, crunk and trap influences', 'Hip-Hop', 'archived', 'Inactive since 2024'),
      ('Sofia Martinez', 'Sofi M', 'sofim@email.com', '305-555-0120', 'Miami-based Latin pop vocalist', 'Latin Pop', 'active', NULL),
      ('Andre Phillips', 'Dre Phil', 'drephil@email.com', '770-555-0121', 'Atlanta-based mix engineer and producer', 'Hip-Hop', 'active', 'Engineering services available'),
      ('Rachel Kim', 'Ray K', 'rayk@email.com', '323-555-0122', 'Film scoring and ambient production', 'Cinematic', 'active', 'Sync licensing focus'),
      ('Michael Torres', 'M.Torres', 'mtorres@email.com', '520-555-0123', 'Tucson guitarist, rock and blues production', 'Rock', 'inactive', 'Seasonal availability'),
      ('Destiny Jackson', 'Dess J', 'dessj@email.com', '202-555-0124', 'DC vocalist, neo-soul and gospel influences', 'Neo-Soul', 'active', NULL),
      ('Liam O''Brien', 'L.O.B.', 'lob@email.com', '512-555-0125', 'Austin country-rap crossover producer', 'Country-Rap', 'active', 'Unique niche positioning')
    RETURNING id, name, stage_name
  `);
  console.log(`Created ${artists.length} artists`);

  // ============================================
  // PROJECTS (20 records)
  // ============================================
  const { rows: projects } = await db.query(`
    INSERT INTO projects (title, description, artist_id, status, start_date, target_completion_date) VALUES
      ('Neon Nights EP', '5-track EP exploring dark electronic hip-hop fusion', $1, 'in_progress', '2025-11-01', '2026-03-15'),
      ('Luna Rising', 'Debut R&B album, 12 tracks with live instrumentation', $2, 'in_progress', '2025-10-15', '2026-04-01'),
      ('Westside Stories Vol. 2', 'Follow-up beat tape, West Coast vibes', $3, 'completed', '2025-06-01', '2025-09-30'),
      ('Ambient Trap Sessions', 'Experimental project blending ambient pads with trap drums', $4, 'in_progress', '2025-12-01', '2026-05-01'),
      ('Southern Comfort Beats', 'Southern rap instrumental project, 10 tracks', $5, 'draft', '2026-02-01', '2026-06-01'),
      ('Soul Circuit', 'Neo-soul production project with live drums and keys', $6, 'in_progress', '2025-09-01', '2026-02-28'),
      ('Fuego Mixtape', 'Latin trap mixtape for streaming platforms', $7, 'completed', '2025-04-01', '2025-08-15'),
      ('Lo-Fi Love Letters', 'Concept EP: lo-fi R&B exploring long-distance relationships', $8, 'draft', '2026-01-15', '2026-05-15'),
      ('Desert Frequencies', 'Tucson-inspired indie hip-hop album', $9, 'in_progress', '2025-11-15', '2026-04-15'),
      ('Trap Soul Diaries', 'Vocal project, 8 tracks with features', $10, 'draft', '2026-03-01', '2026-07-01'),
      ('Melodic Shift', 'Transition project from drill to melodic rap production', $11, 'in_progress', '2025-10-01', '2026-03-01'),
      ('Sunrise Pop', 'Pop production showcase, radio-ready singles', $12, 'completed', '2025-03-01', '2025-07-30'),
      ('Crossover Dreams', 'K-pop inspired crossover album', $15, 'draft', '2026-02-15', '2026-08-01'),
      ('NOLA Nights', 'Jazz-R&B fusion project', $16, 'in_progress', '2025-08-01', '2026-01-31'),
      ('Boom Bap Revival', 'Classic hip-hop production with modern mastering', $17, 'completed', '2025-01-01', '2025-06-30'),
      ('Sync Ready Vol. 1', 'Library of sync-licensable cinematic tracks', $22, 'in_progress', '2025-07-01', '2026-02-15'),
      ('Gospel Soul Sessions', 'Neo-soul album with gospel choir arrangements', $24, 'draft', '2026-04-01', '2026-09-01'),
      ('Country Trap Fusion', 'Genre-blending experimental album', $25, 'in_progress', '2025-12-15', '2026-06-15'),
      ('MVRK x Sable Collab', 'Collaborative EP between MVRK and Sable', $1, 'draft', '2026-01-01', '2026-05-01'),
      ('Summer Anthology 2025', 'Multi-artist compilation project', NULL, 'completed', '2025-04-15', '2025-08-30')
    RETURNING id, title`,
    [
      artists[0].id, artists[1].id, artists[2].id, artists[3].id, artists[4].id,
      artists[5].id, artists[6].id, artists[7].id, artists[8].id, artists[9].id,
      artists[10].id, artists[11].id, artists[14].id, artists[15].id, artists[16].id,
      artists[21].id, artists[23].id, artists[24].id, artists[0].id
    ]
  );
  console.log(`Created ${projects.length} projects`);

  // ============================================
  // PROJECT COLLABORATORS
  // ============================================
  const collabInserts = [
    [projects[0].id, artists[3].id, 'Co-producer'],       // Neon Nights - Sable
    [projects[1].id, artists[5].id, 'Keys & arrangements'], // Luna Rising - Mayavision
    [projects[1].id, artists[0].id, 'Beat production'],    // Luna Rising - MVRK
    [projects[3].id, artists[0].id, 'Drum programming'],   // Ambient Trap - MVRK
    [projects[8].id, artists[5].id, 'Live instrumentation'], // Desert Frequencies - Mayavision
    [projects[9].id, artists[1].id, 'Featured vocalist'],  // Trap Soul Diaries - Luna Rey
    [projects[13].id, artists[5].id, 'Keys'],              // NOLA Nights - Mayavision
    [projects[18].id, artists[3].id, 'Co-producer'],       // MVRK x Sable Collab - Sable
    [projects[19].id, artists[0].id, 'Producer'],          // Summer Anthology - MVRK
    [projects[19].id, artists[1].id, 'Vocalist'],          // Summer Anthology - Luna Rey
    [projects[19].id, artists[6].id, 'Producer'],          // Summer Anthology - Crux
    [projects[19].id, artists[9].id, 'Vocalist'],          // Summer Anthology - K.B.
  ];

  for (const [projectId, artistId, role] of collabInserts) {
    await db.query(
      'INSERT INTO project_collaborators (project_id, artist_id, role_description) VALUES ($1, $2, $3)',
      [projectId, artistId, role]
    );
  }
  console.log(`Created ${collabInserts.length} project collaborators`);

  console.log('\nSeed complete!');
  console.log('\nTest accounts:');
  console.log('  admin@pryntis.com / password123 (admin)');
  console.log('  manager@pryntis.com / password123 (manager)');
  console.log('  viewer@pryntis.com / password123 (viewer)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
