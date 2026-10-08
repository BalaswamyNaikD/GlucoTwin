const { query, body } = require('express-validator');

const fetchHospitalsValidator = [
  query('location').optional().isString().trim().isLength({ min: 2 }).withMessage('location must be at least 2 chars'),
];

const fetchDoctorsValidator = [
  query('hospital_id').optional().isMongoId().withMessage('hospital_id must be a valid id'),
  query('specialization').optional().isString().trim().isLength({ min: 2 }).withMessage('specialization must be at least 2 chars'),
];

const fetchSlotsValidator = [
  query('doctor_id').isMongoId().withMessage('doctor_id is required and must be valid'),
  query('date').isISO8601().withMessage('date must be ISO format yyyy-mm-dd'),
];

const listAppointmentsValidator = [
  query('patient_id').optional().isString().trim().isLength({ min: 1 }).withMessage('patient_id must be valid'),
  query('doctor_id').optional().isMongoId().withMessage('doctor_id must be a valid id'),
  query('status').optional().isIn(['upcoming', 'completed', 'cancelled']).withMessage('status must be upcoming, completed, or cancelled'),
];

const createAppointmentValidator = [
  body('patient_id').isString().trim().isLength({ min: 1 }).withMessage('patient_id is required'),
  body('patient_name').isString().trim().isLength({ min: 2 }).withMessage('patient_name is required'),
  body('doctor_id').isMongoId().withMessage('doctor_id is required and must be valid'),
  body('hospital_id').isMongoId().withMessage('hospital_id is required and must be valid'),
  body('specialization').isString().trim().isLength({ min: 2 }).withMessage('specialization is required'),
  body('date').isISO8601().withMessage('date must be ISO format yyyy-mm-dd'),
  body('time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('time must be HH:mm'),
];

module.exports = {
  fetchHospitalsValidator,
  fetchDoctorsValidator,
  fetchSlotsValidator,
  listAppointmentsValidator,
  createAppointmentValidator,
};
