import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ENTITY_ROUTES = {
  artist: (id) => `/artists/${id}`,
  project: (id) => `/projects/${id}`,
  asset: (id) => `/port/assets/${id}`,
  contact: (id) => `/port/contacts`,
  template: (id) => `/port/templates`,
};

const ENTITY_LABELS = {
  artists: 'Artists',
  projects: 'Projects',
  assets: 'Assets',
  contacts: 'Contacts',
  templates: 'Templates',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  function handleSearch(value) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(value.trim())}`);
        setResults(data);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(entityType, id) {
    const route = ENTITY_ROUTES[entityType];
    if (route) {
      navigate(route(id));
    }
    setOpen(false);
    setQuery('');
    setResults(null);
  }

  const resultGroups = results?.results || {};
  const totalCount = results?.total || 0;

  return (
    <div ref={containerRef} className="global-search">
      <div className="global-search__input-wrapper">
        <svg className="global-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="global-search__input"
          placeholder="Search... (Ctrl+K)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
        />
        {loading && <span className="global-search__spinner" />}
      </div>

      {open && results && (
        <div className="global-search__dropdown">
          {totalCount === 0 ? (
            <div className="global-search__empty">No results for "{query}"</div>
          ) : (
            Object.entries(resultGroups).map(([group, items]) => {
              if (!items || items.length === 0) return null;
              return (
                <div key={group} className="global-search__group">
                  <div className="global-search__group-label">{ENTITY_LABELS[group] || group}</div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="global-search__result"
                      onClick={() => handleSelect(item.entity_type, item.id)}
                    >
                      <span className="global-search__result-title">
                        {item.title || item.name || item.stage_name}
                      </span>
                      <span className="global-search__result-meta">
                        {item.genre || item.status || item.organization || item.category || ''}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
