import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ai-smart-hospital-secret-key-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', True)
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///hospital.db')
    CORS_ORIGINS = os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000,'
        'http://localhost:3001,http://127.0.0.1:3001',
    )
    JWT_EXPIRATION_HOURS = 24
