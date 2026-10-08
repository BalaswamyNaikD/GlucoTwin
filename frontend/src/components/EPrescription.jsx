import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/apiConfig';

const EPrescription = ({ user }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadPrescriptions();
  }, [user?.id]);

  const loadPrescriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/records/prescriptions?patient_id=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestRefill = async (prescriptionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/records/prescriptions/${prescriptionId}/refill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        alert('Refill request submitted successfully!');
        loadPrescriptions();
      } else {
        alert(data.error || 'Failed to request refill');
      }
    } catch (error) {
      console.error('Failed to request refill:', error);
    }
  };

  const downloadPrescription = async (prescriptionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/records/prescriptions/${prescriptionId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success && data.file_url) {
        window.open(data.file_url, '_blank');
      } else {
        alert('Download link not available');
      }
    } catch (error) {
      console.error('Failed to download prescription:', error);
    }
  };

  const filteredPrescriptions = filter === 'all' ? prescriptions : prescriptions.filter(p => p.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-medical-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'active', 'expired', 'revoked'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              filter === status
                ? 'border-medical-600 text-medical-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'all' && ` (${prescriptions.length})`}
            {status === 'active' && ` (${prescriptions.filter(p => p.status === 'active').length})`}
          </button>
        ))}
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions.length > 0 ? (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* Left Column */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Rx Prescription</h3>
                      <p className="text-sm text-gray-500 mt-1">ID: {prescription.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      prescription.status === 'active' ? 'bg-green-100 text-green-700' :
                      prescription.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {prescription.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="text-xs text-gray-500">Prescribed By</div>
                    <div className="font-semibold text-gray-900">{prescription.doctor_name || 'Dr. N/A'}</div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Date Issued</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(prescription.issued_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Valid Until</div>
                      <div className="font-semibold text-gray-900">
                        {prescription.valid_until ? new Date(prescription.valid_until).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  {/* Diagnosis */}
                  {prescription.diagnosis && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1">Diagnosis</div>
                      <div className="text-sm font-medium text-gray-900">{prescription.diagnosis}</div>
                    </div>
                  )}

                  {/* Refills */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                    <div className="text-xs text-gray-500">Refills Remaining</div>
                    <div className="text-xl font-bold text-medical-600 mt-1">{prescription.refills_remaining || 0}</div>
                  </div>

                  {/* Instructions */}
                  {prescription.special_instructions && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Special Instructions</div>
                      <div className="text-sm text-gray-700 p-2 bg-yellow-50 rounded-lg">
                        {prescription.special_instructions}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Medicines */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Medications</h4>
                <div className="space-y-3">
                  {prescription.medicines?.map((medicine, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Medicine</div>
                          <div className="font-semibold text-gray-900">{medicine.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Dosage</div>
                          <div className="font-semibold text-gray-900">{medicine.dosage}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Frequency</div>
                          <div className="font-semibold text-gray-900">{medicine.frequency}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Duration</div>
                          <div className="font-semibold text-gray-900">{medicine.duration}</div>
                        </div>
                        {medicine.timing && (
                          <div>
                            <div className="text-xs text-gray-500">Timing</div>
                            <div className="text-sm text-gray-700">{medicine.timing}</div>
                          </div>
                        )}
                        {medicine.notes && (
                          <div>
                            <div className="text-xs text-gray-500">Notes</div>
                            <div className="text-sm text-gray-700">{medicine.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Instructions */}
              {prescription.instructions && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-xs text-gray-500 mb-2">General Instructions</div>
                  <div className="text-sm text-gray-700">{prescription.instructions}</div>
                </div>
              )}

              {/* Follow-up and Tests */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {prescription.follow_up_date && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-xs text-gray-500">Follow-up Visit</div>
                    <div className="font-semibold text-gray-900">
                      {new Date(prescription.follow_up_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {prescription.tests_required?.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="text-xs text-gray-500">Tests Required</div>
                    <div className="text-sm text-gray-700 mt-1">
                      {prescription.tests_required.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => downloadPrescription(prescription.id)}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  📥 Download PDF
                </button>
                {prescription.status === 'active' && prescription.refills_remaining > 0 && (
                  <button
                    onClick={() => requestRefill(prescription.id)}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                  >
                    🔄 Request Refill
                  </button>
                )}
                {prescription.status === 'active' && prescription.refills_remaining === 0 && (
                  <button
                    className="flex-1 px-4 py-2.5 bg-gray-300 text-gray-600 rounded-lg text-sm font-semibold cursor-not-allowed"
                  >
                    No Refills Remaining
                  </button>
                )}
                <button
                  onClick={() => setSelectedPrescription(selectedPrescription === prescription.id ? null : prescription.id)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
                >
                  {selectedPrescription === prescription.id ? '▲ Hide Details' : '▼ More Details'}
                </button>
              </div>

              {/* Additional Details */}
              {selectedPrescription === prescription.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Prescription Notes</div>
                      <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded">{prescription.notes || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Last Refill</div>
                      <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                        {prescription.last_refill_date ? new Date(prescription.last_refill_date).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-3 text-gray-500">
            {filter === 'all' ? 'No prescriptions yet' : `No ${filter} prescriptions`}
          </p>
        </div>
      )}
    </div>
  );
};

export default EPrescription;
