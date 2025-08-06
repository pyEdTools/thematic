from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from collections import defaultdict
import numpy as np
from wordcloud import WordCloud

import matplotlib.patches as mpatches
from matplotlib.patches import Ellipse

def draw_cluster_ellipse(ax, x, y, color):
    cov = np.cov(x, y)
    eigenvals, eigenvecs = np.linalg.eigh(cov)
    order = eigenvals.argsort()[::-1]
    eigenvals, eigenvecs = eigenvals[order], eigenvecs[:, order]

    angle = np.degrees(np.arctan2(*eigenvecs[:, 0][::-1]))
    width, height = 2 * np.sqrt(eigenvals)  # scale for visualization
    ellipse = Ellipse(
        (np.mean(x), np.mean(y)),
        width * 2, height * 2,
        angle=angle,
        edgecolor=color,
        facecolor=color,
        alpha=0.15,
        lw=2
    )
    ax.add_patch(ellipse)


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
    word_cloud = generate_wordcloud(clustered_words)


    return dict(clustered_words), scatter_plot, bar_chart, word_cloud


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
    # Reduce dimensions with PCA
    pca = PCA(n_components=2)
    reduced_embeddings = pca.fit_transform(word_embeddings)

    # Create DataFrame
    df = pd.DataFrame({
        'X': reduced_embeddings[:, 0],
        'Y': reduced_embeddings[:, 1],
        'Theme': [theme_labels[cluster] for cluster in clusters],
        'Word': words_list,

    })

    # Generate color palette
    unique_themes = list(dict.fromkeys(theme_labels))
    colors = plt.cm.viridis(np.linspace(0.2, 0.9, len(unique_themes)))
    theme_palette = dict(zip(unique_themes, colors))

    # Plot
    plt.figure(figsize=(24, 15))

    # Scatter plot points by theme
    for theme, color in theme_palette.items():
        subset = df[df['Theme'] == theme]
        plt.scatter(subset['X'], subset['Y'], s=220, color=color, alpha=0.8, label=theme, edgecolors='none')
        draw_cluster_ellipse(plt.gca(), subset['X'], subset['Y'], color)


    if len(words_list) <= 20:
        for i, row in df.iterrows():
            plt.text(row['X'] + 0.02, row['Y'] + 0.02, row['Word'],
                     fontsize=24, ha='left', va='bottom')

    # Styling
    # plt.title('Semantic Clustering of Words by Theme', fontsize=44, fontweight='bold', pad=20)
    plt.xlabel('PCA Component 1', fontsize=38, labelpad=10)
    plt.ylabel('PCA Component 2', fontsize=38, labelpad=10)
    plt.xticks(fontsize=32)
    plt.yticks(fontsize=32)

    # Minimalist grid and remove top/right borders
    plt.grid(linestyle='--', linewidth=0.6, alpha=0.4)
    plt.gca().spines['top'].set_visible(False)
    plt.gca().spines['right'].set_visible(False)

    # Legend outside
    plt.legend(
    title='Theme',
    title_fontsize=32,   # Larger title
    fontsize=28,         # Larger labels
    bbox_to_anchor=(1.05, 1),
    loc='upper left',
    borderaxespad=0.,
    markerscale=2.0,     # Bigger legend markers
    handlelength=4
    )       # Extra spacing between marker and text


    plt.tight_layout()

    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', bbox_inches="tight", dpi=200)
    buffer.seek(0)
    plt.close()

    return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"


def generate_bar_chart(clustered_words):
    # Count and sort frequencies
    theme_counts = {theme: len(words) for theme, words in clustered_words.items()}
    sorted_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)
    themes, counts = zip(*sorted_themes)

    # Use a clean, modern color palette
    colors = plt.cm.viridis(np.linspace(0.2, 0.8, len(themes)))

    # Create figure
    plt.figure(figsize=(24, 15))
    bars = plt.bar(themes, counts, color=colors, edgecolor='none')

    # Add value labels above bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, height + 0.3,
                 f"{int(height)}", ha='center', va='bottom',
                 fontsize=20, fontweight='bold', color='#333333')

    # Minimalist grid
    plt.grid(axis='y', linestyle='--', linewidth=0.6, alpha=0.4)
    plt.gca().spines['top'].set_visible(False)
    plt.gca().spines['right'].set_visible(False)
    plt.gca().spines['left'].set_visible(False)

    # Labels and title
    plt.ylabel("Frequency", fontsize=30, labelpad=15)
    # plt.title("Theme Frequency", fontsize=38, pad=20, fontweight='bold')
    plt.xticks(rotation=25, ha='right', fontsize=36)
    plt.yticks(fontsize=32)

    # Legend (outside, minimalistic)
    handles = [plt.Rectangle((0,0),1,1,color=colors[i]) for i in range(len(themes))]
    plt.legend(
    handles,
    themes,
    title="Themes",
    title_fontsize=30,   # Bigger title font
    fontsize=24,         # Bigger legend text
    bbox_to_anchor=(1.08, 1),  # Slightly push further out
    loc='upper left',
    borderaxespad=0.5,   # Add some padding
    labelspacing=1.2     # More space between legend items
    )

    plt.tight_layout()

    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', bbox_inches="tight")
    buffer.seek(0)
    plt.close()

    return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"



def generate_wordcloud(clustered_words):
    """
    Generate a heatmap showing overlap (cosine similarity) between themes.
    Replaces the word cloud for better analytical insight.
    """
    # Themes
    themes = list(clustered_words.keys())

    # If less than 2 themes, return empty plot
    if len(themes) < 2:
        plt.figure(figsize=(24, 15))
        plt.text(0.5, 0.5, "Not enough themes for overlap matrix",
                 ha='center', va='center', fontsize=26, color='#666666')
        plt.axis('off')
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=200, transparent=True)
        buffer.seek(0)
        plt.close()
        return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"

    # Use SentenceTransformer to encode each theme's words
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Create embeddings per theme (average of its words)
    theme_embeddings = []
    for theme in themes:
        words = clustered_words[theme]
        if words:
            emb = model.encode(words)
            avg_emb = np.mean(emb, axis=0)
        else:
            avg_emb = np.zeros(model.get_sentence_embedding_dimension())
        theme_embeddings.append(avg_emb)

    # Compute cosine similarity matrix
    from sklearn.metrics.pairwise import cosine_similarity
    similarity_matrix = cosine_similarity(theme_embeddings)

    # Plot heatmap
    plt.figure(figsize=(24, 15))
    sns.heatmap(
        similarity_matrix,
        xticklabels=themes,
        yticklabels=themes,
        cmap="coolwarm",
        annot=True,
        fmt=".2f",
        square=True,
        annot_kws={"size": 32, "weight": "bold"},
        cbar_kws={"shrink": 0.7}
    )

    plt.xticks(rotation=30, ha='right', fontsize=38, weight='bold')
    plt.yticks(rotation=0, fontsize=38, weight='bold')

    plt.tight_layout()

    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=200, bbox_inches="tight", transparent=True)
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
