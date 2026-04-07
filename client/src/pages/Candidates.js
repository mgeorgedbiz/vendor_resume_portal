import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidates, getVendors, uploadResume } from '../api';

const STATUS_LABELS = {
  screening: 'Screening',
  l1_review: 'L1 Review',
  l2_review: 'L2 Review',
  selected: 'Selected',
  rejected: 'Rejected',
};

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', vendorId: '', search: '', page: 1 });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadVendor, setUploadVendor] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([fetchCandidates(), getVendors().then(r => setVendors(r.data))]);
  }, [filters.status, filters.vendorId, filters.page]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await getCandidates(filters);
      setCandidates(res.data.candidates);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCandidates();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadVendor) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', uploadFile);
      formData.append('vendorId', uploadVendor);
      await uploadResume(formData);
      setShowUpload(false);
      setUploadFile(null);
      fetchCandidates();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Candidates ({total})</h2>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          + Upload Resume
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search name, email, title..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          />
          <button className="btn btn-secondary btn-sm" type="submit">Search</button>
        </form>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.vendorId}
          onChange={e => setFilters(f => ({ ...f, vendorId: e.target.value, page: 1 }))}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
        >
          <option value="">All vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Skills</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>No candidates found</td></tr>
            ) : candidates.map(c => (
              <tr
                key={c.id}
                onClick={() => navigate(`/candidates/${c.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <strong>{c.full_name}</strong>
                  {c.is_duplicate && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: 12 }}>⚠️ Dup</span>}
                </td>
                <td>{c.current_title || '-'}</td>
                <td>
                  <span className="vendor-dot" style={{ background: c.vendor_color }}></span>
                  {c.vendor_name}
                </td>
                <td><span className={`status-badge status-${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.skills?.join(', ') || '-'}
                </td>
                <td>{new Date(c.submitted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Upload Resume</h3>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Vendor</label>
                <select value={uploadVendor} onChange={e => setUploadVendor(e.target.value)} required>
                  <option value="">Select vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Resume (PDF or DOCX)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={e => setUploadFile(e.target.files[0])}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
