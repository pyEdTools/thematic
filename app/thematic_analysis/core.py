from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from collections import defaultdict
import numpy as np


def define_themes(words_list, theme_seeds):
    np.random.shuffle(words_list)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    word_embeddings = model.encode(words_list)

    theme_centers = []
    theme_labels = list(theme_seeds.keys())

    for theme in theme_labels:
        seed_embeddings = model.encode(theme_seeds[theme])
        center = np.mean(seed_embeddings, axis=0)
        theme_centers.append(center)

    theme_centers = np.array(theme_centers)
    kmeans = KMeans(n_clusters=len(theme_labels), init=theme_centers, n_init=1, random_state=42)
    kmeans.fit(word_embeddings)

    clusters = kmeans.labels_
    clustered_words = defaultdict(list)
    for word, cluster_id in zip(words_list, clusters):
        clustered_words[theme_labels[cluster_id]].append(word)

    # Generate all 3 plots
    scatter_plot = generate_scatterplot(words_list, word_embeddings, clusters, theme_labels)
    bar_chart = generate_bar_chart(clustered_words)
    pie_chart = generate_pie_chart(clustered_words)

    return dict(clustered_words), scatter_plot, bar_chart, pie_chart


# ------------- Plot Creation -------------
from sklearn.decomposition import PCA
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import io
import base64


theme_colors = sns.color_palette("Set2", n_colors=10).as_hex()


def generate_scatterplot(words_list, word_embeddings, clusters, theme_labels):
    pca = PCA(n_components=2)
    reduced_embeddings = pca.fit_transform(word_embeddings)

    trimmed_words = [word[:10] + '...' if len(word) > 10 else word for word in words_list]

    df = pd.DataFrame({
        'X': reduced_embeddings[:, 0],
        'Y': reduced_embeddings[:, 1],
        'Theme': [theme_labels[cluster] for cluster in clusters],
        'Word': trimmed_words
    })

    theme_palette = dict(zip(theme_labels, theme_colors[:len(theme_labels)]))

    plt.figure(figsize=(12, 8))
    sns.scatterplot(data=df, x='X', y='Y', hue='Theme', palette=theme_palette, s=100)

    for _, row in df.iterrows():
        plt.text(row['X'] + 0.01, row['Y'] + 0.01, row['Word'], fontsize=10, alpha=0.75)

    plt.title('Semantic Clustering of Words by Theme', fontsize=18)
    plt.xlabel('PCA Component 1', fontsize=14)
    plt.ylabel('PCA Component 2', fontsize=14)
    plt.legend(title='Theme', fontsize=12, title_fontsize=13, loc='best')
    plt.tight_layout()

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plt.close()

    return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"


def generate_bar_chart(clustered_words):
    theme_counts = {theme: len(words) for theme, words in clustered_words.items()}
    sorted_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)
    themes, counts = zip(*sorted_themes)

    theme_palette = dict(zip(themes, theme_colors[:len(themes)]))

    plt.figure(figsize=(10, 6))
    sns.barplot(x=list(themes), y=list(counts), palette=theme_palette)
    plt.ylabel("Number of Words", fontsize=14)
    plt.title("Theme Cluster Sizes", fontsize=18)
    plt.xticks(rotation=45, fontsize=12)
    plt.yticks(fontsize=12)
    plt.tight_layout()

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plt.close()

    return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"


def generate_pie_chart(clustered_words):
    theme_counts = {theme: len(words) for theme, words in clustered_words.items()}
    themes = list(theme_counts.keys())
    counts = list(theme_counts.values())
    theme_palette = theme_colors[:len(themes)]

    plt.figure(figsize=(8, 8))
    plt.pie(counts, labels=themes, autopct='%1.1f%%', startangle=140, colors=theme_palette,
            textprops={'fontsize': 12})
    plt.title("Theme Distribution", fontsize=18)
    plt.tight_layout()

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plt.close()

    return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"





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
