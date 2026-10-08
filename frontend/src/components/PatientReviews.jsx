import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/apiConfig';

const PatientReviews = ({ user, doctors = [] }) => {
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    visit_type: 'consultation',
    would_recommend: true,
    categories: {
      communication: 5,
      cleanliness: 5,
      wait_time: 5,
      punctuality: 5
    }
  });
  const [doctorRatings, setDoctorRatings] = useState({});

  useEffect(() => {
    loadReviews();
    loadDoctorRatings();
  }, [user?.id]);

  const loadReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reviews?patient_id=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorRatings = async () => {
    try {
      const token = localStorage.getItem('token');
      const ratings = {};

      for (const doctor of doctors) {
        const response = await fetch(`${API_BASE}/reviews/doctors/${doctor.id}/rating`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          ratings[doctor.id] = data;
        }
      }
      setDoctorRatings(ratings);
    } catch (error) {
      console.error('Failed to load doctor ratings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) {
      alert('Please select a doctor');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const doctor = doctors.find(d => d.id === selectedDoctor);

      const response = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          patient_id: user?.id,
          doctor_id: selectedDoctor,
          doctor_name: doctor?.name || '',
          patient_name: user?.name || ''
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Review submitted successfully!');
        setShowForm(false);
        setSelectedDoctor('');
        setFormData({
          rating: 5,
          title: '',
          comment: '',
          visit_type: 'consultation',
          would_recommend: true,
          categories: {
            communication: 5,
            cleanliness: 5,
            wait_time: 5,
            punctuality: 5
          }
        });
        loadReviews();
        loadDoctorRatings();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const markHelpful = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        loadReviews();
      }
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
    }
  };

  const StarRating = ({ value, onChange, readonly = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={readonly ? 'button' : 'button'}
          onClick={() => !readonly && onChange(star)}
          className={`text-2xl transition-colors cursor-pointer ${
            star <= value ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-medical-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Doctor Ratings Overview */}
      {doctors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⭐ Doctor Ratings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor) => {
              const rating = doctorRatings[doctor.id];
              return (
                <div key={doctor.id} className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{doctor.name}</div>
                      <div className="text-xs text-gray-500">{doctor.specialization}</div>
                    </div>
                  </div>
                  {rating ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl font-bold text-yellow-400">{rating.average_rating}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= Math.round(rating.average_rating) ? 'text-yellow-400' : 'text-gray-300'}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {rating.total_reviews} review{rating.total_reviews !== 1 ? 's' : ''}
                      </div>
                      {rating.would_recommend_percent !== undefined && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ {rating.would_recommend_percent}% would recommend
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No ratings yet</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write Review Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full px-4 py-3 bg-medical-600 text-white rounded-xl font-semibold hover:bg-medical-700 transition-colors"
      >
        {showForm ? '✕ Cancel' : '+ Write a Review'}
      </button>

      {/* Review Form */}
      {showForm && doctors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Your Experience</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor *</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              >
                <option value="">-- Choose a doctor --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>

            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
              <StarRating value={formData.rating} onChange={(val) => setFormData({ ...formData, rating: val })} />
              <div className="mt-2 text-xs text-gray-500">
                {formData.rating === 5 && '⭐ Excellent!'}
                {formData.rating === 4 && '👍 Good'}
                {formData.rating === 3 && '👌 Average'}
                {formData.rating === 2 && '👎 Poor'}
                {formData.rating === 1 && '😞 Very Poor'}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summarize your experience"
                required
                maxLength={100}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
              <div className="text-xs text-gray-400 mt-1">{formData.title.length}/100</div>
            </div>

            {/* Category Ratings */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-4">Rate Different Aspects</label>
              <div className="space-y-4">
                {Object.keys(formData.categories).map((category) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{category.replace('_', ' ')}</span>
                    <StarRating
                      value={formData.categories[category]}
                      onChange={(val) => setFormData({
                        ...formData,
                        categories: { ...formData.categories, [category]: val }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Visit Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type</label>
                <select
                  value={formData.visit_type}
                  onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
                >
                  <option value="consultation">Consultation</option>
                  <option value="checkup">Checkup</option>
                  <option value="surgery_followup">Surgery Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.would_recommend}
                    onChange={(e) => setFormData({ ...formData, would_recommend: e.target.checked })}
                    className="mr-2"
                  />
                  I would recommend this doctor
                </label>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Share details about your experience..."
                rows="4"
                maxLength={500}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
              <div className="text-xs text-gray-400 mt-1">{formData.comment.length}/500</div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-medical-600 text-white rounded-lg font-semibold hover:bg-medical-700"
            >
              Submit Review
            </button>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Reviews</h3>
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{review.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    for <strong>{review.doctor_name}</strong>
                  </p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-gray-700 mb-4">{review.comment}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg text-xs">
                {Object.entries(review.categories || {}).map(([category, rating]) => (
                  <div key={category}>
                    <div className="text-gray-500 capitalize">{category.replace('_', ' ')}</div>
                    <div className="font-semibold text-gray-900">{rating}/5</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-3">
                  {review.would_recommend && (
                    <span className="text-green-600 font-medium">✓ Recommends this doctor</span>
                  )}
                  <span className="text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => markHelpful(review.id)}
                  className="text-medical-600 hover:text-medical-700 font-medium"
                >
                  👍 Helpful ({review.helpful_count || 0})
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            No reviews yet. Be the first to share your experience!
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientReviews;
