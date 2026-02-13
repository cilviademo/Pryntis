import React, { useState, useEffect } from 'react';
import api from '../services/api';

function formatBytes(bytes) {
  if (!bytes) return '--';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MediaVersionHistory({ ownerType, ownerId, canManage }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const res = await api.get(`/media?owner_type=${ownerType}&owner_id=${ownerId}`);
      setFiles(res.data?.data || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [ownerType, ownerId]);

  const setCurrent = async (id) => {
    try {
      await api.put(`/media/${id}/set-current`);
      fetchFiles();
    } catch (err) {
      console.error('Failed to set current version:', err);
    }
  };

  if (loading) return <div className="text-sm text-muted">Loading files...</div>;
  if (!files.length) return <div className="text-sm text-muted">No files uploaded yet.</div>;

  return (
    <div className="media-version-history">
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Version</th>
              <th>Uploaded</th>
              <th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id} className={f.is_current ? 'row--highlight' : ''}>
                <td className="font-semibold">{f.file_name}</td>
                <td><span className="badge badge--active">{f.mime_type.split('/')[0]}</span></td>
                <td className="text-sm">{formatBytes(f.size_bytes)}</td>
                <td className="text-sm">v{f.version}</td>
                <td className="text-sm text-secondary">{formatDate(f.created_at)}</td>
                <td>
                  {f.is_current ? (
                    <span className="badge badge--success">Current</span>
                  ) : (
                    <span className="badge">Previous</span>
                  )}
                </td>
                {canManage && (
                  <td>
                    {!f.is_current && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(f.id)}>
                        Set Current
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
