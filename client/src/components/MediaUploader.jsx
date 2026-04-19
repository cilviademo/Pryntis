import React, { useState, useCallback } from 'react';
import api from '../services/api';

const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/aac',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
];

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function MediaUploader({ ownerType, ownerId, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleUpload = useCallback(async (file) => {
    setError('');
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}`);
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(`File too large (max ${formatBytes(MAX_SIZE)})`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('owner_type', ownerType);
    formData.append('owner_id', ownerId);

    setUploading(true);
    setProgress(0);

    try {
      const token = sessionStorage.getItem('pryntis_token');
      const xhr = new XMLHttpRequest();

      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));

        xhr.open('POST', '/api/v1/media/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      setProgress(100);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [ownerType, ownerId, onUploadComplete]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  return (
    <div
      className={`media-uploader${dragging ? ' media-uploader--dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <div className="media-uploader__progress">
          <div className="media-uploader__bar">
            <div className="media-uploader__fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm">{progress}% uploaded</span>
        </div>
      ) : (
        <div className="media-uploader__content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm">Drag and drop a file or <label className="media-uploader__link">
            browse
            <input
              type="file"
              accept="audio/*,video/*,application/pdf"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </label></p>
          <p className="text-xs text-muted">Audio, video, or PDF up to {formatBytes(MAX_SIZE)}</p>
        </div>
      )}
      {error && <div className="text-sm" style={{ color: 'var(--color-danger)', marginTop: '8px' }}>{error}</div>}
    </div>
  );
}
