import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidate, updateCandidateStatus, addFeedback } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  screening: 'Screening',
  l1_review: 'L1 Review',
  l2_review: 'L2 Review',
  selected: 'Selected',
  rejected: 'Rejected',
};

const NEXT_STATUS = {
  screening: 'l1_review',
  l1_review: 'l2_review',
  l2_review: 'selected',
};

export default function CandidateDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    stage: '', rating: 3, strengths: '', weaknesses: '', recommendation: 'yes', notes: ''
  });

  const isRecruiter = user?.role === 'admin' || user?.role === 'recruiter';

  useEffect(() => { fetchCandidate(); }, [id]);

  const fetchCandidate = async () => {
    try {
      const res = await getCandidate(id);
      setCandidate(res.data);
      setFeedbackForm(f => ({ ...f, stage: res.data.status }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async () => {
    const next = NEXT_STATUS[candidate.status];
    if (!next) return;
    try {
      await updateCandidateStatus(id, next);
      fetchCandidate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this candidate?')) return;
    try {
      await updateCandidateStatus(id, 'rejected', 'Rejected from detail view');
      fetchCandidate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    try {
      await addFeedback(id, feedbackForm);
      setShowFeedback(false);
      fetchCandidate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!candidate) return <div style={{ padding: 40 }}>Candidate not found</div>;

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main info */}
        <div>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700 }}>{candidate.full_name}</h2>
                <p style={{ color: '#6b7280', fontSize: 16 }}>{candidate.current_title || 'No title'}</p>
                {candidate.current_company && <p style={{ color: '#6b7280' }}>{candidate.current_company}</p>}
              </div>
              <span className={`status-badge status-${candidate.status}`}>
                {STATUS_LABELS[candidate.status]}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20, fontSize: 14 }}>
              <div><strong>Email:</strong> {candidate.email || '-'}</div>
              <div><strong>Phone:</strong> {candidate.phone || '-'}</div>
              <div><strong>Location:</strong> {candidate.location || '-'}</div>
              <div><strong>Experience:</strong> {candidate.experience_years ? `${candidate.experience_years} years` : '-'}</div>
              <div>
                <strong>Vendor:</strong>{' '}
                <span className="vendor-dot" style={{ background: candidate.vendor_color }}></span>
                {candidate.vendor_name}
              </div>
              <div><strong>Submitted:</strong> {new Date(candidate.submitted_at).toLocaleDateString()}</div>
            </div>

            {candidate.skills?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Skills:</strong>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {candidate.skills.map(s => (
                    <span key={s} style={{ padding: '4px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: 6, fontSize: 12 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {candidate.is_duplicate && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>
                ⚠️ This candidate was flagged as a duplicate submission.
              </div>
            )}

            {candidate.resume_file_path && (
              <div style={{ marginTop: 16 }}>
                <a
                  href={`/${candidate.resume_file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  📄 View Resume ({candidate.resume_file_name})
                </a>
              </div>
            )}
          </div>

          {/* Pipeline Actions */}
          {isRecruiter && candidate.status !== 'selected' && candidate.status !== 'rejected' && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button className="btn btn-success" onClick={handleAdvance}>
                Advance to {STATUS_LABELS[NEXT_STATUS[candidate.status]]}
              </button>
              <button className="btn btn-danger" onClick={handleReject}>
                Reject
              </button>
              <button className="btn btn-secondary" onClick={() => setShowFeedback(true)}>
                Add Feedback
              </button>
            </div>
          )}

          {/* Feedback section */}
          {candidate.feedback?.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Interview Feedback</h3>
              {candidate.feedback.map(f => (
                <div key={f.id} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{STATUS_LABELS[f.stage]} - {f.interviewer_name || 'Unknown'}</strong>
                    <span>{'⭐'.repeat(f.rating || 0)} ({f.recommendation})</span>
                  </div>
                  {f.strengths && <p style={{ fontSize: 14, marginTop: 4 }}><strong>Strengths:</strong> {f.strengths}</p>}
                  {f.weaknesses && <p style={{ fontSize: 14 }}><strong>Weaknesses:</strong> {f.weaknesses}</p>}
                  {f.notes && <p style={{ fontSize: 14, color: '#6b7280' }}>{f.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: 'fit-content' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pipeline History</h3>
          {candidate.pipelineHistory?.map((h, i) => (
            <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 14 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: i === candidate.pipelineHistory.length - 1 ? '#4f46e5' : '#d1d5db'
              }} />
              <div>
                <div style={{ fontWeight: 500 }}>
                  {h.from_status ? `${STATUS_LABELS[h.from_status] || h.from_status} → ` : ''}
                  {STATUS_LABELS[h.to_status] || h.to_status}
                </div>
                {h.changed_by_name && <div style={{ color: '#6b7280', fontSize: 12 }}>by {h.changed_by_name}</div>}
                {h.notes && <div style={{ color: '#6b7280', fontSize: 12 }}>{h.notes}</div>}
                <div style={{ color: '#9ca3af', fontSize: 11 }}>
                  {new Date(h.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Interview Feedback</h3>
            <form onSubmit={handleFeedback}>
              <div className="form-group">
                <label>Stage</label>
                <select value={feedbackForm.stage} onChange={e => setFeedbackForm(f =>({...f, stage: e.target.value}))}>
                  {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Rating (1-5)</label>
                <input type="number" min="1" max="5" value={feedbackForm.rating}
                  onChange={e => setFeedbackForm(f =>({...f, rating: parseInt(e.target.value)}))} />
              </div>
              <div className="form-group">
                <label>Recommendation</label>
                <select value={feedbackForm.recommendation} onChange={e => setFeedbackForm(f =>({...f, recommendation: e.target.value}))}>
                  <option value="strong_yes">Strong Yes</option>
                  <option value="yes">Yes</option>
                  <option value="maybe">Maybe</option>
                  <option value="no">No</option>
                  <option value="strong_no">Strong No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Strengths</label>
                <textarea rows="2" value={feedbackForm.strengths}
                  onChange={e => setFeedbackForm(f =>({...f, strengths: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Weaknesses</label>
                <textarea rows="2" value={feedbackForm.weaknesses}
                  onChange={e => setFeedbackForm(f =>({...f, weaknesses: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows="2" value={feedbackForm.notes}
                  onChange={e => setFeedbackForm(f =>({...f, notes: e.target.value}))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFeedback(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
