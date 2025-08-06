import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from 'react-bootstrap';



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
    const [showZoom, setShowZoom] = useState(false);
    const [zoomSrc, setZoomSrc] = useState('');
    const [zoomTitle, setZoomTitle] = useState('');

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
        <div className="container my-5">
            {/* Header */}
            <h3 className="fw-bold text-center mb-2" style={{ fontSize: '2rem' }}>
                Thematic Clustering Results
            </h3>
            <p className="text-muted text-center mb-5" style={{ fontSize: '1rem' }}>
                Visual summary of clustered feedback and their associated themes
            </p>

            {/* Visualizations Section */}
            <div className="row text-center g-4 mb-5">
                {images.scatter_plot && (
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3">
                            <div
                                style={{
                                    width: '100%',
                                    height: '320px',           // fixed consistent height
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                <img
                                    src={images.scatter_plot}
                                    alt="Scatter Plot"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        cursor: 'zoom-in',
                                    }}
                                    onClick={() => {
                                        setZoomSrc(images.scatter_plot);
                                        setZoomTitle('Semantic Scatter Plot');
                                        setShowZoom(true);
                                    }}
                                />

                          

                            </div>
                            <p className="fw-semibold mt-3 mb-0" style={{ fontSize: '1.1rem' }}>
                                Semantic Scatter Plot
                            </p>
                        </div>
                    </div>
                )}

                {images.bar_chart && (
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3">
                            <div
                                style={{
                                    width: '100%',
                                    height: '320px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                <img
                                    src={images.bar_chart}
                                    alt="Bar Chart"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        cursor: 'zoom-in',
                                    }}
                                    onClick={() => {
                                        setZoomSrc(images.bar_chart);
                                        setZoomTitle('Theme Frequency');
                                        setShowZoom(true);
                                    }}
                                />

                            </div>
                            <p className="fw-semibold mt-3 mb-0" style={{ fontSize: '1.1rem' }}>
                                Theme Frequency
                            </p>
                        </div>
                    </div>
                )}

                {images.word_cloud && (
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3">
                            <div
                                style={{
                                    width: '100%',
                                    height: '320px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                <img
                                    src={images.word_cloud}
                                    alt="Overlap Matrix"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        cursor: 'zoom-in',
                                    }}
                                    onClick={() => {
                                        setZoomSrc(images.word_cloud);
                                        setZoomTitle('Theme Overlap Matrix');
                                        setShowZoom(true);
                                    }}
                                />

                            </div>
                            <p className="fw-semibold mt-3 mb-0" style={{ fontSize: '1.1rem' }}>
                                Theme Overlap Matrix
                            </p>
                        </div>
                    </div>
                )}
            </div>


            {/* Themes Section */}

            <div className="row mb-5">
                {Object.entries(clusters)
                    .slice(0, showAllThemes ? Object.keys(clusters).length : 10)
                    .map(([theme, words], idx) => {
                        const isExpanded = expandedThemes[theme] || false;
                        const displayedWords = isExpanded ? words : words.slice(0, 5); // show 5 by default

                        return (
                            <div key={idx} className="col-md-6 mb-4">
                                <div
                                    className="border rounded p-3 shadow-sm bg-white h-100"

                                 
                                >
                                    <h5
                                        className="mb-3 fw-bold"
                                        style={{ color: '#1e3a8a' }}
                                    >
                                        {theme}
                                    </h5>

                                    <ul className="list-group list-group-flush">
                                        {displayedWords.map((word, i) => (
                                            <li key={i} className="list-group-item py-2">{word}</li>
                                        ))}
                                    </ul>
                                    {words.length > 5 && (
                                        <button
                                            className="btn btn-outline-secondary btn-sm rounded-pill mt-2 px-3 fw-semibold"
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

            {/* Show More Themes Button */}
            {Object.keys(clusters).length > 10 && (
                <div className="text-center mb-5">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setShowAllThemes(!showAllThemes)}
                    >
                        {showAllThemes ? 'Show Less Themes ▲' : 'Show More Themes ▼'}
                    </button>
                </div>
            )}

            {/* Download Button */}
            <div className="text-center">
                <button
                    onClick={handleDownload}
                    className="btn text-white px-4 py-2 rounded-pill shadow-sm"
            
                    style={{ fontWeight: '500', backgroundColor: '#1e3a8a' }}
                >
                    Download Cluster Data
                </button>
            </div>

            <div className="text-center mt-3">
                <a
                    href="/upload"
                    className="btn btn-outline-dark rounded-pill px-4 py-2 fw-semibold"
                >
                    ← Back to Upload
                </a>
            </div>

            {/* Zoom Modal */}
            <Modal show={showZoom} onHide={() => setShowZoom(false)} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title>{zoomTitle}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <img src={zoomSrc} alt={zoomTitle} className="w-100" />
                </Modal.Body>
            </Modal>


        </div>
    );
}
