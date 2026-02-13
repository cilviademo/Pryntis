import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function generateInsights(kpi, healthScores) {
  const insights = [];
  const k = kpi || {};

  // Revenue insights
  if (parseFloat(k.grossRevenue) > 0) {
    const atRisk = parseFloat(k.atRiskRevenue) || 0;
    const gross = parseFloat(k.grossRevenue) || 1;
    const riskPct = ((atRisk / gross) * 100).toFixed(0);
    if (atRisk > 0) {
      insights.push({
        id: 'at-risk-revenue',
        severity: riskPct > 30 ? 'high' : riskPct > 15 ? 'medium' : 'low',
        title: `${riskPct}% of revenue is at-risk`,
        detail: `$${atRisk.toLocaleString()} in pending placements may not materialize. Focus on converting pending to confirmed.`,
        action: 'Schedule placement follow-ups',
        actionType: 'calendar',
        actionRoute: '/calendar',
      });
    }
  }

  // Recoupment insights
  const unrecouped = parseFloat(k.unrecoupedBalance) || 0;
  if (unrecouped > 0) {
    insights.push({
      id: 'unrecouped',
      severity: unrecouped > 50000 ? 'high' : unrecouped > 20000 ? 'medium' : 'low',
      title: `$${unrecouped.toLocaleString()} unrecouped balance`,
      detail: 'Artists with unrecouped balances need new revenue streams or placement activity to recover investment.',
      action: 'Review unrecouped artists',
      actionType: 'navigate',
      actionRoute: '/business',
    });
  }

  // Pipeline value
  const pipeline = parseFloat(k.pipelineValue) || 0;
  if (pipeline === 0) {
    insights.push({
      id: 'empty-pipeline',
      severity: 'high',
      title: 'Pipeline is empty',
      detail: 'No pending or confirmed placements in the pipeline. This means zero near-term revenue visibility.',
      action: 'Create placement outreach plan',
      actionType: 'calendar',
      actionRoute: '/calendar',
    });
  }

  // Payable
  const payable = parseFloat(k.payableNow) || 0;
  if (payable > 0) {
    insights.push({
      id: 'payable',
      severity: payable > 10000 ? 'medium' : 'low',
      title: `$${payable.toLocaleString()} payable to artists`,
      detail: 'Fully recouped artists have amounts due. Timely payments maintain trust and relationships.',
      action: 'Process payments',
      actionType: 'navigate',
      actionRoute: '/business',
    });
  }

  // Health scores
  if (Array.isArray(healthScores) && healthScores.length > 0) {
    const atRiskArtists = healthScores.filter((h) => (h.health_score || 0) < 50);
    if (atRiskArtists.length > 0) {
      insights.push({
        id: 'at-risk-artists',
        severity: atRiskArtists.length > 5 ? 'high' : atRiskArtists.length > 2 ? 'medium' : 'low',
        title: `${atRiskArtists.length} artist${atRiskArtists.length > 1 ? 's' : ''} at risk (health < 50)`,
        detail: 'Artists with low health scores need attention across momentum, delivery, revenue, audience, engagement, or compliance dimensions.',
        action: 'Review at-risk artists',
        actionType: 'navigate',
        actionRoute: '/analytics',
      });
    }
  }

  // Pending placements age
  const pendingCount = parseInt(k.pendingPlacements) || 0;
  if (pendingCount > 5) {
    insights.push({
      id: 'pending-placements',
      severity: pendingCount > 10 ? 'high' : 'medium',
      title: `${pendingCount} placements still pending`,
      detail: 'A high number of pending placements may indicate follow-up delays or stalled deals.',
      action: 'Schedule follow-up calls',
      actionType: 'calendar',
      actionRoute: '/calendar',
    });
  }

  // Metadata gap check
  const totalAssets = parseInt(k.totalAssets) || 0;
  if (totalAssets > 0) {
    insights.push({
      id: 'metadata-audit',
      severity: 'low',
      title: 'Quarterly metadata audit recommended',
      detail: `With ${totalAssets} assets in catalog, regular metadata audits ensure ISRC/UPC accuracy and DSP compliance.`,
      action: 'Open Catalog Audit SOP',
      actionType: 'navigate',
      actionRoute: '/port/templates',
    });
  }

  return insights;
}

const SEVERITY_COLORS = {
  high: { bg: 'var(--color-danger-light)', color: 'var(--color-danger)', label: 'HIGH' },
  medium: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)', label: 'MED' },
  low: { bg: 'var(--color-info-light)', color: 'var(--color-info)', label: 'LOW' },
};

export default function InsightsPanel({ kpi, healthScores }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState({});

  const insights = useMemo(
    () => generateInsights(kpi, healthScores),
    [kpi, healthScores]
  );

  const visible = insights.filter((i) => !dismissed[i.id]);

  if (visible.length === 0) {
    return (
      <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
        All clear. No critical insights right now.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Insights & Actions ({visible.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map((insight) => {
          const sev = SEVERITY_COLORS[insight.severity];
          return (
            <div
              key={insight.id}
              style={{
                padding: '12px 16px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderLeft: `4px solid ${sev.color}`,
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span style={{ padding: '1px 6px', borderRadius: '3px', background: sev.bg, color: sev.color, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', flexShrink: 0, marginTop: '2px' }}>
                {sev.label}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{insight.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '8px' }}>{insight.detail}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => navigate(insight.actionRoute)}
                  >
                    {insight.action}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => setDismissed((prev) => ({ ...prev, [insight.id]: true }))}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
