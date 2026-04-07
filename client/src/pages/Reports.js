import React, { useState, useEffect } from 'react';
import { getVendorAnalytics, getPipelineFunnel } from '../api';

export default function Reports() {
  const [vendorStats, setVendorStats] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getVendorAnalytics().then(r => setVendorStats(r.data)),
      getPipelineFunnel().then(r => setFunnel(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading reports...</div>;

  const maxSubmitted = Math.max(...vendorStats.map(v => parseInt(v.total_submitted) || 1), 1);

  return (
    <div>
      <div className="page-header">
        <h2>Reports & Analytics</h2>
      </div>

      {/* Pipeline Funnel */}
      {funnel && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Pipeline Funnel</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, textAlign: 'center' }}>
            {[
              { label: 'Total Received', value: funnel.total, color: '#6366f1' },
              { label: 'Passed Screening', value: funnel.passed_screening, color: '#8b5cf6' },
              { label: 'Passed L1', value: funnel.passed_l1, color: '#f59e0b' },
              { label: 'Passed L2', value: funnel.passed_l2, color: '#10b981' },
              { label: 'Selected', value: funnel.selected, color: '#059669' },
            ].map((stage, i) => (
              <div key={i}>
                <div style={{ fontSize: 28, fontWeight: 700, color: stage.color }}>{stage.value}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{stage.label}</div>
                <div className="progress-bar">
                  <div
                    className="fill"
                    style={{
                      width: `${funnel.total > 0 ? (stage.value / funnel.total) * 100 : 0}%`,
                      background: stage.color
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {funnel.total > 0 ? `${Math.round((stage.value / funnel.total) * 100)}%` : '0%'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Performance */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Vendor Performance</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Submitted</th>
                <th>In Screening</th>
                <th>In L1</th>
                <th>In L2</th>
                <th>Selected</th>
                <th>Rejected</th>
                <th>Duplicates</th>
                <th>Selection Rate</th>
              </tr>
            </thead>
            <tbody>
              {vendorStats.map(v => (
                <tr key={v.id}>
                  <td>
                    <span className="vendor-dot" style={{ background: v.color }}></span>
                    <strong>{v.name}</strong>
                    {v.contact_person && <div style={{ fontSize: 12, color: '#6b7280' }}>{v.contact_person}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{v.total_submitted}</span>
                      <div style={{ flex: 1, maxWidth: 80 }}>
                        <div className="progress-bar">
                          <div className="fill" style={{ width: `${(v.total_submitted / maxSubmitted) * 100}%`, background: v.color }} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{v.in_screening}</td>
                  <td>{v.in_l1}</td>
                  <td>{v.in_l2}</td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>{v.selected}</td>
                  <td style={{ color: '#dc2626' }}>{v.rejected}</td>
                  <td style={{ color: v.duplicates > 0 ? '#f59e0b' : '#6b7280' }}>{v.duplicates}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      background: parseFloat(v.selection_rate) > 30 ? '#d1fae5' : parseFloat(v.selection_rate) > 10 ? '#fef3c7' : '#fee2e2',
                      color: parseFloat(v.selection_rate) > 30 ? '#065f46' : parseFloat(v.selection_rate) > 10 ? '#92400e' : '#991b1b'
                    }}>
                      {v.selection_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
