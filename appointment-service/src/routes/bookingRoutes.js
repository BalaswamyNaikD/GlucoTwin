const express = require('express');
const {
  getSpecializations,
  getHospitals,
  getDoctors,
  getAvailableSlots,
  createAppointment,
  listAppointments,
} = require('../controllers/bookingController');
const { validateRequest } = require('../middlewares/validateRequest');
const {
  fetchHospitalsValidator,
  fetchDoctorsValidator,
  fetchSlotsValidator,
  listAppointmentsValidator,
  createAppointmentValidator,
} = require('../validators/bookingValidators');

const router = express.Router();

router.get('/specializations', getSpecializations);
router.get('/hospitals', fetchHospitalsValidator, validateRequest, getHospitals);
router.get('/doctors', fetchDoctorsValidator, validateRequest, getDoctors);
router.get('/slots', fetchSlotsValidator, validateRequest, getAvailableSlots);
router.get('/appointments', listAppointmentsValidator, validateRequest, listAppointments);
router.post('/appointments', createAppointmentValidator, validateRequest, createAppointment);

module.exports = router;
