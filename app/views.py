from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from .models import db, Submission, Feedback, ClusterResult, Theme, Seed
views = Blueprint('views', __name__)
from app.thematic_analysis.utils import process_themes_and_seeds, is_allowed_file, get_codewords
from app.thematic_analysis.agent import generate_codewords, generate_seed_words
from app.thematic_analysis.core import define_themes
import pandas as pd
from io import StringIO
import ast
import json

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



@views.route('/generate', methods=['POST'])
def generate():

    data = request.get_json()
    feedback_list = data.get('feedback', [])

    # Step 1: Create submission entry
    new_submission = Submission(upload_type='file') 
    db.session.add(new_submission)
    db.session.commit()  # Commit now to get the ID

    results = []

    for feedback_text in feedback_list:
        codewords = generate_codewords(feedback_text)

        # Step 2: Create Feedback entry
        feedback_entry = Feedback(
            feedback_text=feedback_text,
            codewords=','.join(codewords) if isinstance(codewords, list) else codewords,
            submission_id=new_submission.id
        )
        db.session.add(feedback_entry)
        db.session.flush()

        # Append to response
        results.append({
            "feedback_id": feedback_entry.id,
            "feedback": feedback_text,
            "codewords": codewords if isinstance(codewords, list) else codewords.split(','),
        })

    db.session.commit()

    return jsonify({
        "submission_id": new_submission.public_id,
        "results": results
    })


@views.route('/regenerate_one', methods=['POST'])
def regenerate_one():
    data = request.get_json()
    text = data.get('text')

    if not text:
        return jsonify({'error': 'No feedback text provided.'}), 400

    try:
        codewords = generate_codewords(text)
        return jsonify({'codewords': codewords}), 200
    except Exception as e:
        print("Error in regenerate_one:", str(e))
        return jsonify({'error': 'Failed to regenerate codewords.'}), 500



@views.route('/submission/<int:id>', methods=['GET'])
def get_submission(id):
    submission = Submission.query.get_or_404(id)
    return jsonify({
        "id": submission.id,
        "codewords": submission.codewords,  # assume flat list
        "entries": [
            {"text": fb.text, "codewords": fb.codewords}
            for fb in submission.feedback_entries  # backref
        ]
    })


@views.route('/approve_codewords', methods=['POST'])
def approve_codewords():

    data = request.get_json()
    approved_entries = data.get("approved", [])

    for entry in approved_entries:
        feedback = Feedback.query.get(entry["feedback_id"])
        if feedback:
            print(f" - {entry['feedback_id']}: {entry['codewords']}")
            feedback.codewords = ','.join(entry["codewords"])  # Update with approved codewords
            feedback.approved = True
        

    db.session.commit()
    return jsonify({"status": "success"})





@views.route('/api/submission/<public_id>/codewords', methods=['GET'])
def get_codewords_for_submission(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first_or_404()

    print(f"Getting codewords for submission: {public_id}")

    all_codewords = []
    for fb in submission.feedbacks:
        print(f" - Feedback {fb.id} approved={getattr(fb, 'approved', None)} codewords={fb.codewords}")
        if getattr(fb, 'approved', False) and fb.codewords:
            if isinstance(fb.codewords, str):
                split_words = [w.strip() for w in fb.codewords.split(',') if w.strip()]
                all_codewords.extend(split_words)
            elif isinstance(fb.codewords, list):
                all_codewords.extend(fb.codewords)

    # Remove duplicates while preserving order
    seen = set()
    unique_codewords = [x for x in all_codewords if not (x in seen or seen.add(x))]

    print("Returning codewords:", unique_codewords)
    return jsonify({ "codewords": unique_codewords })



@views.route('/api/submission/<string:public_id>/cluster', methods=['POST'])
def cluster_submission(public_id):

    submission = Submission.query.filter_by(public_id=public_id).first_or_404()

    data = request.get_json()
    theme_names = {k: v for k, v in data.get("themes", {}).items() if k.startswith("theme[")}
    seed_texts = {k: v for k, v in data.get("seeds", {}).items() if k.startswith("seeds[")}

    # Save to DB
    process_themes_and_seeds(submission, theme_names, seed_texts)
    db.session.commit()
    print("4. Seeds + Themes saved.")

    # Now fetch codewords
    codewords = get_codewords(submission.id)
    print("5. Codewords:", codewords)

    if not codewords:
        return jsonify({"error": "No codewords available for clustering."}), 400

    # Clustering
    clustered = define_themes(codewords, {
        theme_names[f'theme[{i}]']: [s.strip() for s in seed_texts.get(f'seeds[{i}]', '').split(',')]
        for i in range(len(theme_names))
    })

    print("6. Clustering Result:", clustered)

    existing_result = ClusterResult.query.filter_by(submission_id=submission.id).first()

    if existing_result:
        existing_result.results = json.dumps(clustered)
    else:
        new_result = ClusterResult(submission_id=submission.id, results=json.dumps(clustered))
        db.session.add(new_result)

    db.session.commit()

    return jsonify({"message": "Clustering complete", "results": clustered}), 200


@views.route('/api/submission/<string:public_id>/results', methods=['GET'])
def get_clustering_results(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first_or_404()
    cluster_result = submission.cluster_result

    if not cluster_result:
        return jsonify({"error": "No clustering result found."}), 404

    return jsonify({"results": json.loads(cluster_result.results)}), 200


@views.route('/api/suggest_seeds', methods=['POST'])
def suggest_seeds():
    data = request.get_json()
    theme = data.get("theme", "")

    if not theme:
        return jsonify({"error": "Theme is required"}), 400

    try:
        seeds = generate_seed_words(theme)
        return jsonify({"seeds": seeds})
    except Exception as e:
        print("Seed suggestion error:", e)
        return jsonify({"error": "Failed to generate seed words"}), 500



@views.route('/api/cluster_manual_codes', methods=['POST'])
def cluster_manual_codes():
    data = request.get_json()
    raw_codes = data.get("codes", [])
    theme_dict = data.get("themes", {})
    seed_dict = data.get("seeds", {})

    # Preprocess the codes
    cleaned_codes = [c.strip().lower() for c in raw_codes if c.strip()]

    # Reconstruct the theme_seeds dictionary
    theme_seeds = {}
    for idx in range(len(theme_dict)):
        theme = theme_dict.get(f"theme[{idx}]")
        seed_string = seed_dict.get(f"seeds[{idx}]", "")
        seed_list = [s.strip().lower() for s in seed_string.split(",") if s.strip()]
        if theme:
            theme_seeds[theme] = seed_list

    # Run clustering
    result = define_themes(cleaned_codes, theme_seeds)

    new_submission = Submission(upload_type='manual')
    db.session.add(new_submission)
    db.session.commit()

    cluster_result = ClusterResult(
        submission_id=new_submission.id,
        results=json.dumps(result)
    )
    db.session.add(cluster_result)
    db.session.commit()

    return jsonify({ 
        "result": result,
        "status": "success",
        "public_id": new_submission.public_id 
        })
