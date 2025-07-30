# ------------- Models -------------
from . import db
from sqlalchemy.sql import func
import uuid
from sqlalchemy import JSON


class Submission(db.Model):
    __tablename__ = 'submissions'


    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    upload_type = db.Column(db.String(50), nullable=False)  # e.g., 'file' or 'text'
    date = db.Column(db.DateTime(timezone=True), default=func.now())  # Timestamp of the submission
    feedbacks = db.relationship('Feedback', backref='submission', cascade="all, delete-orphan")

    themes = db.relationship('Theme', backref='submission', cascade="all, delete-orphan")
    cluster_result = db.relationship('ClusterResult', backref='submission', uselist=False)

class Feedback(db.Model):
    __tablename__ = 'feedbacks'

    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(100), nullable=True)  # Optional, if present in CSV
    feedback_text = db.Column(db.Text, nullable=False)
    codewords = db.Column(JSON, nullable=True)
    approved = db.Column(db.Boolean, default=False)


    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False)



class Theme(db.Model):
    __tablename__ = 'themes'  

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False)

    seeds = db.relationship('Seed', backref='theme', cascade="all, delete-orphan")



class Seed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(255), nullable=False)
    theme_id = db.Column(db.Integer, db.ForeignKey('themes.id'), nullable=False)



class ClusterResult(db.Model):
    id= db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False, unique=True)
    results = db.Column(db.Text, nullable=False) 


    scatter_plot = db.Column(db.Text)  # Base64 string
    bar_chart = db.Column(db.Text)
    word_cloud = db.Column(db.Text)










