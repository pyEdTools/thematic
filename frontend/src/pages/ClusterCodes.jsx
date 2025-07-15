import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import ThemeSeedTable from '../components/ThemeTable';

export default function ClusterExistingCodes() {
    const navigate = useNavigate();




    const [codeText, setCodeText] = useState('');
    const [themes, setThemes] = useState(['']);
    const [seeds, setSeeds] = useState(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showExample, setShowExample] = useState(false);

    const allWords = codeText.split(',').map(w => w.trim().toLowerCase());
    const duplicates = allWords.filter((item, idx) => allWords.indexOf(item) !== idx);

    const handleCluster = async () => {
        const codeList = codeText
            .split(',')
            .map(c => c.trim().toLowerCase())
            .filter(Boolean); // remove empty strings

        const payload = {
            codes: codeList,
            themes: {},
            seeds: {}
        };

        themes.forEach((theme, idx) => {
            payload.themes[`theme[${idx}]`] = theme;
            payload.seeds[`seeds[${idx}]`] = seeds[idx];
        });

        try {
            setIsSubmitting(true);
            const res = await axios.post('/api/cluster_manual_codes', payload);
            const public_id = res.data.public_id;
            if (public_id) {
                navigate(`/results/${public_id}`);
            } else {
                console.error("Missing public_id in response", res.data);
            }


        } catch (err) {
            console.error('Manual clustering failed', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mt-4">
            <h5 className="mb-3">Paste Codewords You Already Have</h5>
            <textarea
                className="form-control mb-3"
                rows={5}
                value={codeText}
                onChange={e => setCodeText(e.target.value)}
            />

            {codeText.trim() && (
                <div className="mt-2">
                    <small className="text-muted">Live Preview:</small>
                    <div className="d-flex flex-wrap gap-2 mt-1">
                        {codeText
                            .split(',')
                            .map(word => word.trim().toLowerCase())
                            .filter(word => word)
                            .map((word, idx) => {
                                const allSeeds = seeds
                                    .map(seedStr => seedStr.split(','))
                                    .flat()
                                    .map(s => s.trim().toLowerCase());

                                const isSeed = allSeeds.includes(word);

                                return (
                                    <span
                                        key={idx}
                                        style={{
                                            fontSize: '0.85rem',
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            backgroundColor: isSeed ? '#38b6ff' : '#e0e0e0',
                                            color: isSeed ? '#fff' : '#333'
                                        }}
                                    >
                                        {word}
                                    </span>
                                );
                            })}
                    </div>
                </div>
            )}






            <Button
                variant="link"
                size="sm"
                className="p-0 mb-3"
                onClick={() => setShowExample(true)}
            >
                Show example
            </Button>

            <ThemeSeedTable
                themes={themes}
                setThemes={setThemes}
                seeds={seeds}
                setSeeds={setSeeds}
            />

            <div className="d-flex justify-content-end mt-3">
                <Button variant="success" onClick={handleCluster} disabled={isSubmitting || !codeText.trim()}>
                    {isSubmitting ? 'Clustering...' : 'Run Clustering'}
                </Button>
            </div>

            {/* Example Modal */}
            <Modal show={showExample} onHide={() => setShowExample(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Example Format</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Paste your codewords in a comma-separated format:</p>
                    <code>peer support, autonomy, self-efficacy, growth mindset</code>
                    <p className="mt-3">Ensure each code is meaningful, lowercase, and not duplicated.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowExample(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
