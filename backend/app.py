import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

# Load environment variables from backend/.env before importing config/routes.
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from config import Config

# Existing route blueprints
from routes.auth import auth_bp
from routes.diagnosis import diagnosis_bp
from routes.dashboard import dashboard_bp
from routes.patients import patients_bp

# New route blueprints
from routes.alerts import alerts_bp
from routes.health_timeline import health_timeline_bp
from routes.doctor_actions import doctor_actions_bp
from routes.notifications import notifications_bp
from routes.emergency import emergency_bp
from routes.logs import logs_bp
from routes.chatbot import chatbot_bp

# Newly added feature blueprints
from routes.appointments import appointments_bp
from routes.reminders import reminders_bp
from routes.reviews import reviews_bp
from routes.records import records_bp
from routes.glucotwin import glucotwin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    cors_origins = [origin.strip() for origin in str(app.config.get('CORS_ORIGINS', '')).split(',') if origin.strip()]
    CORS(app, origins=cors_origins)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'logs'), exist_ok=True)

    # Register existing blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(diagnosis_bp, url_prefix='/api/diagnosis')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')

    # Register new blueprints
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(health_timeline_bp, url_prefix='/api/timeline')
    app.register_blueprint(doctor_actions_bp, url_prefix='/api/doctor')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(emergency_bp, url_prefix='/api/emergency')
    app.register_blueprint(logs_bp, url_prefix='/api/logs')
    app.register_blueprint(chatbot_bp, url_prefix='/api/chatbot')

    # Register newly added feature blueprints
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(reminders_bp, url_prefix='/api/reminders')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(records_bp, url_prefix='/api/records')
    app.register_blueprint(glucotwin_bp, url_prefix='/api/glucotwin')

    # Root endpoint
    @app.route('/')
    def root():
        return {
            'message': 'AI Smart Hospital Assistant API',
            'version': '1.0.0',
            'status': 'running',
            'health_check': '/api/health',
            'api_endpoints': {
                'auth': '/api/auth',
                'diagnosis': '/api/diagnosis',
                'dashboard': '/api/dashboard',
                'patients': '/api/patients',
                'alerts': '/api/alerts',
                'timeline': '/api/timeline',
                'doctor': '/api/doctor',
                'notifications': '/api/notifications',
                'emergency': '/api/emergency',
                'logs': '/api/logs',
                'chatbot': '/api/chatbot',
                'appointments': '/api/appointments',
                'reminders': '/api/reminders',
                'reviews': '/api/reviews',
                'records': '/api/records',
                'glucotwin': '/api/glucotwin'
            }
        }

    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'service': 'AI Smart Hospital Assistant'}

    @app.route('/status')
    def status():
        return {'status': 'ok', 'service': 'AI Smart Hospital Assistant Backend'}

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
