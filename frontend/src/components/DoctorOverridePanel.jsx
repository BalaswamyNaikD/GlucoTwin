import React, { useState } from 'react';
import { API_BASE } from '../config/apiConfig';

const DoctorOverridePanel = ({ patient, onClose }) => {
  const [actionType, setActionType] = useState('override');
  const [formData, setFormData] = useState({
    doctor_diagnosis: '',
    doctor_notes: '',
    prescription: '',
    follow_up: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      doctor_id: '1',
      doctor_name: 'Dr. Sarah Johnson',
      patient_id: patient?.id || 'unknown',
      action_type: actionType,
      ai_diagnosis: patient?.ai_results || {},
      ai_confidence: patient?.ai_results?.confidence || 0,
      ...formData,
    };

    try {
      await fetch(`${API_BASE}/doctor/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (onClose) onClose();
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 text-center">
        <span className="text-4xl">✅</span>
        <p className="mt-3 text-sm font-medium text-green-700">
          AI prediction {actionType === 'approve' ? 'approved' : actionType === 'modify' ? 'modified' : 'overridden'} successfully
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Doctor Override</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        )}
      </div>

      {/* Patient Info */}
      {patient && (
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
          <div className="text-xs text-gray-500">ID: {patient.id} | Age: {patient.age}</div>
          {patient.ai_results && (
            <div className="flex gap-3 mt-2 text-xs">
              <span>Pain: <strong>{patient.ai_results.pain_score || 0}/10</strong></span>
              <span>Voice: <strong className="capitalize">{patient.ai_results.voice_condition}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Action Type */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'approve', label: 'Approve AI', icon: '✅', color: 'green' },
          { id: 'modify', label: 'Modify', icon: '✏️', color: 'yellow' },
          { id: 'override', label: 'Override', icon: '🔄', color: 'red' },
        ].map(a => (
          <button
            key={a.id}
            onClick={() => setActionType(a.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              actionType === a.id
                ? a.color === 'green' ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : a.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                : 'bg-red-100 text-red-700 border-2 border-red-300'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent'
            }`}
          >
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {actionType !== 'approve' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Doctor's Diagnosis</label>
            <input
              type="text"
              value={formData.doctor_diagnosis}
              onChange={(e) => setFormData({ ...formData, doctor_diagnosis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your diagnosis..."
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Clinical Notes</label>
          <textarea
            rows="3"
            value={formData.doctor_notes}
            onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add clinical notes..."
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Prescription</label>
          <input
            type="text"
            value={formData.prescription}
            onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Medication, dosage, frequency..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up</label>
          <input
            type="text"
            value={formData.follow_up}
            onChange={(e) => setFormData({ ...formData, follow_up: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Follow-up instructions..."
          />
        </div>

        {actionType === 'override' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Override</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Reason for overriding AI prediction..."
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all ${
            actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
            actionType === 'modify' ? 'bg-yellow-600 hover:bg-yellow-700' :
            'bg-red-600 hover:bg-red-700'
          } disabled:opacity-50`}
        >
          {submitting ? 'Submitting...' :
            actionType === 'approve' ? 'Approve AI Results' :
            actionType === 'modify' ? 'Submit Modified Diagnosis' :
            'Submit Override'}
        </button>
      </form>
    </div>
  );
};

export default DoctorOverridePanel;
