import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKanban, getVendors, updateCandidateStatus } from '../api';

const STATUS_CONFIG = {
  screening: { label: 'Screening', className: 'column-screening' },
  l1_review: { label: 'L1 review', className: 'column-l1' },
  l2_review: { label: 'L2 review', className: 'column-l2' },
  selected: { label: 'Selected', className: 'column-selected' },
  rejected: { label: 'Rejected', className: 'column-rejected' },
};

const NEXT_STATUS = {
  screening: 'l1_review',
  l1_review: 'l2_review',
  l2_review: 'selected',
};

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??';
}

function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export default function Dashboard() {
  const [kanban, setKanban] = useState(null);
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [kanbanRes, vendorsRes] = await Promise.all([
        getKanban(selectedVendor),
        getVendors()
      ]);
      setKanban(kanbanRes.data.kanban);
      setSummary(kanbanRes.data.summary);
      setVendors(vendorsRes.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedVendor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdvance = async (candidateId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      await updateCandidateStatus(candidateId, next);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleReject = async (candidateId) => {
    if (!window.confirm('Reject this candidate?')) return;
    try {
      await updateCandidateStatus(candidateId, 'rejected', 'Rejected from dashboard');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    }
  };

  if (loading) return <div style={{padding: 40}}>Loading pipeline...</div>;

  return (
    <div>
      <div className="kanban-header">
        <div>
          <h2>Resume pipeline</h2>
          <span className="meta">
            {summary?.totalCandidates || 0} candidates &middot; {summary?.totalVendors || 0} vendors
          </span>
        </div>
        <div className="kanban-filters">
          <select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
            <option value="all">All vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/candidates')}>
            + Add resume
          </button>
        </div>
      </div>

      <div className="summary-bar">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div className="summary-card" key={key}>
            <div className="number">{summary?.[key] || 0}</div>
            <div className="label">{config.label}</div>
          </div>
        ))}
      </div>

      <div className="kanban-board">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div className={`kanban-column ${config.className}`} key={status}>
            <div className="kanban-column-header">
              <span className="label">{config.label}</span>
              <span className="count">{kanban?.[status]?.length || 0}</span>
            </div>
            {kanban?.[status]?.map(candidate => (
              <div
                className="candidate-card"
                key={candidate.id}
                onClick={() => navigate(`/candidates/${candidate.id}`)}
              >
                <div className="candidate-card-header">
                  <div
                    className="candidate-avatar"
                    style={{ background: candidate.vendor_color || '#6B7280' }}
                  >
                    {getInitials(candidate.full_name)}
                  </div>
                  <div className="info">
                    <h4>{candidate.full_name}</h4>
                    <p>{candidate.current_title}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="candidate-vendor-tag">
                    <span className="vendor-dot" style={{ background: candidate.vendor_color }}></span>
                    {candidate.vendor_name}
                  </span>
                  <span className="candidate-time">{timeAgo(candidate.submitted_at)}</span>
                </div>
                {status !== 'selected' && status !== 'rejected' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); handleAdvance(candidate.id, status); }}
                    >
                      Advance
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); handleReject(candidate.id); }}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {candidate.is_duplicate && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>⚠️ Duplicate</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
