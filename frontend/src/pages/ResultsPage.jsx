import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ResultsPage() {
    const { public_id } = useParams();
    const [clusters, setClusters] = useState({});
    const [images, setImages] = useState({
        scatter_plot: '',
        bar_chart: '',
        pie_chart: ''
    });



    useEffect(() => {
        axios.get(`/api/submission/${public_id}/results`)
            .then(res => {
                setClusters(res.data.results || {});
                setImages({
                    scatter_plot: res.data.scatter_plot || '',
                    bar_chart: res.data.bar_chart || '',
                    pie_chart: res.data.pie_chart || ''
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
            <h3 className="mb-2 fw-bold text-center" style={{ fontSize: '2rem' }}>Thematic Clustering Results</h3>
            <p className="text-muted text-center mb-5" style={{ fontSize: '1rem' }}>
                Visual summary of clustered feedback and their associated themes
            </p>

            {/* Chart Grid */}
            <div className="row text-center mb-5">
                <div className="col-md-4 mb-4">
                    {images.scatter_plot && (
                        <img
                            src={images.scatter_plot}
                            alt="Scatter Plot"
                            className="img-fluid rounded"
                            style={{ maxHeight: "28rem", objectFit: "contain" }}
                        />
                    )}
                    <p className="mt-3 fw-semibold" style={{ fontSize: "1.1rem" }}>Semantic Scatter Plot</p>
                </div>
                <div className="col-md-4 mb-4">
                    {images.bar_chart && (
                        <img
                            src={images.bar_chart}
                            alt="Bar Chart"
                            className="img-fluid rounded"
                            style={{ maxHeight: "28rem", objectFit: "contain" }}
                        />
                    )}
                    <p className="mt-3 fw-semibold" style={{ fontSize: "1.1rem" }}>Theme Frequencies</p>
                </div>
                <div className="col-md-4 mb-4">
                    {images.pie_chart && (
                        <img
                            src={images.pie_chart}
                            alt="Pie Chart"
                            className="img-fluid rounded"
                            style={{ maxHeight: "28rem", objectFit: "contain" }}
                        />
                    )}
                    <p className="mt-3 fw-semibold" style={{ fontSize: "1.1rem" }}>Theme Distribution</p>
                </div>
            </div>


            {/* Theme Tables */}
            <div className="mb-5">
                <div className="row">
                    {Object.entries(clusters).map(([theme, words], idx) => (
                        <div key={idx} className="col-md-6 mb-4">
                            <div className="border rounded p-3 shadow-sm bg-white">
                                <h5 className="mb-3 fw-bold text-info">{theme}</h5>
                                <ul className="list-group list-group-flush">
                                    {words.map((word, i) => (
                                        <li key={i} className="list-group-item py-2">{word}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            {/* Download Button */}
            <div className="text-center mb-5">
                <button
                    className="btn btn-info rounded-pill px-4 py-2 fw-bold"
                    onClick={handleDownload}
                >
                    Download Clustered Themes
                </button>
            </div>
        </div>
    );
}
