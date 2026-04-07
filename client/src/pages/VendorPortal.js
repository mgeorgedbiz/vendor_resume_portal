import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKanban } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  screening: 'Screening',
  l1_review: 'L1 Review',
  l2_review: 'L2 Review',
  selected: 'Selected',
  rejected: 'Rejected',
};

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??';
}

export default function VendorPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kanban, setKanban] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getKanban();
        setKanban(res.data.kanban);
        setSummary(res.data.summary);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  const allCandidates = kanban
    ? Object.values(kanban).flat().sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vendor Portal</h2>
          <p style={{ color: '#6b7280' }}>Welcome, {user?.vendorName || user?.fullName}</p>
        </div>
      </div>

      {/* Status summary */}
      <div className="summary-bar">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div className="summary-card" key={key}>
            <div className="number">{summary?.[key] || 0}</div>
            <div className="label">{label}</div>
          </div>
        ))}
      </div>

      {/* Candidates table - read-only view */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Position</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {allCandidates.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>No candidates submitted yet</td></tr>
            ) : allCandidates.map(c => (
              <tr key={c.id} onClick={() => navigate(`/candidates/${c.id}`)} style={{ cursor: 'pointer' }}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="candidate-avatar" style={{ background: '#6366f1', width: 32, height: 32, fontSize: 11 }}>
                    {getInitials(c.full_name)}
                  </div>
                  <strong>{c.full_name}</strong>
                </td>
                <td>{c.current_title || '-'}</td>
                <td><span className={`status-badge status-${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                <td>{new Date(c.submitted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
