const mongoose = require('mongoose');

async function connectDatabase(mongodbUri) {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(mongodbUri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 4000,
    });
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { connectDatabase };
