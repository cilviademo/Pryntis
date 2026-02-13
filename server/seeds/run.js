const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config();

async function seed() {
  console.log('Seeding database...\n');

  // ============================================
  // CLEAR ALL TABLES (reverse FK order)
  // ============================================
  const tablesToClear = [
    'activity_reactions',
    'activity_comments',
    'audit_log',
    'templates',
    'activity_feed',
    'tasks',
    'revenue_events',
    'recoupable_expenses',
    'usage_records',
    'ownership_records',
    'placements',
    'asset_tags',
    'assets',
    'artist_subscriptions',
    'subscription_tiers',
    'project_collaborators',
    'projects',
    'contacts',
    'artists',
    'users',
  ];
  for (const t of tablesToClear) {
    await db.query(`DELETE FROM ${t}`);
  }
  console.log('Cleared all tables.\n');

  // ============================================
  // 1. USERS (6) — one per role
  // ============================================
  const ownerHash    = await bcrypt.hash('owner123', 12);
  const adminHash    = await bcrypt.hash('admin123', 12);
  const managerHash  = await bcrypt.hash('manager123', 12);
  const engineerHash = await bcrypt.hash('engineer123', 12);
  const contribHash  = await bcrypt.hash('contributor123', 12);
  const viewerHash   = await bcrypt.hash('viewer123', 12);

  const { rows: users } = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
      ('owner@pryntis.io',      $1, 'Dana',   'Whitfield',     'owner'),
      ('admin@pryntis.io',      $2, 'Marc',   'Miller-Nelson', 'admin'),
      ('manager@pryntis.io',    $3, 'Taylor', 'Brooks',        'manager'),
      ('engineer@pryntis.io',   $4, 'Jordan', 'Reeves',        'audio_engineer'),
      ('contributor@pryntis.io',$5, 'Skyler', 'Imani',         'contributor'),
      ('viewer@pryntis.io',     $6, 'Riley',  'Chen',          'viewer')
    RETURNING id, email, role`,
    [ownerHash, adminHash, managerHash, engineerHash, contribHash, viewerHash]
  );
  console.log(`Users: ${users.length}`);

  // ============================================
  // 2. ARTISTS (35) — 7 case artists + 28 roster
  // ============================================
  const { rows: artists } = await db.query(`
    INSERT INTO artists (name, stage_name, email, phone, bio, genre, status, notes) VALUES
      -- Case artist 0: MVRK — not recouped
      ('Marcus Thompson',  'MVRK',        'mvrk@email.com',        '520-555-0101', 'Arizona-based hip-hop producer known for heavy 808 patterns and cinematic arrangements. Signed 2024.',                         'Hip-Hop',     'active',   'Advance recoupment in progress — $45k + $12k marketing'),
      -- Case artist 1: Luna Rey — ownership dispute
      ('Alicia Reyes',     'Luna Rey',    'lunarey@email.com',     '602-555-0102', 'Bilingual R&B vocalist and songwriter from Phoenix. Strong Latin crossover potential.',                                          'R&B',         'active',   'Ownership audit required — producer points dispute on Velvet Horizon'),
      -- Case artist 2: Sable — pending sync
      ('Samantha Chen',    'Sable',       'sable@email.com',       '415-555-0104', 'Electronic producer blending ambient textures with trap percussion. Film/TV sync interest growing.',                               'Electronic',  'active',   'Netflix sync pending — tight deadline Q1 2026'),
      -- Case artist 3: JO Beats — catalogue growth, low conversion
      ('James Okafor',     'JO Beats',    'jobeats@email.com',     '713-555-0105', 'Houston-based producer with deep catalogue. Southern rap and trap instrumentation. Streaming plateau.',                           'Hip-Hop',     'active',   'Large catalogue but placement conversion under 10%'),
      -- Case artist 4: Mayavision — collaborator/ownership chaos
      ('Maya Patel',       'Mayavision',  'maya@email.com',        '520-555-0106', 'Multi-instrumentalist and neo-soul producer. Complex collaboration web across multiple projects.',                                 'Neo-Soul',    'active',   'Compliance risk: unclear ownership on several collaborative tracks'),
      -- Case artist 5: Crux — subscription downgrade
      ('Chris Rodriguez',  'Crux',        'crux@email.com',        '480-555-0107', 'Latin trap and reggaeton producer. Recently downgraded subscription from Pro to Basic.',                                           'Latin',       'active',   'Downgraded from Pro to Basic — some Port actions now tier-gated'),
      -- Case artist 6: Bree Wave — high-performing placement
      ('Brianna Lee',      'Bree Wave',   'breewave@email.com',    '646-555-0108', 'NYC-based vocalist with lo-fi R&B aesthetic. Recent $18k sync placement triggering contract renewal.',                             'R&B',         'active',   'Contract renewal due — sync placement for $18k completed'),

      -- Roster artists 7-34 (28 additional)
      ('Tyler Morrison',     'Ty Morr',       'tymorr@email.com',       '520-555-0109', 'Tucson indie hip-hop production with desert-inspired soundscapes',                     'Hip-Hop',      'active',   NULL),
      ('Keisha Brown',       'K.B.',          'kb@email.com',           '404-555-0110', 'Atlanta vocalist specializing in trap-soul ballads and vocal layering',                 'Trap-Soul',    'active',   'Looking for beat placements'),
      ('Nathan Wolfe',       'Nate Wolfe',    'natewolfe@email.com',    '312-555-0111', 'Chicago drill producer transitioning to melodic rap production',                        'Hip-Hop',      'active',   NULL),
      ('Olivia Grant',       'Liv G',         'livg@email.com',         '206-555-0112', 'Seattle-based pop producer and topliner with strong social media following',            'Pop',          'active',   'Strong social media presence'),
      ('Rashid Ali',         'Ra$h',          'rash@email.com',         '248-555-0113', 'Detroit beatmaker with dark and atmospheric production style',                          'Hip-Hop',      'inactive', 'On hiatus — personal reasons'),
      ('Emma Fitzgerald',    'E.Fitz',        'efitz@email.com',        '617-555-0114', 'Boston singer-songwriter exploring folk-electronic fusion',                             'Indie',        'inactive', 'Contract under review'),
      ('Daniel Kim',         'DK Sounds',     'dksounds@email.com',     '213-555-0115', 'K-pop influenced production with crossover pop potential',                             'Pop',          'active',   NULL),
      ('Jasmine Howard',     'Jazz H',        'jazzh@email.com',        '504-555-0116', 'New Orleans jazz-influenced R&B with live instrumentation',                            'Jazz',         'active',   'Session musician connections'),
      ('Anthony Russo',      'Tone Russo',    'tonerusso@email.com',    '718-555-0117', 'Boom-bap revivalist producer from Brooklyn',                                           'Hip-Hop',      'active',   NULL),
      ('Mia Chang',          'Mia C',         'miac@email.com',         '408-555-0118', 'Bay Area electronic artist with experimental sound design approach',                   'Electronic',   'archived', 'Moved to different label'),
      ('William Davis',      'Will D',        'willd@email.com',        '901-555-0119', 'Memphis producer blending crunk energy with modern trap',                               'Hip-Hop',      'archived', 'Inactive since 2024'),
      ('Sofia Martinez',     'Sofi M',        'sofim@email.com',        '305-555-0120', 'Miami-based Latin pop vocalist with bilingual appeal',                                 'Latin',        'active',   NULL),
      ('Andre Phillips',     'Dre Phil',      'drephil@email.com',      '770-555-0121', 'Atlanta mix engineer and producer with major-label credits',                            'Hip-Hop',      'active',   'Engineering services available'),
      ('Rachel Kim',         'Ray K',         'rayk@email.com',         '323-555-0122', 'Film scoring and ambient production for sync licensing',                                'Cinematic',    'active',   'Sync licensing focus'),
      ('Michael Torres',     'M.Torres',      'mtorres@email.com',      '520-555-0123', 'Tucson guitarist specializing in rock and blues production',                            'Rock',         'inactive', 'Seasonal availability'),
      ('Destiny Jackson',    'Dess J',        'dessj@email.com',        '202-555-0124', 'DC vocalist blending neo-soul and gospel influences',                                  'Neo-Soul',     'active',   NULL),
      ('Liam O''Brien',      'L.O.B.',        'lob@email.com',          '512-555-0125', 'Austin country-rap crossover producer with unique niche positioning',                   'Country-Rap',  'active',   'Unique niche positioning'),
      ('Priya Sharma',       'Priya Nova',    'priyanova@email.com',    '469-555-0126', 'Dallas-based electronic artist fusing Bollywood samples with house beats',              'Electronic',   'active',   NULL),
      ('Terrence Boyd',      'T-Boyd',        'tboyd@email.com',        '901-555-0127', 'Memphis vocalist with gritty Southern rap delivery',                                   'Hip-Hop',      'active',   NULL),
      ('Catalina Vega',      'Cat Vega',      'catvega@email.com',      '786-555-0128', 'Miami reggaeton and Latin trap vocalist',                                               'Latin',        'active',   NULL),
      ('Jordan Park',        'J.Park',        'jpark@email.com',        '571-555-0129', 'Virginia indie-electronic producer with ambient textures',                              'Indie',        'active',   NULL),
      ('Aisha Williams',     'Aisha W',       'aishaw@email.com',       '678-555-0130', 'Atlanta R&B vocalist with jazz training and neo-soul sensibility',                      'R&B',          'active',   NULL),
      ('Ryan Gallagher',     'R.Gall',        'rgall@email.com',        '215-555-0131', 'Philadelphia rock producer blending indie and post-punk elements',                      'Rock',         'active',   NULL),
      ('Nkechi Adeyemi',     'Nkechi',        'nkechi@email.com',       '832-555-0132', 'Houston Afrobeats and R&B fusion vocalist',                                             'R&B',          'active',   NULL),
      ('Elijah Cross',       'Eli Cross',     'elicross@email.com',     '615-555-0133', 'Nashville cinematic composer with orchestral and electronic hybrid style',              'Cinematic',    'active',   NULL),
      ('Dakota Reyes',       'Dak Rey',       'dakrey@email.com',       '505-555-0134', 'Albuquerque country-rap artist blending Southwest themes with hip-hop beats',           'Country-Rap',  'active',   NULL),
      ('Isaiah Grant',       'Zay G',         'zayg@email.com',         '704-555-0135', 'Charlotte trap-soul producer with melodic vocal chops and ambient pads',                  'Trap-Soul',    'active',   NULL),
      ('Valentina Cruz',     'Val Cruz',      'valcruz@email.com',      '956-555-0136', 'Texas border-region artist blending norteño with modern electronic production',            'Latin',        'active',   NULL)
    RETURNING id, name, stage_name
  `);
  console.log(`Artists: ${artists.length}`);

  // ============================================
  // 3. PROJECTS (75) — ~21 for case artists, ~54 for roster
  // ============================================
  const projectValues = [
    // --- MVRK (index 0): 4 projects ---
    [`'Neon Nights EP'`,          `'5-track EP exploring dark electronic hip-hop fusion'`,                    0, `'in_progress'`, `'2025-11-01'`, `'2026-03-15'`],
    [`'MVRK x Sable Sessions'`,   `'Collaborative EP with Sable — ambient trap crossover'`,                  0, `'draft'`,       `'2026-01-01'`, `'2026-05-01'`],
    [`'808 Theology'`,            `'Full-length producer album with features from roster artists'`,           0, `'in_progress'`, `'2025-08-15'`, `'2026-02-28'`],
    [`'Recoup Singles Pack'`,     `'Strategic singles release targeting streaming revenue for recoupment'`,    0, `'completed'`,   `'2025-03-01'`, `'2025-07-15'`],

    // --- Luna Rey (index 1): 3 projects ---
    [`'Luna Rising'`,             `'Debut R&B album, 12 tracks with live instrumentation'`,                   1, `'in_progress'`, `'2025-10-15'`, `'2026-04-01'`],
    [`'Bilingual Sessions'`,      `'Spanish-language EP targeting Latin crossover market'`,                    1, `'draft'`,       `'2026-03-01'`, `'2026-07-15'`],
    [`'Velvet Singles'`,          `'Pre-album single releases to build momentum'`,                            1, `'completed'`,   `'2025-05-01'`, `'2025-09-30'`],

    // --- Sable (index 2): 3 projects ---
    [`'Ambient Trap Sessions'`,   `'Experimental project blending ambient pads with trap drums'`,             2, `'in_progress'`, `'2025-12-01'`, `'2026-05-01'`],
    [`'Sync Library Vol. 1'`,     `'Curated tracks for film/TV sync licensing opportunities'`,                2, `'in_progress'`, `'2025-09-01'`, `'2026-02-15'`],
    [`'Digital Mirage'`,          `'Concept album exploring virtual reality themes'`,                         2, `'draft'`,       `'2026-04-01'`, `'2026-09-01'`],

    // --- JO Beats (index 3): 3 projects ---
    [`'Southern Comfort Beats'`,  `'Southern rap instrumental project, 10 tracks'`,                           3, `'completed'`,   `'2025-01-15'`, `'2025-06-01'`],
    [`'Trap Kitchen Vol. 3'`,     `'Third installment of beat tape series'`,                                  3, `'completed'`,   `'2024-06-01'`, `'2024-10-15'`],
    [`'Houston We Have Beats'`,   `'Full catalogue showcase album with 20 instrumentals'`,                    3, `'in_progress'`, `'2025-10-01'`, `'2026-04-01'`],

    // --- Mayavision (index 4): 3 projects ---
    [`'Soul Circuit'`,            `'Neo-soul production project with live drums and keys'`,                   4, `'in_progress'`, `'2025-09-01'`, `'2026-02-28'`],
    [`'Collaborative Chaos'`,     `'Multi-artist project with 6+ collaborators'`,                             4, `'in_progress'`, `'2025-11-01'`, `'2026-06-01'`],
    [`'Patel Sessions: Live'`,    `'Live session recordings with session musicians'`,                         4, `'completed'`,   `'2025-02-01'`, `'2025-07-30'`],

    // --- Crux (index 5): 3 projects ---
    [`'Fuego Mixtape'`,           `'Latin trap mixtape for streaming platforms'`,                              5, `'completed'`,   `'2025-04-01'`, `'2025-08-15'`],
    [`'Reggaeton Revival'`,       `'Modern take on classic reggaeton production'`,                             5, `'in_progress'`, `'2025-11-15'`, `'2026-04-15'`],
    [`'Crux Beats Library'`,      `'Beat library for licensing — tier-gated content'`,                        5, `'draft'`,       `'2026-02-01'`, `'2026-06-01'`],

    // --- Bree Wave (index 6): 2 projects ---
    [`'Lo-Fi Love Letters'`,      `'Concept EP: lo-fi R&B exploring long-distance relationships'`,            6, `'completed'`,   `'2025-06-01'`, `'2025-10-30'`],
    [`'Wave II'`,                 `'Follow-up project building on sync placement momentum'`,                  6, `'in_progress'`, `'2025-12-01'`, `'2026-05-15'`],

    // --- Roster artists: 54 projects spread across indices 7-34 ---
    [`'Desert Frequencies'`,            `'Tucson-inspired indie hip-hop album'`,                              7,  `'in_progress'`, `'2025-11-15'`, `'2026-04-15'`],
    [`'Ty Morr Instrumentals'`,         `'Beat tape showcasing desert soundscapes'`,                          7,  `'completed'`,   `'2025-03-01'`, `'2025-08-01'`],

    [`'Trap Soul Diaries'`,             `'Vocal project, 8 tracks with features'`,                            8,  `'draft'`,       `'2026-03-01'`, `'2026-07-01'`],
    [`'K.B. Unplugged'`,                `'Acoustic reimagining of trap-soul classics'`,                       8,  `'in_progress'`, `'2025-10-01'`, `'2026-03-01'`],

    [`'Melodic Shift'`,                 `'Transition from drill to melodic rap production'`,                  9,  `'in_progress'`, `'2025-10-01'`, `'2026-03-01'`],
    [`'Chicago Nights'`,                `'Late-night drill beats compilation'`,                               9,  `'completed'`,   `'2025-02-01'`, `'2025-06-30'`],

    [`'Sunrise Pop'`,                   `'Pop production showcase, radio-ready singles'`,                    10,  `'completed'`,   `'2025-03-01'`, `'2025-07-30'`],
    [`'Liv G: The Remixes'`,            `'Remix project of previous singles'`,                               10,  `'in_progress'`, `'2025-12-01'`, `'2026-04-01'`],

    [`'Dark Corners'`,                  `'Atmospheric Detroit beats anthology'`,                              11,  `'completed'`,   `'2024-09-01'`, `'2025-02-15'`],
    [`'Ra$h Returns'`,                  `'Comeback project after hiatus'`,                                   11,  `'draft'`,       `'2026-05-01'`, `'2026-10-01'`],

    [`'Folk-Tronica'`,                  `'Folk-electronic fusion debut'`,                                    12,  `'in_progress'`, `'2025-08-15'`, `'2026-02-28'`],
    [`'E.Fitz Acoustic EP'`,            `'Stripped-back acoustic recordings'`,                                12,  `'completed'`,   `'2025-01-15'`, `'2025-05-30'`],

    [`'Crossover Dreams'`,              `'K-pop inspired crossover album'`,                                  13,  `'draft'`,       `'2026-02-15'`, `'2026-08-01'`],
    [`'DK Pop Singles'`,                `'Series of pop singles for streaming'`,                              13,  `'in_progress'`, `'2025-09-01'`, `'2026-01-31'`],

    [`'NOLA Nights'`,                   `'Jazz-R&B fusion project'`,                                         14,  `'in_progress'`, `'2025-08-01'`, `'2026-01-31'`],
    [`'Jazz H Live Sessions'`,          `'Live jazz recordings at Preservation Hall'`,                       14,  `'completed'`,   `'2025-04-01'`, `'2025-08-30'`],

    [`'Boom Bap Revival'`,              `'Classic hip-hop production with modern mastering'`,                 15,  `'completed'`,   `'2025-01-01'`, `'2025-06-30'`],
    [`'Tone Russo Beats Vol. 2'`,       `'Second beat tape in ongoing series'`,                               15,  `'in_progress'`, `'2025-10-15'`, `'2026-03-15'`],

    [`'Experimental Circuits'`,         `'Sound design experiments and modular synth recordings'`,            16,  `'archived'`,    `'2024-06-01'`, `'2024-12-15'`],

    [`'Memphis Heat'`,                  `'Crunk-influenced trap compilation'`,                                17,  `'archived'`,    `'2024-03-01'`, `'2024-08-30'`],

    [`'Sofi M Debut'`,                  `'Latin pop debut album with bilingual tracks'`,                     18,  `'in_progress'`, `'2025-09-15'`, `'2026-03-15'`],
    [`'Summer Caliente'`,               `'Summer-themed Latin pop singles package'`,                          18,  `'completed'`,   `'2025-04-01'`, `'2025-08-15'`],

    [`'Dre Phil Mix Reel'`,             `'Showcase of mixing and production capabilities'`,                  19,  `'completed'`,   `'2025-05-01'`, `'2025-09-30'`],
    [`'ATL Sessions'`,                  `'Atlanta studio collaboration recordings'`,                          19,  `'in_progress'`, `'2025-11-01'`, `'2026-03-30'`],

    [`'Sync Ready Vol. 1'`,             `'Library of sync-licensable cinematic tracks'`,                     20,  `'in_progress'`, `'2025-07-01'`, `'2026-02-15'`],
    [`'Film Score Demos'`,              `'Demo reel for film scoring opportunities'`,                         20,  `'completed'`,   `'2025-02-01'`, `'2025-06-30'`],

    [`'Blues Rock Sessions'`,           `'Rock and blues guitar-driven production'`,                          21,  `'in_progress'`, `'2025-10-01'`, `'2026-03-01'`],

    [`'Gospel Soul Sessions'`,          `'Neo-soul album with gospel choir arrangements'`,                   22,  `'draft'`,       `'2026-04-01'`, `'2026-09-01'`],
    [`'Dess J: Hymns Reimagined'`,      `'Modern reimagining of gospel hymns'`,                               22,  `'in_progress'`, `'2025-11-15'`, `'2026-05-01'`],

    [`'Country Trap Fusion'`,           `'Genre-blending experimental country-rap album'`,                   23,  `'in_progress'`, `'2025-12-15'`, `'2026-06-15'`],
    [`'L.O.B. Austin Live'`,            `'Live recordings from Austin venues'`,                               23,  `'completed'`,   `'2025-06-01'`, `'2025-10-30'`],

    [`'Bollywood Beats'`,               `'House music with Bollywood sample flips'`,                          24,  `'in_progress'`, `'2025-10-15'`, `'2026-03-01'`],

    [`'Southern Drawl'`,                `'Memphis hip-hop with Southern vocal style'`,                        25,  `'draft'`,       `'2026-02-15'`, `'2026-07-01'`],

    [`'Reggaeton Reinas'`,              `'Female-fronted reggaeton project'`,                                 26,  `'in_progress'`, `'2025-11-01'`, `'2026-04-01'`],

    [`'Ambient Park'`,                  `'Ambient electronic compositions inspired by nature'`,               27,  `'in_progress'`, `'2025-09-15'`, `'2026-03-15'`],
    [`'J.Park: Night Drives'`,          `'Nocturnal electronic music for late-night listening'`,               27,  `'completed'`,   `'2025-04-15'`, `'2025-09-01'`],

    [`'Aisha Unplugged'`,               `'Acoustic R&B sessions with jazz arrangements'`,                    28,  `'in_progress'`, `'2025-10-01'`, `'2026-02-28'`],

    [`'Post-Punk Philly'`,              `'Philadelphia post-punk and indie rock production'`,                 29,  `'draft'`,       `'2026-03-01'`, `'2026-08-01'`],

    [`'Afrobeats Fusion'`,              `'Afrobeats and R&B crossover project'`,                              30,  `'in_progress'`, `'2025-11-15'`, `'2026-04-15'`],

    [`'Orchestral Horizons'`,           `'Orchestral and electronic hybrid compositions for film'`,           31,  `'in_progress'`, `'2025-08-01'`, `'2026-03-01'`],

    [`'Southwest Sounds'`,              `'Country-rap blending Southwest desert themes'`,                     32,  `'draft'`,       `'2026-04-01'`, `'2026-09-01'`],

    [`'Trap Soul Visions'`,             `'Melodic trap-soul EP with vocal production'`,                      33,  `'in_progress'`, `'2025-10-01'`, `'2026-03-01'`],
    [`'Zay G Beats Vol. 1'`,            `'First beat tape release for streaming'`,                           33,  `'completed'`,   `'2025-04-01'`, `'2025-08-15'`],

    [`'Frontera Sounds'`,               `'Border-region fusion of norteño and electronic music'`,            34,  `'in_progress'`, `'2025-11-01'`, `'2026-04-01'`],
    [`'Val Cruz Singles'`,              `'Singles package for Latin streaming playlists'`,                    34,  `'completed'`,   `'2025-05-01'`, `'2025-09-15'`],

    [`'MVRK: Unplugged'`,              `'Acoustic reimagining of beat catalogue with live musicians'`,       0,   `'draft'`,       `'2026-04-01'`, `'2026-08-01'`],
    [`'Luna Rey: Acoustic Sessions'`,   `'Stripped-back vocal performances for streaming platforms'`,         1,   `'draft'`,       `'2026-05-01'`, `'2026-09-01'`],
    [`'JO Beats: Best Of'`,             `'Compilation of top-performing instrumentals for licensing'`,        3,   `'draft'`,       `'2026-03-01'`, `'2026-07-01'`],
    [`'Mayavision: Solo'`,              `'Solo project with no collaborators to simplify ownership'`,         4,   `'draft'`,       `'2026-06-01'`, `'2026-10-01'`],
    [`'Bree Wave: Deluxe'`,             `'Deluxe edition of Lo-Fi Love Letters with bonus tracks'`,           6,   `'draft'`,       `'2026-03-15'`, `'2026-07-15'`],
    [`'Nkechi: Homecoming'`,            `'Afrobeats project celebrating Nigerian musical heritage'`,          30,  `'draft'`,       `'2026-05-01'`, `'2026-09-15'`],
    [`'Eli Cross: Cinematic Suites'`,   `'Orchestral composition suite for film scoring portfolio'`,          31,  `'in_progress'`, `'2025-12-01'`, `'2026-05-01'`],
    [`'Dak Rey: Desert Highway'`,       `'Country-rap debut album with Southwest desert imagery'`,            32,  `'in_progress'`, `'2025-11-15'`, `'2026-04-15'`],

    [`'Summer Anthology 2025'`,         `'Multi-artist compilation project'`,                                null, `'completed'`,   `'2025-04-15'`, `'2025-08-30'`]
  ];

  // Build the VALUES clause
  let projectSQL = `INSERT INTO projects (title, description, artist_id, status, start_date, target_completion_date) VALUES\n`;
  const projectParams = [];
  const projectLines = [];
  let paramIdx = 1;

  for (const [title, desc, artistIdx, status, start, end] of projectValues) {
    const artistRef = artistIdx !== null ? `$${paramIdx++}` : 'NULL';
    if (artistIdx !== null) projectParams.push(artists[artistIdx].id);
    projectLines.push(`    (${title}, ${desc}, ${artistRef}, ${status}, ${start}, ${end})`);
  }
  projectSQL += projectLines.join(',\n') + '\n    RETURNING id, title';

  const { rows: projects } = await db.query(projectSQL, projectParams);
  console.log(`Projects: ${projects.length}`);

  // ============================================
  // 4. PROJECT COLLABORATORS (25)
  // ============================================
  const collabData = [
    // MVRK projects
    [0, 2, 'Co-producer'],                    // Neon Nights — Sable
    [1, 2, 'Co-producer & sound design'],     // MVRK x Sable — Sable
    [2, 8, 'Featured vocalist'],              // 808 Theology — K.B.
    [2, 4, 'Keys & live instrumentation'],    // 808 Theology — Mayavision
    // Luna Rey projects
    [4, 0, 'Beat production'],                // Luna Rising — MVRK
    [4, 4, 'Keys & arrangements'],            // Luna Rising — Mayavision
    [6, 0, 'Producer'],                       // Velvet Singles — MVRK
    // Sable projects
    [7, 0, 'Drum programming'],               // Ambient Trap — MVRK
    [8, 20, 'Cinematic arrangements'],        // Sync Library — Ray K
    // Mayavision projects — heavy collaborator load
    [13, 0, 'Beat production'],               // Soul Circuit — MVRK
    [13, 1, 'Vocal features'],                // Soul Circuit — Luna Rey
    [13, 14, 'Horn arrangements'],            // Soul Circuit — Jazz H
    [14, 1, 'Vocalist'],                      // Collaborative Chaos — Luna Rey
    [14, 8, 'Vocalist'],                      // Collaborative Chaos — K.B.
    [14, 22, 'Gospel choir direction'],        // Collaborative Chaos — Dess J
    [14, 14, 'Jazz instrumentation'],          // Collaborative Chaos — Jazz H
    [15, 14, 'Session keys'],                 // Patel Sessions — Jazz H
    // Crux projects
    [16, 18, 'Featured vocalist'],            // Fuego Mixtape — Sofi M
    [17, 26, 'Featured vocalist'],            // Reggaeton Revival — Cat Vega
    // Bree Wave projects
    [19, 4, 'Keys & production'],             // Lo-Fi Love Letters — Mayavision
    [20, 0, 'Beat production'],               // Wave II — MVRK
    // Compilation
    [74, 0, 'Producer'],                      // Summer Anthology — MVRK
    [74, 1, 'Vocalist'],                      // Summer Anthology — Luna Rey
    [74, 5, 'Producer'],                      // Summer Anthology — Crux
    [74, 8, 'Vocalist'],                      // Summer Anthology — K.B.
  ];

  for (const [projIdx, artIdx, role] of collabData) {
    await db.query(
      'INSERT INTO project_collaborators (project_id, artist_id, role_description) VALUES ($1, $2, $3) RETURNING id',
      [projects[projIdx].id, artists[artIdx].id, role]
    );
  }
  console.log(`Project collaborators: ${collabData.length}`);

  // ============================================
  // 5. SUBSCRIPTION TIERS (4)
  // ============================================
  const { rows: tiers } = await db.query(`
    INSERT INTO subscription_tiers (name, description, access_level, features, price_monthly, is_active) VALUES
      ('Free',       'Basic access to dashboard and limited Port features',
        1, '["Dashboard access","Up to 5 assets","Basic analytics"]'::jsonb, 0.00, true),
      ('Basic',      'Standard access with expanded Port and Pass features',
        2, '["Dashboard access","Up to 25 assets","Standard analytics","Placement tracking","Basic ownership reports"]'::jsonb, 29.99, true),
      ('Pro',        'Full access to all Pryntis features including advanced analytics',
        3, '["Dashboard access","Unlimited assets","Advanced analytics","Sync opportunities","Full ownership suite","Revenue tracking","Priority support"]'::jsonb, 79.99, true),
      ('Enterprise', 'White-glove service with dedicated account management and custom integrations',
        5, '["All Pro features","Custom integrations","Dedicated account manager","API access","Bulk operations","Custom reporting","SLA guarantee"]'::jsonb, 249.99, true)
    RETURNING id, name, access_level
  `);
  console.log(`Subscription tiers: ${tiers.length}`);

  // tier lookup: Free=0, Basic=1, Pro=2, Enterprise=3
  const tierFree = tiers[0].id;
  const tierBasic = tiers[1].id;
  const tierPro = tiers[2].id;
  const tierEnterprise = tiers[3].id;

  // ============================================
  // 6. ARTIST SUBSCRIPTIONS (35 — one per artist)
  // ============================================
  const subData = [
    // Case artists
    [0, tierPro,        'active',    '2025-06-01', '2026-06-01'],    // MVRK — Pro active
    [1, tierPro,        'active',    '2025-08-01', '2026-08-01'],    // Luna Rey — Pro active
    [2, tierPro,        'active',    '2025-07-15', '2026-07-15'],    // Sable — Pro active
    [3, tierBasic,      'active',    '2025-04-01', '2026-04-01'],    // JO Beats — Basic active
    [4, tierPro,        'active',    '2025-09-01', '2026-09-01'],    // Mayavision — Pro active
    [5, tierBasic,      'active',    '2025-11-01', '2026-11-01'],    // Crux — downgraded to Basic
    [6, tierPro,        'active',    '2025-10-01', '2026-10-01'],    // Bree Wave — Pro active
    // Roster artists — mix of tiers and statuses
    [7,  tierBasic,      'active',    '2025-05-01', '2026-05-01'],
    [8,  tierPro,        'active',    '2025-06-15', '2026-06-15'],
    [9,  tierBasic,      'active',    '2025-07-01', '2026-07-01'],
    [10, tierPro,        'active',    '2025-03-01', '2026-03-01'],
    [11, tierFree,       'active',    '2025-01-01', null],            // Ra$h — Free (on hiatus)
    [12, tierBasic,      'expired',   '2024-09-01', '2025-09-01'],   // E.Fitz — expired
    [13, tierBasic,      'active',    '2025-08-01', '2026-08-01'],
    [14, tierPro,        'active',    '2025-04-15', '2026-04-15'],
    [15, tierBasic,      'active',    '2025-05-01', '2026-05-01'],
    [16, tierBasic,      'expired',   '2024-06-01', '2025-06-01'],   // Mia C — expired/archived
    [17, tierFree,       'suspended', '2024-03-01', '2025-03-01'],   // Will D — suspended/archived
    [18, tierPro,        'active',    '2025-07-01', '2026-07-01'],
    [19, tierBasic,      'active',    '2025-06-01', '2026-06-01'],
    [20, tierPro,        'active',    '2025-05-15', '2026-05-15'],
    [21, tierFree,       'active',    '2025-10-01', null],
    [22, tierBasic,      'active',    '2025-09-01', '2026-09-01'],
    [23, tierPro,        'active',    '2025-08-15', '2026-08-15'],
    [24, tierBasic,      'active',    '2025-10-01', '2026-10-01'],
    [25, tierFree,       'active',    '2025-11-01', null],
    [26, tierBasic,      'active',    '2025-07-15', '2026-07-15'],
    [27, tierBasic,      'active',    '2025-06-01', '2026-06-01'],
    [28, tierPro,        'active',    '2025-09-15', '2026-09-15'],
    [29, tierBasic,      'expired',   '2024-12-01', '2025-12-01'],
    [30, tierBasic,      'active',    '2025-10-01', '2026-10-01'],
    [31, tierPro,        'active',    '2025-08-01', '2026-08-01'],
    [32, tierFree,       'active',    '2025-11-15', null],
    [33, tierBasic,      'suspended', '2025-04-01', '2026-04-01'],
    [34, tierBasic,      'active',    '2025-09-01', '2026-09-01'],
  ];

  for (const [artIdx, tierId, status, startDate, endDate] of subData) {
    await db.query(
      `INSERT INTO artist_subscriptions (artist_id, tier_id, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [artists[artIdx].id, tierId, status, startDate, endDate]
    );
  }
  console.log(`Artist subscriptions: ${subData.length}`);

  // ============================================
  // 7. ASSETS (40) — realistic track titles
  // ============================================
  const assetData = [
    // MVRK assets (0-5)
    ['Midnight Meridian',       'beat',   'midnight_meridian_v3.wav',   'Hip-Hop',     140, 'Cm',  210, 0, 0,  'Lead single from 808 Theology'],
    ['Concrete Garden',         'beat',   'concrete_garden_final.wav',  'Hip-Hop',     138, 'Dm',  195, 0, 0,  'Dark trap beat with orchestral stabs'],
    ['Phantom Frequency',       'master', 'phantom_frequency_m1.wav',  'Hip-Hop',     145, 'Gm',  224, 0, 2,  'Mastered for Neon Nights EP'],
    ['Desert Mirage',           'beat',   'desert_mirage_v2.wav',      'Hip-Hop',     132, 'Am',  187, 0, 3,  'Placed in recoup singles pack'],
    ['Neon Cathedral',          'stem',   'neon_cathedral_stems.zip',  'Electronic',  128, 'Fm',  240, 0, 0,  'Full stem pack for collab with Sable'],
    ['Thunder Road',            'mix',    'thunder_road_mix3.wav',     'Hip-Hop',     142, 'Bbm', 198, 0, 0,  'Pre-master mix for review'],

    // Luna Rey assets (6-10)
    ['Velvet Horizon',          'master', 'velvet_horizon_m1.wav',     'R&B',         92,  'Eb',  234, 1, 4,  'Lead single — ownership dispute flagged'],
    ['Seda y Fuego',            'master', 'seda_y_fuego_m1.wav',      'R&B',         98,  'Ab',  212, 1, 4,  'Spanish-language single'],
    ['Crescent Moon',           'mix',    'crescent_moon_mix2.wav',    'R&B',         88,  'Db',  248, 1, 4,  'Album track — Luna Rising'],
    ['Golden Hour',             'beat',   'golden_hour_prod.wav',      'R&B',         95,  'F',   202, 1, 4,  'Production demo for Luna Rising'],
    ['Lavender Skies',          'master', 'lavender_skies_m1.wav',    'R&B',         90,  'Gb',  220, 1, 6,  'Completed single from Velvet Singles'],

    // Sable assets (11-15)
    ['Glass Cathedral',         'master', 'glass_cathedral_m1.wav',   'Electronic',  120, 'Cm',  300, 2, 7,  'Ambient piece — Netflix sync candidate'],
    ['Neon Pulse',              'beat',   'neon_pulse_v4.wav',        'Electronic',  135, 'Em',  195, 2, 7,  'Upbeat electronic for sync library'],
    ['Whisper Network',         'master', 'whisper_network_m1.wav',   'Electronic',  110, 'Am',  267, 2, 8,  'Cinematic ambient — strong sync potential'],
    ['Binary Sunset',           'stem',   'binary_sunset_stems.zip',  'Electronic',  125, 'Dm',  245, 2, 7,  'Stems for remix and sync licensing'],
    ['Fractal Dreams',          'mix',    'fractal_dreams_mix1.wav',  'Electronic',  118, 'Fm',  280, 2, 9,  'Work in progress — Digital Mirage concept'],

    // JO Beats assets (16-22)
    ['Bayou Bounce',            'beat',   'bayou_bounce_v2.wav',      'Hip-Hop',     148, 'Cm',  178, 3, 10, 'Southern bounce beat'],
    ['Screwston Nights',        'beat',   'screwston_nights_v1.wav',  'Hip-Hop',     72,  'Gm',  210, 3, 10, 'Chopped and screwed style'],
    ['H-Town Anthem',           'master', 'htown_anthem_m1.wav',     'Hip-Hop',     140, 'Am',  195, 3, 10, 'Lead track from Southern Comfort Beats'],
    ['Candy Paint',             'beat',   'candy_paint_v3.wav',       'Hip-Hop',     136, 'Dm',  182, 3, 11, 'Classic Houston trunk music'],
    ['Purple Reign',            'beat',   'purple_reign_v2.wav',      'Hip-Hop',     68,  'Bbm', 225, 3, 11, 'Chopped & screwed with DJ drops'],
    ['Swang Lane',              'mix',    'swang_lane_mix2.wav',      'Hip-Hop',     144, 'Fm',  190, 3, 12, 'Up-tempo Houston beat for catalogue'],
    ['Slab Music',              'beat',   'slab_music_v1.wav',        'Hip-Hop',     138, 'Cm',  176, 3, 12, 'Trunk rattler — low-end heavy'],

    // Mayavision assets (23-27)
    ['Karma Circuit',           'master', 'karma_circuit_m1.wav',     'Neo-Soul',    96,  'Eb',  256, 4, 13, 'Live drums and Rhodes — ownership unclear'],
    ['Third Eye Open',          'master', 'third_eye_open_m1.wav',    'Neo-Soul',    90,  'Ab',  278, 4, 14, 'Collaborative track — 6 contributors'],
    ['Lotus Effect',            'mix',    'lotus_effect_mix3.wav',    'Neo-Soul',    94,  'Db',  234, 4, 14, 'Missing ownership records'],
    ['Chakra Alignment',        'stem',   'chakra_alignment_stems.zip','Neo-Soul',   88,  'F',   290, 4, 13, 'Stem pack for live session'],
    ['Indigo Waves',            'beat',   'indigo_waves_prod.wav',    'Neo-Soul',    92,  'Gb',  210, 4, 15, 'From Patel Sessions: Live'],

    // Crux assets (28-31)
    ['Fuego Eterno',            'master', 'fuego_eterno_m1.wav',      'Latin',       100, 'Am',  198, 5, 16, 'Lead single from Fuego Mixtape'],
    ['Callejero',               'master', 'callejero_m1.wav',         'Latin',       96,  'Dm',  205, 5, 16, 'Street-oriented Latin trap'],
    ['Ritmo Sagrado',           'beat',   'ritmo_sagrado_v2.wav',     'Latin',       105, 'Gm',  186, 5, 17, 'Reggaeton production — revival project'],
    ['Medianoche',              'mix',    'medianoche_mix2.wav',       'Latin',       98,  'Cm',  220, 5, 17, 'Midnight-themed Latin trap'],

    // Bree Wave assets (32-35)
    ['Tidal Serenade',          'master', 'tidal_serenade_m1.wav',    'R&B',         85,  'Eb',  245, 6, 19, 'Sync placement track — $18k deal'],
    ['Paper Cranes',            'master', 'paper_cranes_m1.wav',      'R&B',         88,  'Ab',  228, 6, 19, 'Lo-Fi Love Letters lead single'],
    ['Driftwood',               'mix',    'driftwood_mix2.wav',        'R&B',         82,  'Db',  262, 6, 20, 'In progress — Wave II'],
    ['Morning Fog',             'beat',   'morning_fog_prod.wav',      'R&B',         80,  'F',   195, 6, 20, 'Production demo for Wave II'],

    // Roster assets (36-39)
    ['Skyline Drive',           'master', 'skyline_drive_m1.wav',     'Pop',         122, 'C',   208, 10, 27, 'Sunrise Pop lead single'],
    ['Smoke Signals',           'beat',   'smoke_signals_v2.wav',     'Hip-Hop',     136, 'Em',  185, 15, 37, 'Boom-bap beat tape entry'],
    ['Cinema Noir',             'master', 'cinema_noir_m1.wav',       'Cinematic',   90,  'Gm',  320, 20, 44, 'Film sync demo — cinematic orchestral'],
    ['Dharma Rising',           'master', 'dharma_rising_m1.wav',     'Electronic',  124, 'Am',  275, 24, 51, 'Bollywood-house fusion track'],
  ];

  const assetRows = [];
  for (const [title, fileType, fileName, genre, bpm, key, dur, artIdx, projIdx, notes] of assetData) {
    const { rows } = await db.query(
      `INSERT INTO assets (title, file_type, file_name, genre, bpm, key_signature, duration_seconds, artist_id, project_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, title`,
      [title, fileType, fileName, genre, bpm, key, dur, artists[artIdx].id, projects[projIdx].id, notes]
    );
    assetRows.push(rows[0]);
  }
  console.log(`Assets: ${assetRows.length}`);

  // ============================================
  // 8. PLACEMENTS (20) — realistic sync/licensing
  // ============================================
  const placementData = [
    // Sable — Netflix sync (case 2)
    [11, 'sync',    'pending',   'Netflix - Stranger Things S6',                      '2026-02-15', 25000.00, 'Tight deadline — needs clearance by Feb 28'],
    [13, 'sync',    'pending',   'HBO - The Last of Us S3',                           '2026-03-01', 15000.00, 'Ambient cue for episode 4 forest scene'],
    [12, 'license', 'confirmed', 'Music supervisor: Sarah Chen, Neophonic',           '2025-11-15', 8000.00,  'Library placement for sync catalogue'],

    // Bree Wave — completed sync (case 6)
    [32, 'sync',    'completed', 'Amazon Prime - Citadel S2',                         '2025-10-15', 18000.00, '$18k sync deal completed — triggers contract renewal'],
    [33, 'sync',    'confirmed', 'Hulu - Only Murders in the Building S5',            '2026-01-20', 12000.00, 'End credits placement confirmed'],

    // MVRK placements
    [0,  'sync',    'confirmed', 'Nike - Air Max Campaign Q2 2026',                   '2026-01-10', 35000.00, 'Major brand sync — high value'],
    [3,  'license', 'completed', 'Music supervisor: James Park, Format Entertainment', '2025-06-20', 5000.00,  'Library license — recoup singles'],
    [1,  'sync',    'pending',   'Adidas - Originals Campaign',                       '2026-03-15', 20000.00, 'Pending brand approval'],

    // Luna Rey placements
    [10, 'sync',    'completed', 'Apple - iPhone 17 Launch Ad',                       '2025-09-01', 45000.00, 'Major sync placement'],
    [7,  'feature', 'completed', 'Spotify - New Music Friday Feature',                '2025-11-01', 0.00,     'Editorial playlist feature — Seda y Fuego'],

    // JO Beats — low placement rate
    [18, 'license', 'declined',  'Music supervisor: Tom Wright, Lionsgate',            '2025-08-15', 10000.00, 'Declined — not the right fit for John Wick franchise'],
    [16, 'license', 'pending',   'YouTube Premium - Originals',                        '2026-01-25', 3000.00,  'Low-value library opportunity'],

    // Crux placements
    [28, 'sync',    'completed', 'Telemundo - La Reina del Sur S4',                   '2025-07-20', 8000.00,  'Spanish-language TV sync'],
    [29, 'release', 'completed', 'Spotify - Baila Reggaeton Playlist',                '2025-09-15', 0.00,     'Major playlist inclusion'],

    // Mayavision
    [23, 'sync',    'pending',   'Netflix - Queen Charlotte S2',                      '2026-02-20', 12000.00, 'Period drama cue — neo-soul arrangement'],
    [24, 'license', 'confirmed', 'Music supervisor: Lisa Tran, Neon Gold Music',      '2025-12-10', 6000.00,  'Multi-artist collaborative track'],

    // Roster placements
    [36, 'sync',    'confirmed', 'NBC - This Is Us Revival Special',                  '2026-01-15', 15000.00, 'Pop vocal sync for emotional scene'],
    [38, 'sync',    'completed', 'Lionsgate - John Wick: Chapter 5',                  '2025-08-01', 22000.00, 'Cinematic underscore placement'],
    [37, 'license', 'pending',   'Music supervisor: Rachel Wong, Heard Well',          '2026-02-01', 4000.00,  'Hip-hop library placement'],
    [39, 'sync',    'confirmed', 'Disney+ - National Geographic Series',               '2026-01-20', 9000.00,  'World music documentary cue'],

    // Additional roster placements for Port coverage
    [2,  'sync',    'confirmed', 'FX - Shogun S3',                                    '2026-02-01', 14000.00, 'Ambient electronic cue for battle scene'],
    [4,  'license', 'pending',   'Music supervisor: Amanda Foster, Spotify Editorial', '2026-02-10', 0.00,     'Neon Cathedral submitted for editorial playlist'],
    [5,  'sync',    'pending',   'Apple TV+ - Severance S3',                           '2026-03-01', 18000.00, 'Dark electronic underscore submission'],
    [6,  'sync',    'completed', 'Universal Pictures - Film Placement',                '2025-08-20', 32000.00, 'R&B vocal placement in romantic drama'],
    [9,  'license', 'confirmed', 'YouTube Music - Discover Weekly',                    '2025-12-15', 2500.00,  'Algorithmic playlist feature'],
    [14, 'sync',    'pending',   'Paramount+ - Yellowstone Spinoff',                   '2026-01-28', 11000.00, 'Electronic ambient cue for landscape montage'],
    [17, 'license', 'completed', 'Spotify - Beats Unwind Playlist',                    '2025-10-01', 0.00,     'Chopped and screwed beat featured in curation'],
    [19, 'sync',    'declined',  'Warner Bros - Film Submission',                       '2025-09-10', 15000.00, 'Candy Paint submitted but style mismatch'],
    [25, 'sync',    'pending',   'A24 - Independent Film',                             '2026-02-05', 7500.00,  'Lotus Effect submitted for indie drama'],
    [27, 'license', 'confirmed', 'Music supervisor: Kevin O\'Malley, Apple Music',     '2025-11-20', 3500.00,  'Indigo Waves for curated neo-soul playlist'],
    [30, 'sync',    'confirmed', 'Peacock - Drama Series',                             '2026-01-25', 10000.00, 'Ritmo Sagrado for Latin drama series'],
    [34, 'sync',    'pending',   'HBO Max - Documentary',                              '2026-02-18', 8500.00,  'Driftwood submitted for oceanography documentary'],
    [35, 'license', 'confirmed', 'Tidal - Rising Artist Feature',                      '2025-12-01', 0.00,     'Morning Fog featured in lo-fi R&B rising artists'],
  ];

  const placementRows = [];
  for (const [assetIdx, pType, status, placedWith, pDate, value, notes] of placementData) {
    const { rows } = await db.query(
      `INSERT INTO placements (asset_id, placement_type, status, placed_with, placement_date, expected_value, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [assetRows[assetIdx].id, pType, status, placedWith, pDate, value, notes]
    );
    placementRows.push(rows[0]);
  }
  console.log(`Placements: ${placementRows.length}`);

  // ============================================
  // 9. OWNERSHIP RECORDS (120)
  // ============================================
  const ownershipData = [
    // --- MVRK assets (0-5): 6 assets x ~3 records each = ~18 ---
    // Asset 0: Midnight Meridian
    [0, 'Marcus Thompson',     'writer',    50.00, 'BMI',   '00289345671'],
    [0, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [0, 'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    // Asset 1: Concrete Garden
    [1, 'Marcus Thompson',     'writer',    50.00, 'BMI',   '00289345671'],
    [1, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [1, 'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    // Asset 2: Phantom Frequency
    [2, 'Marcus Thompson',     'writer',    40.00, 'BMI',   '00289345671'],
    [2, 'Marcus Thompson',     'producer',  80.00, 'BMI',   '00289345671'],
    [2, 'Samantha Chen',       'producer',  20.00, 'SESAC', '00567234891'],
    [2, 'Pryntis Publishing',  'publisher', 60.00, 'ASCAP', '00412876543'],
    // Asset 3: Desert Mirage
    [3, 'Marcus Thompson',     'writer',    50.00, 'BMI',   '00289345671'],
    [3, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [3, 'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    // Asset 4: Neon Cathedral
    [4, 'Marcus Thompson',     'writer',    25.00, 'BMI',   '00289345671'],
    [4, 'Samantha Chen',       'writer',    25.00, 'SESAC', '00567234891'],
    [4, 'Marcus Thompson',     'producer',  50.00, 'BMI',   '00289345671'],
    [4, 'Samantha Chen',       'producer',  50.00, 'SESAC', '00567234891'],
    [4, 'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    // Asset 5: Thunder Road
    [5, 'Marcus Thompson',     'writer',    50.00, 'BMI',   '00289345671'],
    [5, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [5, 'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],

    // --- Luna Rey assets (6-10): CASE — asset 6 has 115% writer split ---
    // Asset 6: Velvet Horizon — INTENTIONAL 115% writer dispute
    [6, 'Alicia Reyes',        'writer',    60.00, 'ASCAP', '00345678912'],
    [6, 'Marcus Thompson',     'writer',    55.00, 'BMI',   '00289345671'],  // 60+55=115% writer!
    [6, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [6, 'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [6, 'Reyes Music LLC',     'publisher', 50.00, 'ASCAP', '00345678999'],
    [6, 'Pryntis Records',     'master',    100.00,'ASCAP', '00412876543'],
    // Asset 7: Seda y Fuego
    [7, 'Alicia Reyes',        'writer',    80.00, 'ASCAP', '00345678912'],
    [7, 'Alicia Reyes',        'producer',  50.00, 'ASCAP', '00345678912'],
    [7, 'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    // Asset 8: Crescent Moon
    [8, 'Alicia Reyes',        'writer',    70.00, 'ASCAP', '00345678912'],
    [8, 'Maya Patel',          'writer',    30.00, 'BMI',   '00478912345'],
    [8, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [8, 'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    // Asset 9: Golden Hour
    [9, 'Alicia Reyes',        'writer',    50.00, 'ASCAP', '00345678912'],
    [9, 'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],
    [9, 'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    // Asset 10: Lavender Skies
    [10,'Alicia Reyes',        'writer',    100.00,'ASCAP', '00345678912'],
    [10,'Alicia Reyes',        'producer',  50.00, 'ASCAP', '00345678912'],
    [10,'Reyes Music LLC',     'publisher', 50.00, 'ASCAP', '00345678999'],
    [10,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],

    // --- Sable assets (11-15) ---
    [11,'Samantha Chen',       'writer',    100.00,'SESAC', '00567234891'],
    [11,'Samantha Chen',       'producer',  100.00,'SESAC', '00567234891'],
    [11,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [12,'Samantha Chen',       'writer',    100.00,'SESAC', '00567234891'],
    [12,'Samantha Chen',       'producer',  100.00,'SESAC', '00567234891'],
    [12,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [13,'Samantha Chen',       'writer',    80.00, 'SESAC', '00567234891'],
    [13,'Rachel Kim',          'writer',    20.00, 'BMI',   '00612345678'],
    [13,'Samantha Chen',       'producer',  100.00,'SESAC', '00567234891'],
    [13,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    [14,'Samantha Chen',       'writer',    100.00,'SESAC', '00567234891'],
    [14,'Samantha Chen',       'producer',  100.00,'SESAC', '00567234891'],
    [15,'Samantha Chen',       'writer',    100.00,'SESAC', '00567234891'],
    [15,'Samantha Chen',       'producer',  100.00,'SESAC', '00567234891'],

    // --- JO Beats assets (16-22) ---
    [16,'James Okafor',        'writer',    100.00,'BMI',   '00398765432'],
    [16,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],
    [17,'James Okafor',        'writer',    100.00,'BMI',   '00398765432'],
    [17,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],
    [18,'James Okafor',        'writer',    50.00, 'BMI',   '00398765432'],
    [18,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],
    [18,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    [19,'James Okafor',        'writer',    100.00,'BMI',   '00398765432'],
    [19,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],
    [20,'James Okafor',        'writer',    100.00,'BMI',   '00398765432'],
    [20,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],
    [21,'James Okafor',        'writer',    100.00,'BMI',   '00398765432'],
    [21,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],
    [22,'James Okafor',        'writer',    100.00,'BMI',   '00398765432'],
    [22,'James Okafor',        'producer',  100.00,'BMI',   '00398765432'],

    // --- Mayavision assets (23-27): some MISSING ownership = compliance risk ---
    [23,'Maya Patel',          'writer',    40.00, 'BMI',   '00478912345'],
    [23,'Marcus Thompson',     'writer',    20.00, 'BMI',   '00289345671'],
    [23,'Jasmine Howard',      'writer',    15.00, 'ASCAP', '00523467891'],
    [23,'Maya Patel',          'producer',  60.00, 'BMI',   '00478912345'],
    [23,'Marcus Thompson',     'producer',  40.00, 'BMI',   '00289345671'],
    [23,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    [24,'Maya Patel',          'writer',    25.00, 'BMI',   '00478912345'],
    [24,'Alicia Reyes',        'writer',    25.00, 'ASCAP', '00345678912'],
    [24,'Keisha Brown',        'writer',    15.00, 'BMI',   '00534567891'],
    // Asset 24: ownership intentionally incomplete — missing producer & publisher
    [25,'Maya Patel',          'writer',    35.00, 'BMI',   '00478912345'],
    // Asset 25: Lotus Effect — VERY incomplete, compliance risk
    [26,'Maya Patel',          'writer',    50.00, 'BMI',   '00478912345'],
    [26,'Maya Patel',          'producer',  100.00,'BMI',   '00478912345'],
    [27,'Maya Patel',          'writer',    100.00,'BMI',   '00478912345'],
    [27,'Maya Patel',          'producer',  100.00,'BMI',   '00478912345'],
    [27,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],

    // --- Crux assets (28-31) ---
    [28,'Chris Rodriguez',     'writer',    80.00, 'BMI',   '00456789123'],
    [28,'Sofia Martinez',      'writer',    20.00, 'ASCAP', '00567891234'],
    [28,'Chris Rodriguez',     'producer',  100.00,'BMI',   '00456789123'],
    [28,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    [29,'Chris Rodriguez',     'writer',    100.00,'BMI',   '00456789123'],
    [29,'Chris Rodriguez',     'producer',  100.00,'BMI',   '00456789123'],
    [29,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [30,'Chris Rodriguez',     'writer',    100.00,'BMI',   '00456789123'],
    [30,'Chris Rodriguez',     'producer',  100.00,'BMI',   '00456789123'],
    [31,'Chris Rodriguez',     'writer',    100.00,'BMI',   '00456789123'],
    [31,'Chris Rodriguez',     'producer',  100.00,'BMI',   '00456789123'],

    // --- Bree Wave assets (32-35) ---
    [32,'Brianna Lee',         'writer',    80.00, 'ASCAP', '00678912345'],
    [32,'Maya Patel',          'writer',    20.00, 'BMI',   '00478912345'],
    [32,'Maya Patel',          'producer',  50.00, 'BMI',   '00478912345'],
    [32,'Brianna Lee',         'producer',  50.00, 'ASCAP', '00678912345'],
    [32,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    [33,'Brianna Lee',         'writer',    100.00,'ASCAP', '00678912345'],
    [33,'Brianna Lee',         'producer',  100.00,'ASCAP', '00678912345'],
    [33,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [34,'Brianna Lee',         'writer',    100.00,'ASCAP', '00678912345'],
    [34,'Brianna Lee',         'producer',  100.00,'ASCAP', '00678912345'],
    [35,'Brianna Lee',         'writer',    100.00,'ASCAP', '00678912345'],
    [35,'Marcus Thompson',     'producer',  100.00,'BMI',   '00289345671'],

    // --- Roster assets (36-39) ---
    [36,'Olivia Grant',        'writer',    100.00,'ASCAP', '00712345678'],
    [36,'Olivia Grant',        'producer',  100.00,'ASCAP', '00712345678'],
    [36,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [37,'Anthony Russo',       'writer',    100.00,'BMI',   '00823456789'],
    [37,'Anthony Russo',       'producer',  100.00,'BMI',   '00823456789'],
    [38,'Rachel Kim',          'writer',    100.00,'BMI',   '00612345678'],
    [38,'Rachel Kim',          'producer',  100.00,'BMI',   '00612345678'],
    [38,'Pryntis Publishing',  'publisher', 100.00,'ASCAP', '00412876543'],
    [39,'Priya Sharma',        'writer',    100.00,'SESAC', '00934567891'],
    [39,'Priya Sharma',        'producer',  100.00,'SESAC', '00934567891'],
    [39,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
    [37,'Pryntis Publishing',  'publisher', 50.00, 'ASCAP', '00412876543'],
  ];

  for (const [assetIdx, owner, oType, pct, pro, ipi] of ownershipData) {
    await db.query(
      `INSERT INTO ownership_records (asset_id, owner_name, ownership_type, percentage, pro_affiliation, ipi_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [assetRows[assetIdx].id, owner, oType, pct, pro, ipi]
    );
  }
  console.log(`Ownership records: ${ownershipData.length}`);

  // ============================================
  // 9b. ASSET TAGS — realistic music-industry descriptors
  // ============================================
  const tagData = [
    // MVRK assets (0-5)
    [0,  ['dark', '808', 'cinematic', 'hip-hop']],
    [1,  ['dark', 'trap', 'orchestral', 'gritty']],
    [2,  ['atmospheric', 'synth', 'bass-heavy', 'dark', 'cinematic']],
    [3,  ['melodic', 'chill', 'radio-ready', 'hip-hop']],
    [4,  ['ambient', 'synth', 'electronic', 'atmospheric', 'instrumental']],
    [5,  ['bass-heavy', '808', 'gritty', 'hip-hop']],

    // Luna Rey assets (6-10)
    [6,  ['vocal', 'smooth', 'melodic', 'r&b']],
    [7,  ['vocal', 'latin', 'smooth', 'radio-ready']],
    [8,  ['vocal', 'atmospheric', 'chill', 'r&b']],
    [9,  ['melodic', 'instrumental', 'smooth', 'r&b']],
    [10, ['vocal', 'radio-ready', 'summer', 'melodic', 'sync-ready']],

    // Sable assets (11-15)
    [11, ['ambient', 'cinematic', 'atmospheric', 'sync-ready', 'strings']],
    [12, ['synth', 'upbeat', 'electronic', 'sync-ready']],
    [13, ['ambient', 'cinematic', 'atmospheric', 'instrumental', 'sync-ready']],
    [14, ['ambient', 'synth', 'electronic', 'instrumental']],
    [15, ['lo-fi', 'atmospheric', 'synth', 'electronic']],

    // JO Beats assets (16-22)
    [16, ['bass-heavy', 'trap', 'club', '808']],
    [17, ['chopped-screwed', 'dark', 'gritty', 'lo-fi']],
    [18, ['808', 'trap', 'radio-ready', 'hip-hop', 'bass-heavy']],
    [19, ['bass-heavy', 'gritty', 'hip-hop', 'club']],
    [20, ['chopped-screwed', 'dark', 'atmospheric']],
    [21, ['upbeat', 'trap', '808', 'hip-hop']],
    [22, ['bass-heavy', '808', 'gritty', 'club', 'trap']],

    // Mayavision assets (23-27)
    [23, ['live-drums', 'piano', 'smooth', 'instrumental']],
    [24, ['live-drums', 'instrumental', 'cinematic', 'orchestral', 'sync-ready']],
    [25, ['piano', 'strings', 'smooth', 'atmospheric']],
    [26, ['live-drums', 'strings', 'instrumental', 'ambient']],
    [27, ['guitar', 'live-drums', 'chill', 'smooth', 'instrumental']],

    // Crux assets (28-31)
    [28, ['latin', 'club', 'bass-heavy', 'radio-ready', 'summer']],
    [29, ['latin', 'trap', 'gritty', 'club']],
    [30, ['latin', 'upbeat', 'club', 'summer']],
    [31, ['latin', 'dark', 'atmospheric', 'trap']],

    // Bree Wave assets (32-35)
    [32, ['vocal', 'lo-fi', 'chill', 'sync-ready', 'smooth']],
    [33, ['vocal', 'lo-fi', 'chill', 'melodic']],
    [34, ['lo-fi', 'atmospheric', 'chill', 'r&b']],
    [35, ['lo-fi', 'instrumental', 'chill', 'smooth']],

    // Roster assets (36-39)
    [36, ['vocal', 'upbeat', 'radio-ready', 'summer', 'synth']],
    [37, ['boom-bap', 'gritty', 'instrumental', 'hip-hop']],
    [38, ['cinematic', 'orchestral', 'strings', 'sync-ready', 'atmospheric']],
    [39, ['synth', 'afrobeats', 'upbeat', 'club', 'melodic']],
  ];

  let tagCount = 0;
  for (const [assetIdx, tags] of tagData) {
    for (const tag of tags) {
      await db.query(
        `INSERT INTO asset_tags (asset_id, tag) VALUES ($1, $2) RETURNING id`,
        [assetRows[assetIdx].id, tag]
      );
      tagCount++;
    }
  }
  console.log(`Asset tags: ${tagCount}`);

  // ============================================
  // 10. USAGE RECORDS (200)
  // ============================================
  const platforms = ['Spotify', 'Apple Music', 'YouTube', 'Amazon Music', 'Tidal'];
  const usageTypes = ['stream', 'download', 'sync', 'broadcast'];
  const months = [
    '2024-07-01','2024-08-01','2024-09-01','2024-10-01','2024-11-01','2024-12-01',
    '2025-01-01','2025-02-01','2025-03-01','2025-04-01','2025-05-01','2025-06-01',
    '2025-07-01','2025-08-01','2025-09-01','2025-10-01','2025-11-01','2025-12-01',
    '2026-01-01','2026-02-01',
  ];

  const usageRecords = [];

  // Helper to push usage entries
  function addUsage(assetIdx, platform, type, date, count, revenue, notes) {
    usageRecords.push([assetIdx, type, platform, date, count, revenue, notes]);
  }

  // MVRK assets — moderate streaming, building toward recoup
  for (const m of months.slice(8, 20)) { // 2025-03 to 2026-02
    addUsage(0, 'Spotify',      'stream', m, 12000 + Math.floor(Math.random()*5000), 48.00, null);
    addUsage(0, 'Apple Music',  'stream', m, 4000  + Math.floor(Math.random()*2000), 22.00, null);
    addUsage(1, 'Spotify',      'stream', m, 8000  + Math.floor(Math.random()*3000), 32.00, null);
  }
  addUsage(0, 'YouTube', 'stream', '2025-09-01', 45000, 18.00, 'Music video release boost');
  addUsage(3, 'Spotify', 'stream', '2025-06-01', 25000, 100.00, 'Recoup singles launch');
  addUsage(3, 'Spotify', 'stream', '2025-07-01', 18000, 72.00, null);
  addUsage(3, 'Apple Music', 'stream', '2025-06-01', 8000, 44.00, null);

  // Luna Rey — strong streaming
  for (const m of months.slice(6, 20)) { // 2025-01 to 2026-02
    addUsage(6, 'Spotify',     'stream', m, 35000 + Math.floor(Math.random()*10000), 140.00, null);
    addUsage(6, 'Apple Music', 'stream', m, 12000 + Math.floor(Math.random()*5000),  66.00, null);
  }
  addUsage(7, 'Spotify',     'stream', '2025-11-01', 28000, 112.00, 'Seda y Fuego editorial push');
  addUsage(7, 'Spotify',     'stream', '2025-12-01', 32000, 128.00, null);
  addUsage(7, 'Apple Music', 'stream', '2025-11-01', 10000, 55.00, null);
  addUsage(10,'Spotify',     'stream', '2025-09-01', 22000, 88.00, 'Lavender Skies single release');
  addUsage(10,'Apple Music', 'stream', '2025-10-01', 8500,  46.75, null);
  addUsage(10,'YouTube',     'stream', '2025-10-01', 50000, 20.00, 'Lyric video');
  addUsage(10,'Tidal',       'stream', '2025-10-01', 3000,  18.00, null);

  // Sable — moderate, sync-focused
  for (const m of months.slice(10, 18)) { // 2025-05 to 2025-12
    addUsage(11, 'Spotify', 'stream', m, 6000 + Math.floor(Math.random()*3000), 24.00, null);
  }
  addUsage(11, 'Spotify',      'sync',   '2025-12-01', 1, 0, 'Sync license inquiry — Netflix');
  addUsage(13, 'Apple Music',  'stream', '2025-11-01', 4500, 24.75, null);
  addUsage(13, 'Spotify',      'stream', '2025-11-01', 8000, 32.00, null);
  addUsage(12, 'Amazon Music', 'stream', '2025-10-01', 3200, 12.80, null);
  addUsage(12, 'Spotify',      'stream', '2025-10-01', 7500, 30.00, null);

  // JO Beats — lots of streams early, then drop-off (case: streaming plateau)
  for (const m of months.slice(0, 8)) { // 2024-07 to 2025-02 — high early
    addUsage(16, 'Spotify', 'stream', m, 20000 + Math.floor(Math.random()*8000), 80.00, null);
    addUsage(17, 'Spotify', 'stream', m, 15000 + Math.floor(Math.random()*5000), 60.00, null);
  }
  for (const m of months.slice(8, 20)) { // 2025-03 to 2026-02 — drop-off
    addUsage(16, 'Spotify', 'stream', m, 3000 + Math.floor(Math.random()*2000), 12.00, null);
    addUsage(18, 'Spotify', 'stream', m, 5000 + Math.floor(Math.random()*2000), 20.00, null);
  }
  addUsage(18, 'Apple Music', 'stream', '2025-06-01', 6000, 33.00, 'H-Town Anthem release');
  addUsage(18, 'YouTube',     'stream', '2025-07-01', 30000, 12.00, null);
  addUsage(19, 'Spotify',     'stream', '2025-01-01', 4000, 16.00, null);
  addUsage(20, 'Spotify',     'stream', '2024-09-01', 8000, 32.00, null);
  addUsage(20, 'Tidal',       'stream', '2024-10-01', 1200, 7.20, null);

  // Mayavision — moderate
  for (const m of months.slice(8, 16)) { // 2025-03 to 2025-10
    addUsage(23, 'Spotify', 'stream', m, 5000 + Math.floor(Math.random()*3000), 20.00, null);
  }
  addUsage(23, 'Apple Music', 'stream', '2025-07-01', 3000, 16.50, null);
  addUsage(24, 'Spotify',     'stream', '2025-12-01', 4200, 16.80, null);
  addUsage(24, 'Apple Music', 'stream', '2025-12-01', 1800, 9.90, null);
  addUsage(27, 'Spotify',     'stream', '2025-08-01', 7000, 28.00, 'Live session release');

  // Crux — decent Latin market streams
  for (const m of months.slice(6, 16)) { // 2025-01 to 2025-10
    addUsage(28, 'Spotify', 'stream', m, 18000 + Math.floor(Math.random()*8000), 72.00, null);
  }
  addUsage(28, 'Apple Music',  'stream', '2025-08-01', 7000, 38.50, null);
  addUsage(29, 'Spotify',      'stream', '2025-09-01', 12000, 48.00, 'Playlist push');
  addUsage(29, 'Amazon Music', 'stream', '2025-09-01', 3500, 14.00, null);
  addUsage(30, 'Spotify',      'stream', '2025-12-01', 5000, 20.00, null);
  addUsage(28, 'YouTube',      'stream', '2025-06-01', 60000, 24.00, 'Music video viral moment');

  // Bree Wave — sync boosts streams
  for (const m of months.slice(10, 20)) { // 2025-05 to 2026-02
    addUsage(32, 'Spotify', 'stream', m, 8000 + Math.floor(Math.random()*4000), 32.00, null);
  }
  addUsage(32, 'Apple Music', 'stream', '2025-11-01', 5000, 27.50, 'Post-sync placement boost');
  addUsage(32, 'YouTube',     'stream', '2025-11-01', 25000, 10.00, null);
  addUsage(32, 'Tidal',       'stream', '2025-11-01', 2000, 12.00, null);
  addUsage(33, 'Spotify',     'stream', '2025-10-01', 15000, 60.00, 'Lo-Fi Love Letters release');
  addUsage(33, 'Apple Music', 'stream', '2025-10-01', 6000, 33.00, null);
  addUsage(33, 'Amazon Music','stream', '2025-10-01', 2500, 10.00, null);
  addUsage(34, 'Spotify',     'stream', '2026-01-01', 3000, 12.00, 'Wave II early preview');

  // Roster assets
  addUsage(36, 'Spotify',     'stream', '2025-07-01', 40000, 160.00, 'Skyline Drive summer hit');
  addUsage(36, 'Apple Music', 'stream', '2025-07-01', 15000, 82.50, null);
  addUsage(36, 'YouTube',     'stream', '2025-08-01', 80000, 32.00, 'Music video');
  addUsage(36, 'Spotify',     'stream', '2025-08-01', 35000, 140.00, null);
  addUsage(36, 'Tidal',       'stream', '2025-08-01', 5000, 30.00, null);
  addUsage(36, 'Amazon Music','stream', '2025-08-01', 8000, 32.00, null);

  addUsage(37, 'Spotify',     'stream', '2025-07-01', 8000, 32.00, null);
  addUsage(37, 'Apple Music', 'stream', '2025-07-01', 3000, 16.50, null);

  addUsage(38, 'Spotify',     'stream', '2025-09-01', 5000, 20.00, null);
  addUsage(38, 'Apple Music', 'stream', '2025-09-01', 2000, 11.00, null);
  addUsage(38, 'YouTube',     'broadcast','2025-08-01', 1, 22000.00, 'John Wick 5 sync broadcast');

  addUsage(39, 'Spotify',     'stream', '2025-11-01', 6000, 24.00, null);
  addUsage(39, 'Apple Music', 'stream', '2025-11-01', 2500, 13.75, null);

  // Broadcast and download entries to hit 200
  addUsage(0,  'YouTube',     'broadcast', '2026-01-01', 1, 35000.00, 'Nike Air Max campaign broadcast');
  addUsage(10, 'Apple Music', 'broadcast', '2025-09-01', 1, 45000.00, 'iPhone 17 ad broadcast');
  addUsage(28, 'Telemundo',   'broadcast', '2025-07-01', 1, 8000.00, 'La Reina del Sur broadcast');
  addUsage(32, 'Amazon Prime','broadcast', '2025-10-01', 1, 18000.00, 'Citadel S2 broadcast');
  addUsage(6,  'Spotify',     'download',  '2025-06-01', 5000, 50.00, null);
  addUsage(6,  'Apple Music', 'download',  '2025-06-01', 2000, 26.00, null);
  addUsage(28, 'Spotify',     'download',  '2025-08-01', 3000, 30.00, null);
  addUsage(33, 'Spotify',     'download',  '2025-11-01', 2500, 25.00, null);

  // Pad remaining to exactly 200
  const remaining = 200 - usageRecords.length;
  const padAssets = [0,1,6,7,11,16,23,28,32,36];
  const padPlatforms = ['Spotify','Apple Music','YouTube','Amazon Music','Tidal'];
  for (let i = 0; i < remaining; i++) {
    const aIdx = padAssets[i % padAssets.length];
    const plat = padPlatforms[i % padPlatforms.length];
    const mIdx = 6 + (i % 14); // months index 6-19
    addUsage(aIdx, plat, 'stream', months[mIdx], 2000 + i * 100, 8.00 + i * 0.40, null);
  }

  for (const [assetIdx, uType, platform, date, cnt, rev, notes] of usageRecords) {
    await db.query(
      `INSERT INTO usage_records (asset_id, usage_type, platform, date_recorded, count, revenue, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [assetRows[assetIdx].id, uType, platform, date, cnt, rev, notes]
    );
  }
  console.log(`Usage records: ${usageRecords.length}`);

  // ============================================
  // 11. REVENUE EVENTS (for 7 case artists)
  // ============================================
  const revenueData = [
    // MVRK — total ~$28k revenue against $57k expenses = not recouped
    [0, 0,  6,  4500.00,  4500.00, 'Spotify streaming Q3 2025',        'Quarterly streaming revenue — Midnight Meridian',       '2025-09-30'],
    [0, 0,  null, 3200.00, 3200.00, 'Spotify streaming Q4 2025',       'Quarterly streaming revenue — Midnight Meridian',       '2025-12-31'],
    [0, 1,  null, 2100.00, 2100.00, 'Spotify streaming Q3 2025',       'Quarterly streaming — Concrete Garden',                 '2025-09-30'],
    [0, 3,  null, 3800.00, 3800.00, 'Spotify streaming Q2 2025',       'Recoup singles pack — launch quarter',                  '2025-06-30'],
    [0, 3,  null, 2400.00, 2400.00, 'Apple Music streaming Q2 2025',   'Recoup singles — Apple Music share',                    '2025-06-30'],
    [0, null,5,  5000.00,  5000.00, 'Format Entertainment sync fee',    'Library license — Desert Mirage placement',             '2025-07-15'],
    [0, 0,  null, 1800.00, 1800.00, 'Apple Music streaming Q4 2025',   'Apple Music quarterly',                                 '2025-12-31'],
    [0, null,null,2500.00, 2500.00, 'YouTube ad revenue H2 2025',      'YouTube Content ID revenue',                            '2025-12-31'],
    [0, 0,  null, 1200.00, 1200.00, 'Amazon Music streaming 2025',     'Annual Amazon Music payout',                            '2025-12-31'],
    [0, 0,  null, 1500.00, 1500.00, 'Tidal streaming 2025',            'Annual Tidal payout',                                   '2025-12-31'],

    // Luna Rey — healthy revenue
    [1, 6,  null, 8500.00, 0, 'Spotify streaming H1 2025',             'Velvet Horizon streaming revenue',                      '2025-06-30'],
    [1, 6,  null, 9200.00, 0, 'Spotify streaming H2 2025',             'Velvet Horizon continued strong performance',            '2025-12-31'],
    [1, 10, 8,   45000.00,0, 'Apple iPhone 17 sync fee',               'Major sync placement — Lavender Skies in iPhone ad',    '2025-09-15'],
    [1, 7,  null, 4800.00, 0, 'Spotify streaming Q4 2025',             'Seda y Fuego editorial playlist revenue',               '2025-12-31'],
    [1, 6,  null, 5500.00, 0, 'Apple Music streaming 2025',            'Apple Music annual — Velvet Horizon',                   '2025-12-31'],

    // Sable — sync-focused revenue
    [2, 12, 1,   8000.00,  0, 'Neophonic library license',             'Sync catalogue placement — Neon Pulse',                 '2025-12-01'],
    [2, 11, null, 2400.00, 0, 'Spotify streaming 2025',                'Glass Cathedral streaming revenue',                     '2025-12-31'],
    [2, 13, null, 1800.00, 0, 'Apple Music streaming 2025',            'Whisper Network streaming',                             '2025-12-31'],

    // JO Beats — moderate revenue, dropping
    [3, 18, null, 3500.00, 0, 'Spotify streaming H1 2025',             'H-Town Anthem — release quarter',                       '2025-06-30'],
    [3, 16, null, 2800.00, 0, 'Spotify streaming 2024',                'Bayou Bounce catalogue revenue',                        '2024-12-31'],
    [3, 17, null, 1200.00, 0, 'Spotify streaming 2025',                'Screwston Nights — declining streams',                  '2025-12-31'],
    [3, 18, null, 1500.00, 0, 'Apple Music streaming 2025',            'H-Town Anthem — Apple Music',                           '2025-12-31'],

    // Mayavision — moderate
    [4, 23, null, 2200.00, 0, 'Spotify streaming 2025',                'Karma Circuit streaming',                               '2025-12-31'],
    [4, 24, 15,  6000.00,  0, 'Neon Gold Music license',               'Third Eye Open — library placement fee',                '2025-12-20'],
    [4, 27, null, 1400.00, 0, 'Spotify streaming 2025',                'Indigo Waves — live session release',                   '2025-12-31'],

    // Crux — Latin market revenue
    [5, 28, 12,  8000.00,  0, 'Telemundo sync fee',                    'Fuego Eterno — La Reina del Sur placement',             '2025-08-01'],
    [5, 28, null, 6500.00, 0, 'Spotify streaming 2025',                'Fuego Eterno — strong Latin market streams',            '2025-12-31'],
    [5, 29, null, 3200.00, 0, 'Spotify streaming Q4 2025',             'Callejero — playlist push revenue',                     '2025-12-31'],

    // Bree Wave — sync placement revenue
    [6, 32, 3,   18000.00, 0, 'Amazon Prime sync fee — Citadel S2',    'Tidal Serenade — $18k sync deal completed',             '2025-10-30'],
    [6, 33, null, 4200.00, 0, 'Spotify streaming H2 2025',             'Paper Cranes — Lo-Fi Love Letters single',              '2025-12-31'],
    [6, 33, null, 1800.00, 0, 'Apple Music streaming 2025',            'Paper Cranes — Apple Music',                            '2025-12-31'],
    [6, 32, null, 2500.00, 0, 'Spotify streaming post-sync 2025',      'Tidal Serenade — post-placement streaming boost',       '2025-12-31'],

    // Roster artists with placements — Liv G, Tone Russo, Ray K, Priya Sharma
    // Liv G (artist index 10) — asset 36, placement 16 (NBC sync, confirmed $15k)
    [10, 36, 16,  15000.00, 0, 'NBC sync fee — This Is Us Revival',     'Skyline Drive — TV sync placement fee',                 '2026-02-01'],
    [10, 36, null, 3200.00, 0, 'Spotify streaming H2 2025',             'Skyline Drive — pop single streaming revenue',          '2025-12-31'],
    [10, 36, null, 1400.00, 0, 'Apple Music streaming 2025',            'Skyline Drive — Apple Music annual payout',             '2025-12-31'],

    // Tone Russo (artist index 15) — asset 37, placement 18 (Heard Well, pending $4k)
    [15, 37, null, 2800.00, 0, 'Spotify streaming H2 2025',             'Smoke Signals — boom-bap beat tape streams',            '2025-12-31'],
    [15, 37, null, 1100.00, 0, 'Apple Music streaming 2025',            'Smoke Signals — Apple Music annual payout',             '2025-12-31'],
    [15, 37, null,  600.00, 0, 'YouTube ad revenue 2025',               'Smoke Signals — YouTube Content ID revenue',            '2025-12-31'],

    // Ray K (artist index 20) — asset 38, placement 17 (John Wick 5, completed $22k)
    [20, 38, 17,  22000.00, 0, 'Lionsgate sync fee — John Wick 5',      'Cinema Noir — cinematic underscore sync deal',          '2025-09-01'],
    [20, 38, null, 1800.00, 0, 'Spotify streaming post-sync 2025',      'Cinema Noir — post-placement streaming boost',          '2025-12-31'],
    [20, 38, null,  900.00, 0, 'Apple Music streaming 2025',            'Cinema Noir — Apple Music annual payout',               '2025-12-31'],

    // Priya Sharma (artist index 24) — asset 39, placement 19 (Disney+ Nat Geo, confirmed $9k)
    [24, 39, 19,   9000.00, 0, 'Disney+ sync fee — Nat Geo Series',     'Dharma Rising — world music documentary cue',           '2026-01-25'],
    [24, 39, null,  2100.00, 0, 'Spotify streaming H2 2025',            'Dharma Rising — Bollywood-house fusion streams',        '2025-12-31'],
    [24, 39, null,   800.00, 0, 'Apple Music streaming 2025',           'Dharma Rising — Apple Music annual payout',             '2025-12-31'],
  ];

  for (const [artIdx, assetIdx, placeIdx, amount, recoup, source, desc, date] of revenueData) {
    await db.query(
      `INSERT INTO revenue_events (artist_id, asset_id, placement_id, amount, amount_applied_to_recoupment, source, description, event_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        artists[artIdx].id,
        assetIdx !== null ? assetRows[assetIdx].id : null,
        placeIdx !== null ? placementRows[placeIdx].id : null,
        amount, recoup, source, desc, date
      ]
    );
  }
  console.log(`Revenue events: ${revenueData.length}`);

  // ============================================
  // 12. RECOUPABLE EXPENSES (MVRK only — case 0)
  // ============================================
  const expenseData = [
    [0, 'advance',      25000.00, 'Artist advance — initial signing',                  '2024-06-15'],
    [0, 'advance',      20000.00, 'Artist advance — second tranche',                   '2024-12-01'],
    [0, 'marketing',    5000.00,  'Social media campaign — Midnight Meridian release',  '2025-03-15'],
    [0, 'marketing',    4000.00,  'Playlist pitching and PR — recoup singles',          '2025-05-01'],
    [0, 'marketing',    3000.00,  'Music video production — Midnight Meridian',         '2025-08-01'],
    [0, 'recording',    2500.00,  'Studio time — Neon Nights EP sessions',              '2025-11-15'],
    [0, 'distribution', 1200.00,  'Distribution fees — all platforms 2025',             '2025-12-31'],
    [0, 'legal',        800.00,   'Contract review — Nike sync placement',              '2026-01-05'],

    // Luna Rey (index 1) — recording and marketing expenses
    [1, 'recording',    3500.00,  'Studio time — Luna Rising album sessions (5 days)',    '2025-11-10'],
    [1, 'marketing',    2000.00,  'Social media campaign — Velvet Singles pre-release',   '2025-08-20'],

    // Sable (index 2) — recording and marketing expenses
    [2, 'recording',    2800.00,  'Studio time — Ambient Trap Sessions mixing (3 days)',  '2026-01-08'],
    [2, 'marketing',    1500.00,  'Sync reel production — Sync Library Vol. 1 promo',    '2025-10-15'],

    // Bree Wave (index 6) — recording and marketing expenses
    [6, 'recording',    2200.00,  'Studio time — Wave II vocal tracking sessions',        '2026-01-20'],
    [6, 'marketing',    3000.00,  'Music video production — Paper Cranes visual',         '2025-09-10'],
  ];

  for (const [artIdx, cat, amount, desc, date] of expenseData) {
    await db.query(
      `INSERT INTO recoupable_expenses (artist_id, category, amount, description, expense_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [artists[artIdx].id, cat, amount, desc, date]
    );
  }
  console.log(`Recoupable expenses: ${expenseData.length}`);

  // ============================================
  // 13. TASKS (~50 for 7 case artists, 6-10 each)
  // ============================================
  const adminId = users[0].id;
  const managerId = users[1].id;

  const taskData = [
    // MVRK tasks (8)
    [0, 'Review recoupment balance',                    'Current balance: $57k expenses vs $28k revenue. Artist is $29k from recoupment. Review quarterly.',        'open',        'high',   '2026-03-01', managerId,  'artist'],
    [0, 'Approve Nike Air Max sync contract',           'Legal review complete. $35k sync fee pending final approval. Ensure recoupment allocation is correct.',    'in_progress', 'urgent', '2026-02-15', adminId,    'placement'],
    [0, 'Schedule Neon Nights EP mastering',            'Book mastering sessions with Sterling Sound. Target completion by March 1.',                               'open',        'medium', '2026-02-20', managerId,  'project'],
    [0, 'Update streaming analytics dashboard',         'Midnight Meridian streaming numbers need reconciliation with distributor reports.',                        'done',        'low',    '2025-12-15', managerId,  'asset'],
    [0, 'Clear Adidas sync — pending brand approval',   'Follow up with Adidas creative team. Concrete Garden submitted for Originals campaign.',                  'open',        'high',   '2026-03-20', managerId, 'placement'],
    [0, 'Plan MVRK x Sable collab sessions',           'Coordinate studio availability for collaborative EP. Both artists confirmed interest.',                   'open',        'medium', '2026-03-01', managerId,  'project'],
    [0, 'Quarterly royalty statement review',           'Prepare Q4 2025 royalty statement showing recoupment progress. Share with artist management.',             'open',        'medium', '2026-01-31', adminId,    'artist'],
    [0, 'Register Phantom Frequency with BMI',         'Co-production with Sable — ensure both writers are registered with correct splits.',                       'open',        'high',   '2026-02-28', managerId, 'asset'],

    // Luna Rey tasks (7)
    [1, 'URGENT: Resolve Velvet Horizon ownership dispute', 'Writer splits on Velvet Horizon total 115% (Reyes 60% + Thompson 55%). Must resolve before next royalty distribution.', 'open', 'urgent', '2026-02-10', adminId, 'asset'],
    [1, 'Audit all Luna Rey ownership records',         'Following Velvet Horizon dispute, audit all tracks for split accuracy. Check PRO registrations.',          'open',        'high',   '2026-02-20', managerId,  'artist'],
    [1, 'Coordinate Luna Rising album artwork',         'Album art concepts due from designer. Need approval before pressing deadline.',                            'in_progress', 'medium', '2026-03-01', managerId, 'project'],
    [1, 'Follow up on Bilingual Sessions producers',    'Spanish-language EP needs producer confirmations. Budget approved for 3 external producers.',              'open',        'medium', '2026-03-15', managerId,  'project'],
    [1, 'Process iPhone 17 sync royalty payment',       'Apple sync fee of $45k received. Allocate to Luna Rey account and update revenue records.',                'done',        'high',   '2025-10-01', adminId,    'placement'],
    [1, 'Submit Seda y Fuego for Grammy consideration', 'Best Latin Pop Song category. Submission deadline approaching.',                                           'open',        'medium', '2026-04-01', managerId,  'asset'],
    [1, 'Schedule Luna Rey press interviews',           'Album promo cycle starting. Coordinate with PR team for interview schedule.',                              'open',        'low',    '2026-03-15', managerId, 'artist'],

    // Sable tasks (7)
    [2, 'DEADLINE: Clear Netflix sync by Feb 28',       'Glass Cathedral submitted for Stranger Things S6. $25k deal. Music supervisor needs stems and clearance docs by end of February.', 'in_progress', 'urgent', '2026-02-28', adminId, 'placement'],
    [2, 'Prepare sync clearance documentation',         'Compile ownership certificates, PRO registrations, and master use license for Netflix legal team.',        'in_progress', 'urgent', '2026-02-25', managerId,  'asset'],
    [2, 'Follow up on HBO Last of Us placement',        'Whisper Network submitted for S3. Expected value $15k. Awaiting music supervisor response.',               'open',        'high',   '2026-03-15', managerId, 'placement'],
    [2, 'Review Sync Library Vol. 1 for completeness',  'Ensure all tracks have cleared metadata, stems, and ownership documentation for library.',                 'open',        'medium', '2026-02-28', managerId,  'project'],
    [2, 'Book studio time for Digital Mirage',          'Concept album sessions starting Q2 2026. Need to reserve studio blocks.',                                  'open',        'low',    '2026-04-01', managerId,  'project'],
    [2, 'Update Sable artist bio and press kit',        'Bio needs updating with Netflix placement mention. Press kit refresh for sync pitch deck.',                 'open',        'low',    '2026-03-01', managerId, 'artist'],
    [2, 'Register Binary Sunset stems with SESAC',      'Stem pack needs PRO registration before sync licensing can proceed.',                                      'open',        'medium', '2026-02-20', managerId,  'asset'],

    // JO Beats tasks (7)
    [3, 'Analyze streaming drop-off — JO Beats catalogue', 'Bayou Bounce and Screwston Nights showing significant stream decline. Investigate playlist removal or algorithm changes.', 'open', 'high', '2026-02-15', managerId, 'artist'],
    [3, 'Develop placement strategy for catalogue',     'Large catalogue but under 10% placement rate. Identify top 5 tracks for active pitching.',                 'open',        'high',   '2026-03-01', managerId, 'artist'],
    [3, 'Remaster Southern Comfort Beats for sync',     'Older masters may not meet current sync technical specs. Get remastering quotes.',                         'open',        'medium', '2026-03-15', managerId,  'project'],
    [3, 'Follow up on YouTube Premium placement',       'Bayou Bounce submitted for YouTube Originals. Low-value ($3k) but good exposure.',                         'open',        'low',    '2026-02-28', managerId, 'placement'],
    [3, 'Review Lionsgate rejection feedback',          'H-Town Anthem declined for John Wick franchise. Get specific feedback for future submissions.',            'done',        'medium', '2025-09-01', managerId,  'placement'],
    [3, 'Update JO Beats social media strategy',        'Streaming plateau may be connected to low social engagement. Coordinate with marketing.',                  'open',        'medium', '2026-03-01', managerId, 'artist'],
    [3, 'Houston We Have Beats — track listing review',  'Review 20-track instrumental project. Identify strongest tracks for lead singles.',                        'in_progress', 'medium', '2026-02-20', managerId,  'project'],

    // Mayavision tasks (7)
    [4, 'COMPLIANCE: Audit Mayavision ownership records',  'Multiple tracks have incomplete or missing ownership records. Lotus Effect has only writer at 35%. Third Eye Open missing producer/publisher.', 'open', 'urgent', '2026-02-15', adminId, 'artist'],
    [4, 'Resolve Collaborative Chaos contributor splits',  '6+ collaborators on project. Need written agreements for all contributors before any licensing.',        'open',        'high',   '2026-03-01', managerId,  'project'],
    [4, 'Collect missing IPI numbers for collaborators',   'Several session musicians on Karma Circuit lack IPI registrations. Cannot process PRO payments.',        'open',        'high',   '2026-02-28', managerId, 'asset'],
    [4, 'Review Soul Circuit project timeline',            'Project behind schedule. Live session recordings need final mixing. Target February completion.',        'in_progress', 'medium', '2026-02-28', managerId,  'project'],
    [4, 'Contact Jasmine Howard re: horn arrangement credit','Horn parts on Karma Circuit — confirm writing credit percentage and PRO registration.',                'open',        'medium', '2026-02-20', managerId, 'asset'],
    [4, 'Prepare Neon Gold placement paperwork',           'Third Eye Open — library placement confirmed at $6k. Need all contributor signatures.',                 'open',        'high',   '2026-02-15', adminId,    'placement'],
    [4, 'Schedule Patel Sessions: Live master review',     'Completed project needs final master approval before distribution.',                                     'done',        'low',    '2025-08-15', managerId,  'project'],

    // Crux tasks (6)
    [5, 'Review subscription downgrade impact',            'Crux downgraded from Pro to Basic. Identify which Port features are now tier-gated and notify artist.',  'open',        'high',   '2026-02-15', adminId,    'artist'],
    [5, 'Discuss Pro re-upgrade with Crux management',     'Artist may need Pro features for Reggaeton Revival project. Schedule call with management.',            'open',        'medium', '2026-02-28', managerId,  'artist'],
    [5, 'Finalize Reggaeton Revival tracklist',            'Project in progress — need final track selection from 15 demos.',                                       'in_progress', 'medium', '2026-03-15', managerId, 'project'],
    [5, 'Process Telemundo sync payment',                  'Fuego Eterno — $8k sync fee received from Telemundo. Update revenue records.',                          'done',        'medium', '2025-08-15', adminId,    'placement'],
    [5, 'Crux Beats Library — tier access review',         'Beat library project may require Pro tier for full functionality. Assess Basic tier limitations.',       'open',        'medium', '2026-03-01', managerId,  'project'],
    [5, 'Register Ritmo Sagrado with BMI',                 'New production needs PRO registration before any licensing activity.',                                   'open',        'low',    '2026-03-01', managerId, 'asset'],

    // Bree Wave tasks (8)
    [6, 'Initiate contract renewal — Bree Wave',           '$18k Citadel sync triggers automatic renewal clause. Prepare renewal paperwork using contract template.','open',        'urgent', '2026-02-15', adminId,    'artist'],
    [6, 'Apply contract renewal template',                 'Use standard artist renewal template. Include updated sync bonus clause based on Citadel performance.',  'open',        'high',   '2026-02-20', adminId,    'artist'],
    [6, 'Confirm Hulu placement details',                  'Only Murders S5 end credits — Paper Cranes. $12k confirmed. Verify broadcast dates.',                   'in_progress', 'high',   '2026-02-28', managerId,  'placement'],
    [6, 'Wave II project — midpoint review',               'Project 50% complete. Review current mixes and production direction.',                                  'open',        'medium', '2026-03-01', managerId,  'project'],
    [6, 'Update Bree Wave streaming analytics',            'Post-sync streaming boost significant. Update dashboards and prepare report for artist.',                'open',        'medium', '2026-02-15', managerId, 'asset'],
    [6, 'Process Citadel S2 sync payment',                 '$18k payment received from Amazon Prime. Allocate to Bree Wave account.',                               'done',        'high',   '2025-11-15', adminId,    'placement'],
    [6, 'Coordinate Bree Wave press for sync placement',   'Citadel placement is a major career milestone. Coordinate press release with PR team.',                 'open',        'low',    '2026-03-01', managerId, 'artist'],
    [6, 'Register Driftwood with ASCAP',                   'Wave II track in progress — register early for sync readiness.',                                        'open',        'medium', '2026-02-28', managerId,  'asset'],
  ];

  let taskCount = 0;
  for (const [artIdx, title, desc, status, priority, due, assignee, entityType] of taskData) {
    await db.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, related_entity_type, artist_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [title, desc, status, priority, due, assignee, entityType, artists[artIdx].id, adminId]
    );
    taskCount++;
  }
  console.log(`Tasks: ${taskCount}`);

  // ============================================
  // 14. ACTIVITY FEED (~30)
  // ============================================
  const activityData = [
    ['artist_created',    adminId,    'artist',    0,  'Created artist profile for MVRK (Marcus Thompson)',                        '2024-06-15'],
    ['artist_created',    adminId,    'artist',    1,  'Created artist profile for Luna Rey (Alicia Reyes)',                       '2024-08-01'],
    ['artist_created',    adminId,    'artist',    2,  'Created artist profile for Sable (Samantha Chen)',                         '2024-09-15'],
    ['artist_created',    adminId,    'artist',    3,  'Created artist profile for JO Beats (James Okafor)',                      '2024-07-01'],
    ['artist_created',    adminId,    'artist',    4,  'Created artist profile for Mayavision (Maya Patel)',                      '2024-10-01'],
    ['artist_created',    adminId,    'artist',    5,  'Created artist profile for Crux (Chris Rodriguez)',                       '2024-11-01'],
    ['artist_created',    adminId,    'artist',    6,  'Created artist profile for Bree Wave (Brianna Lee)',                      '2025-01-15'],
    ['project_created',   managerId,  'project',   0,  'Created project: Neon Nights EP for MVRK',                                '2025-11-01'],
    ['project_created',   managerId,  'project',   4,  'Created project: Luna Rising for Luna Rey',                               '2025-10-15'],
    ['asset_uploaded',    managerId,  'asset',     0,  'Uploaded asset: Midnight Meridian (beat) for MVRK',                       '2025-03-01'],
    ['asset_uploaded',    managerId,  'asset',     6,  'Uploaded asset: Velvet Horizon (master) for Luna Rey',                    '2025-05-01'],
    ['asset_uploaded',    managerId,  'asset',     11, 'Uploaded asset: Glass Cathedral (master) for Sable',                      '2025-09-15'],
    ['placement_created', managerId, 'placement', 0,  'Created sync placement: Glass Cathedral for Netflix Stranger Things S6',  '2026-01-15'],
    ['placement_updated', adminId,    'placement', 3,  'Completed sync placement: Tidal Serenade for Amazon Prime Citadel S2',   '2025-10-30'],
    ['placement_created', managerId, 'placement', 5,  'Created sync placement: Midnight Meridian for Nike Air Max Campaign',    '2026-01-10'],
    ['ownership_flagged', adminId,    'asset',     6,  'ALERT: Velvet Horizon writer splits total 115% — dispute flagged',        '2025-12-01'],
    ['revenue_received',  adminId,    'artist',    1,  'Revenue received: $45,000 from Apple iPhone 17 sync (Luna Rey)',           '2025-09-15'],
    ['revenue_received',  adminId,    'artist',    6,  'Revenue received: $18,000 from Amazon Prime Citadel S2 sync (Bree Wave)', '2025-10-30'],
    ['subscription_changed', adminId, 'artist',    5,  'Subscription downgraded: Crux moved from Pro to Basic',                   '2025-11-01'],
    ['task_created',      adminId,    'artist',    0,  'Created task: Review recoupment balance for MVRK',                        '2026-01-15'],
    ['task_created',      adminId,    'asset',     6,  'Created urgent task: Resolve Velvet Horizon ownership dispute',           '2026-01-20'],
    ['task_created',      adminId,    'placement', 0,  'Created urgent task: Clear Netflix sync deadline for Sable',              '2026-01-25'],
    ['project_updated',   managerId,  'project',   3,  'Project completed: Recoup Singles Pack (MVRK)',                           '2025-07-15'],
    ['project_updated',   managerId,  'project',   16, 'Project completed: Fuego Mixtape (Crux)',                                 '2025-08-15'],
    ['project_updated',   managerId,  'project',   19, 'Project completed: Lo-Fi Love Letters (Bree Wave)',                       '2025-10-30'],
    ['expense_logged',    adminId,    'artist',    0,  'Logged expense: $25,000 artist advance for MVRK',                         '2024-06-15'],
    ['expense_logged',    adminId,    'artist',    0,  'Logged expense: $20,000 second advance tranche for MVRK',                 '2024-12-01'],
    ['compliance_alert',  adminId,    'artist',    4,  'Compliance alert: Mayavision has tracks with incomplete ownership records','2026-01-10'],
    ['task_created',      adminId,    'artist',    6,  'Created task: Initiate contract renewal for Bree Wave',                   '2026-02-01'],
    ['placement_updated', managerId, 'placement', 8,  'Placement confirmed: Lavender Skies for Apple iPhone 17 Launch Ad',      '2025-09-01'],
  ];

  for (const [eventType, actorId, entityType, entityIdx, summary, date] of activityData) {
    let entityId;
    if (entityType === 'artist')    entityId = artists[entityIdx].id;
    else if (entityType === 'project')   entityId = projects[entityIdx].id;
    else if (entityType === 'asset')     entityId = assetRows[entityIdx].id;
    else if (entityType === 'placement') entityId = placementRows[entityIdx].id;

    await db.query(
      `INSERT INTO activity_feed (event_type, actor_user_id, entity_type, entity_id, summary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [eventType, actorId, entityType, entityId, summary, date + 'T12:00:00Z']
    );
  }
  console.log(`Activity feed: ${activityData.length}`);

  // ============================================
  // 15. CONTACTS (15 industry contacts)
  // ============================================
  const contactData = [
    ['Sarah Chen',         'Neophonic',                  'Music Supervisor',          'sarah.chen@neophonic.com',     '310-555-2001', 'Primary sync contact. Placed Sable tracks. Open to electronic and ambient.',          '{sync,supervisor,film}',     5],
    ['James Park',         'Format Entertainment',       'Music Supervisor',          'jpark@formatent.com',          '323-555-2002', 'Library music specialist. Placed MVRK track. Prefers hip-hop and R&B.',               '{sync,supervisor,tv}',       4],
    ['Lisa Tran',          'Neon Gold Music',            'A&R / Sync',               'lisa@neongold.com',            '212-555-2003', 'Indie and neo-soul focus. Working with Mayavision on library placement.',              '{sync,ar,indie}',            4],
    ['Tom Wright',         'Lionsgate Music',            'Music Director',            'twright@lionsgate.com',        '310-555-2004', 'Action film scoring. Declined JO Beats but open to cinematic producers.',             '{sync,film,action}',         3],
    ['Rachel Wong',        'Heard Well',                 'Playlist Curator / Sync',   'rwong@heardwell.com',          '415-555-2005', 'Playlist and sync dual role. Hip-hop and electronic focus.',                           '{playlist,sync,digital}',    3],
    ['David Morales',      'Telemundo Music',            'Music Licensing',           'dmorales@telemundo.com',       '305-555-2006', 'Latin music specialist. Placed Crux track in La Reina del Sur.',                      '{sync,latin,tv}',            4],
    ['Amanda Foster',      'Spotify Editorial',          'Playlist Editor',           'afoster@spotify.com',          '212-555-2007', 'New Music Friday and RapCaviar. Good relationship — placed Luna Rey and Crux.',       '{playlist,streaming,editorial}', 5],
    ["Kevin O'Malley",    'Apple Music Editorial',      'Playlist Curator',          'komalley@apple.com',           '408-555-2008', 'Apple Music editorial. Interested in R&B and electronic genres.',                     '{playlist,streaming,apple}', 3],
    ['Jennifer Liu',       'Netflix Music',              'Music Coordinator',         'jliu@netflix.com',             '323-555-2009', 'Primary Netflix contact for Stranger Things placement. Tight deadline relationship.', '{sync,tv,netflix}',          5],
    ['Marcus Williams',    'Nike Brand Marketing',       'Creative Director',         'mwilliams@nike.com',           '503-555-2010', 'Air Max campaign contact. Strong interest in MVRK production style.',                 '{brand,advertising,nike}',   4],
    ['Sophia Nakamura',    'Sterling Sound',             'Mastering Engineer',        'snakamura@sterling.com',       '212-555-2011', 'Preferred mastering engineer. Worked on Luna Rey and Bree Wave projects.',            '{mastering,engineering}',    5],
    ['Robert Hayes',       'Warner Chappell Publishing', 'A&R Manager',              'rhayes@warnerchappell.com',    '615-555-2012', 'Publishing contact. Exploring co-publishing deal for MVRK catalogue.',                '{publishing,ar,major}',      3],
    ['Elena Vasquez',      'BMI',                        'Writer Relations',          'evasquez@bmi.com',             '615-555-2013', 'BMI rep for roster artists. Helps with registration and disputes.',                   '{pro,bmi,registration}',     4],
    ['Michael Chen',       'ASCAP',                      'Membership Services',       'mchen@ascap.com',              '212-555-2014', 'ASCAP rep. Assisted with Luna Rey and Bree Wave registrations.',                      '{pro,ascap,registration}',   4],
    ['Diana Osei',         'Creative Artists Agency',    'Music Agent',               'dosei@caa.com',                '310-555-2015', 'Booking agent interested in roster artists for live performance opportunities.',       '{agency,booking,live}',      3],
  ];

  for (const [name, org, role, email, phone, notes, tagsStr, strength] of contactData) {
    await db.query(
      `INSERT INTO contacts (name, organization, role, email, phone, notes, tags, relationship_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, org, role, email, phone, notes, tagsStr, strength]
    );
  }
  console.log(`Contacts: ${contactData.length}`);

  // ============================================
  // 16. TEMPLATES / SOPs (12 industry templates)
  // ============================================
  const templateData = [
    ['Split Sheet Agreement', 'Split Sheet',
`SPLIT SHEET AGREEMENT

Song Title: ________________________________________
Working Title (if different): ______________________
Recording Date: ____/____/________
Studio / Location: _________________________________
ISRC (if assigned): ________________________________

The undersigned contributors hereby agree to the following ownership
splits for the above-referenced musical composition:

WRITER / CONTRIBUTOR TABLE
+----+---------------------+-----------+--------+-------+-----------------+
| #  | Name                | Role      | Share  | PRO   | IPI / CAE #     |
+----+---------------------+-----------+--------+-------+-----------------+
| 1  | ________________    | Topliner  | _____%  | ASCAP | _______________ |
| 2  | ________________    | Lyricist  | _____%  | BMI   | _______________ |
| 3  | ________________    | Producer  | _____%  | SESAC | _______________ |
| 4  | ________________    | Composer  | _____%  | PRS   | _______________ |
+----+---------------------+-----------+--------+-------+-----------------+
TOTAL:                                   100.00%

PUBLISHER INFORMATION
Writer 1 Publisher: ____________________  Share: _____%
Writer 2 Publisher: ____________________  Share: _____%
Writer 3 Publisher: ____________________  Share: _____%
Writer 4 Publisher: ____________________  Share: _____%

AGREED TERMS
1. Each contributor shall register this work with their respective PRO
   within 30 calendar days of execution.
2. No contributor may license, assign, or transfer their share without
   prior written consent of all parties.
3. Mechanical royalties shall be split in the same percentages listed above.
4. Sync licensing requires unanimous written approval of all contributors.
5. This agreement is binding and may not be modified except by unanimous
   written consent of all parties.

SIGNATURES

___________________________  Date: ____/____/________
Print Name: _______________

___________________________  Date: ____/____/________
Print Name: _______________

___________________________  Date: ____/____/________
Print Name: _______________

___________________________  Date: ____/____/________
Print Name: _______________`, null],

    ['Producer Agreement Checklist', 'Other',
`PRODUCER AGREEMENT CHECKLIST

Use this checklist when negotiating or reviewing any producer agreement
to ensure all key deal points are addressed before execution.

RECOUPMENT TERMS
[ ] Advance amount clearly stated (e.g., $2,000 - $10,000 per master)
[ ] Recoupment limited to artist royalties only (not label share)
[ ] Recording costs listed as recoupable or non-recoupable
[ ] Recoupment cross-collateralization clause reviewed
[ ] Cap on recoupable expenses defined

PRODUCER ROYALTY POINTS
[ ] Points specified as percentage of suggested retail or net receipts
[ ] Typical range: 3-5 points for major-label deals
[ ] Pro-rata calculation method defined for multi-producer albums
[ ] Escalations tied to sales thresholds (e.g., 4pts after 500K units)
[ ] Points calculated before or after packaging deductions

MOST FAVORED NATIONS (MFN) CLAUSE
[ ] MFN clause present or intentionally excluded
[ ] MFN applies to: advance, points, credit (specify which)
[ ] MFN reference group defined (all producers on project)

CREDIT LANGUAGE
[ ] Credit format specified: "Produced by [NAME]"
[ ] Placement requirements: liner notes, streaming metadata, video
[ ] Credit on all configurations (digital, physical, promotional)
[ ] Remedies for credit omission (cure period, not grounds for termination)

DELIVERY SPECIFICATIONS
[ ] File format: WAV 24-bit / 48 kHz minimum
[ ] Stems required: drums, bass, vocals, synths, FX (separate tracks)
[ ] Instrumental version required
[ ] TV-clean version required (if applicable)
[ ] Delivery deadline with cure period for late delivery
[ ] Metadata requirements: BPM, key, ISRC embedded in file headers`, null],

    ['Cue Sheet Template -- Film/TV', 'Cue Sheet',
`CUE SHEET -- FILM / TELEVISION

Production Title: _________________________________
Episode Number: _________  Episode Title: _________
Network / Platform: _______________________________
Air Date / Release Date: ____/____/________
Total Runtime: ____:____:____
Production Company: _______________________________
Music Supervisor: _________________________________

CUE LOG
+------+------------------------------+-------------------+-------------------+-------+----------+----------+-----------+------------------+
| Cue# | Music Title                  | Composer(s)       | Publisher(s)      | PRO   | Usage    | Timing   | Duration  | ISRC             |
+------+------------------------------+-------------------+-------------------+-------+----------+----------+-----------+------------------+
| 001  | ________________________     | ________________  | ________________  | ASCAP | BV       | 00:01:15 | 00:00:45  | ________________ |
| 002  | ________________________     | ________________  | ________________  | BMI   | BI       | 00:05:30 | 00:01:20  | ________________ |
| 003  | ________________________     | ________________  | ________________  | SESAC | VV       | 00:12:44 | 00:02:10  | ________________ |
| 004  | ________________________     | ________________  | ________________  | ASCAP | MT       | 00:00:00 | 00:00:30  | ________________ |
| 005  | ________________________     | ________________  | ________________  | BMI   | ET       | 00:42:15 | 00:00:30  | ________________ |
+------+------------------------------+-------------------+-------------------+-------+----------+----------+-----------+------------------+

USAGE TYPE CODES
BV = Background Vocal       BI = Background Instrumental
VV = Visual Vocal           VI = Visual Instrumental
MT = Main Title / Theme     ET = End Title
LO = Logo                   PI = Promotional Instrumental
FT = Feature Performance    AD = Ad / Bumper

NOTES
- All publishers must be listed with their respective PRO affiliations.
- If a cue contains multiple works, list each on a separate row.
- Attach signed sync and master-use licenses for each cue.

Prepared by: ___________________  Date: ____/____/________
Contact Email: _________________  Phone: _________________`, null],

    ['ISRC/UPC Assignment SOP', 'Other',
`ISRC / UPC ASSIGNMENT -- STANDARD OPERATING PROCEDURE

PURPOSE
Ensure every released recording has a unique, valid ISRC and every
release (single, EP, album) has a valid UPC/EAN barcode before
distribution.

ISRC ASSIGNMENT (International Standard Recording Code)
Format: CC-XXX-YY-NNNNN  (Country-Registrant-Year-Designation)

Step 1: Obtain a registrant code from your national ISRC agency
        (US: RIAA, UK: PPL, etc.) or through your distributor.
Step 2: Maintain a sequential log of all assigned designation numbers.
Step 3: Assign one unique ISRC per unique recording.
        - New ISRC required for: remixes, remastered versions, edits.
        - Same ISRC retained for: re-releases on different platforms,
          inclusion on compilations, format changes (WAV to MP3).
Step 4: Embed the ISRC in the WAV file header (BWF chunk) before delivery.
Step 5: Record the ISRC in your asset management system and metadata sheet.

COMMON ISRC MISTAKES TO AVOID
- Do NOT reuse an ISRC for a different recording.
- Do NOT assign a new ISRC when re-distributing the same master.
- Do NOT use placeholder codes; always assign final ISRCs before delivery.
- Ensure the year portion matches the year of first commercial release.

UPC/EAN ASSIGNMENT (Universal Product Code)
Step 1: Purchase a GS1 company prefix or obtain UPCs from your distributor.
Step 2: Assign one UPC per release (single, EP, album, deluxe edition).
Step 3: Each unique configuration (standard vs. deluxe) needs its own UPC.
Step 4: Enter the UPC into your distributor portal during release setup.

VALIDATION RULES
- ISRC must be exactly 12 alphanumeric characters (no hyphens in systems).
- UPC must be exactly 12 digits (UPC-A) or 13 digits (EAN-13).
- Run check-digit validation before submission.
- Cross-reference against existing catalogue to prevent duplicates.`, null],

    ['Metadata QC Checklist', 'Other',
`METADATA QUALITY CONTROL CHECKLIST

Run this checklist before submitting any release to distribution.
Every field marked [REQUIRED] must be present and validated.

TRACK-LEVEL METADATA
[REQUIRED] Track title -- no ALL CAPS unless stylized; check spelling
[REQUIRED] Primary artist name -- must match existing DSP profiles
[REQUIRED] ISRC code -- 12 characters, validated format
[REQUIRED] Genre (primary) -- use DDEX standard genre taxonomy
[REQUIRED] Language of lyrics -- ISO 639-1 code (e.g., "en", "es")
[REQUIRED] Explicit content flag -- "Explicit" or "Clean" or "Not Applicable"
[OPTIONAL] Featured artist(s) -- format: "feat. [Name]"
[OPTIONAL] Remixer / version info -- "(Remix)" or "(Acoustic Version)"
[REQUIRED] Composer(s) -- full legal names, comma-separated
[REQUIRED] Producer(s) -- full legal names
[REQUIRED] Publisher(s) -- registered entity names

RELEASE-LEVEL METADATA
[REQUIRED] Release title -- consistent with track naming conventions
[REQUIRED] UPC/EAN -- 12 or 13 digits, check-digit validated
[REQUIRED] Release date -- YYYY-MM-DD, must be a future Friday (industry standard)
[REQUIRED] Label name -- registered with distributor
[REQUIRED] Cover art -- 3000x3000 px minimum, RGB, JPG or PNG, no bleed
[REQUIRED] Copyright line (P) -- year + master owner
[REQUIRED] Copyright line (C) -- year + composition owner

COMMON ERRORS TO WATCH FOR
- Mismatched artist names across DSPs (e.g., "J. Cole" vs "J Cole")
- Missing featured artist credits in both title and artist fields
- Wrong ISRC format (hyphens where systems expect none)
- Release date set on a non-Friday
- Artwork with text too small to read at thumbnail size
- Genre mismatch between metadata and actual audio content

SIGN-OFF
QC performed by: ___________________  Date: ____/____/________
Approved for distribution: [ ] Yes  [ ] No
Notes: ____________________________________________________________`, null],

    ['Royalty Statement Template', 'Other',
`ROYALTY ACCOUNTING STATEMENT

Statement Period: Q__ / 20____
Artist / Payee: ___________________________________
Agreement Date: ____/____/________
Statement Issue Date: ____/____/________
Account Number: ___________________________________

1. REVENUE BY SOURCE
+-------------------------------+-----------+-----------+
| Source                        | Units     | Gross ($) |
+-------------------------------+-----------+-----------+
| Streaming -- Spotify          |           |           |
| Streaming -- Apple Music      |           |           |
| Streaming -- Amazon / Other   |           |           |
| Download Sales                |           |           |
| Sync License Fees             |           |           |
| Mechanical Royalties          |           |           |
| Performance Royalties (PRO)   |           |           |
| Physical Sales                |           |           |
| Neighboring Rights            |           |           |
| Other Income                  |           |           |
+-------------------------------+-----------+-----------+
| GROSS REVENUE                 |           |           |
+-------------------------------+-----------+-----------+

2. DEDUCTIONS
+-------------------------------+-----------+
| Distribution Fee (___%)       |           |
| Administration Fee (___%)     |           |
| Withholding Tax (___%)        |           |
+-------------------------------+-----------+
| TOTAL DEDUCTIONS              |           |
+-------------------------------+-----------+

3. NET REVENUE AFTER DEDUCTIONS:  $__________

4. RECOUPMENT STATUS
+-------------------------------+-----------+
| Opening Unrecouped Balance    |           |
| Applied This Period           |           |
| Closing Unrecouped Balance    |           |
+-------------------------------+-----------+

5. NET PAYABLE TO ARTIST
+-------------------------------+-----------+
| Artist Share (___%)           |           |
| Less: Recoupment Applied      |           |
| Less: Reserves Held (___%)    |           |
| NET PAYMENT THIS PERIOD       |           |
+-------------------------------+-----------+

Payment Method: [ ] ACH  [ ] Wire  [ ] Check
Payment Date: ____/____/________
Notes: ____________________________________________________________`, null],

    ['Sync Pitch Email Template', 'Sync License',
`SYNC PITCH EMAIL TEMPLATE

Use this template when pitching tracks to music supervisors, ad agencies,
or sync licensing representatives.

SUBJECT LINE OPTIONS (choose or adapt one):
- "[Artist] -- Fresh tracks for [Show/Brand] consideration"
- "One-stop clearance catalog: [Genre] tracks for [Project Type]"
- "New releases available for sync: [Artist] ([Genre])"

---

EMAIL BODY

Hi [First Name],

I hope this message finds you well. I wanted to share some tracks from
[Artist Name / Catalog Name] that I believe could be a strong fit for
[specific project, show, or brand if known; otherwise use "your upcoming
projects"].

Attached / linked below are [3-5] selections:

1. "[Track Title]" -- [Genre], [BPM] BPM, [Mood descriptors]
   Duration: [X:XX] | One-stop: [Yes/No]
   Link: [streaming or private link]

2. "[Track Title]" -- [Genre], [BPM] BPM, [Mood descriptors]
   Duration: [X:XX] | One-stop: [Yes/No]
   Link: [streaming or private link]

3. "[Track Title]" -- [Genre], [BPM] BPM, [Mood descriptors]
   Duration: [X:XX] | One-stop: [Yes/No]
   Link: [streaming or private link]

All tracks are fully cleared for sync with master and publishing
controlled by [Entity]. Instrumentals, stems, and alternate edits
(30s / 60s) are available upon request.

Happy to send additional material or discuss licensing terms. Looking
forward to hearing from you.

Best regards,
[Your Name]
[Title / Company]
[Phone] | [Email]

---

ATTACHMENTS CHECKLIST
[ ] One-sheet (PDF) with track list, credits, and clearance status
[ ] Private streaming links (not public URLs)
[ ] Contact card or signature with direct phone number

FOLLOW-UP SCHEDULE
- Day 3: Brief follow-up email if no response
- Day 10: Second follow-up with one additional track suggestion
- Day 21: Final check-in; offer to remove from pitch list if not relevant`, null],

    ['Engineer Mix Notes', 'Other',
`ENGINEER MIX NOTES -- REVISION LOG

Project: ___________________________________
Artist: ___________________________________
Engineer: ___________________________________
Session Date: ____/____/________
DAW / Session File: ___________________________________

REFERENCE TRACKS
List 2-3 commercial reference tracks for sonic direction:
1. "[Title]" by [Artist] -- Reference for: [low end / vocal tone / width]
2. "[Title]" by [Artist] -- Reference for: [dynamics / overall balance]
3. "[Title]" by [Artist] -- Reference for: [FX treatment / spatial depth]

MIX TARGETS
- Loudness: -14 LUFS integrated (streaming-optimized)
- True Peak: -1.0 dBTP maximum
- Dynamic Range: 8-12 LU minimum
- Low-end roll-off: HPF at 30 Hz on master bus
- Stereo width: Mono-compatible below 200 Hz

REVISION LOG
+-----+------------+-----------------------------------------------------+
| Rev | Date       | Notes                                               |
+-----+------------+-----------------------------------------------------+
| v1  | __________ | Initial mix delivered. Awaiting client feedback.     |
| v2  | __________ | ____________________________________________        |
| v3  | __________ | ____________________________________________        |
| v4  | __________ | ____________________________________________        |
+-----+------------+-----------------------------------------------------+

DELIVERY SPECIFICATIONS
- Mix format: WAV 24-bit / 48 kHz (or match session sample rate)
- Instrumental: Separate file, same processing chain minus vocal bus
- A-cappella: Vocals only, with reverb/delay printed and dry version
- TV mix: Remove explicit lyrics; preserve all instrumentation
- Stems: Drums, Bass, Synths/Keys, Guitars, Vocals, FX/Perc (6-8 stems)
- File naming: [Artist]_[Title]_[Version]_[Date].[ext]
  Example: LunaRey_Midnight_MixV2_20250115.wav

SIGN-OFF
Mix approved by: ___________________  Date: ____/____/________
Notes: ____________________________________________________________`, null],

    ['Master Delivery Checklist', 'Other',
`MASTER DELIVERY CHECKLIST

Complete this checklist before delivering final masters to distribution,
licensing partners, or archive storage.

FORMAT REQUIREMENTS
[ ] WAV 16-bit / 44.1 kHz -- CD-quality master (required for physical)
[ ] WAV 24-bit / 48 kHz -- High-resolution master (required for DSPs)
[ ] WAV 24-bit / 96 kHz -- Archival master (if available)
[ ] MP3 320 kbps CBR -- Promotional / reference copy
[ ] FLAC -- Lossless compressed (for platforms that accept it)

LOUDNESS TARGETS (per platform standards)
[ ] Integrated loudness: -14 LUFS (Spotify, YouTube, Tidal)
[ ] True peak: -1.0 dBTP maximum
[ ] Loudness range (LRA): 5-12 LU recommended
[ ] Verify with loudness meter (e.g., Youlean, iZotope Insight)

STEMS PACKAGE
[ ] Drums / Percussion (stereo or multi-mono)
[ ] Bass (DI + processed)
[ ] Vocals (lead + backgrounds, dry + wet versions)
[ ] Synths / Keys
[ ] Guitars
[ ] FX / Ambience
[ ] All stems sum to match the full mix within 0.5 dB

ALTERNATE VERSIONS
[ ] Instrumental (full mix minus all vocals)
[ ] A-cappella (vocals only, with and without effects)
[ ] TV / Clean edit (explicit content removed)
[ ] 30-second edit
[ ] 60-second edit
[ ] Radio edit (if different from album version)

FILE NAMING CONVENTION
[Artist]_[Title]_[Version]_[BitDepth]-[SampleRate].[ext]
Example: BreeWave_Glow_Master_24-48.wav
Example: BreeWave_Glow_Instrumental_24-48.wav

METADATA EMBEDDED IN FILES
[ ] ISRC code in BWF header
[ ] Artist name, track title, album title
[ ] Year of release
[ ] Copyright notice

FINAL SIGN-OFF
Mastering engineer: ___________________  Date: ____/____/________
A&R / Label approval: _________________  Date: ____/____/________`, null],

    ['Sample Clearance Request', 'Other',
`SAMPLE CLEARANCE REQUEST

Use this template to initiate clearance for any sampled or interpolated
material in a new recording.

REQUESTING PARTY
Artist / Producer: ___________________________________
Label / Company: ___________________________________
Contact Name: ___________________________________
Email: ___________________________________
Phone: ___________________________________

ORIGINAL WORK BEING SAMPLED
Song Title: ___________________________________
Original Artist: ___________________________________
Writer(s): ___________________________________
Publisher(s): ___________________________________
Record Label (Master Owner): ___________________________________
Year of Release: __________
ISRC (if known): ___________________________________

SAMPLE DETAILS
Type: [ ] Sound Recording Sample  [ ] Interpolation  [ ] Replay
Portion Used: ___________________________________
Duration of Sample: ____:____ (MM:SS)
Location in New Song: ____:____ to ____:____
Is the sample recognizable? [ ] Yes  [ ] No
Modifications made: ___________________________________

NEW WORK
New Song Title: ___________________________________
New Artist: ___________________________________
Expected Release Date: ____/____/________
Distribution Scope: [ ] Worldwide  [ ] Territory-specific: __________
Intended Use: [ ] Commercial Release  [ ] Sync  [ ] Mixtape / Promo

FEE STRUCTURE
Typical clearance models (for reference):
- Flat fee: $500 - $50,000+ depending on prominence and commercial scope
- Rollover advance: Flat fee + royalty after sales threshold
- Co-publishing: Ownership share of new composition (often 25-50%)
- Royalty only: Per-unit or percentage of revenue, no upfront fee

Proposed offer: ___________________________________

TRACKING
+-----+---------------------+-----------+----------------------------------+
| #   | Date                | Contact   | Status / Notes                   |
+-----+---------------------+-----------+----------------------------------+
| 1   | ____/____/________  | ________  | Initial outreach sent            |
| 2   | ____/____/________  | ________  | ________________________________ |
| 3   | ____/____/________  | ________  | ________________________________ |
+-----+---------------------+-----------+----------------------------------+

Master clearance obtained: [ ] Yes  [ ] No  Date: ____/____/________
Publishing clearance obtained: [ ] Yes  [ ] No  Date: ____/____/________`, null],

    ['Project Kickoff Brief', 'Other',
`PROJECT KICKOFF BRIEF

PROJECT OVERVIEW
Project Name: ___________________________________
Project Type: [ ] Album  [ ] EP  [ ] Single  [ ] Sync Campaign  [ ] Other
Artist / Client: ___________________________________
Project Lead: ___________________________________
Start Date: ____/____/________
Target Completion: ____/____/________

GOALS AND OBJECTIVES
Primary goal: ___________________________________
Success metrics:
  - ___________________________________
  - ___________________________________
  - ___________________________________

SCOPE AND DELIVERABLES
+-----+------------------------------------+----------------+
| #   | Deliverable                        | Due Date       |
+-----+------------------------------------+----------------+
| 1   | __________________________________ | ______________ |
| 2   | __________________________________ | ______________ |
| 3   | __________________________________ | ______________ |
| 4   | __________________________________ | ______________ |
| 5   | __________________________________ | ______________ |
+-----+------------------------------------+----------------+

TEAM ROLES AND RESPONSIBILITIES
+-----------------------------+-------------------+------------------+
| Role                        | Name              | Contact          |
+-----------------------------+-------------------+------------------+
| Project Manager             | ________________  | ________________ |
| A&R / Creative Director     | ________________  | ________________ |
| Engineer / Producer         | ________________  | ________________ |
| Marketing / PR              | ________________  | ________________ |
| Legal / Business Affairs    | ________________  | ________________ |
| Distribution Contact        | ________________  | ________________ |
+-----------------------------+-------------------+------------------+

BUDGET
Total Budget: $__________
+-----------------------------+-----------+
| Category                    | Allocated |
+-----------------------------+-----------+
| Recording / Production      |           |
| Mixing / Mastering          |           |
| Marketing / Promotion       |           |
| Music Videos / Visual       |           |
| Legal / Licensing           |           |
| Contingency (10%)           |           |
+-----------------------------+-----------+

MILESTONES
+-----+------------------------------------+----------------+-----------+
| #   | Milestone                          | Target Date    | Status    |
+-----+------------------------------------+----------------+-----------+
| 1   | Project kickoff meeting            | ______________ | _________ |
| 2   | Recording complete                 | ______________ | _________ |
| 3   | Mixing and mastering complete      | ______________ | _________ |
| 4   | Marketing assets finalized         | ______________ | _________ |
| 5   | Distribution submission            | ______________ | _________ |
| 6   | Release date                       | ______________ | _________ |
+-----+------------------------------------+----------------+-----------+

NOTES / SPECIAL CONSIDERATIONS
___________________________________________________________________
___________________________________________________________________`, null],

    ['Dispute/Claim Intake Form', 'Other',
`DISPUTE / CLAIM INTAKE FORM

Complete this form for any ownership dispute, royalty claim, or
takedown request. All fields are required unless marked optional.

CLAIM REFERENCE NUMBER: _____________________ (assigned by admin)
Date Filed: ____/____/________

CLAIMANT INFORMATION
Name / Entity: ___________________________________
Role: [ ] Writer  [ ] Publisher  [ ] Producer  [ ] Label  [ ] Other: ______
Email: ___________________________________
Phone: ___________________________________
Legal Representative (optional): ___________________________________

CLAIM TYPE
[ ] Ownership / Split Dispute -- Disagreement over composition shares
[ ] Royalty Underpayment -- Alleged incorrect or missing royalty payment
[ ] Unauthorized Use -- Work used without permission or license
[ ] Credit Omission -- Missing or incorrect credit on released work
[ ] Takedown Request -- Request to remove content from DSPs
[ ] Counter-Notification -- Response to a previous claim or takedown
[ ] Other: ___________________________________

WORK(S) IN QUESTION
Song Title: ___________________________________
ISRC: ___________________________________
UPC (if release-level): ___________________________________
Release Date: ____/____/________
Platform(s) affected: ___________________________________

DESCRIPTION OF CLAIM
Provide a detailed summary of the dispute, including relevant dates,
parties involved, and the specific issue:
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

EVIDENCE PROVIDED
[ ] Signed split sheet or agreement
[ ] PRO registration confirmation
[ ] Correspondence (emails, messages) supporting claim
[ ] Royalty statements showing discrepancy
[ ] Screenshots of incorrect credits or usage
[ ] Copyright registration certificate
[ ] Other: ___________________________________

TIMELINE OF EVENTS
+-----+--------------------+----------------------------------------------+
| #   | Date               | Event                                        |
+-----+--------------------+----------------------------------------------+
| 1   | __________________ | ____________________________________________ |
| 2   | __________________ | ____________________________________________ |
| 3   | __________________ | ____________________________________________ |
+-----+--------------------+----------------------------------------------+

REQUESTED RESOLUTION
[ ] Correction of ownership splits to: ___________________________________
[ ] Payment of outstanding royalties: $__________
[ ] Removal of content from platforms
[ ] Credit correction on all platforms and metadata
[ ] Other: ___________________________________

INTERNAL USE ONLY
Assigned to: ___________________  Priority: [ ] Low  [ ] Medium  [ ] High
Status: [ ] Open  [ ] Under Review  [ ] Resolved  [ ] Escalated
Resolution date: ____/____/________
Resolution summary: ________________________________________________`, null],
  ];

  for (const [title, category, body, sourceUrl] of templateData) {
    await db.query(
      `INSERT INTO templates (title, category, body, source_url, created_by, verification_status, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, 'verified', NOW()) RETURNING id`,
      [title, category, body, sourceUrl, adminId]
    );
  }
  console.log(`Templates: ${templateData.length}`);

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('SEED COMPLETE — Final Counts:');
  console.log('========================================');

  const countQueries = [
    ['users',                'SELECT COUNT(*) FROM users'],
    ['artists',              'SELECT COUNT(*) FROM artists'],
    ['projects',             'SELECT COUNT(*) FROM projects'],
    ['project_collaborators','SELECT COUNT(*) FROM project_collaborators'],
    ['subscription_tiers',   'SELECT COUNT(*) FROM subscription_tiers'],
    ['artist_subscriptions', 'SELECT COUNT(*) FROM artist_subscriptions'],
    ['assets',               'SELECT COUNT(*) FROM assets'],
    ['placements',           'SELECT COUNT(*) FROM placements'],
    ['ownership_records',    'SELECT COUNT(*) FROM ownership_records'],
    ['usage_records',        'SELECT COUNT(*) FROM usage_records'],
    ['revenue_events',       'SELECT COUNT(*) FROM revenue_events'],
    ['recoupable_expenses',  'SELECT COUNT(*) FROM recoupable_expenses'],
    ['tasks',                'SELECT COUNT(*) FROM tasks'],
    ['activity_feed',        'SELECT COUNT(*) FROM activity_feed'],
    ['contacts',             'SELECT COUNT(*) FROM contacts'],
    ['templates',            'SELECT COUNT(*) FROM templates'],
  ];

  for (const [label, sql] of countQueries) {
    const { rows } = await db.query(sql);
    console.log(`  ${label.padEnd(24)} ${rows[0].count}`);
  }

  console.log('\n========================================');
  console.log('TEST ACCOUNT CREDENTIALS:');
  console.log('========================================');
  console.log('  owner@pryntis.io       / owner123        (owner)');
  console.log('  admin@pryntis.io       / admin123        (admin)');
  console.log('  manager@pryntis.io     / manager123      (manager)');
  console.log('  engineer@pryntis.io    / engineer123     (audio_engineer)');
  console.log('  contributor@pryntis.io / contributor123  (contributor)');
  console.log('  viewer@pryntis.io      / viewer123       (viewer)');
  console.log('========================================\n');

}

module.exports = seed;

// Run directly when executed as a script
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
