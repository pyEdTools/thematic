import { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import CodewordReviewModal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import '../App.css'; // Assuming you have some global styles


export default function UploadPage() {
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [columnName, setColumnName] = useState('');
    const [themes, setThemes] = useState('');
    const [reviewData, setReviewData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [submissionId, setSubmissionId] = useState(null);
    const [context, setContext] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState(null);




    const navigate = useNavigate();


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setCsvData(results.data);
                },
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true)

        if (!columnName || csvData.length === 0) {
            alert('Please upload a file and specify the feedback column.');
            return;
        }

        const feedbackList = csvData
            .map(row => row[columnName])
            .filter(text => text && text.trim() !== '');

        try {
            const response = await axios.post('/generate', {
                feedback: feedbackList
            });

            const { submission_id, results } = response.data;

            setReviewData(results.map(entry => ({ ...entry, approved: false })));
            setSubmissionId(submission_id);  // <- saved public_id
            setShowModal(true);

        } catch (error) {
            console.error('Failed to generate codewords:', error);
            alert('An error occurred while generating codewords.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = (idx) => {
        const updated = [...reviewData];
        updated[idx].approved = true;
        setReviewData(updated);
    };

    const handleApproveAll = () => {
        const updated = reviewData.map(entry => ({ ...entry, approved: true }));
        setReviewData(updated);
    };


    const handleRemoveCodeword = (entryIdx, wordIdx) => {
        const updated = [...reviewData];
        updated[entryIdx].codewords.splice(wordIdx, 1);
        updated[entryIdx].approved = false; // unapprove if modified
        setReviewData(updated);
    };


    const handleContinue = async () => {
        const approvedEntries = reviewData
            .filter(entry => entry.approved)
            .map(entry => ({
                feedback_id: entry.feedback_id,
                codewords: entry.codewords
            }));
        
        console.log("Sending only approved entries:", approvedEntries);




        await axios.post('/approve_codewords', {
            approved: approvedEntries
        });

        // Now redirect to the next step:
        navigate(`/submission/${submissionId}/themes`);
    };

    const handleRegenerate = async (idx) => {
        const text = reviewData[idx].feedback || reviewData[idx].text;

        try {
            setRegeneratingIndex(idx);  // Start loading
            const response = await axios.post('/regenerate_one', { text });
            const updated = [...reviewData];
            updated[idx].codewords = response.data.codewords;
            updated[idx].approved = false;
            setReviewData(updated);
        } catch (error) {
            console.error('Error regenerating codewords:', error);
            alert('Failed to regenerate codewords.');
        } finally {
            setRegeneratingIndex(null);  // Stop loading
        }
    };






    return (
        <div className="container mt-4">
            <p className="small text-muted fw-bold">Instructions:</p>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Input your feedback into a csv file and specify your feedback column name.
                Before you begin coding make you can help the LLM by giving context of your feedback as well.
            </p>

            <form onSubmit={handleSubmit} className="row g-4">
                <div className="col-md-5">
                    <div className="mb-3">
                        <label className="form-label">Upload CSV</label>
                        <input type="file" className="form-control" accept=".csv" onChange={handleFileChange} />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Feedback Column Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={columnName}
                            onChange={(e) => setColumnName(e.target.value)}
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Feedback Context</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g., A 4-week AI coding program"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                        />
                    </div>

                    <small className='d-flex align-items-center gap-1'>
                        show{' '}
                        <button
                            type="button"
                            className="btn btn-link p-0"
                            style={{ fontSize: '0.85rem' }}
                            onClick={() => setShowImageModal(true)}
                        >
                            example
                        </button>
                    </small>


                    <button type="submit" className="btn btn-dark w-100 mt-1 py-2">
                        Generate Codewords
                    </button>

                    {isLoading && <FaSpinner className="spin" size="2rem" />}


                </div>

                <div className="col-md-7">
                    <div className="border rounded p-3 bg-light" style={{ height: '21rem', overflowY: 'auto' }}>
                        {csvData.length > 0 ? (
                            <table className="table table-sm table-bordered table-striped">
                                <thead>
                                    <tr>
                                        {Object.keys(csvData[0]).map((header, i) => <th key={i}>{header}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvData.slice(0, 5).map((row, idx) => (
                                        <tr key={idx}>
                                            {Object.values(row).map((cell, i) => <td key={i}>{cell}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-muted">Uploaded data will appear here...</p>
                        )}
                    </div>
                </div>
            </form>

            <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Example Upload</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <img src="/example.png" alt="Example" style={{ width: '100%', borderRadius: '0.5rem' }} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowImageModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>



            <CodewordReviewModal
                show={showModal}
                onClose={() => setShowModal(false)}
                data={reviewData}
                onApprove={handleApprove}
                onApproveAll={handleApproveAll}
                onRegenerate={handleRegenerate}
                onRemoveCodeword={handleRemoveCodeword}
                onContinue={handleContinue}
                regeneratingIndex={regeneratingIndex}

                
            />



            
        </div>
    );
}
