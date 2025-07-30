import { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import CodewordReviewModal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';

import '../App.css'; 


export default function UploadPage() {
    const [csvData, setCsvData] = useState([]);
    const [columnName, setColumnName] = useState('');
    const [reviewData, setReviewData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [submissionId, setSubmissionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState(null);




    const navigate = useNavigate();

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setCsvData(results.data);
                },
            });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
        },
    });



    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setCsvData(results.data);
                },
            });
        }
    };

    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(''); // Clear previous errors

        if (!columnName || csvData.length === 0) {
            setErrorMessage('Please upload a file and specify the feedback column.');
            setIsLoading(false);
            return;
        }

        const feedbackList = csvData
            .map(row => row[columnName])
            .filter(text => text && text.trim() !== '');

        try {
            const response = await axios.post('/api/generate', {
                feedback: feedbackList
            });

            const { submission_id, results } = response.data;

            setReviewData(results.map(entry => ({ ...entry, approved: false })));
            setSubmissionId(submission_id);
            setShowModal(true);

        } catch (error) {
            console.error('Failed to generate codewords:', error);
            setErrorMessage('Failed to generate codewords. Please try again.');
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




        await axios.post('/api/approve_codewords', {
            approved: approvedEntries
        });

        // Now redirect to the next step:
        navigate(`/submission/${submissionId}/themes`);
    };

    const handleRegenerate = async (idx) => {
        const text = reviewData[idx].feedback || reviewData[idx].text;

        try {
            setRegeneratingIndex(idx);  // Start loading
            const response = await axios.post('/api/regenerate_one', { text });
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
        <div className="container py-4" style={{ maxWidth: '1200px' }}>
            <h5 className="text-muted fw-bold mb-2">Upload Your Feedback Dataset</h5>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                Upload your open-ended feedback data in CSV format, specify the column with the feedback to simulate thematic analysis.
            </p>

            <form onSubmit={handleSubmit} className="row gx-4 gy-5">
                {/* LEFT PANEL */}
                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm p-4">
                        <div className="mb-3">
                            <label className="form-label">Upload CSV</label>
                            <input
                                type="file"
                                className="form-control mb-2"
                                accept=".csv"
                                onChange={handleFileChange}
                            />

                            <div
                                {...getRootProps()}
                                className="border rounded p-3 text-center"
                                style={{
                                    background: isDragActive ? '#f8f9fa' : '#fcfcfc',
                                    borderColor: '#ddd',
                                    borderStyle: 'dashed',
                                    fontSize: '0.9rem',
                                    color: '#6c757d',
                                    cursor: 'pointer',
                                }}
                            >
                                <input {...getInputProps()} />
                                {isDragActive ? (
                                    <span>Drop the CSV file here...</span>
                                ) : (
                                    <span>Or drag and drop a CSV file here</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Feedback Column Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g., Response, Feedback"
                                value={columnName}
                                onChange={(e) => setColumnName(e.target.value)}
                            />
                        </div>

                        <small className="d-flex align-items-center gap-1">
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

                        {errorMessage && (
                            <div className="alert alert-danger mt-3" role="alert">
                                {errorMessage}
                            </div>
                        )}


                        <button type="submit" className="btn btn-dark w-100 mt-3 py-2">
                            Generate Codewords
                        </button>
                        {isLoading && (
                            <div className="text-center mt-3 d-flex flex-column align-items-center">
                                <FaSpinner className="spin mb-2" size="1.8rem" />
                                <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                                    Generating codewords — this may take a moment...
                                </p>
                            </div>
                        )}

                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="col-lg-7">
                    <div
                        className="card border-0 shadow-sm p-4"
                        style={{ maxHeight: '600px', overflowY: 'auto' }}
                    >
                        {csvData.length > 0 ? (
                            <table className="table table-sm table-bordered table-striped mb-0">
                                <thead>
                                    <tr>
                                        {Object.keys(csvData[0]).map((header, i) => (
                                            <th key={i}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvData.map((row, idx) => (
                                        <tr key={idx}>
                                            {Object.values(row).map((cell, i) => (
                                                <td key={i}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-muted mb-0">Uploaded data will appear here...</p>
                        )}
                    </div>
                </div>
            </form>

            {/* Example Modal */}
            <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Example Upload</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <img
                        src="/example.png"
                        alt="Example"
                        style={{ width: '100%', borderRadius: '0.5rem' }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowImageModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal for Codeword Review */}
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

            {/* Thematic Analysis Process Overview */}
            <div className="mt-5 pt-5 border-top text-center" style={{ scrollMarginTop: '100px' }}>
                <h4 className="fw-semibold mb-2">Visualizing the Thematic Analysis Workflow</h4>
                <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                    See how your qualitative feedback moves through each stage of the analysis pipeline.
                </p>
                <img
                    src="/thematic-pipeline.png"
                    alt="Thematic Analysis Workflow Diagram"
                    style={{ maxWidth: '100%', borderRadius: '0.75rem' }}
                />
            </div>



        </div>
    );

}
