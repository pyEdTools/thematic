from flask import Blueprint, render_template, request, flash, redirect, url_for, json
from .models import db, Submission, Feedback, ClusterResult
views = Blueprint('views', __name__)
from app.thematic_analysis.utils import process_themes_and_seeds, is_allowed_file, get_codewords
from app.thematic_analysis.agent import generate_codewords
from app.thematic_analysis.core import define_themes
import pandas as pd
from io import StringIO


@views.route('/')
def home():
    return render_template('landing.html')



@views.route('/new', methods=['GET', 'POST'])
def new_upload():
    print("🎯 /new route hit")

    active_tab = request.args.get('tab', 'file')

    if request.method == 'POST':
        print("🎯 post request submitted")
    
        file = request.files.get('file')
        text_input = request.form.get('text', '').strip()

        themes = {k: v for k, v in request.form.items() if k.startswith('theme[')}
        seeds = {k: v for k, v in request.form.items() if k.startswith('seeds[')}

        # Error: both file and text submitted
        if file and file.filename and text_input:
            flash('Please provide either a file or text — not both.', category='error')
            return redirect(request.url)

        # Error: nothing submitted
        if not file and not text_input:
            flash('Please upload a file or enter text.', category='error')
            return redirect(request.url)
        

        # Create a new Submission regardless of source
        submission_type = 'file' if file else 'text'
        submission = Submission(upload_type=submission_type)
        db.session.add(submission)
        db.session.flush()  # Generate submission.id before using in Feedback

        feedback_items = []

        try:
            #------------------- CSV FILE FLOW ---------------------------

            if file and file.filename.endswith('.csv'):
                stream = StringIO(file.stream.read().decode('utf-8'))
                df = pd.read_csv(stream)

    
                feedback_col = request.form.get('feedback_column', 'feedback')
                print(feedback_col)
                if feedback_col not in df.columns:
                    flash(f"Column '{feedback_col}' not found in file.", category='error')
                    return redirect(request.url)


                for _, row in df.iterrows():
                    feedback_text = str(row.get(feedback_col, '')).strip()
                    print(feedback_text)
                    if feedback_text:
                        #call agent here...
                        # student_name = str(idx)
                        codewords = generate_codewords(feedback_text)
                        print(f"Initial Codewords: ================{codewords}==============")
                        feedback_items.append(Feedback(
                            feedback_text=feedback_text,
                            codewords=codewords,
                            submission_id=submission.id
                        ))
            #------------------- TEXT INPUT FLOW ---------------------------

            elif file and file.filename.endswith('.txt'):
                lines = file.stream.read().decode('utf-8').splitlines()
                for line in lines:
                    feedback_text = line.strip()
                    if feedback_text:
                        codewords = generate_codewords(feedback_text)
                        feedback_items.append(Feedback(
                            feedback_text=feedback_text,
                            codewords=codewords,
                            submission_id=submission.id
                        ))
            #------------------- TEXT INPUT FLOW ---------------------------
            elif text_input:
                if len(text_input) < 5:
                    flash('Text input is too short', category='error')
                

                codewords = generate_codewords(text_input)
                feedback_items.append(Feedback(
                    feedback_text=text_input,
                    codewords=codewords,
                    submission_id=submission.id
                ))

            else:
                flash('Unsupported file type', category='error')
                return redirect(request.url)

            db.session.add_all(feedback_items)

            process_themes_and_seeds(submission, themes, seeds)

            db.session.commit()

            return redirect(url_for('views.processing', public_id=submission.public_id))
        
        except Exception as e:
            db.session.rollback()
            flash(f"Error processing input: {str(e)}", category='error')

    return render_template('new_upload.html', active_tab=active_tab)



                



@views.route('/processing/<string:public_id>')
def processing(public_id):
    return render_template('processing.html', public_id=public_id)


@views.route('/run-clustering/<string:public_id>')
def run_clustering(public_id):
    #find the submission
    submission = Submission.query.filter_by(public_id=public_id).first()

    if not submission:
        flash('Submission not found.', category='error')
        return redirect(url_for('views.err'))
    
    #build the themes + seeds dictionary
    theme_and_seeds = {}
    for theme in submission.themes:
        seed_texts = [seed.text.strip() for seed in theme.seeds if seed.text.strip()]
        if seed_texts:
            theme_and_seeds[theme.name] = seed_texts

    # Get all codewords from feedback
    codewords = get_codewords(submission.id)
    print(f"       codeworkds: {codewords}")
    print(f"       theme_and_seeds: {theme_and_seeds}")

    # clustering
    clustered = define_themes(codewords, theme_and_seeds)

    #storing result in ClusterResult model as JSON string
    cluster_result = ClusterResult(
        submission_id=submission.id,
        results=json.dumps(clustered)
    )

    db.session.add(cluster_result)
    db.session.commit()

    return "Clustering complete", 200


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





@views.route('/instructions/<instr_type>')
def instructions(instr_type):
    return render_template('instructions.html', instr_type=instr_type)


@views.route('/debug')
def debug():
    return "Blueprint is working!"
