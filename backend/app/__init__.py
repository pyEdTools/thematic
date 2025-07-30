from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os

db = SQLAlchemy()
migrate = Migrate()

DB_NAME = "database.db"

def create_app():
    app = Flask(
    __name__,
    static_folder=os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'build')
    ),
    static_url_path='/'
)


    # Secret key (use env variable in production)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')

    # Database configuration (Postgres for prod, SQLite fallback for dev)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{DB_NAME}'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from .views import views
    app.register_blueprint(views, url_prefix='/api')

    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        build_path = os.path.join(app.static_folder)
        if path != "" and os.path.exists(os.path.join(build_path, path)):
            return send_from_directory(build_path, path)
        else:
            return send_from_directory(build_path, 'index.html')

    return app
