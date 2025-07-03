
from app.models import Theme, Seed, Submission, db

def is_allowed_file(file):
    """
    Checks if the uploaded file is a CSV or TXT based on its extension.
    """
    if not file or not file.filename:
        return False

    allowed_extensions = {'csv', 'txt'}
    filename = file.filename.lower()

    return '.' in filename and filename.rsplit('.', 1)[1] in allowed_extensions



def process_themes_and_seeds(submission, themes, seeds):
    for i in range(len(themes)):
        theme_name = themes.get(f'theme[{i}]', '').strip()
        seed_str = seeds.get(f'seeds[{i}]', '')

        if not theme_name:
            continue  # Skip empty themes

        theme = Theme(name=theme_name, submission=submission)
        seed_list = [s.strip() for s in seed_str.split(',') if s.strip()]

        for seed_text in seed_list:
            seed = Seed(text=seed_text, theme=theme)
            db.session.add(seed)

        db.session.add(theme)
