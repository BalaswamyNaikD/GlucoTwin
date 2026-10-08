const { connectDatabase } = require('../config/db');
const { mongodbUri } = require('../config/env');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');

const seedHospitals = [
  {
    name: 'AIIMS Mangalagiri',
    location: 'Mangalagiri',
    doctors: [
      { name: 'Dr. Uttara Das', specialization: 'Nephrology' },
      { name: 'Dr. V. Suresh', specialization: 'Endocrinology' },
      { name: 'Dr. Rajeev Aravindakshan', specialization: 'General Medicine' },
      { name: 'Dr. Meenakshi Yeola', specialization: 'Gynecology' },
      { name: 'Dr. Timitrov P', specialization: 'Nephrology' },
    ],
  },
  {
    name: 'Apollo Hospitals Visakhapatnam',
    location: 'Visakhapatnam',
    doctors: [
      { name: 'Dr. Nageswara Rao', specialization: 'Cardiac Surgery' },
      { name: 'Dr. P. Suresh', specialization: 'Neurology' },
      { name: 'Dr. Sunil Kumar', specialization: 'Orthopedics' },
      { name: 'Dr. Anitha Rao', specialization: 'Gynecology' },
      { name: 'Dr. Ramesh Babu', specialization: 'Gastroenterology' },
    ],
  },
  {
    name: 'Andhra Hospitals Vijayawada',
    location: 'Vijayawada',
    doctors: [
      { name: 'Dr. P. V. Ramesh', specialization: 'Cardiology' },
      { name: 'Dr. K. Siva Kumar', specialization: 'General Medicine' },
      { name: 'Dr. Lakshmi Devi', specialization: 'Gynecology' },
      { name: 'Dr. Ravi Kumar', specialization: 'Orthopedics' },
      { name: 'Dr. Pradeep', specialization: 'Pediatrics' },
    ],
  },
  {
    name: 'KIMS ICON Hospital Visakhapatnam',
    location: 'Visakhapatnam',
    doctors: [
      { name: 'Dr. Krishna Prasad', specialization: 'General Surgery' },
      { name: 'Dr. Harish Kumar', specialization: 'Neurology' },
      { name: 'Dr. Sandeep', specialization: 'Cardiology' },
      { name: 'Dr. Anil Kumar', specialization: 'Orthopedics' },
      { name: 'Dr. Kavitha', specialization: 'Gynecology' },
    ],
  },
  {
    name: 'Medicover Hospitals Visakhapatnam',
    location: 'Visakhapatnam',
    doctors: [
      { name: 'Dr. Ravi Kumar', specialization: 'Orthopedics' },
      { name: 'Dr. Lakshmi Devi', specialization: 'Gynecology' },
      { name: 'Dr. Srikanth', specialization: 'Cardiology' },
      { name: 'Dr. Naveen', specialization: 'Neurology' },
      { name: 'Dr. Priya', specialization: 'General Medicine' },
    ],
  },
];

async function seed() {
  await connectDatabase(mongodbUri);

  await Doctor.deleteMany({});
  await Hospital.deleteMany({});

  for (const item of seedHospitals) {
    const hospital = await Hospital.create({ name: item.name, location: item.location });
    const doctors = item.doctors.map((d) => ({ ...d, hospital_id: hospital._id }));
    await Doctor.insertMany(doctors);
  }

  // eslint-disable-next-line no-console
  console.log('Seed completed successfully');
  process.exit(0);
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', error);
  process.exit(1);
});
