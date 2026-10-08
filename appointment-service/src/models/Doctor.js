const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    specialization: { type: String, required: true, trim: true, index: true },
    hospital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

doctorSchema.index({ hospital_id: 1, specialization: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
