from app.models import Theme, Seed, db
from collections import Counter



def process_themes_and_seeds(submission, themes, seeds):
    for i in range(len(themes)):
        theme_name = themes.get(f'theme[{i}]', '').strip()
        seed_str = seeds.get(f'seeds[{i}]', '')

        if not theme_name:
            continue  # Skip empty themes

        theme = Theme(name=theme_name, submission=submission)
        seed_list = [s.strip().lower() for s in seed_str.split(',') if s.strip()]


        for seed_text in seed_list:
            seed = Seed(text=seed_text, theme=theme)
            db.session.add(seed)

        db.session.add(theme)



def get_codewords(submission_id):
    from app.models import Feedback

    feedbacks = Feedback.query.filter_by(submission_id=submission_id).all()
    codewords = []

    for fb in feedbacks:
        if fb.codewords:
            # Handle comma-separated string like: "teamwork, leadership"
            words = [word.strip().lower() for word in fb.codewords.split(',') if word.strip()]
            codewords.extend(words)

    return list(set(codewords))  



def get_codeword_counts(submission_id):
    words = get_codewords(submission_id)
    return Counter(words)

