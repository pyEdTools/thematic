from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from .models import db, Submission, Feedback, ClusterResult, Theme, Seed
views = Blueprint('views', __name__)
from app.thematic_analysis.utils import process_themes_and_seeds, get_codewords
from app.thematic_analysis.agent import generate_codewords, generate_seed_words
from app.thematic_analysis.core import define_themes
import pandas as pd
from io import StringIO
import ast
import json

@views.route('/')
def home():
    return render_template('landing.html')



@views.route('/results/<string:public_id>')
def results(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first()
    if not submission or not submission.cluster_result:
        return redirect(url_for('views.processing', public_id=public_id))
    results = json.loads(submission.cluster_result.results)


    return render_template('results.html', submission=submission, results=results)




@views.route('/debug')
def debug():
    return "Blueprint is working!"




#Starting process: Generate codes from each feedback in the submission
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
            # print(f" - {entry['feedback_id']}: {entry['codewords']}")
            feedback.codewords = ','.join(entry["codewords"])  # Update with approved codewords
            feedback.approved = True
        

    db.session.commit()
    return jsonify({"status": "success"})





@views.route('/api/submission/<public_id>/codewords', methods=['GET'])
def get_codewords_for_submission(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first_or_404()

    # print(f"Getting codewords for submission: {public_id}")

    all_codewords = []
    for fb in submission.feedbacks:
        # print(f" - Feedback {fb.id} approved={getattr(fb, 'approved', None)} codewords={fb.codewords}")
        if getattr(fb, 'approved', False) and fb.codewords:
            if isinstance(fb.codewords, str):
                split_words = [w.strip() for w in fb.codewords.split(',') if w.strip()]
                all_codewords.extend(split_words)
            elif isinstance(fb.codewords, list):
                all_codewords.extend(fb.codewords)

    # Remove duplicates while preserving order
    seen = set()
    unique_codewords = [x for x in all_codewords if not (x in seen or seen.add(x))]

    return jsonify({ "codewords": unique_codewords })



@views.route('/api/submission/<string:public_id>/cluster', methods=['POST'])
def cluster_submission(public_id):
    try:
        submission = Submission.query.filter_by(public_id=public_id).first_or_404()

        data = request.get_json()
        theme_names = {k: v for k, v in data.get("themes", {}).items() if k.startswith("theme[")}
        seed_texts = {k: v for k, v in data.get("seeds", {}).items() if k.startswith("seeds[")}

        # Save to DB
        process_themes_and_seeds(submission, theme_names, seed_texts)
        db.session.commit()
        # print("4. Seeds + Themes saved.")

        # Now fetch codewords
        codewords = get_codewords(submission.id)
        # print("5. Codewords:", codewords)

        if not codewords:
            return jsonify({"error": "No codewords available for clustering."}), 400

        theme_seeds = {
            theme_names[f'theme[{i}]']: [s.strip() for s in seed_texts.get(f'seeds[{i}]', '').split(',')]
            for i in range(len(theme_names))
        }

        clustered, scatter_plot, bar_chart, pie_chart = define_themes(codewords, theme_seeds)

        print("6. Clustering Result:", clustered)

        # Save or update result
        cluster_result = ClusterResult.query.filter_by(submission_id=submission.id).first()
        if cluster_result:
            cluster_result.results = json.dumps(clustered)
            cluster_result.scatter_plot = scatter_plot
            cluster_result.bar_chart = bar_chart
            cluster_result.pie_chart = pie_chart
        else:
            cluster_result = ClusterResult(
                submission_id=submission.id,
                results=json.dumps(clustered),
                scatter_plot=scatter_plot,
                bar_chart=bar_chart,
                pie_chart=pie_chart
            )
            db.session.add(cluster_result)

        db.session.commit()

        return jsonify({
            "message": "Clustering complete",
            "results": clustered,
            "scatter_plot": cluster_result.scatter_plot,
            "bar_chart": cluster_result.bar_chart,
            "pie_chart": cluster_result.pie_chart
        }), 200

    except Exception as e:
        print("ERROR during clustering:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500



@views.route('/api/submission/<string:public_id>/results', methods=['GET'])
def get_clustering_results(public_id):
    submission = Submission.query.filter_by(public_id=public_id).first_or_404()
    cluster_result = submission.cluster_result

    if not cluster_result:
        return jsonify({"error": "No clustering result found."}), 404
    

    return jsonify({
        "results": json.loads(cluster_result.results),
        "scatter_plot": cluster_result.scatter_plot,
        "bar_chart": cluster_result.bar_chart,
        "pie_chart": cluster_result.pie_chart
    }), 200




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
    result, scatter_plot, bar_chart, pie_chart = define_themes(cleaned_codes, theme_seeds)

    new_submission = Submission(upload_type='manual')
    db.session.add(new_submission)
    db.session.commit()

    cluster_result = ClusterResult(
    submission_id=new_submission.id,
    results=json.dumps(result),
    scatter_plot=scatter_plot,
    bar_chart=bar_chart,
    pie_chart=pie_chart
)

    db.session.add(cluster_result)
    db.session.commit()

    return jsonify({ 
        "result": result,
        "scatter_plot": scatter_plot,
        "bar_chart": bar_chart,
        "pie_chart": pie_chart,
        "status": "success",
        "public_id": new_submission.public_id 
    })

