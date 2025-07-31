import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ResultsPage() {
    const { public_id } = useParams();
    const [clusters, setClusters] = useState({});
    const [images, setImages] = useState({
        scatter_plot: '',
        bar_chart: '',
        word_cloud: ''
    });
    const [expandedThemes, setExpandedThemes] = useState({});
    const [showAllThemes, setShowAllThemes] = useState(false);

    const toggleThemeExpand = (theme) => {
        setExpandedThemes(prev => ({
            ...prev,
            [theme]: !prev[theme]
        }));
    };

    useEffect(() => {
        axios.get(`/api/submission/${public_id}/results`)
            .then(res => {
                setClusters(res.data.results || {});
                setImages({
                    scatter_plot: res.data.scatter_plot || '',
                    bar_chart: res.data.bar_chart || '',
                    word_cloud: res.data.word_cloud || ''
                });
            })
            .catch(err => console.error("Failed to load clustering results:", err));
    }, [public_id]);

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(clusters, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `clustered_themes_${public_id}.json`;
        link.click();
    };

    return (
        <div className="container mt-5">
            <h3 className="mb-2 fw-bold text-center" style={{ fontSize: '2rem' }}>
                Thematic Clustering Results
            </h3>
            <p className="text-muted text-center mb-5" style={{ fontSize: '1rem' }}>
                Visual summary of clustered feedback and their associated themes
            </p>

            {/* Download Button */}
            <div className="text-center mb-4">
                <button
                    onClick={handleDownload}
                    className="btn btn-info text-white px-4 py-2 rounded-pill shadow-sm"
                    style={{ fontWeight: '500' }}
                >
                    Download Cluster Data
                </button>
            </div>

            {/* Plots side-by-side (responsive) */}
            <div className="row mb-5 text-center g-4">
                {images.scatter_plot && (
                    <div className="col-md-4">
                        <img
                            src={images.scatter_plot}
                            alt="Scatter Plot"
                            className="img-fluid rounded shadow-sm"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                        <p className="mt-3 fw-semibold" style={{ fontSize: "1.1rem" }}>
                            Semantic Scatter Plot
                        </p>
                    </div>
                )}

                {images.bar_chart && (
                    <div className="col-md-4">
                        <img
                            src={images.bar_chart}
                            alt="Bar Chart"
                            className="img-fluid rounded shadow-sm"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                        <p className="mt-3 fw-semibold" style={{ fontSize: "1.1rem" }}>
                            Theme Frequencies
                        </p>
                    </div>
                )}

                {images.word_cloud && (
                    <div className="col-md-4">
                        <img
                            src={images.word_cloud}
                            alt="Word Cloud"
                            className="img-fluid rounded shadow-sm"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                        <p className="mt-3 fw-semibold" style={{ fontSize: "1.1rem" }}>
                            Word Cloud
                        </p>
                    </div>
                )}
            </div>

            {/* Theme Tables */}
            <div className="mb-5">
                <div className="row">
                    {Object.entries(clusters)
                        .slice(0, showAllThemes ? Object.keys(clusters).length : 10)
                        .map(([theme, words], idx) => {
                            const isExpanded = expandedThemes[theme] || false;
                            const displayedWords = isExpanded ? words : words.slice(0, 5); // show 5 by default

                            return (
                                <div key={idx} className="col-md-6 mb-4">
                                    <div className="border rounded p-3 shadow-sm bg-white">
                                        <h5 className="mb-3 fw-bold text-info">{theme}</h5>
                                        <ul className="list-group list-group-flush">
                                            {displayedWords.map((word, i) => (
                                                <li key={i} className="list-group-item py-2">{word}</li>
                                            ))}
                                        </ul>
                                        {words.length > 5 && (
                                            <button
                                                className="btn btn-link btn-sm mt-2"
                                                onClick={() => toggleThemeExpand(theme)}
                                            >
                                                {isExpanded ? 'Show Less ▲' : 'Show More ▼'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Toggle for showing more themes (10+) */}
                {Object.keys(clusters).length > 10 && (
                    <div className="text-center mt-3">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setShowAllThemes(!showAllThemes)}
                        >
                            {showAllThemes ? 'Show Less Themes ▲' : 'Show More Themes ▼'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
