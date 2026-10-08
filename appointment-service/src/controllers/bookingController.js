const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const { DEFAULT_TIME_SLOTS } = require('../utils/timeSlots');
const localStore = require('../data/localStore');

function isLocalMode() {
  return String(process.env.APPOINTMENT_STORE || '').toLowerCase() === 'local';
}

function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

function ensureFutureOrToday(date) {
  const today = getTodayIsoDate();
  return date >= today;
}

async function getSpecializations(req, res) {
  if (isLocalMode()) {
    return res.json({ success: true, data: localStore.getSpecializations() });
  }
  const specializations = await Doctor.distinct('specialization');
  specializations.sort((a, b) => a.localeCompare(b));
  return res.json({ success: true, data: specializations });
}

async function getHospitals(req, res) {
  const location = req.query.location?.trim();
  if (isLocalMode()) {
    return res.json({ success: true, data: localStore.getHospitals(location) });
  }
  const filter = location ? { location: new RegExp(`^${location}$`, 'i') } : {};
  const hospitals = await Hospital.find(filter).select('_id name location').sort({ name: 1 }).lean();
  return res.json({ success: true, data: hospitals });
}

async function getDoctors(req, res) {
  const { hospital_id, specialization } = req.query;
  if (isLocalMode()) {
    return res.json({ success: true, data: localStore.getDoctors(hospital_id, specialization) });
  }
  const filter = {};
  if (hospital_id) filter.hospital_id = hospital_id;
  if (specialization) filter.specialization = new RegExp(`^${specialization}$`, 'i');

  const doctors = await Doctor.find(filter)
    .populate('hospital_id', '_id name location')
    .select('_id name specialization hospital_id')
    .sort({ name: 1 })
    .lean();

  return res.json({ success: true, data: doctors });
}

async function getAvailableSlots(req, res) {
  const { doctor_id, date } = req.query;
  if (!ensureFutureOrToday(date)) {
    return res.status(400).json({ success: false, message: 'Cannot fetch slots for past date' });
  }

  const bookedSet = isLocalMode()
    ? new Set(localStore.getBookedSlots(doctor_id, date))
    : new Set((await Appointment.find({ doctor_id, date }).select('time -_id').lean()).map((b) => b.time));
  const available = DEFAULT_TIME_SLOTS.filter((slot) => !bookedSet.has(slot));

  return res.json({
    success: true,
    data: {
      date,
      doctor_id,
      available_slots: available,
      booked_slots: [...bookedSet],
    },
  });
}

async function createAppointment(req, res) {
  const payload = req.body;

  if (!ensureFutureOrToday(payload.date)) {
    return res.status(400).json({ success: false, message: 'Past date booking is not allowed' });
  }

  const [doctor, hospital] = isLocalMode()
    ? [localStore.findDoctor(payload.doctor_id), localStore.findHospital(payload.hospital_id)]
    : await Promise.all([
      Doctor.findById(payload.doctor_id).lean(),
      Hospital.findById(payload.hospital_id).lean(),
    ]);

  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }

  if (String(doctor.hospital_id) !== String(payload.hospital_id)) {
    return res.status(400).json({ success: false, message: 'Doctor does not belong to selected hospital' });
  }

  const slotTaken = isLocalMode()
    ? localStore.getBookedSlots(payload.doctor_id, payload.date).includes(payload.time)
    : await Appointment.findOne({
      doctor_id: payload.doctor_id,
      date: payload.date,
      time: payload.time,
    }).lean();

  if (slotTaken) {
    return res.status(409).json({ success: false, message: 'Selected slot is already booked' });
  }

  try {
    const appointment = isLocalMode()
      ? localStore.createAppointment({
        patient_id: payload.patient_id.trim(),
        patient_name: payload.patient_name.trim(),
        doctor_id: payload.doctor_id,
        hospital_id: payload.hospital_id,
        specialization: payload.specialization,
        date: payload.date,
        time: payload.time,
      })
      : await Appointment.create({
        patient_id: payload.patient_id.trim(),
        patient_name: payload.patient_name.trim(),
        doctor_id: payload.doctor_id,
        hospital_id: payload.hospital_id,
        specialization: payload.specialization,
        date: payload.date,
        time: payload.time,
        status: 'upcoming',
      });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  } catch (error) {
    if (error?.code === 11000 || error?.code === 'DUPLICATE') {
      return res.status(409).json({ success: false, message: 'Selected slot is already booked' });
    }
    throw error;
  }
}

async function listAppointments(req, res) {
  const patientId = req.query.patient_id;
  const doctorId = req.query.doctor_id;
  const status = req.query.status;

  if (isLocalMode()) {
    return res.json({
      success: true,
      data: localStore.getAppointments({ patientId, doctorId, status }),
    });
  }

  const filter = {};
  if (patientId) filter.patient_id = String(patientId);
  if (doctorId) filter.doctor_id = doctorId;
  if (status) filter.status = String(status).toLowerCase();

  const appointments = await Appointment.find(filter)
    .populate('doctor_id', '_id name specialization')
    .populate('hospital_id', '_id name location')
    .sort({ date: -1, time: 1 })
    .lean();

  const data = appointments.map((apt) => ({
    ...apt,
    doctor_name: apt.doctor_id?.name || 'Doctor',
    hospital_name: apt.hospital_id?.name || 'Hospital',
    location: apt.hospital_id?.location || '',
  }));

  return res.json({ success: true, data });
}

module.exports = {
  getSpecializations,
  getHospitals,
  getDoctors,
  getAvailableSlots,
  createAppointment,
  listAppointments,
};
