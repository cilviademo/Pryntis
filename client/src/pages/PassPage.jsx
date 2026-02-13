import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/* ============================================================
   SVG Icon Components
   ============================================================ */
const IconThumbsUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 22V11l5-9 2 1-1 5h7a2 2 0 0 1 2 2.2l-1.5 7.5A2 2 0 0 1 18.5 19H7z" />
    <path d="M3 11v11h4V11H3z" />
  </svg>
);

const IconFire = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2c1 4-2 6-2 10a4 4 0 0 0 8 0c0-4-3-6-3-8" />
    <path d="M12 22a8 8 0 0 1-8-8c0-5 4-8 4-12 0 4 4 4 4 8a4 4 0 0 0 8 0" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconMusic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconHeadphones = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const IconPackage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

/* ============================================================
   Tier color map (preserved from original)
   ============================================================ */
const TIER_COLORS = {
  Free: '#6b7280',
  Basic: '#3b82f6',
  Pro: '#8b5cf6',
  Enterprise: '#f59e0b',
};

/* ============================================================
   Static Data
   ============================================================ */
const engineeringServices = [
  { id: 1, name: 'Mixing', desc: 'Full mix session -- balancing, EQ, compression, effects, automation', turnaround: '3-5 business days', priceRange: '$300 - $800' },
  { id: 2, name: 'Mastering', desc: 'Final master for distribution -- loudness, stereo width, format delivery', turnaround: '1-2 business days', priceRange: '$100 - $300' },
  { id: 3, name: 'Vocal Tuning', desc: 'Pitch correction and timing alignment for lead and background vocals', turnaround: '1-2 business days', priceRange: '$75 - $200' },
  { id: 4, name: 'Stem Preparation', desc: 'Export and organize stems for sync licensing, remixes, or collaboration', turnaround: '1-2 business days', priceRange: '$50 - $150' },
  { id: 5, name: 'Session Editing', desc: 'Comp takes, clean edits, noise removal, arrangement adjustments', turnaround: '2-3 business days', priceRange: '$100 - $400' },
  { id: 6, name: 'Mastering for Vinyl', desc: 'Specialized mastering with vinyl-specific EQ curves and dynamics', turnaround: '3-5 business days', priceRange: '$200 - $500' },
];

const producerLibrary = [
  { id: 1, name: '808 Mafia Essentials', type: 'Drum Kit', genre: 'Trap', bpm: '140-160', key: 'Various', samples: 45, license: 'Royalty-Free', creator: 'MVRK' },
  { id: 2, name: 'Velvet Vocals Vol. 1', type: 'Loop Pack', genre: 'R&B', bpm: '90-110', key: 'Various', samples: 30, creator: 'Luna Rey', license: 'Royalty-Free' },
  { id: 3, name: 'Cinematic Textures', type: 'One-Shots', genre: 'Cinematic', bpm: 'N/A', key: 'Various', samples: 60, creator: 'Sable', license: 'Sync-Ready' },
  { id: 4, name: 'Latin Heat Percussion', type: 'Loop Pack', genre: 'Latin', bpm: '100-130', key: 'Various', samples: 35, creator: 'Crux', license: 'Royalty-Free' },
  { id: 5, name: 'Lo-Fi Bedroom Pack', type: 'Preset Pack', genre: 'Lo-Fi', bpm: '70-90', key: 'Various', samples: 25, creator: 'Bree Wave', license: 'Royalty-Free' },
  { id: 6, name: 'Boom Bap Foundations', type: 'Drum Kit', genre: 'Hip-Hop', bpm: '85-95', key: 'Various', samples: 40, creator: 'Tone Russo', license: 'Royalty-Free' },
  { id: 7, name: 'Analog Warmth Collection', type: 'Preset Pack', genre: 'Electronic', bpm: 'Various', key: 'Various', samples: 50, creator: 'Priya Nova', license: 'Sync-Ready' },
  { id: 8, name: 'Orchestral Swells', type: 'One-Shots', genre: 'Cinematic', bpm: 'N/A', key: 'C Major', samples: 20, creator: 'Ray K', license: 'Sync-Ready' },
];

const opsChecklists = [
  { id: 1, name: 'Weekly Label Review', items: ['Review open tasks and deadlines', 'Check pending placements status', 'Review revenue events and payables', 'Update artist health score follow-ups', 'Verify metadata completeness for new assets'], link: '/analytics' },
  { id: 2, name: 'Release Readiness', items: ['Confirm master audio approved', 'Verify ISRC/UPC assigned', 'Check metadata (title, credits, artwork)', 'Confirm distribution platform setup', 'Schedule marketing and PR push', 'Verify split sheets signed'], link: '/port/assets' },
  { id: 3, name: 'Metadata QC', items: ['Verify ISRC codes present', 'Check writer/publisher splits sum to 100%', 'Confirm PRO registrations submitted', 'Validate genre and mood tags', 'Check BPM and key signature accuracy'], link: '/port/assets' },
  { id: 4, name: 'Sync Pitch Preparation', items: ['Select pitchable assets from catalog', 'Prepare one-sheet per asset', 'Verify chain of title / clearances', 'Create cue sheet templates', 'Update contact list for supervisors', 'Package stems and alt mixes'], link: '/port/placements' },
  { id: 5, name: 'New Artist Onboarding', items: ['Collect signed agreements', 'Set up subscription tier', 'Upload initial asset catalog', 'Create project workspace', 'Assign task workflows', 'Schedule intro call with engineering'], link: '/artists' },
  { id: 6, name: 'Quarterly Royalty Review', items: ['Pull revenue reports by artist', 'Calculate recoupment positions', 'Generate royalty statements', 'Review pending payables', 'Flag disputes or discrepancies', 'Distribute approved payments'], link: '/business' },
];

/* ============================================================
   Helpers
   ============================================================ */
function eventTypeIcon(eventType) {
  switch (eventType) {
    case 'asset_created':
    case 'asset_updated':
      return <IconMusic />;
    case 'artist_created':
    case 'artist_updated':
      return <IconUser />;
    case 'project_created':
    case 'project_updated':
      return <IconFolder />;
    case 'placement_created':
    case 'placement_updated':
      return <IconStar />;
    default:
      return <IconSettings />;
  }
}

function entityLink(entityType, entityId) {
  switch (entityType) {
    case 'artist':
      return `/artists/${entityId}`;
    case 'project':
      return `/projects/${entityId}`;
    case 'asset':
      return `/port/assets/${entityId}`;
    case 'placement':
      return `/port/placements`;
    default:
      return null;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

const libraryGenres = ['All', 'Trap', 'R&B', 'Cinematic', 'Latin', 'Lo-Fi', 'Hip-Hop', 'Electronic'];
const libraryTypes = ['All', 'Drum Kit', 'Loop Pack', 'One-Shots', 'Preset Pack'];

/* ============================================================
   PassPage Component
   ============================================================ */
export default function PassPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const canEdit = isAdmin || user?.role === 'manager';

  /* ------ Tab state ------ */
  const [activeTab, setActiveTab] = useState('feed');

  /* ------ Subscription data (preserved) ------ */
  const [tiers, setTiers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [featureMatrix, setFeatureMatrix] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  /* ------ Tier modal (preserved) ------ */
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState({
    name: '', description: '', price: '', access_level: '', features: '',
  });
  const [tierFormError, setTierFormError] = useState('');
  const [tierSubmitting, setTierSubmitting] = useState(false);

  /* ------ Subscription modal (preserved) ------ */
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subForm, setSubForm] = useState({
    artist_id: '', tier_id: '', status: 'active', start_date: '', end_date: '',
  });
  const [subFormError, setSubFormError] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  /* ------ Feed state ------ */
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  /* ------ Engineering state ------ */
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ project: '', notes: '', deadline: '' });
  const [recentDeliverables] = useState([
    { id: 1, service: 'Mixing', project: 'Neon Dreams EP', artist: 'Luna Rey', status: 'delivered', revision: 2, date: '2026-02-10' },
    { id: 2, service: 'Mastering', project: 'Street Anthems Vol. 3', artist: 'MVRK', status: 'in_review', revision: 1, date: '2026-02-11' },
    { id: 3, service: 'Vocal Tuning', project: 'Midnight Sessions', artist: 'Bree Wave', status: 'in_progress', revision: 0, date: '2026-02-12' },
  ]);

  /* ------ Producer Library state ------ */
  const [libGenreFilter, setLibGenreFilter] = useState('All');
  const [libTypeFilter, setLibTypeFilter] = useState('All');
  const [libSearch, setLibSearch] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);

  /* ------ Ops Toolkit state ------ */
  const [expandedChecklist, setExpandedChecklist] = useState(null);
  const [checklistState, setChecklistState] = useState({});

  /* ============================================================
     Data Fetching
     ============================================================ */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [
        api.get('/pass/tiers'),
        api.get('/pass/subscriptions'),
        api.get('/pass/feature-matrix'),
      ];
      if (isAdmin) promises.push(api.get('/pass/audit?limit=25'));

      const results = await Promise.all(promises);
      setTiers(Array.isArray(results[0]) ? results[0] : []);
      setSubscriptions(Array.isArray(results[1]) ? results[1] : []);
      setFeatureMatrix(Array.isArray(results[2]) ? results[2] : []);
      if (isAdmin && results[3]) setAuditLog(Array.isArray(results[3]) ? results[3] : []);
    } catch (err) {
      setError('Failed to load subscription data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError('');
    try {
      const data = await api.get('/dashboard/recent-activity');
      setFeedItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedError('Failed to load activity feed');
      console.error(err);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchFeed();
  }, [fetchData, fetchFeed]);

  /* ============================================================
     Tier Handlers (preserved)
     ============================================================ */
  const openCreateTier = () => {
    setEditingTier(null);
    setTierForm({ name: '', description: '', price: '', access_level: '', features: '' });
    setTierFormError('');
    setShowTierModal(true);
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name || '',
      description: tier.description || '',
      price: tier.price_monthly != null ? String(tier.price_monthly) : (tier.price != null ? String(tier.price) : ''),
      access_level: tier.access_level || '',
      features: Array.isArray(tier.features) ? tier.features.join(', ') : (tier.features || ''),
    });
    setTierFormError('');
    setShowTierModal(true);
  };

  const handleTierChange = (field) => (e) => setTierForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitTier = async (e) => {
    e.preventDefault();
    if (!tierForm.name.trim()) { setTierFormError('Name is required'); return; }
    if (!tierForm.access_level) { setTierFormError('Access level is required'); return; }
    setTierFormError('');
    setTierSubmitting(true);
    try {
      const payload = {
        ...tierForm,
        price_monthly: tierForm.price ? parseFloat(tierForm.price) : null,
        features: tierForm.features ? tierForm.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      };
      delete payload.price;
      if (editingTier) {
        await api.put(`/pass/tiers/${editingTier.id}`, payload);
      } else {
        await api.post('/pass/tiers', payload);
      }
      setShowTierModal(false);
      fetchData();
    } catch (err) {
      setTierFormError(err.message || 'Failed to save tier');
    } finally {
      setTierSubmitting(false);
    }
  };

  /* ============================================================
     Subscription Handlers (preserved)
     ============================================================ */
  const openCreateSub = () => {
    setEditingSub(null);
    setSubForm({ artist_id: '', tier_id: '', status: 'active', start_date: '', end_date: '' });
    setSubFormError('');
    setShowSubModal(true);
  };

  const openEditSub = (sub) => {
    setEditingSub(sub);
    setSubForm({
      artist_id: sub.artist_id || '',
      tier_id: sub.tier_id || '',
      status: sub.status || 'active',
      start_date: sub.start_date ? sub.start_date.split('T')[0] : '',
      end_date: sub.end_date ? sub.end_date.split('T')[0] : '',
    });
    setSubFormError('');
    setShowSubModal(true);
  };

  const handleSubChange = (field) => (e) => setSubForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitSub = async (e) => {
    e.preventDefault();
    if (!subForm.artist_id.trim()) { setSubFormError('Artist ID is required'); return; }
    if (!subForm.tier_id) { setSubFormError('Tier is required'); return; }
    setSubFormError('');
    setSubSubmitting(true);
    try {
      const payload = { ...subForm };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (editingSub) {
        await api.put(`/pass/subscriptions/${editingSub.id}`, payload);
      } else {
        await api.post('/pass/subscriptions', payload);
      }
      setShowSubModal(false);
      fetchData();
    } catch (err) {
      setSubFormError(err.message || 'Failed to save subscription');
    } finally {
      setSubSubmitting(false);
    }
  };

  /* ============================================================
     Reaction Handler
     ============================================================ */
  const handleReaction = async (activityId, reaction) => {
    try {
      await api.post(`/activity/${activityId}/reactions`, { reaction });
      fetchFeed();
    } catch (err) {
      console.error('Failed to add reaction', err);
    }
  };

  /* ============================================================
     Filter helpers
     ============================================================ */
  const filteredSubs = subscriptions.filter((sub) => {
    if (search) {
      const q = search.toLowerCase();
      const name = (sub.artist_name || sub.stage_name || '').toLowerCase();
      if (!name.includes(q)) return false;
    }
    if (statusFilter && sub.status !== statusFilter) return false;
    return true;
  });

  const creatorStatsMap = {};
  subscriptions.forEach((s) => {
    const artistKey = s.artist_id;
    if (!creatorStatsMap[artistKey]) {
      creatorStatsMap[artistKey] = {
        assetCount: s.asset_count != null ? Number(s.asset_count) : 0,
        placementCount: s.placement_count != null ? Number(s.placement_count) : 0,
      };
    } else {
      if (s.asset_count != null) creatorStatsMap[artistKey].assetCount = Number(s.asset_count);
      if (s.placement_count != null) creatorStatsMap[artistKey].placementCount = Number(s.placement_count);
    }
  });

  const filteredLibrary = producerLibrary.filter((pack) => {
    if (libGenreFilter !== 'All' && pack.genre !== libGenreFilter) return false;
    if (libTypeFilter !== 'All' && pack.type !== libTypeFilter) return false;
    if (libSearch) {
      const q = libSearch.toLowerCase();
      if (!pack.name.toLowerCase().includes(q) && !pack.creator.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ============================================================
     Checklist toggle
     ============================================================ */
  const toggleCheckItem = (checklistId, idx) => {
    setChecklistState((prev) => {
      const key = `${checklistId}-${idx}`;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const getChecklistCompleted = (checklist) => {
    let count = 0;
    checklist.items.forEach((_, idx) => {
      if (checklistState[`${checklist.id}-${idx}`]) count++;
    });
    return count;
  };

  /* ============================================================
     Loading gate
     ============================================================ */
  if (loading) return <div className="loading">Loading marketplace data...</div>;

  /* ============================================================
     Tabs
     ============================================================ */
  const tabs = [
    { key: 'feed', label: 'Feed' },
    { key: 'engineering', label: 'Engineering' },
    { key: 'library', label: 'Producer Library' },
    { key: 'ops', label: 'Ops Toolkit' },
    { key: 'roadmap', label: 'Roadmap' },
    { key: 'subscriptions', label: 'Subscriptions' },
  ];

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Pass</h2>
          <div className="page-header-sub">Creator marketplace, services, and subscription management</div>
        </div>
        <div className="flex gap-8">
          {isAdmin && (
            <button className="btn btn-secondary" onClick={openCreateTier}>Add Tier</button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={openCreateSub}>Assign Subscription</button>
          )}
        </div>
      </div>

      {error && <div className="empty-state">{error}</div>}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab${activeTab === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================
          TAB 1: Feed
          ============================================================ */}
      {activeTab === 'feed' && (
        <div className="detail-section">
          <div className="flex items-center justify-between mb-16">
            <h3 style={{ marginBottom: 0 }}>Activity Feed</h3>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewPostModal(true)}>
                <IconPlus /> New Post
              </button>
            )}
          </div>

          {feedLoading && <div className="loading">Loading feed...</div>}
          {feedError && <div className="empty-state">{feedError}</div>}
          {!feedLoading && !feedError && feedItems.length === 0 && (
            <div className="empty-state">No activity yet</div>
          )}

          {!feedLoading && feedItems.length > 0 && (
            <div className="flex flex-col gap-8">
              {feedItems.map((item) => {
                const link = entityLink(item.entity_type, item.entity_id);
                const actorName = [item.actor_first_name, item.actor_last_name].filter(Boolean).join(' ') || 'System';
                const reactions = Array.isArray(item.reactions) ? item.reactions : [];
                const thumbsCount = reactions.find((r) => r.reaction === 'thumbs_up')?.count || 0;
                const eyesCount = reactions.find((r) => r.reaction === 'eyes')?.count || 0;

                return (
                  <div key={item.id} className="card card--compact" style={{ padding: '16px 20px' }}>
                    <div className="flex items-center gap-12">
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {eventTypeIcon(item.event_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-8 flex-wrap">
                          <span className="font-semibold text-sm">{actorName}</span>
                          <span className="badge badge--in_progress" style={{ fontSize: 10 }}>
                            {(item.event_type || '').replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted ml-auto nowrap">{timeAgo(item.created_at)}</span>
                        </div>
                        <div className="text-sm text-secondary" style={{ marginTop: 4 }}>
                          {link ? (
                            <Link to={link} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {item.summary || 'Activity recorded'}
                            </Link>
                          ) : (
                            item.summary || 'Activity recorded'
                          )}
                        </div>
                        <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
                          <button
                            className="reaction-pill"
                            onClick={() => handleReaction(item.id, 'thumbs_up')}
                            title="Thumbs up"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconThumbsUp />
                            {thumbsCount > 0 && <span style={{ fontSize: 11, marginLeft: 2 }}>{thumbsCount}</span>}
                          </button>
                          <button
                            className="reaction-pill"
                            onClick={() => handleReaction(item.id, 'fire')}
                            title="Fire"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconFire />
                          </button>
                          <button
                            className="reaction-pill"
                            onClick={() => handleReaction(item.id, 'eyes')}
                            title="Watching"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconEye />
                            {eyesCount > 0 && <span style={{ fontSize: 11, marginLeft: 2 }}>{eyesCount}</span>}
                          </button>
                          {link && (
                            <Link to={link} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 8px' }}>
                              <IconLink /> View
                            </Link>
                          )}
                          {item.comment_count > 0 && (
                            <span className="text-xs text-muted">{item.comment_count} comment{item.comment_count !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: Engineering
          ============================================================ */}
      {activeTab === 'engineering' && (
        <>
          <div className="detail-section">
            <div className="flex items-center justify-between mb-16">
              <div>
                <h3 style={{ marginBottom: 0 }}>Audio Engineering Services</h3>
                <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                  Professional audio services for your projects. Request a service to get started.
                </p>
              </div>
            </div>

            <div className="card-grid">
              {engineeringServices.map((svc) => (
                <div key={svc.id} className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-primary)' }}>
                  <div className="card-header">
                    <div className="flex items-center gap-8">
                      <IconHeadphones />
                      <h4 style={{ margin: 0 }}>{svc.name}</h4>
                    </div>
                  </div>
                  <p className="text-sm text-secondary mb-8">{svc.desc}</p>
                  <div className="card-limits">
                    <div className="flex items-center gap-8 mb-8">
                      <IconClock />
                      <span className="text-xs">{svc.turnaround}</span>
                    </div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-success)' }}>{svc.priceRange}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12, width: '100%' }}
                    onClick={() => {
                      setSelectedService(svc);
                      setServiceForm({ project: '', notes: '', deadline: '' });
                      setShowServiceModal(true);
                    }}
                  >
                    Request Service
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h3>Recent Engineering Deliverables</h3>
            <p className="text-sm text-secondary mb-16">Track revision status for active engineering orders.</p>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Project</th>
                    <th>Artist</th>
                    <th>Revision</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliverables.map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.service}</td>
                      <td>{d.project}</td>
                      <td>{d.artist}</td>
                      <td>
                        <span className="badge badge--in_progress">Rev {d.revision}</span>
                      </td>
                      <td>
                        <span className={`badge badge--${d.status === 'delivered' ? 'active' : d.status === 'in_review' ? 'pending' : 'in_progress'}`}>
                          {d.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="nowrap">{new Date(d.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          TAB 3: Producer Library
          ============================================================ */}
      {activeTab === 'library' && (
        <div className="detail-section">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h3 style={{ marginBottom: 0 }}>Producer Library</h3>
              <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                Browse sound packs, drum kits, and presets from the community.
              </p>
            </div>
          </div>

          <div className="filter-bar">
            <input
              placeholder="Search packs or creators..."
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
            />
            <select value={libGenreFilter} onChange={(e) => setLibGenreFilter(e.target.value)}>
              {libraryGenres.map((g) => (
                <option key={g} value={g}>{g === 'All' ? 'All Genres' : g}</option>
              ))}
            </select>
            <select value={libTypeFilter} onChange={(e) => setLibTypeFilter(e.target.value)}>
              {libraryTypes.map((t) => (
                <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
              ))}
            </select>
            <span className="filter-count">{filteredLibrary.length} pack{filteredLibrary.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredLibrary.length === 0 ? (
            <div className="empty-state">No packs match your filters</div>
          ) : (
            <div className="card-grid">
              {filteredLibrary.map((pack) => (
                <div
                  key={pack.id}
                  className="card card--compact cursor-pointer"
                  onClick={() => setSelectedPack(pack)}
                  style={{ transition: 'border-color 0.15s' }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-8">
                      <IconPackage />
                      <span className="font-semibold text-sm">{pack.name}</span>
                    </div>
                  </div>
                  <div className="text-xs text-secondary mb-8">by {pack.creator}</div>
                  <div className="flex items-center gap-8 flex-wrap">
                    <span className="badge badge--in_progress">{pack.genre}</span>
                    <span className="badge badge--pending">{pack.type}</span>
                    <span className="text-xs text-muted ml-auto">{pack.samples} samples</span>
                  </div>
                  <div className="flex items-center gap-8 mt-8">
                    <span className={`badge ${pack.license === 'Royalty-Free' ? 'badge--active' : 'badge--draft'}`}>
                      {pack.license}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card card--compact mt-24">
            <h4>License Terms</h4>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              <p className="mb-8">
                <strong style={{ color: 'var(--color-text)' }}>Royalty-Free:</strong> Once downloaded, you may use the samples
                in unlimited commercial and non-commercial productions. No additional royalties or clearance required.
                Credit is appreciated but not mandatory.
              </p>
              <p className="mb-8">
                <strong style={{ color: 'var(--color-text)' }}>Sync-Ready:</strong> Pre-cleared for synchronization licensing.
                Suitable for film, TV, advertising, and gaming placements. Chain of title documentation included.
                Contact rights management for specific sync deal terms.
              </p>
              <p>
                All packs remain the intellectual property of the original creator. Redistribution of raw samples is
                prohibited. Derivative works using these samples are fully owned by the licensee.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: Ops Toolkit
          ============================================================ */}
      {activeTab === 'ops' && (
        <div className="detail-section">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h3 style={{ marginBottom: 0 }}>Ops Toolkit</h3>
              <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                Operational checklists and shortcuts for label management workflows.
              </p>
            </div>
          </div>

          <div className="card-grid--wide card-grid">
            {opsChecklists.map((checklist) => {
              const isExpanded = expandedChecklist === checklist.id;
              const completedCount = getChecklistCompleted(checklist);
              const totalItems = checklist.items.length;

              return (
                <div key={checklist.id} className="card card--compact">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedChecklist(isExpanded ? null : checklist.id)}
                  >
                    <div className="flex items-center gap-8">
                      <IconCheck />
                      <span className="font-semibold text-sm">{checklist.name}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="text-xs text-muted">{completedCount}/{totalItems}</span>
                      <span style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s', display: 'flex',
                      }}>
                        <IconChevronRight />
                      </span>
                    </div>
                  </div>

                  {completedCount > 0 && completedCount < totalItems && (
                    <div style={{
                      marginTop: 8, height: 3, background: 'var(--color-surface-2)',
                      borderRadius: 2, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${(completedCount / totalItems) * 100}%`,
                        background: 'var(--color-primary)', borderRadius: 2, transition: 'width 0.2s',
                      }} />
                    </div>
                  )}
                  {completedCount === totalItems && totalItems > 0 && (
                    <div className="text-xs mt-8" style={{ color: 'var(--color-success)' }}>All items complete</div>
                  )}

                  {isExpanded && (
                    <div style={{ marginTop: 16 }}>
                      <div className="flex flex-col gap-8">
                        {checklist.items.map((item, idx) => {
                          const isChecked = !!checklistState[`${checklist.id}-${idx}`];
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-8 cursor-pointer"
                              style={{
                                fontSize: 13, color: isChecked ? 'var(--color-text-muted)' : 'var(--color-text)',
                                textDecoration: isChecked ? 'line-through' : 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCheckItem(checklist.id, idx)}
                                style={{ accentColor: 'var(--color-primary)', flexShrink: 0 }}
                              />
                              {item}
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                        <Link to={checklist.link} className="btn btn-secondary btn-sm">
                          <IconLink /> Go to related page
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 5: Roadmap (preserved exactly)
          ============================================================ */}
      {activeTab === 'roadmap' && (
        <div className="detail-section">
          <h3>Analog Modeling Roadmap</h3>
          <p className="text-sm text-secondary mb-16">
            Planned feature releases for the Pryntis analog modeling suite. Each phase introduces new capabilities
            aligned with subscription tier availability.
          </p>
          <div className="card-grid">
            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-success)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 1 -- Current</h4>
                <span className="badge badge--active">Live</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Foundation layer available across all tiers. Core digital infrastructure
                for managing music assets and rights.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Included Capabilities</div>
                <div>Digital asset management and cataloging</div>
                <div>Sync licensing workflow automation</div>
                <div>Ownership tracking and chain-of-title records</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: All Tiers</span>
              </div>
            </div>

            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-info)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 2 -- Q2 2026</h4>
                <span className="badge badge--in_progress">In Development</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Introduction of analog sound modeling tools. Authentic vintage
                hardware emulation for modern production workflows.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Planned Capabilities</div>
                <div>Analog tape emulation presets (reel-to-reel, cassette, 8-track)</div>
                <div>Vintage EQ modeling (Pultec, Neve, API style curves)</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: Pro and Enterprise Tiers</span>
              </div>
            </div>

            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-warning)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 3 -- Q3 2026</h4>
                <span className="badge badge--pending">Planned</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Developer and integration tools for third-party hardware connectivity
                and real-time audio processing pipelines.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Planned Capabilities</div>
                <div>Hardware integration SDK for outboard gear connectivity</div>
                <div>Real-time processing API with sub-5ms latency target</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: Enterprise Tier</span>
              </div>
            </div>

            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-primary)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 4 -- Q4 2026</h4>
                <span className="badge badge--draft">Roadmap</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Complete analog modeling suite with native DAW integration.
                Full production-grade toolchain for professional studios.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Planned Capabilities</div>
                <div>Full analog modeling suite (compressors, preamps, saturators)</div>
                <div>DAW plugins (VST3, AU, AAX) with preset management</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: Enterprise Tier</span>
              </div>
            </div>
          </div>

          <div className="card card--compact mt-24">
            <h4>Tier Availability Matrix</h4>
            <p className="text-sm text-secondary mb-16">
              Feature availability by subscription tier as each phase is released.
            </p>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th className="text-center">Free</th>
                    <th className="text-center">Basic</th>
                    <th className="text-center">Pro</th>
                    <th className="text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">Phase 1: Digital Asset Management</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Phase 2: Analog Tape and EQ Modeling</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Phase 3: Hardware SDK and Processing API</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Phase 4: Full Modeling Suite and DAW Plugins</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 6: Subscriptions (condensed)
          ============================================================ */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Tier Cards */}
          <div className="detail-section">
            <div className="flex items-center justify-between mb-16">
              <h3 style={{ marginBottom: 0 }}>Subscription Tiers</h3>
              {isAdmin && (
                <button className="btn btn-secondary btn-sm" onClick={openCreateTier}>
                  <IconPlus /> Add Tier
                </button>
              )}
            </div>
            {tiers.length === 0 ? (
              <div className="empty-state">No tiers configured</div>
            ) : (
              <div className="card-grid">
                {tiers.map((tier) => {
                  const limits = tier.limits || {};
                  const color = TIER_COLORS[tier.name] || '#6b7280';
                  return (
                    <div key={tier.id} className="card card--compact card--border-top" style={{ borderTopColor: color }}>
                      <div className="card-header">
                        <h4 style={{ margin: 0 }}>{tier.name}</h4>
                        {isAdmin && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditTier(tier)}>Edit</button>
                        )}
                      </div>
                      <div className="card-price" style={{ color }}>
                        {tier.price_monthly != null && Number(tier.price_monthly) > 0 ? `$${Number(tier.price_monthly).toFixed(2)}` : 'Free'}
                        {tier.price_monthly != null && Number(tier.price_monthly) > 0 && <span className="card-price__period">/mo</span>}
                      </div>
                      <div className="text-sm text-secondary mb-8">
                        Access Level: <span className="badge badge--in_progress">{tier.access_level || '--'}</span>
                      </div>
                      {tier.description && <p className="text-sm text-secondary mb-8">{tier.description}</p>}
                      <div className="card-limits">
                        <div className="card-limits__title">Limits</div>
                        <div>Assets: {limits.assets === -1 ? 'Unlimited' : limits.assets || '--'}</div>
                        <div>Placements: {limits.placements === -1 ? 'Unlimited' : limits.placements || '--'}</div>
                      </div>
                      {tier.features && (Array.isArray(tier.features) ? tier.features : []).length > 0 && (
                        <ul className="card-features">
                          {(Array.isArray(tier.features) ? tier.features : []).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subscriptions Table */}
          <div className="detail-section">
            <div className="flex items-center justify-between mb-16">
              <h3 style={{ marginBottom: 0 }}>Artist Subscriptions</h3>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={openCreateSub}>
                  <IconPlus /> Assign
                </button>
              )}
            </div>
            <div className="filter-bar">
              <input placeholder="Search by artist name..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <span className="filter-count">{filteredSubs.length} subscription{filteredSubs.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredSubs.length === 0 ? (
              <div className="empty-state">No subscriptions found</div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Tier</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Creator Stats</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((sub) => {
                      const isExpired = sub.end_date && new Date(sub.end_date) < new Date();
                      return (
                        <tr key={sub.id} style={isExpired && sub.status === 'active' ? { opacity: 0.7 } : undefined}>
                          <td>
                            <div>{sub.artist_name || sub.artist_id}</div>
                            {sub.stage_name && <div className="text-xs text-muted">{sub.stage_name}</div>}
                          </td>
                          <td>
                            <span className="font-semibold" style={{ color: TIER_COLORS[sub.tier_name] || 'inherit' }}>
                              {sub.tier_name || sub.tier_id}
                            </span>
                          </td>
                          <td>{sub.access_level || '--'}</td>
                          <td>
                            <span className={`badge badge--${sub.status || 'active'}`}>
                              {(sub.status || 'active').replace(/_/g, ' ')}
                            </span>
                            {isExpired && sub.status === 'active' && (
                              <span className="text-xs text-danger" style={{ display: 'block' }}>Past End Date</span>
                            )}
                          </td>
                          <td className="nowrap">
                            <div className="text-xs text-secondary">
                              Assets: <span className="font-semibold">{creatorStatsMap[sub.artist_id]?.assetCount || 0}</span>
                            </div>
                            <div className="text-xs text-secondary">
                              Placements: <span className="font-semibold">{creatorStatsMap[sub.artist_id]?.placementCount || 0}</span>
                            </div>
                          </td>
                          <td>{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '--'}</td>
                          <td>{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '--'}</td>
                          {canEdit && (
                            <td><button className="btn btn-secondary btn-sm" onClick={() => openEditSub(sub)}>Edit</button></td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feature Matrix */}
          <div className="detail-section">
            <h3>Feature Matrix</h3>
            <p className="text-sm text-secondary mb-16">Comparison of features and limits available at each subscription tier.</p>
            {featureMatrix.length === 0 ? (
              <div className="empty-state">No tiers configured</div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      {featureMatrix.map((tier) => (
                        <th key={tier.id} className="text-center" style={{ color: TIER_COLORS[tier.name] || 'inherit' }}>
                          {tier.name}
                          <div className="text-xs text-muted" style={{ fontWeight: 400 }}>
                            {Number(tier.price_monthly) > 0 ? `$${Number(tier.price_monthly).toFixed(2)}/mo` : 'Free'}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Asset Limit', render: (t) => t.limits?.assets === -1 ? 'Unlimited' : t.limits?.assets || '--' },
                      { label: 'Placement Limit', render: (t) => t.limits?.placements === -1 ? 'Unlimited' : t.limits?.placements || '--' },
                      { label: 'Dashboard Access', render: () => 'Yes', className: () => 'text-center text-success' },
                      { label: 'Analytics', render: (t) => t.access_level >= 3 ? 'Advanced' : t.access_level >= 2 ? 'Standard' : 'Basic' },
                      { label: 'Placement Tracking', render: (t) => t.access_level >= 2 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 2 ? 'text-success' : 'text-muted'}` },
                      { label: 'Ownership Reports', render: (t) => t.access_level >= 3 ? 'Full Suite' : t.access_level >= 2 ? 'Basic' : 'No' },
                      { label: 'Revenue Tracking', render: (t) => t.access_level >= 3 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 3 ? 'text-success' : 'text-muted'}` },
                      { label: 'Priority Support', render: (t) => t.access_level >= 3 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 3 ? 'text-success' : 'text-muted'}` },
                      { label: 'API Access', render: (t) => t.access_level >= 5 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 5 ? 'text-success' : 'text-muted'}` },
                      { label: 'Custom Integrations', render: (t) => t.access_level >= 5 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 5 ? 'text-success' : 'text-muted'}` },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="font-semibold">{row.label}</td>
                        {featureMatrix.map((tier) => (
                          <td key={tier.id} className={row.className ? row.className(tier) : 'text-center'}>
                            {row.render(tier)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Log (admin only) */}
          {isAdmin && (
            <div className="detail-section">
              <h3>Audit Log</h3>
              <p className="text-sm text-secondary mb-16">Recent subscription and tier changes tracked for compliance.</p>
              {auditLog.length === 0 ? (
                <div className="empty-state">No audit entries yet</div>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
                    </thead>
                    <tbody>
                      {auditLog.map((entry) => (
                        <tr key={entry.id}>
                          <td className="nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                          <td>{entry.user_name || entry.user_email || '--'}</td>
                          <td><span className="badge badge--active">{(entry.action || '').replace(/_/g, ' ')}</span></td>
                          <td className="text-xs">{entry.entity_type}</td>
                          <td className="text-xs truncate" style={{ maxWidth: 300 }}>{entry.details ? JSON.stringify(entry.details) : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* Tier Modal (preserved) */}
      {showTierModal && (
        <div className="modal-overlay" onClick={() => setShowTierModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTier ? 'Edit Tier' : 'Add Tier'}</h3>
            <form onSubmit={submitTier} className="form-stack">
              {tierFormError && <div className="form-error">{tierFormError}</div>}
              <div className="form-group">
                <label>Name *</label>
                <input value={tierForm.name} onChange={handleTierChange('name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Access Level *</label>
                  <input type="number" min="1" max="5" value={tierForm.access_level} onChange={handleTierChange('access_level')} required />
                </div>
                <div className="form-group">
                  <label>Price (monthly)</label>
                  <input type="number" step="0.01" min="0" value={tierForm.price} onChange={handleTierChange('price')} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={tierForm.description} onChange={handleTierChange('description')} />
              </div>
              <div className="form-group">
                <label>Features (comma separated)</label>
                <input value={tierForm.features} onChange={handleTierChange('features')} placeholder="Feature 1, Feature 2, Feature 3" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTierModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={tierSubmitting}>
                  {tierSubmitting ? 'Saving...' : editingTier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Modal (preserved) */}
      {showSubModal && (
        <div className="modal-overlay" onClick={() => setShowSubModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSub ? 'Edit Subscription' : 'Assign Subscription'}</h3>
            <form onSubmit={submitSub} className="form-stack">
              {subFormError && <div className="form-error">{subFormError}</div>}
              <div className="form-group">
                <label>Artist ID *</label>
                <input value={subForm.artist_id} onChange={handleSubChange('artist_id')} placeholder="Artist UUID" required disabled={!!editingSub} />
              </div>
              <div className="form-group">
                <label>Tier *</label>
                <select value={subForm.tier_id} onChange={handleSubChange('tier_id')} required>
                  <option value="">Select Tier</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (Level {t.access_level})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={subForm.status} onChange={handleSubChange('status')}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={subForm.start_date} onChange={handleSubChange('start_date')} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={subForm.end_date} onChange={handleSubChange('end_date')} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={subSubmitting}>
                  {subSubmitting ? 'Saving...' : editingSub ? 'Update' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Post Modal (placeholder) */}
      {showNewPostModal && (
        <div className="modal-overlay" onClick={() => setShowNewPostModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Post</h3>
            <div className="form-stack">
              <div className="form-group">
                <label>Post Type</label>
                <select defaultValue="">
                  <option value="" disabled>Select type...</option>
                  <option value="announcement">Announcement</option>
                  <option value="update">Project Update</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div className="form-group">
                <label>Summary</label>
                <textarea rows={3} placeholder="What would you like to share?" />
              </div>
              <p className="text-xs text-muted">
                Post creation is under development. Activity entries are currently generated automatically from system events.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewPostModal(false)}>Close</button>
                <button type="button" className="btn btn-primary" disabled>Post</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engineering Service Request Modal */}
      {showServiceModal && selectedService && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request: {selectedService.name}</h3>
            <p className="text-sm text-secondary mb-16">{selectedService.desc}</p>
            <div className="flex gap-16 mb-16">
              <div className="text-xs">
                <span className="text-muted">Turnaround:</span> {selectedService.turnaround}
              </div>
              <div className="text-xs">
                <span className="text-muted">Price Range:</span> {selectedService.priceRange}
              </div>
            </div>
            <div className="form-stack">
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  value={serviceForm.project}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, project: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any specific requirements, reference tracks, or instructions..."
                />
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="date"
                  value={serviceForm.deadline}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted">
                Service requests are under development. This form will submit directly to the engineering queue in a future release.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowServiceModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled>Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Producer Library Pack Detail Modal */}
      {selectedPack && (
        <div className="modal-overlay" onClick={() => setSelectedPack(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedPack.name}</h3>
            <div className="flex items-center gap-8 mb-16">
              <span className="badge badge--in_progress">{selectedPack.genre}</span>
              <span className="badge badge--pending">{selectedPack.type}</span>
              <span className={`badge ${selectedPack.license === 'Royalty-Free' ? 'badge--active' : 'badge--draft'}`}>
                {selectedPack.license}
              </span>
            </div>
            <div className="detail-grid mb-16">
              <div className="detail-field">
                <span className="detail-field__label">Creator</span>
                <span className="detail-field__value">{selectedPack.creator}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">BPM Range</span>
                <span className="detail-field__value">{selectedPack.bpm}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Key</span>
                <span className="detail-field__value">{selectedPack.key}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Samples</span>
                <span className="detail-field__value">{selectedPack.samples}</span>
              </div>
            </div>
            <div className="card-limits mb-16">
              <div className="card-limits__title">License</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                {selectedPack.license === 'Royalty-Free'
                  ? 'This pack is royalty-free. Use in unlimited productions without additional clearance. Redistribution of raw samples is prohibited.'
                  : 'This pack is sync-ready. Pre-cleared for synchronization licensing including film, TV, advertising, and gaming. Chain of title documentation included.'}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPack(null)}>Close</button>
              <button type="button" className="btn btn-secondary" disabled>
                <IconPlus /> Add to Project
              </button>
              <button type="button" className="btn btn-primary" disabled>
                <IconDownload /> Download Pack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
