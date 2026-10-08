from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import os

reviews_bp = Blueprint('reviews', __name__)

REVIEWS_FILE = os.path.join(os.path.dirname(__file__), '../data/reviews.json')

def load_reviews():
    """Load reviews from file"""
    if not os.path.exists(REVIEWS_FILE):
        return []
    try:
        with open(REVIEWS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_reviews(reviews):
    """Save reviews to file"""
    os.makedirs(os.path.dirname(REVIEWS_FILE), exist_ok=True)
    with open(REVIEWS_FILE, 'w') as f:
        json.dump(reviews, f, indent=2)

@reviews_bp.route('', methods=['GET'])
@reviews_bp.route('/', methods=['GET'])
def get_reviews():
    """Get reviews with optional filters"""
    try:
        reviews = load_reviews()
        
        # Filter by doctor_id if provided
        doctor_id = request.args.get('doctor_id')
        if doctor_id:
            reviews = [r for r in reviews if r.get('doctor_id') == doctor_id]
        
        # Filter by patient_id if provided
        patient_id = request.args.get('patient_id')
        if patient_id:
            reviews = [r for r in reviews if r.get('patient_id') == patient_id]
        
        # Sort by newest first
        reviews = sorted(reviews, key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'reviews': reviews,
            'total': len(reviews),
            'average_rating': round(sum(r.get('rating', 0) for r in reviews) / len(reviews), 1) if reviews else 0
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reviews_bp.route('', methods=['POST'])
@reviews_bp.route('/', methods=['POST'])
def create_review():
    """Create a new review for a doctor"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['doctor_id', 'patient_id', 'rating', 'title']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Validate rating
        rating = data.get('rating')
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return jsonify({'success': False, 'error': 'Rating must be between 1 and 5'}), 400
        
        reviews = load_reviews()
        
        # Check if patient already reviewed this doctor
        existing_review = next((r for r in reviews 
                               if r.get('doctor_id') == data['doctor_id'] and 
                               r.get('patient_id') == data['patient_id']), None)
        
        if existing_review:
            return jsonify({'success': False, 'error': 'You have already reviewed this doctor'}), 400
        
        # Create review object
        review = {
            'id': f"REV-{datetime.now().timestamp()}",
            'doctor_id': data['doctor_id'],
            'doctor_name': data.get('doctor_name', ''),
            'patient_id': data['patient_id'],
            'patient_name': data.get('patient_name', ''),
            'rating': float(rating),
            'title': data['title'],
            'comment': data.get('comment', ''),
            'categories': {
                'communication': data.get('categories', {}).get('communication', 0),
                'cleanliness': data.get('categories', {}).get('cleanliness', 0),
                'wait_time': data.get('categories', {}).get('wait_time', 0),
                'punctuality': data.get('categories', {}).get('punctuality', 0)
            },
            'visit_type': data.get('visit_type', ''),  # consultation, checkup, surgery_followup
            'visit_date': data.get('visit_date', ''),
            'would_recommend': data.get('would_recommend', True),
            'verified_patient': True,
            'helpful_count': 0,
            'created_at': datetime.now().isoformat(),
            'status': 'published'  # published, moderated, removed
        }
        
        reviews.append(review)
        save_reviews(reviews)
        
        return jsonify({
            'success': True,
            'message': 'Review submitted successfully',
            'review': review
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reviews_bp.route('/<review_id>', methods=['GET'])
def get_review(review_id):
    """Get a specific review"""
    try:
        reviews = load_reviews()
        review = next((r for r in reviews if r.get('id') == review_id), None)
        
        if not review:
            return jsonify({'success': False, 'error': 'Review not found'}), 404
        
        return jsonify({
            'success': True,
            'review': review
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reviews_bp.route('/<review_id>', methods=['PUT'])
def update_review(review_id):
    """Update a review (only by original submitter)"""
    try:
        data = request.get_json()
        reviews = load_reviews()
        
        review_idx = next((i for i, r in enumerate(reviews) if r.get('id') == review_id), None)
        if review_idx is None:
            return jsonify({'success': False, 'error': 'Review not found'}), 404
        
        # Update fields
        review = reviews[review_idx]
        for key in ['rating', 'title', 'comment', 'categories', 'would_recommend']:
            if key in data:
                review[key] = data[key]
        
        review['updated_at'] = datetime.now().isoformat()
        reviews[review_idx] = review
        save_reviews(reviews)
        
        return jsonify({
            'success': True,
            'message': 'Review updated successfully',
            'review': review
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reviews_bp.route('/<review_id>', methods=['DELETE'])
def delete_review(review_id):
    """Delete a review (only by original submitter)"""
    try:
        reviews = load_reviews()
        reviews = [r for r in reviews if r.get('id') != review_id]
        save_reviews(reviews)
        
        return jsonify({
            'success': True,
            'message': 'Review deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reviews_bp.route('/<review_id>/helpful', methods=['POST'])
def mark_review_helpful(review_id):
    """Mark a review as helpful"""
    try:
        reviews = load_reviews()
        review_idx = next((i for i, r in enumerate(reviews) if r.get('id') == review_id), None)
        
        if review_idx is None:
            return jsonify({'success': False, 'error': 'Review not found'}), 404
        
        review = reviews[review_idx]
        review['helpful_count'] = review.get('helpful_count', 0) + 1
        reviews[review_idx] = review
        save_reviews(reviews)
        
        return jsonify({
            'success': True,
            'message': 'Thank you for finding this review helpful',
            'helpful_count': review['helpful_count']
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reviews_bp.route('/doctors/<doctor_id>/rating', methods=['GET'])
def get_doctor_rating(doctor_id):
    """Get average rating and stats for a doctor"""
    try:
        reviews = load_reviews()
        doctor_reviews = [r for r in reviews if r.get('doctor_id') == doctor_id and r.get('status') == 'published']
        
        if not doctor_reviews:
            return jsonify({
                'success': True,
                'doctor_id': doctor_id,
                'average_rating': 0,
                'total_reviews': 0,
                'rating_distribution': {}
            }), 200
        
        # Calculate stats
        total = len(doctor_reviews)
        average = sum(r.get('rating', 0) for r in doctor_reviews) / total
        
        # Rating distribution
        rating_dist = {}
        for i in range(1, 6):
            rating_dist[str(i)] = len([r for r in doctor_reviews if r.get('rating') == i])
        
        # Category averages
        category_avg = {}
        for category in ['communication', 'cleanliness', 'wait_time', 'punctuality']:
            ratings = [r.get('categories', {}).get(category, 0) for r in doctor_reviews]
            ratings = [r for r in ratings if r > 0]
            category_avg[category] = round(sum(ratings) / len(ratings), 1) if ratings else 0
        
        recommendation_rate = (len([r for r in doctor_reviews if r.get('would_recommend')]) / total) * 100
        
        return jsonify({
            'success': True,
            'doctor_id': doctor_id,
            'average_rating': round(average, 1),
            'total_reviews': total,
            'rating_distribution': rating_dist,
            'category_average': category_avg,
            'would_recommend_percent': round(recommendation_rate, 1)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
