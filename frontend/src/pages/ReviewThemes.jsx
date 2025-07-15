import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ThemeSeedTable from '../components/ThemeTable';
import { Toast, ToastContainer, Spinner } from 'react-bootstrap';

export default function ReviewThemes() {
    const { public_id } = useParams();
    const [codewordsData, setCodewordsData] = useState([]);
    const [themes, setThemes] = useState(['']);
    const [seeds, setSeeds] = useState(['']);
    const [isClustering, setIsClustering] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCodewords = async () => {
            const res = await axios.get(`/api/submission/${public_id}/codewords`);
            setCodewordsData(res.data.codewords);
        };
        fetchCodewords();
    }, [public_id]);

    const handleCluster = async () => {
        const payload = { themes: {}, seeds: {} };

        themes.forEach((theme, idx) => {
            payload.themes[`theme[${idx}]`] = theme;
            payload.seeds[`seeds[${idx}]`] = seeds[idx];
        });

        try {
            setIsClustering(true);
            await axios.post(`/api/submission/${public_id}/cluster`, payload);
            setShowToast(true);  // Show success toast
            setTimeout(() => navigate(`/results/${public_id}`), 1000);
        } catch (err) {
            console.error("Clustering failed", err);
        } finally {
            setIsClustering(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="mb-4">
                <h5 className="text-muted mb-3">All Approved Codewords</h5>
                <div className="p-3 border rounded bg-light" style={{ minHeight: '100px' }}>
                    {codewordsData.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {codewordsData.map((word, i) => (
                                <span key={i} className="badge bg-secondary text-light" style={{ fontSize: '0.85rem' }}>
                                    {word}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted m-0">No approved codewords available.</p>
                    )}
                </div>
            </div>

            <ThemeSeedTable
                themes={themes}
                setThemes={setThemes}
                seeds={seeds}
                setSeeds={setSeeds}
            />

            <div className="d-flex justify-content-end mt-4">
                <button
                    onClick={handleCluster}
                    className="btn btn-success"
                    disabled={isClustering}
                >
                    {isClustering ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Clustering...
                        </>
                    ) : (
                        'Run Clustering'
                    )}
                </button>
            </div>

            {/* Toast Notification */}
            <ToastContainer position="bottom-end" className="p-3">
                <Toast
                    show={showToast}
                    onClose={() => setShowToast(false)}
                    delay={2000}
                    autohide
                    bg="success"
                >
                    <Toast.Header>
                        <strong className="me-auto">Clustering</strong>
                    </Toast.Header>
                    <Toast.Body className="text-white">Clustering completed!</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    );
}
