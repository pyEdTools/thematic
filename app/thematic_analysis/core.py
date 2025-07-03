from app.models import Submission
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from collections import defaultdict
import numpy as np

def run_analysis(submission_id):
    submission = Submission.query.get(submission_id)
    if not submission:
        return None

    raw_text = submission.raw_data or ''
    feedback_list = [sentence.strip() for sentence in raw_text.split(',') if sentence.strip()]

    themes_data = {
        theme.name: [seed.text for seed in theme.seeds]
        for theme in submission.themes
    }

    results = thematic_analysis(feedback_list, themes_data)

    return results



def thematic_analysis(feedback_list, theme_seeds):

    np.random.shuffle(feedback_list)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    word_embeddings = model.encode(feedback_list)

    #Compute theme centers based on seed words
    theme_centers = []
    theme_labels = []

    for theme, seeds in theme_seeds.items():
        seed_embeddings = model.encode(seeds)
        center = np.mean(seed_embeddings, axis=0)
        theme_centers.append(center)
        theme_labels.append(theme)

    theme_centers = np.array(theme_centers)

    # Initialize and fit k-means with predefined centers
    num_clusters = len(theme_seeds)
    kmeans = KMeans(n_clusters=num_clusters, init=theme_centers, n_init=1, random_state=42)
    kmeans.fit(word_embeddings)
    clusters = kmeans.labels_


    #Organize words by cluster
    clustered_feedback = defaultdict(list)
    for word, cluster in zip(feedback_list, clusters):
        theme = theme_labels[cluster]
        clustered_feedback[theme].append(word)

    #Print the clusters
    # for theme, cluster_feedback in clustered_feedback.items():
    #     print(f"{theme}: {', '.join(cluster_feedback)}")
        
    return clustered_feedback




# -------------------- AI Agent--------------------



















# ------------- Plot Creation -------------
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import seaborn as sns


def generate_theme_clusters_plot():
    return None





# run a test if __name__ == "__main__":
if __name__ == "__main__":
    # Example usage
    feedback_list = [
        "This is a great product",
        "I love the design",
        "The service was excellent",
        "Could be improved",
        "Not what I expected"
    ]

    theme_seeds = {
        "Positive": ["great", "love", "excellent"],
        "Negative": ["improved", "not expected"]
    }

    results = thematic_analysis(feedback_list, theme_seeds)
    print("-----------------------------------------")
    print(results)
    print("-----------------------------------------")
