const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ name: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
