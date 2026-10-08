const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient_id: { type: String, required: true, trim: true, index: true },
    patient_name: { type: String, required: true, trim: true },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    hospital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    specialization: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor_id: 1, date: 1, time: 1 }, { unique: true });
appointmentSchema.index({ doctor_id: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
