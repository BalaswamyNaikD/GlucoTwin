import { BOOKING_API_BASE } from '../config/apiConfig';

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.append(k, v);
  });
  return q.toString();
}

async function request(path, options = {}) {
  const res = await fetch(`${BOOKING_API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const bookingApi = {
  getSpecializations: () => request('/specializations'),
  getHospitals: (location) => request(`/hospitals?${toQuery({ location })}`),
  getDoctors: (hospital_id, specialization) =>
    request(`/doctors?${toQuery({ hospital_id, specialization })}`),
  getSlots: (doctor_id, date) => request(`/slots?${toQuery({ doctor_id, date })}`),
  getAppointments: ({ patient_id, doctor_id, status } = {}) =>
    request(`/appointments?${toQuery({ patient_id, doctor_id, status })}`),
  createAppointment: (payload) =>
    request('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
