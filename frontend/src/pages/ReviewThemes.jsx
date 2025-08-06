import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ThemeSeedTable from '../components/ThemeTable';
import { Toast, ToastContainer } from 'react-bootstrap';

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
                <p className='text-muted'>These are the 'codes' that have been approved for clustering. Input your own themes and correlated seeds to begin the clustering.</p>
                <div
                    className="p-3 border rounded bg-light"
                    style={{
                        minHeight: '200px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        justifyContent: 'center',
                    }}
                >
                    {codewordsData.length > 0 ? (
                        codewordsData.map((word, i) => {
                            const flattenedSeeds = seeds
                                .map(seedStr => seedStr.split(','))
                                .flat()
                                .map(s => s.trim().toLowerCase());

                            const isSeed = flattenedSeeds.includes(word.toLowerCase());

                            // Pastel palette for non-seed bubbles
                            const colors = [
                                '#A78BFA', // soft purple
                                '#60A5FA', // soft blue
                                '#34D399', // soft green
                                '#FBBF24', // soft yellow
                                '#F472B6', // soft pink
                                '#F87171', // soft red
                                '#818CF8', // soft indigo
                                '#2DD4BF', // teal
                                '#C084FC', // violet
                                '#FACC15'  // amber
                            ];

                            const bgColor = isSeed ? '#38b6ff' : colors[i % colors.length];

                            return (
                                <span
                                    key={i}
                                    style={{
                                        fontSize: '0.85rem',
                                        padding: '0.35rem 0.8rem',
                                        borderRadius: '999px',
                                        backgroundColor: bgColor,
                                        color: '#fff',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.2s ease',
                                        cursor: 'default',
                                    }}
                                    className="hover:scale-105"
                                >
                                    {word}
                                </span>
                            );
                        })
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
                    disabled={isClustering}
                    className="px-4 py-2 fw-semibold text-white border-0"
                    style={{
                        borderRadius: '50px',
                        background: isClustering
                            ? 'linear-gradient(135deg, #9CA3AF, #6B7280)' // grayish when disabled
                            : 'linear-gradient(135deg, #1a1a1a, #555555)', // vibrant green gradient

                        transition: 'all 0.25s ease',
                        cursor: isClustering ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                        if (!isClustering) e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    {isClustering ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
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
