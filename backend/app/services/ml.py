import os
import numpy as np
import logging
from typing import Optional
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

logger = logging.getLogger(__name__)

# Fix for OpenMP conflict
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

logger.info("Loading Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
logger.info("Model Loaded.")

def get_embeddings(texts: list) -> np.ndarray:
    return model.encode(texts)

def run_clustering(embeddings: np.ndarray, n_clusters: int, init_centroids: Optional[np.ndarray] = None) -> np.ndarray:
    if init_centroids is not None:
        kmeans = KMeans(n_clusters=n_clusters, init=init_centroids, n_init=1, random_state=42)
    else:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    return kmeans.fit_predict(embeddings)

def run_pca(embeddings: np.ndarray, n_components: int = 2) -> np.ndarray:
    pca = PCA(n_components=n_components)
    return pca.fit_transform(embeddings)
