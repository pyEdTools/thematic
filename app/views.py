from flask import Blueprint, render_template, request, flash, redirect, url_for, json
from .models import db, Submission, Theme, Seed, ClusterResult
views = Blueprint('views', __name__)
from app.thematic_analysis.utils import process_themes_and_seeds, is_allowed_file
import pandas as pd
from io import StringIO


@views.route('/')
def home():
    return render_template('landing.html')



@views.route('/new', methods=['GET', 'POST'])
def new_upload():


    active_tab = request.args.get('tab', 'file')

    if request.method == 'POST':
        file = request.files.get('file')
        text_input = request.form.get('text', '').strip()

        themes = {k: v for k, v in request.form.items() if k.startswith('theme[')}
        seeds = {k: v for k, v in request.form.items() if k.startswith('seeds[')}

        if file and file.filename and text_input:
            flash('Please provide either a file or text — not both.', category='error')

        elif not file and not text_input:
             flash('Please upload a file or enter text.', category='error')

        elif file and file.filename:
            if not is_allowed_file(file):
                flash('Only CSV or TXT files are allowed.', category='error')
                return redirect(request.url)

            try:
                file_extension = file.filename.rsplit('.', 1)[1].lower()

                if file_extension == 'csv':
                    stream = StringIO(file.stream.read().decode('utf-8'))
                    df = pd.read_csv(stream)

         
                    
                    feedback_col = request.form.get('feedback_column)', 'feedback')
                    #create an if feedback_col is not in df.columns and handle error accordingly
                    if feedback_col not in df.columns:
                        return None
                    
                    submission = Submission(upload_type='file')
                    db.session.add(submission)
                    db.session.flush()

                    



                        


                elif file_extension == 'txt':
                    lines = file.stream.read().decode('utf-8').splitlines()
                    cleaned_lines = [line.strip() for line in lines if line.strip()]
                    raw_data = ', '.join(cleaned_lines)

                else:
                    flash('Unsupported file type.', category='error')
                    return redirect(request.url)

                submission = Submission(upload_type='file', raw_data=raw_data)
                db.session.add(submission)

                process_themes_and_seeds(submission, themes, seeds)

                db.session.commit()
                return redirect(url_for('views.processing', public_id=submission.public_id))

            except Exception as e:
                flash(f'Error processing file: {str(e)}', category='error')



        elif text_input:  # text input
            if len(text_input) < 5:
                flash('Text input is too short.', category='error')
            elif text_input.strip() == '':
                flash('Text input cannot be empty.', category='error')
            else:
                #flash('Text input received.', category='success')
                # Handle text logic...
                submission = Submission(
                    upload_type='text',
                    raw_data=text_input

                )
                db.session.add(submission)

                process_themes_and_seeds(submission, themes, seeds)
                
                db.session.commit()
                #flash('Submission saved to database.', category='success')
                return redirect(url_for('views.processing', public_id=submission.public_id))

    return render_template('new_upload.html', active_tab=active_tab)


@views.route('/processing/<string:public_id>')
def processing(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first()
    if not submission:
        flash('Submission not found.', category='error')
        return redirect(url_for('views.err'))

    return render_template('processing.html', public_id=public_id)


@views.route('/results/<string:public_id>')
def results(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first()
    if not submission or not submission.cluster_result:
        return redirect(url_for('views.processing', public_id=public_id))
    results = json.loads(submission.cluster_result.results)


    return render_template('results.html', submission=submission, results=results)



@views.route('/error404')
def err():
    return "<h1>This is the error404 page</h1>"


@views.route('/check_status/<string:public_id>')
def check_status(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first()

    if submission.cluster_result:
        return {'status': 'done'}

    # ⏱️ Trigger analysis *during* the polling call
    from app.thematic_analysis.core import run_analysis
    results = run_analysis(submission.id)
    if results:
        result_json = json.dumps(results)
        cluster_result = ClusterResult(
            submission_id=submission.id,
            results=result_json
        )
        db.session.add(cluster_result)
        db.session.commit()
        return {'status': 'done'}
    else:
        return {'status': 'error'}



@views.route('/instructions/<instr_type>')
def instructions(instr_type):
    return render_template('instructions.html', instr_type=instr_type)
