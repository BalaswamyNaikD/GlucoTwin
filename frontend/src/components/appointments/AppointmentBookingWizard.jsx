import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingApi } from '../../services/bookingApi';

const steps = [
  'Select Specialization',
  'Select Location',
  'Select Hospital',
  'Select Doctor',
  'Select Date',
  'Select Time Slot',
  'Confirm Booking',
];

const todayISO = () => new Date().toISOString().split('T')[0];

const formatSlotLabel = (value) => {
  if (!value || !value.includes(':')) return value;
  const [hh, mm] = value.split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
};

const AppointmentBookingWizard = ({ user, onBooked = null }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [loadingState, setLoadingState] = useState({
    metadata: false,
    hospitals: false,
    doctors: false,
    slots: false,
    doctorAvailability: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  const [specializations, setSpecializations] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slotData, setSlotData] = useState({
    available: [],
    booked: [],
  });
  const [doctorAvailability, setDoctorAvailability] = useState({});

  const [form, setForm] = useState({
    specialization: '',
    location: '',
    hospital_id: '',
    doctor_id: '',
    date: '',
    time: '',
  });

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h._id === form.hospital_id),
    [hospitals, form.hospital_id]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d._id === form.doctor_id),
    [doctors, form.doctor_id]
  );

  const locations = useMemo(() => {
    const unique = Array.from(new Set((allHospitals || []).map((h) => h.location))).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [allHospitals]);

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((loc) => String(loc).toLowerCase().includes(query));
  }, [locations, locationSearch]);

  const anyLoading = useMemo(
    () => Object.values(loadingState).some(Boolean),
    [loadingState]
  );

  const progressPercent = useMemo(
    () => Math.round((activeStep / steps.length) * 100),
    [activeStep]
  );

  const allSlots = useMemo(() => {
    const merged = Array.from(new Set([...(slotData.available || []), ...(slotData.booked || [])]));
    return merged.sort((a, b) => String(a).localeCompare(String(b)));
  }, [slotData]);

  const setLoadingFlag = (key, value) => {
    setLoadingState((prev) => ({ ...prev, [key]: value }));
  };

  const loadInitial = useCallback(async () => {
    setLoadingFlag('metadata', true);
    setError('');
    try {
      const [specRes, hospRes] = await Promise.all([
        bookingApi.getSpecializations(),
        bookingApi.getHospitals(),
      ]);
      setSpecializations(specRes.data || []);
      setAllHospitals(hospRes.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load appointment metadata');
    } finally {
      setLoadingFlag('metadata', false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!success) return undefined;
    setShowSuccessPopup(true);
    const timer = setTimeout(() => {
      setShowSuccessPopup(false);
      setSuccess('');
    }, 3200);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!form.location) {
      setHospitals([]);
      return;
    }
    let mounted = true;
    setLoadingFlag('hospitals', true);
    bookingApi
      .getHospitals(form.location)
      .then((res) => {
        if (mounted) setHospitals(res.data || []);
      })
      .catch((e) => {
        if (mounted) setError(e.message || 'Failed to load hospitals');
      })
      .finally(() => {
        if (mounted) setLoadingFlag('hospitals', false);
      });
    return () => {
      mounted = false;
    };
  }, [form.location]);

  useEffect(() => {
    if (!form.hospital_id || !form.specialization) {
      setDoctors([]);
      setDoctorAvailability({});
      return;
    }
    let mounted = true;
    setLoadingFlag('doctors', true);
    bookingApi
      .getDoctors(form.hospital_id, form.specialization)
      .then((res) => {
        if (mounted) setDoctors(res.data || []);
      })
      .catch((e) => {
        if (mounted) setError(e.message || 'Failed to load doctors');
      })
      .finally(() => {
        if (mounted) setLoadingFlag('doctors', false);
      });
    return () => {
      mounted = false;
    };
  }, [form.hospital_id, form.specialization]);

  useEffect(() => {
    if (!form.doctor_id || !form.date) {
      setSlotData({ available: [], booked: [] });
      return;
    }
    let mounted = true;
    setLoadingFlag('slots', true);
    bookingApi
      .getSlots(form.doctor_id, form.date)
      .then((res) => {
        if (mounted) {
          setSlotData({
            available: res.data?.available_slots || [],
            booked: res.data?.booked_slots || [],
          });
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e.message || 'Failed to load time slots');
          setSlotData({ available: [], booked: [] });
        }
      })
      .finally(() => {
        if (mounted) setLoadingFlag('slots', false);
      });
    return () => {
      mounted = false;
    };
  }, [form.doctor_id, form.date]);

  useEffect(() => {
    if (!form.date || doctors.length === 0) {
      setDoctorAvailability({});
      return;
    }
    let mounted = true;
    setLoadingFlag('doctorAvailability', true);
    Promise.all(
      doctors.map(async (doctor) => {
        const res = await bookingApi.getSlots(doctor._id, form.date);
        return { doctorId: doctor._id, count: (res.data?.available_slots || []).length };
      })
    )
      .then((rows) => {
        if (!mounted) return;
        const next = {};
        rows.forEach((row) => {
          next[row.doctorId] = row.count;
        });
        setDoctorAvailability(next);
      })
      .catch(() => {
        if (mounted) setDoctorAvailability({});
      })
      .finally(() => {
        if (mounted) setLoadingFlag('doctorAvailability', false);
      });

    return () => {
      mounted = false;
    };
  }, [doctors, form.date]);

  const setField = (field, value) => {
    setError('');
    setSuccess('');
    if (field === 'date' && value < todayISO()) {
      setError('Past date booking is not allowed');
      return;
    }
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'specialization') {
        next.hospital_id = '';
        next.doctor_id = '';
        next.date = '';
        next.time = '';
      }
      if (field === 'location') {
        next.hospital_id = '';
        next.doctor_id = '';
        next.date = '';
        next.time = '';
      }
      if (field === 'hospital_id') {
        next.doctor_id = '';
        next.date = '';
        next.time = '';
      }
      if (field === 'doctor_id') {
        next.date = '';
        next.time = '';
      }
      if (field === 'date') {
        next.time = '';
      }
      return next;
    });
  };

  const allRequiredFieldsReady = useMemo(
    () => !!form.specialization && !!form.location && !!form.hospital_id && !!form.doctor_id && !!form.date && !!form.time,
    [form]
  );

  const resetBookingForm = () => {
    setActiveStep(1);
    setForm({
      specialization: '',
      location: '',
      hospital_id: '',
      doctor_id: '',
      date: '',
      time: '',
    });
    setLocationSearch('');
    setDoctors([]);
    setHospitals([]);
    setSlotData({ available: [], booked: [] });
    setDoctorAvailability({});
    setError('');
  };

  const autoStep = useMemo(() => {
    if (!form.specialization) return 1;
    if (!form.location) return 2;
    if (!form.hospital_id) return 3;
    if (!form.doctor_id) return 4;
    if (!form.date) return 5;
    if (!form.time) return 6;
    return 7;
  }, [form]);

  useEffect(() => {
    if (activeStep !== autoStep) {
      setActiveStep(autoStep);
    }
  }, [autoStep, activeStep]);

  const submitBooking = async () => {
    if (!allRequiredFieldsReady) {
      setError('Please complete all required fields before confirming booking');
      return;
    }
    if (form.date < todayISO()) {
      setError('Past date booking is not allowed');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        patient_id: user?.id || 'PATIENT',
        patient_name: user?.name || 'Patient',
        doctor_id: form.doctor_id,
        hospital_id: form.hospital_id,
        specialization: form.specialization,
        date: form.date,
        time: form.time,
      };
      const res = await bookingApi.createAppointment(payload);
      setSuccess(`${res.message}. Appointment ID: ${res.data?._id || 'N/A'}`);
      if (typeof onBooked === 'function') {
        onBooked(res.data);
      }
      resetBookingForm();
    } catch (e) {
      setError(e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-blue-50 via-white to-green-50 pointer-events-none"></div>
      {showSuccessPopup && (
        <div className="fixed top-5 right-5 z-40 w-[min(90vw,26rem)] bg-green-50 border border-green-200 text-green-800 rounded-xl shadow-lg p-4">
          <div className="font-semibold text-sm">Appointment booked successfully</div>
          <div className="text-xs mt-1">Your booking has been added to patient and doctor dashboards.</div>
        </div>
      )}

      <div className="relative flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Take Appointment</h3>
          <p className="text-xs text-gray-500 mt-0.5">Guided, step-by-step booking for patients.</p>
          <p className="text-xs text-medical-700 mt-1 font-semibold">Current: Step {activeStep} of {steps.length} - {steps[activeStep - 1]}</p>
        </div>
        {anyLoading && (
          <span className="inline-flex items-center gap-2 text-xs text-gray-500">
            <span className="animate-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-medical-300 border-t-medical-600"></span>
            Syncing...
          </span>
        )}
      </div>

      <div className="relative mb-3 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-medical-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="flex lg:grid lg:grid-cols-7 gap-2 mb-6 overflow-x-auto pb-1">
        {steps.map((label, idx) => {
          const step = idx + 1;
          const state = step === activeStep ? 'active' : step < activeStep ? 'done' : 'idle';
          return (
            <div
              key={label}
              className={`min-w-[132px] lg:min-w-0 px-2 py-2 rounded-lg text-[11px] text-center font-medium transition-all ${
                state === 'active'
                  ? 'bg-medical-600 text-white shadow-sm'
                  : state === 'done'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step}. {label}
            </div>
          );
        })}
      </div>

      <div className="space-y-5 animate-fade-in">
        <section className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:p-5 transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Selection Panel</h4>
              <p className="text-xs text-gray-500">Step 1, 2, 3 and 5 are completed here.</p>
            </div>
            {(loadingState.metadata || loadingState.hospitals) && (
              <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                <span className="animate-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-medical-300 border-t-medical-600"></span>
                Fetching options
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Location (Optional)</label>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search city"
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Location</label>
                <select
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  disabled={activeStep < 2}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 disabled:bg-gray-100"
                >
                  <option value="">Choose city</option>
                  {filteredLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
                <input
                  type="date"
                  value={form.date}
                  min={todayISO()}
                  onChange={(e) => setField('date', e.target.value)}
                  disabled={activeStep < 5 || !form.doctor_id}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 disabled:bg-gray-100"
                />
                {!form.doctor_id && (
                  <p className="text-xs text-orange-600 mt-1">Select doctor first to unlock date selection.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Specialization</label>
                <select
                  value={form.specialization}
                  onChange={(e) => setField('specialization', e.target.value)}
                  disabled={activeStep < 1}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 disabled:bg-gray-100"
                >
                  <option value="">Choose specialization</option>
                  {specializations.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Hospital</label>
                <select
                  value={form.hospital_id}
                  onChange={(e) => setField('hospital_id', e.target.value)}
                  disabled={activeStep < 3 || !form.location}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 disabled:bg-gray-100"
                >
                  <option value="">Choose hospital</option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                {activeStep <= 3 && 'Complete specialization, location and hospital to continue.'}
                {activeStep === 5 && 'Choose your preferred appointment date.'}
                {activeStep > 5 && 'Selection details are locked in for confirmation.'}
              </div>
            </div>
          </div>
        </section>

        {activeStep >= 4 && (
          <section className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Doctor Selection</h4>
                <p className="text-xs text-gray-500">Choose a doctor card based on specialization and hospital.</p>
              </div>
              {(loadingState.doctors || loadingState.doctorAvailability) && (
                <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                  <span className="animate-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-medical-300 border-t-medical-600"></span>
                  Loading doctors
                </span>
              )}
            </div>

            {!form.specialization || !form.hospital_id ? (
              <div className="text-sm text-orange-700 bg-orange-50 border border-orange-100 rounded-xl p-3">
                Select specialization and hospital to view doctors.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doctors.map((d) => {
                  const hospitalName = d.hospital_id?.name || selectedHospital?.name || 'Hospital';
                  const availableCount = doctorAvailability[d._id];
                  const hasAvailability = Number.isFinite(availableCount);
                  const statusText = !form.date
                    ? 'Select date to view availability'
                    : hasAvailability
                      ? `${availableCount} slots available`
                      : 'Checking availability';
                  const statusClass = !form.date
                    ? 'text-orange-600 bg-orange-50 border-orange-100'
                    : hasAvailability && availableCount > 0
                      ? 'text-green-700 bg-green-50 border-green-100'
                      : 'text-orange-700 bg-orange-50 border-orange-100';

                  return (
                    <button
                      key={d._id}
                      type="button"
                      onClick={() => setField('doctor_id', d._id)}
                      className={`text-left px-4 py-3 border rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-400 ${
                        form.doctor_id === d._id
                          ? 'border-medical-500 bg-medical-50 shadow-sm'
                          : 'border-gray-200 hover:border-medical-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{d.specialization}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{hospitalName}</div>
                      <div className={`inline-flex mt-2 px-2 py-1 text-[11px] font-semibold rounded-full border ${statusClass}`}>
                        {statusText}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {doctors.length === 0 && form.specialization && form.hospital_id && !loadingState.doctors && (
              <p className="text-sm text-gray-500 mt-3">No doctors found for selected filters.</p>
            )}
          </section>
        )}

        {activeStep >= 6 && (
          <section className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Time Slot Selection</h4>
                <p className="text-xs text-gray-500">Booked slots are disabled to prevent double booking.</p>
              </div>
              {loadingState.slots && (
                <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                  <span className="animate-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-medical-300 border-t-medical-600"></span>
                  Loading slots
                </span>
              )}
            </div>

            {!form.doctor_id || !form.date ? (
              <div className="text-sm text-orange-700 bg-orange-50 border border-orange-100 rounded-xl p-3">
                Select doctor and date first.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {allSlots.map((slot) => {
                    const booked = (slotData.booked || []).includes(slot);
                    const selected = form.time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setField('time', slot)}
                        disabled={booked}
                        className={`px-3 py-3 rounded-lg text-sm border transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-400 ${
                          booked
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                            : selected
                              ? 'bg-medical-600 text-white border-medical-600'
                              : 'border-gray-200 hover:border-medical-300'
                        }`}
                      >
                        {formatSlotLabel(slot)}
                      </button>
                    );
                  })}
                </div>
                {allSlots.length === 0 && !loadingState.slots && (
                  <p className="text-sm text-gray-500 mt-2">No slots available for selected date.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-medical-50 text-medical-700">Selected</span>
                  <span className="px-2 py-1 rounded-full bg-green-50 text-green-700">Available</span>
                  <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-700">Booked</span>
                </div>
              </>
            )}
          </section>
        )}

        {activeStep === 7 && (
          <section className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 transition-shadow hover:shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900">Confirmation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
              <div>Patient: <span className="font-medium">{user?.name || 'Patient'}</span></div>
              <div>Doctor: <span className="font-medium">{selectedDoctor?.name || 'N/A'}</span></div>
              <div>Specialization: <span className="font-medium">{form.specialization || 'N/A'}</span></div>
              <div>Hospital: <span className="font-medium">{selectedHospital?.name || 'N/A'}</span></div>
              <div>Date: <span className="font-medium">{form.date || 'N/A'}</span></div>
              <div>Time: <span className="font-medium">{form.time ? formatSlotLabel(form.time) : 'N/A'}</span></div>
            </div>
          </section>
        )}
      </div>

      {error && <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p role="status" aria-live="polite" className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{success}</p>}

      <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetBookingForm}
          disabled={submitting}
          className="px-4 py-3 text-sm rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40"
        >
          Reset
        </button>

        {activeStep < 7 ? (
          <div className="w-full sm:w-auto text-xs text-medical-700 bg-medical-50 border border-medical-100 px-3 py-2 rounded-lg text-center sm:text-left">
            Next fields unlock automatically after you complete current selection.
          </div>
        ) : (
          <button
            type="button"
            onClick={submitBooking}
            disabled={submitting || !allRequiredFieldsReady}
            className="px-4 py-3 text-sm rounded-lg bg-green-600 text-white font-semibold disabled:opacity-40"
          >
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentBookingWizard;
