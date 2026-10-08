const hospitals = [
  {
    _id: '661111111111111111111111',
    name: 'AIIMS Mangalagiri',
    location: 'Mangalagiri',
  },
  {
    _id: '662222222222222222222222',
    name: 'Apollo Hospitals Visakhapatnam',
    location: 'Visakhapatnam',
  },
  {
    _id: '663333333333333333333333',
    name: 'Andhra Hospitals Vijayawada',
    location: 'Vijayawada',
  },
  {
    _id: '664444444444444444444444',
    name: 'KIMS ICON Hospital Visakhapatnam',
    location: 'Visakhapatnam',
  },
  {
    _id: '665555555555555555555555',
    name: 'Medicover Hospitals Visakhapatnam',
    location: 'Visakhapatnam',
  },
];

const doctors = [
  { _id: '701111111111111111111111', name: 'Dr. Uttara Das', specialization: 'Nephrology', hospital_id: '661111111111111111111111' },
  { _id: '701111111111111111111112', name: 'Dr. V. Suresh', specialization: 'Endocrinology', hospital_id: '661111111111111111111111' },
  { _id: '701111111111111111111113', name: 'Dr. Rajeev Aravindakshan', specialization: 'General Medicine', hospital_id: '661111111111111111111111' },
  { _id: '701111111111111111111114', name: 'Dr. Meenakshi Yeola', specialization: 'Gynecology', hospital_id: '661111111111111111111111' },
  { _id: '701111111111111111111115', name: 'Dr. Timitrov P', specialization: 'Nephrology', hospital_id: '661111111111111111111111' },

  { _id: '702222222222222222222221', name: 'Dr. Nageswara Rao', specialization: 'Cardiac Surgery', hospital_id: '662222222222222222222222' },
  { _id: '702222222222222222222222', name: 'Dr. P. Suresh', specialization: 'Neurology', hospital_id: '662222222222222222222222' },
  { _id: '702222222222222222222223', name: 'Dr. Sunil Kumar', specialization: 'Orthopedics', hospital_id: '662222222222222222222222' },
  { _id: '702222222222222222222224', name: 'Dr. Anitha Rao', specialization: 'Gynecology', hospital_id: '662222222222222222222222' },
  { _id: '702222222222222222222225', name: 'Dr. Ramesh Babu', specialization: 'Gastroenterology', hospital_id: '662222222222222222222222' },

  { _id: '703333333333333333333331', name: 'Dr. P. V. Ramesh', specialization: 'Cardiology', hospital_id: '663333333333333333333333' },
  { _id: '703333333333333333333332', name: 'Dr. K. Siva Kumar', specialization: 'General Medicine', hospital_id: '663333333333333333333333' },
  { _id: '703333333333333333333333', name: 'Dr. Lakshmi Devi', specialization: 'Gynecology', hospital_id: '663333333333333333333333' },
  { _id: '703333333333333333333334', name: 'Dr. Ravi Kumar', specialization: 'Orthopedics', hospital_id: '663333333333333333333333' },
  { _id: '703333333333333333333335', name: 'Dr. Pradeep', specialization: 'Pediatrics', hospital_id: '663333333333333333333333' },

  { _id: '704444444444444444444441', name: 'Dr. Krishna Prasad', specialization: 'General Surgery', hospital_id: '664444444444444444444444' },
  { _id: '704444444444444444444442', name: 'Dr. Harish Kumar', specialization: 'Neurology', hospital_id: '664444444444444444444444' },
  { _id: '704444444444444444444443', name: 'Dr. Sandeep', specialization: 'Cardiology', hospital_id: '664444444444444444444444' },
  { _id: '704444444444444444444444', name: 'Dr. Anil Kumar', specialization: 'Orthopedics', hospital_id: '664444444444444444444444' },
  { _id: '704444444444444444444445', name: 'Dr. Kavitha', specialization: 'Gynecology', hospital_id: '664444444444444444444444' },

  { _id: '705555555555555555555551', name: 'Dr. Ravi Kumar', specialization: 'Orthopedics', hospital_id: '665555555555555555555555' },
  { _id: '705555555555555555555552', name: 'Dr. Lakshmi Devi', specialization: 'Gynecology', hospital_id: '665555555555555555555555' },
  { _id: '705555555555555555555553', name: 'Dr. Srikanth', specialization: 'Cardiology', hospital_id: '665555555555555555555555' },
  { _id: '705555555555555555555554', name: 'Dr. Naveen', specialization: 'Neurology', hospital_id: '665555555555555555555555' },
  { _id: '705555555555555555555555', name: 'Dr. Priya', specialization: 'General Medicine', hospital_id: '665555555555555555555555' },
];

module.exports = { hospitals, doctors };
