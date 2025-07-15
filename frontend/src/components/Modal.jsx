import { Modal, Button, CloseButton } from 'react-bootstrap';
import { HiUser, HiCheck, HiRefresh } from 'react-icons/hi';
import { BsRobot } from 'react-icons/bs';

export default function CodewordReviewModal({
    show,
    onClose,
    data,
    onApprove,
    onApproveAll,
    onRegenerate,
    onRemoveCodeword,
    onContinue,
    regeneratingIndex
}) {
    const allApproved = data.length > 0 && data.every(entry => entry.approved);

    return (
        <Modal show={show} onHide={onClose} fullscreen scrollable>
            <Modal.Header closeButton>
                <Modal.Title className="fw-semibold">Codewords</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-5 py-4">
                {data.map((entry, idx) => (
                    <div key={idx} className="mb-5">
                        {/* User Feedback Block */}
                        <div style={{
                            backgroundColor: '#f1f5f9',
                            padding: '1rem 1.25rem',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            maxWidth: '75%'
                        }}>
                            <HiUser size={20} className="text-secondary mt-1" />
                            <div>
                                <p className="mb-1 fw-bold">Feedback</p>
                                <p className="mb-0 text-muted" style={{ fontSize: '0.95rem' }}>{entry.feedback || entry.text}</p>
                            </div>
                        </div>

                        {/* AI Codewords Block */}
                        <div style={{
                            backgroundColor: '#ffffff',
                            padding: '1rem 1.25rem',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            maxWidth: '75%',
                            marginLeft: 'auto',
                            marginTop: '1rem',
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)'
                        }}>
                            <BsRobot size={20} className="text-primary mt-1" />
                            <div style={{ flex: 1 }}>
                                <p className="mb-1 fw-bold">Codewords</p>
                                <div className="mb-2">
                                    {Array.isArray(entry.codewords) && entry.codewords.length > 0 ? (
                                        entry.codewords.map((word, i) => (
                                            <span key={i} className="badge bg-light border text-dark me-2 mb-2 position-relative">
                                                {word}
                                                <CloseButton
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-6px',
                                                        right: '-6px',
                                                        transform: 'scale(0.6)',
                                                        color: 'red'
                                                    }}
                                                    onClick={() => onRemoveCodeword(idx, i)}
                                                />
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-muted">No codewords</span>
                                    )}
                                </div>
                                <div>
                                    <Button
                                        variant="outline-success"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => onApprove(idx)}
                                        disabled={entry.approved}
                                    >
                                        <HiCheck className="me-1 mb-1" />
                                        {entry.approved ? 'Approved' : 'Approve'}
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => onRegenerate(idx)}
                                        disabled={regeneratingIndex === idx}
                                    >
                                        {regeneratingIndex === idx ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                Regenerating...
                                            </>
                                        ) : (
                                            <>
                                                <HiRefresh className="me-1 mb-1" />
                                                Regenerate
                                            </>
                                        )}
                                    </Button>

                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-between px-5">
                <Button variant="outline-dark" onClick={onApproveAll}>
                    <HiCheck className="me-2 mb-1" />
                    Approve All
                </Button>
           

                <Button variant="dark" disabled={!allApproved} onClick={onContinue}>
                    Continue →
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
