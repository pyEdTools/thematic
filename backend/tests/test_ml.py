import pytest
import numpy as np
from backend.main import model
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

def test_embedding_model_loading():
    assert model is not None
    test_text = "test sentence"
    embedding = model.encode([test_text])
    assert embedding.shape == (1, 384)

def test_clustering_logic():
    # Mock some embeddings (384 dimensions)
    embeddings = np.random.rand(10, 384)
    n_clusters = 3
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(embeddings)
    
    assert len(clusters) == 10
    assert len(set(clusters)) <= n_clusters

def test_pca_logic():
    # Mock some embeddings
    embeddings = np.random.rand(10, 384)
    pca = PCA(n_components=2)
    reduced = pca.fit_transform(embeddings)
    
    assert reduced.shape == (10, 2)
