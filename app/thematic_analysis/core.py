from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from collections import defaultdict
import numpy as np


def define_themes(words_list, theme_seeds):
    np.random.shuffle(words_list)
    
    model = SentenceTransformer('all-MiniLM-L6-v2')
    word_embeddings = model.encode(words_list)

    theme_centers = []
    theme_labels = []

    for theme, seeds in theme_seeds.items():
        seed_embeddings = model.encode(seeds)
        center = np.mean(seed_embeddings, axis=0)
        theme_centers.append(center)
        theme_labels.append(theme)

    theme_centers = np.array(theme_centers)
    num_clusters = len(theme_seeds)

    kmeans = KMeans(n_clusters=num_clusters, init=theme_centers, n_init=1, random_state=42)
    kmeans.fit(word_embeddings)

    clusters = kmeans.labels_
    clustered_words = defaultdict(list)

    for word, cluster_id in zip(words_list, clusters):
        theme = theme_labels[cluster_id]
        clustered_words[theme].append(word)

    return dict(clustered_words)


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

    results = define_themes(feedback_list, theme_seeds)
    print("-----------------------------------------")
    print(results)
    print("-----------------------------------------")
