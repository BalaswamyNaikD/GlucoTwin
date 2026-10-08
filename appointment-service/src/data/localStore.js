const fs = require('fs');
const path = require('path');
const { hospitals: seedHospitals, doctors: seedDoctors } = require('./localSeed');

const dbFile = path.join(process.cwd(), 'data', 'local-db.json');

function ensureStore() {
  if (!fs.existsSync(path.dirname(dbFile))) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  }
  if (!fs.existsSync(dbFile)) {
    const initial = { hospitals: seedHospitals, doctors: seedDoctors, appointments: [] };
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
}

function writeStore(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function getSpecializations() {
  const db = readStore();
  const values = [...new Set(db.doctors.map((d) => d.specialization))];
  return values.sort((a, b) => a.localeCompare(b));
}

function getHospitals(location) {
  const db = readStore();
  if (!location) return db.hospitals;
  return db.hospitals.filter((h) => h.location.toLowerCase() === String(location).toLowerCase());
}

function getDoctors(hospitalId, specialization) {
  const db = readStore();
  const hospitalsById = new Map(db.hospitals.map((h) => [String(h._id), h]));
  return db.doctors
    .filter((d) => (!hospitalId || String(d.hospital_id) === String(hospitalId))
      && (!specialization || String(d.specialization).toLowerCase() === String(specialization).toLowerCase()))
    .map((d) => ({ ...d, hospital_id: hospitalsById.get(String(d.hospital_id)) || d.hospital_id }));
}

function getBookedSlots(doctorId, date) {
  const db = readStore();
  return db.appointments
    .filter((a) => String(a.doctor_id) === String(doctorId) && String(a.date) === String(date))
    .map((a) => a.time);
}

function findDoctor(doctorId) {
  const db = readStore();
  return db.doctors.find((d) => String(d._id) === String(doctorId));
}

function findHospital(hospitalId) {
  const db = readStore();
  return db.hospitals.find((h) => String(h._id) === String(hospitalId));
}

function createAppointment(payload) {
  const db = readStore();
  const duplicate = db.appointments.find(
    (a) => String(a.doctor_id) === String(payload.doctor_id)
      && String(a.date) === String(payload.date)
      && String(a.time) === String(payload.time)
  );
  if (duplicate) {
    const err = new Error('Selected slot is already booked');
    err.code = 'DUPLICATE';
    throw err;
  }

  const appointment = {
    _id: `${Date.now()}${Math.floor(Math.random() * 10000)}`,
    patient_id: payload.patient_id,
    patient_name: payload.patient_name,
    doctor_id: payload.doctor_id,
    hospital_id: payload.hospital_id,
    specialization: payload.specialization,
    date: payload.date,
    time: payload.time,
    status: 'upcoming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.appointments.push(appointment);
  writeStore(db);
  return appointment;
}

function getAppointments(filters = {}) {
  const db = readStore();
  const { patientId, doctorId, status } = filters;
  const hospitalsById = new Map(db.hospitals.map((h) => [String(h._id), h]));
  const doctorsById = new Map(db.doctors.map((d) => [String(d._id), d]));

  return db.appointments
    .filter((a) => (!patientId || String(a.patient_id) === String(patientId))
      && (!doctorId || String(a.doctor_id) === String(doctorId))
      && (!status || String(a.status || '').toLowerCase() === String(status).toLowerCase()))
    .map((a) => {
      const doctor = doctorsById.get(String(a.doctor_id));
      const hospital = hospitalsById.get(String(a.hospital_id));
      return {
        ...a,
        doctor_name: doctor?.name || 'Doctor',
        hospital_name: hospital?.name || 'Hospital',
        location: hospital?.location || '',
      };
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

module.exports = {
  getSpecializations,
  getHospitals,
  getDoctors,
  getBookedSlots,
  findDoctor,
  findHospital,
  createAppointment,
  getAppointments,
};
