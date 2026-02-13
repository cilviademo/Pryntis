import React from 'react';

export default function Pagination({ page, setPage, resultCount, limit, label = 'results' }) {
  return (
    <div className="pagination">
      <span>
        Showing {resultCount} {label}
      </span>
      <div>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span style={{ margin: '0 12px' }}>Page {page}</span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={resultCount < limit}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
