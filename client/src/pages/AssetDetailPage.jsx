import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PresencePill from '../components/PresencePill';
import MediaUploader from '../components/MediaUploader';
import MediaVersionHistory from '../components/MediaVersionHistory';

// Audio file types that should show the player
const AUDIO_TYPES = ['beat', 'stem', 'mix', 'master', 'sample', 'audio'];

export default function AssetDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [asset, setAsset] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Tag management
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const playerIntervalRef = useRef(null);

  // Comments state
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);

  const loadAsset = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/assets/${id}`);
      setAsset(data);

      // Load related data in parallel -- these may 404
      const promises = [
        api.get(`/placements?asset_id=${id}`).catch(() => []),
        api.get(`/assets/${id}/ownership`).catch(() => []),
        api.get(`/assets/${id}/usage`).catch(() => []),
      ];
      const [p, o, u] = await Promise.all(promises);
      setPlacements(Array.isArray(p) ? p : []);
      setOwnership(Array.isArray(o) ? o : []);
      setUsageRecords(Array.isArray(u) ? u : []);
    } catch (err) {
      setError('Failed to load asset');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  // Clean up player interval on unmount
  useEffect(() => {
    return () => {
      if (playerIntervalRef.current) {
        clearInterval(playerIntervalRef.current);
      }
    };
  }, []);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    setAddingTag(true);
    try {
      await api.post(`/assets/${id}/tags`, { tag: newTag.trim() });
      setNewTag('');
      const data = await api.get(`/assets/${id}`);
      setAsset(data);
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await api.del(`/assets/${id}/tags/${tagId}`);
      const data = await api.get(`/assets/${id}`);
      setAsset(data);
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  // Audio player controls
  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (playerIntervalRef.current) {
        clearInterval(playerIntervalRef.current);
        playerIntervalRef.current = null;
      }
    } else {
      // Play
      setIsPlaying(true);
      const duration = asset?.duration || 180; // default 3 min
      const increment = 100 / (duration * 4); // update 4x per second
      playerIntervalRef.current = setInterval(() => {
        setPlayerProgress((prev) => {
          if (prev >= 100) {
            clearInterval(playerIntervalRef.current);
            playerIntervalRef.current = null;
            setIsPlaying(false);
            return 0;
          }
          return prev + increment;
        });
      }, 250);
    }
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
    setPlayerProgress(Math.min(100, Math.max(0, pct)));
  };

  // Comments
  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now(),
      text: commentText.trim(),
      author: user?.name || user?.email || 'You',
      date: new Date().toISOString(),
      entity_type: 'asset',
      entity_id: id,
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
  };

  if (loading) return <div className="loading">Loading asset...</div>;
  if (error && !asset) return <div className="empty-state">{error}</div>;
  if (!asset) return <div className="empty-state">Asset not found</div>;

  const tags = asset.tags || [];
  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatPlayerTime = (progress, totalSeconds) => {
    const total = totalSeconds || 180;
    const currentSec = Math.floor((progress / 100) * total);
    const curM = Math.floor(currentSec / 60);
    const curS = currentSec % 60;
    const totM = Math.floor(total / 60);
    const totS = total % 60;
    return `${curM}:${String(curS).padStart(2, '0')} / ${totM}:${String(totS).padStart(2, '0')}`;
  };

  const isAudioAsset = AUDIO_TYPES.includes((asset.file_type || '').toLowerCase());

  // Ownership analysis
  const ownershipByType = {};
  ownership.forEach((o) => {
    const type = o.ownership_type || o.type || 'unknown';
    if (!ownershipByType[type]) ownershipByType[type] = 0;
    ownershipByType[type] += parseFloat(o.share_percentage || o.percentage || 0);
  });
  const ownershipWarnings = Object.entries(ownershipByType)
    .filter(([, total]) => Math.abs(total - 100) > 0.01)
    .map(([type, total]) => `${type}: ${total.toFixed(1)}%`);

  // Rights status calculation
  const getRightsStatus = () => {
    if (ownership.length === 0) {
      return { label: 'Undocumented', color: 'var(--color-text-muted)', bg: 'rgba(90, 97, 128, 0.15)' };
    }
    const types = Object.keys(ownershipByType);
    const hasOver100 = types.some((t) => ownershipByType[t] > 100.01);
    if (hasOver100) {
      return { label: 'Needs Review', color: 'var(--color-danger)', bg: 'var(--color-danger-light)' };
    }
    const allExact100 = types.length > 0 && types.every((t) => Math.abs(ownershipByType[t] - 100) <= 0.01);
    if (allExact100) {
      return { label: 'Cleared', color: 'var(--color-success)', bg: 'var(--color-success-light)' };
    }
    return { label: 'Partial', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' };
  };
  const rightsStatus = getRightsStatus();

  // Mock version data
  const mockVersions = [
    { version: 3, status: 'final', title: asset.title, date: asset.updated_at || asset.created_at, uploaded_by: 'Current', notes: 'Final approved version' },
    { version: 2, status: 'review', title: asset.title + ' (Rev 2)', date: asset.created_at, uploaded_by: 'Engineer', notes: 'Updated mix levels, added vocal processing' },
    { version: 1, status: 'draft', title: asset.title + ' (Original)', date: asset.created_at, uploaded_by: 'Producer', notes: 'Initial recording and rough mix' },
  ];

  // Usage chart data
  const usageChartOption = usageRecords.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1C2228',
      borderColor: 'rgba(255,255,255,0.07)',
      textStyle: { color: '#F4F4F2' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: usageRecords.map((r) => r.period || r.date || ''),
      axisLabel: { color: '#5f6780', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#5f6780', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    series: [{
      type: 'line',
      data: usageRecords.map((r) => r.count || r.plays || r.streams || 0),
      smooth: true,
      lineStyle: { color: '#0066FF', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 102, 255, 0.2)' },
            { offset: 1, color: 'rgba(0, 102, 255, 0.02)' },
          ],
        },
      },
      itemStyle: { color: '#0066FF' },
    }],
  } : null;

  // Chain of Title Sankey data
  const buildChainOfTitleOption = () => {
    if (ownership.length === 0) return null;

    const typeMap = {};
    ownership.forEach((o) => {
      const type = o.ownership_type || o.type || 'unknown';
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      if (!typeMap[typeName]) typeMap[typeName] = [];
      typeMap[typeName].push(o);
    });

    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    const assetNodeName = asset.title || 'Asset';

    // Type nodes (left side)
    Object.keys(typeMap).forEach((typeName) => {
      if (!nodeSet.has(typeName)) {
        nodes.push({ name: typeName, itemStyle: { color: 'var(--color-primary)' } });
        nodeSet.add(typeName);
      }
    });

    // Asset node (center)
    nodes.push({ name: assetNodeName, itemStyle: { color: 'var(--color-info)' } });
    nodeSet.add(assetNodeName);

    // Owner nodes (right side) and links
    Object.entries(typeMap).forEach(([typeName, owners]) => {
      const typeTotal = owners.reduce((sum, o) => sum + parseFloat(o.share_percentage || o.percentage || 0), 0);

      // Link from type -> asset
      links.push({
        source: typeName,
        target: assetNodeName,
        value: Math.max(typeTotal, 1),
      });

      // Owner nodes and links from asset -> owner
      owners.forEach((o) => {
        const ownerName = o.owner_name || o.artist_name || 'Unknown';
        const share = parseFloat(o.share_percentage || o.percentage || 0);
        // Ensure unique node names by appending type if needed
        const uniqueOwnerName = nodeSet.has(ownerName)
          ? `${ownerName} (${typeName})`
          : ownerName;

        if (!nodeSet.has(uniqueOwnerName)) {
          nodes.push({ name: uniqueOwnerName, itemStyle: { color: 'var(--color-success)' } });
          nodeSet.add(uniqueOwnerName);
        }

        links.push({
          source: assetNodeName,
          target: uniqueOwnerName,
          value: Math.max(share, 1),
        });
      });
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1C2228',
        borderColor: 'rgba(255,255,255,0.07)',
        textStyle: { color: '#F4F4F2' },
      },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'left',
        data: nodes,
        links: links,
        lineStyle: { color: 'gradient', curveness: 0.5 },
        itemStyle: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
        label: { color: '#F4F4F2', fontSize: 12 },
      }],
    };
  };

  const chainOfTitleOption = buildChainOfTitleOption();

  // Waveform bars - generate fixed set of heights for CSS-only waveform
  const waveformBars = [
    35, 55, 40, 70, 85, 60, 45, 90, 75, 50,
    65, 80, 42, 58, 95, 70, 48, 62, 88, 52,
    73, 45, 82, 55, 68, 78, 38, 92, 60, 47,
    72, 85, 53, 67, 43, 78, 90, 55, 63, 82,
    48, 75, 58, 88, 42, 70, 65, 50, 83, 60,
  ];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'tags', label: `Tags (${tags.length})` },
    { key: 'placements', label: `Placements (${placements.length})` },
    { key: 'ownership', label: `Ownership (${ownership.length})` },
    { key: 'versions', label: 'Versions' },
    { key: 'chain-of-title', label: 'Chain of Title' },
    { key: 'usage', label: 'Usage' },
    { key: 'files', label: 'Files' },
  ];

  // Version status badge helper
  const versionStatusStyle = (status) => {
    switch (status) {
      case 'final':
        return { background: 'var(--color-success-light)', color: 'var(--color-success)' };
      case 'review':
        return { background: 'var(--color-warning-light)', color: 'var(--color-warning)' };
      case 'draft':
        return { background: 'rgba(90, 97, 128, 0.15)', color: 'var(--color-text-secondary)' };
      default:
        return { background: 'var(--color-info-light)', color: 'var(--color-info)' };
    }
  };

  // Comments section - shared across all tabs
  const renderCommentsSection = () => (
    <div className="detail-section" style={{ marginTop: '24px' }}>
      <h3>Comments</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '16px' }}>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
          style={{
            flex: 1,
            padding: '9px 12px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-text)',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '40px',
            maxHeight: '120px',
            outline: 'none',
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAddComment}
          disabled={!commentText.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          Add Comment
        </button>
      </div>
      {comments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px 16px',
          color: 'var(--color-text-muted)',
          fontSize: '14px',
        }}>
          No comments yet. Be the first to add context.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '12px 16px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{c.author}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {new Date(c.date).toLocaleDateString()} {new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Audio player component
  const renderAudioPlayer = () => {
    if (!isAudioAsset) return null;

    return (
      <div
        className="detail-section"
        style={{ marginBottom: '24px' }}
      >
        <h3>Player</h3>
        {/* Waveform visualization */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            height: '64px',
            padding: '0 4px',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {waveformBars.map((height, idx) => {
            const barPosition = (idx / waveformBars.length) * 100;
            const isPlayed = barPosition < playerProgress;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: `${height}%`,
                  minWidth: '3px',
                  borderRadius: '2px 2px 0 0',
                  background: isPlayed
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                  transition: 'background 0.15s',
                }}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Play/Pause button */}
          <button
            className="btn btn-primary btn-icon"
            onClick={handlePlayPause}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '16px',
              padding: 0,
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="9" y="1" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 2.268C1 1.44 1.927 0.94 2.624 1.39L12.376 7.122C13.038 7.55 13.038 8.45 12.376 8.878L2.624 14.61C1.927 15.06 1 14.56 1 13.732V2.268Z" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div
            onClick={handleProgressClick}
            style={{
              flex: 1,
              height: '6px',
              background: 'var(--color-surface-2)',
              borderRadius: '3px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${playerProgress}%`,
                height: '100%',
                background: 'var(--color-primary)',
                borderRadius: '3px',
                transition: isPlaying ? 'none' : 'width 0.15s',
              }}
            />
          </div>

          {/* Time display */}
          <span style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontVariantNumeric: 'tabular-nums',
            minWidth: '90px',
            textAlign: 'right',
            flexShrink: 0,
          }}>
            {formatPlayerTime(playerProgress, asset.duration)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            <Link to="/assets">Assets</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <span>{asset.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>{asset.title}</h2>
            {/* Rights Status Badge */}
            <span style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              letterSpacing: '0.2px',
              background: rightsStatus.bg,
              color: rightsStatus.color,
            }}>
              {rightsStatus.label}
            </span>
          </div>
        </div>
        <span className={`badge badge--${asset.file_type || 'unknown'}`}>
          {asset.file_type || 'unknown'}
        </span>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', marginBottom: '-1px', borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent', whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {renderAudioPlayer()}
          <div className="detail-section">
            <h3>Metadata</h3>
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-field__label">Type</span>
                <span className="detail-field__value">{asset.file_type || '--'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Genre</span>
                <span className="detail-field__value">{asset.genre || '--'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">BPM</span>
                <span className="detail-field__value">{asset.bpm || '--'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Key</span>
                <span className="detail-field__value">{asset.key_signature || '--'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Duration</span>
                <span className="detail-field__value">{formatDuration(asset.duration)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Artist</span>
                <span className="detail-field__value">
                  {asset.artist_id ? (
                    <Link to={`/artists/${asset.artist_id}`}>
                      {asset.artist_stage_name || asset.artist_name || 'View Artist'}
                    </Link>
                  ) : '--'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Project</span>
                <span className="detail-field__value">
                  {asset.project_id ? (
                    <Link to={`/projects/${asset.project_id}`}>
                      {asset.project_title || 'View Project'}
                    </Link>
                  ) : '--'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">External URL</span>
                <span className="detail-field__value">
                  {asset.external_url ? (
                    <a href={asset.external_url} target="_blank" rel="noopener noreferrer">{asset.external_url}</a>
                  ) : '--'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field__label">Created</span>
                <span className="detail-field__value">
                  {asset.created_at ? new Date(asset.created_at).toLocaleDateString() : '--'}
                </span>
              </div>
            </div>
            {asset.description && (
              <div style={{ marginTop: '16px' }}>
                <span className="detail-field__label">Description</span>
                <p className="detail-field__value" style={{ marginTop: '4px' }}>{asset.description}</p>
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div>
          <div className="detail-section">
            <h3>Tags</h3>
            {tags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {tags.map((tag) => (
                  <span
                    key={tag.id || tag.tag}
                    className="badge badge--active"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px' }}
                  >
                    {tag.tag || tag.name}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}
                      >
                        x
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ marginBottom: '16px' }}>No tags</div>
            )}
            {canEdit && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  className="form-group"
                  style={{ padding: '8px 12px', width: '220px', margin: 0 }}
                />
                <button className="btn btn-secondary btn-sm" onClick={handleAddTag} disabled={addingTag}>
                  {addingTag ? 'Adding...' : 'Add Tag'}
                </button>
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Placements Tab */}
      {activeTab === 'placements' && (
        <div>
          <div className="detail-section">
            <h3>Placements</h3>
            {placements.length === 0 ? (
              <div className="empty-state">No placements for this asset</div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Status</th>
                      <th>Fee</th>
                      <th>Placed Date</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => (
                      <tr key={p.id}>
                        <td>{p.platform || p.placement_type || '--'}</td>
                        <td>
                          <span className={`badge badge--${p.status}`}>
                            {(p.status || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{p.fee != null ? `$${Number(p.fee).toLocaleString()}` : '--'}</td>
                        <td>{p.placed_date ? new Date(p.placed_date).toLocaleDateString() : '--'}</td>
                        <td>{p.notes || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Ownership Tab */}
      {activeTab === 'ownership' && (
        <div>
          <div className="detail-section">
            <h3>Ownership Splits</h3>
            {ownershipWarnings.length > 0 && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                Warning: Ownership splits do not total 100% for: {ownershipWarnings.join(', ')}
              </div>
            )}
            {ownership.length === 0 ? (
              <div className="empty-state">No ownership records</div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Type</th>
                      <th>Share %</th>
                      <th>Territory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownership.map((o, idx) => (
                      <tr key={o.id || idx}>
                        <td>{o.owner_name || o.artist_name || '--'}</td>
                        <td>{o.ownership_type || o.type || '--'}</td>
                        <td>{o.share_percentage != null ? `${o.share_percentage}%` : o.percentage != null ? `${o.percentage}%` : '--'}</td>
                        <td>{o.territory || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div>
          <div className="detail-section">
            <h3>Version History</h3>
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute',
                left: '11px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: 'var(--color-border)',
              }} />

              {mockVersions.map((v, idx) => {
                const statusStyle = versionStatusStyle(v.status);
                const isCurrent = idx === 0;
                return (
                  <div
                    key={v.version}
                    style={{
                      position: 'relative',
                      marginBottom: idx < mockVersions.length - 1 ? '24px' : '0',
                      padding: '16px 20px',
                      background: isCurrent ? 'var(--color-surface-2)' : 'var(--color-bg)',
                      border: `1px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-27px',
                      top: '20px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: isCurrent ? 'var(--color-primary)' : 'var(--color-border)',
                      border: '2px solid var(--color-surface)',
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                          v{v.version}
                        </span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          ...statusStyle,
                        }}>
                          {v.status}
                        </span>
                        {isCurrent && (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                          }}>
                            Current
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {v.date ? new Date(v.date).toLocaleDateString() : '--'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', color: 'var(--color-text)', marginBottom: '4px' }}>
                      {v.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      {v.notes}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Uploaded by: {v.uploaded_by}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Chain of Title Tab */}
      {activeTab === 'chain-of-title' && (
        <div>
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0 }}>Chain of Title</h3>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                background: rightsStatus.bg,
                color: rightsStatus.color,
              }}>
                Rights Status: {rightsStatus.label}
              </span>
            </div>

            {chainOfTitleOption ? (
              <div>
                <ReactECharts
                  option={chainOfTitleOption}
                  style={{ height: 400, marginBottom: '16px' }}
                />
                {/* Ownership type breakdown summary */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {Object.entries(ownershipByType).map(([type, total]) => {
                    const isExact = Math.abs(total - 100) <= 0.01;
                    const isOver = total > 100.01;
                    return (
                      <div
                        key={type}
                        style={{
                          padding: '12px 16px',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          minWidth: '140px',
                        }}
                      >
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                          marginBottom: '4px',
                        }}>
                          {type}
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: isExact
                            ? 'var(--color-success)'
                            : isOver
                              ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                        }}>
                          {total.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                No ownership data available. Add ownership records to visualize the chain of title.
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div>
          <div className="detail-section">
            <h3>Usage Over Time</h3>
            {usageChartOption ? (
              <ReactECharts option={usageChartOption} style={{ height: 300, marginBottom: '24px' }} />
            ) : (
              <div className="empty-state" style={{ marginBottom: '24px' }}>No usage data available for chart</div>
            )}

            <h3>Usage Records</h3>
            {usageRecords.length === 0 ? (
              <div className="empty-state">No usage records</div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Plays / Streams</th>
                      <th>Revenue</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageRecords.map((r, idx) => (
                      <tr key={r.id || idx}>
                        <td>{r.period || r.date || '--'}</td>
                        <td>{r.count || r.plays || r.streams || 0}</td>
                        <td>{r.revenue != null ? `$${Number(r.revenue).toLocaleString()}` : '--'}</td>
                        <td>{r.source || r.platform || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div>
          <div className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Attached Files</h3>
              <PresencePill roomId={`asset:${id}`} />
            </div>
            <MediaVersionHistory ownerType="asset" ownerId={id} canManage={canEdit} />
            {canEdit && (
              <div style={{ marginTop: '16px' }}>
                <MediaUploader ownerType="asset" ownerId={id} onUploadComplete={() => window.location.reload()} />
              </div>
            )}
          </div>
          {renderCommentsSection()}
        </div>
      )}
    </div>
  );
}
