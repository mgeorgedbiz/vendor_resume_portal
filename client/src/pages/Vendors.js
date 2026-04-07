import React, { useState, useEffect } from 'react';
import { getVendors, createVendor } from '../api';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', contactPerson: '', phone: '', color: '#6366f1', emailDomains: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try {
      const res = await getVendors();
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createVendor({
        ...form,
        emailDomains: form.emailDomains.split(',').map(d => d.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setForm({ name: '', email: '', contactPerson: '', phone: '', color: '#6366f1', emailDomains: '' });
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create vendor');
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Vendors ({vendors.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Vendor</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Domains</th>
              <th>Submitted</th>
              <th>Selected</th>
              <th>Rejected</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.id}>
                <td>
                  <span className="vendor-dot" style={{ background: v.color }}></span>
                  <strong>{v.name}</strong>
                </td>
                <td>{v.contact_person || '-'}</td>
                <td>{v.email}</td>
                <td>{v.email_domains?.join(', ') || '-'}</td>
                <td>{v.total_candidates}</td>
                <td style={{ color: '#059669' }}>{v.selected_count}</td>
                <td style={{ color: '#dc2626' }}>{v.rejected_count}</td>
                <td>
                  {v.total_candidates > 0
                    ? `${Math.round((v.selected_count / v.total_candidates) * 100)}%`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add New Vendor</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Vendor Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Email Domains (comma-separated)</label>
                <input value={form.emailDomains} onChange={e => setForm(f => ({...f, emailDomains: e.target.value}))}
                  placeholder="vendor.com, vendor.io" />
              </div>
              <div className="form-group">
                <label>Contact Person</label>
                <input value={form.contactPerson} onChange={e => setForm(f => ({...f, contactPerson: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
