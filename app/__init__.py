from flask import Flask
from flask_sqlalchemy  import SQLAlchemy
from os import path 

###DELETE LATER
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

db = SQLAlchemy()
DB_NAME = "database.db"


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'hi' 
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_NAME}'
    db.init_app(app)


    from .views import views
    app.register_blueprint(views, url_prefix='/')

    from .models import  Submission, Theme, Seed, ClusterResult

    admin = Admin(app, name='My DB Admin', template_mode='bootstrap4')
    admin.add_view(ModelView(Submission, db.session))
    admin.add_view(ModelView(Theme, db.session))
    admin.add_view(ModelView(Seed, db.session))
    admin.add_view(ModelView(ClusterResult, db.session))


    # from .models import Submission
    
    with app.app_context():
        db.create_all()


    return app


def create_database(app):
    if not path.exists('app/' + DB_NAME):
        db.create_all(app=app)
        print('Created Database!')
