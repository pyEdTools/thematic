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
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="fw-bold">Codewords Review</Modal.Title>
            </Modal.Header>

            <Modal.Body className="px-5 py-4">
                {data.map((entry, idx) => (
                    <div key={idx} className="mb-5">
                        {/* User Feedback Block */}
                        <div
                            style={{
                                backgroundColor: '#f1f5f9',
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                maxWidth: '75%',
                            }}
                            className="shadow-sm"
                        >
                            <HiUser size={20} className="text-secondary mt-1" />
                            <div>
                                <p className="mb-1 fw-bold">Feedback</p>
                                <p
                                    className="mb-0 text-muted"
                                    style={{ fontSize: '0.95rem' }}
                                >
                                    {entry.feedback || entry.text}
                                </p>
                            </div>
                        </div>

                        {/* AI Codewords Block */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                maxWidth: '75%',
                                marginLeft: 'auto',
                                marginTop: '1rem',
                                boxShadow: '0 1px 6px rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            <BsRobot size={20} className="text-primary mt-1" />
                            <div style={{ flex: 1 }}>
                                <p className="mb-1 fw-bold text-primary">Codewords</p>

                                {/* Codeword Badges */}
                                <div className="mb-2">
                                    {Array.isArray(entry.codewords) &&
                                        entry.codewords.length > 0 ? (
                                        entry.codewords.map((word, i) => (
                                            <span
                                                key={i}
                                                className="badge bg-light border text-dark me-2 mb-2 position-relative"
                                                style={{
                                                    fontSize: '0.85rem',
                                                    padding: '0.4rem 0.7rem',
                                                    borderRadius: '999px',
                                                }}
                                            >
                                                {word}
                                                <CloseButton
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-6px',
                                                        right: '-6px',
                                                        transform: 'scale(0.6)',
                                                        color: 'red',
                                                    }}
                                                    onClick={() => onRemoveCodeword(idx, i)}
                                                />
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-muted">No codewords</span>
                                    )}
                                </div>

                                {/* Helper Text */}
                                <p
                                    className="text-muted fst-italic"
                                    style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}
                                >
                                    Do these codes look good?
                                </p>

                                {/* Buttons */}
                                <div>
                                    <Button
                                        variant={entry.approved ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        className="me-2 rounded-pill"
                                        onClick={() => onApprove(idx)}
                                        disabled={entry.approved}
                                    >
                                        <HiCheck className="me-1 mb-1" />
                                        {entry.approved ? 'Approved' : 'Approve'}
                                    </Button>

                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        className="rounded-pill"
                                        onClick={() => onRegenerate(idx)}
                                        disabled={regeneratingIndex === idx}
                                    >
                                        {regeneratingIndex === idx ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-1"
                                                    role="status"
                                                    aria-hidden="true"
                                                ></span>
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

            {/* Footer */}
            <Modal.Footer className="d-flex justify-content-between px-5 border-0">
                <Button
                    variant="outline-primary"
                    className="rounded-pill"
                    onClick={onApproveAll}
                >
                    <HiCheck className="me-2 mb-1" />
                    Approve All
                </Button>

                <Button
                    variant="primary"
                    className="rounded-pill px-4"
                    disabled={!allApproved}
                    onClick={onContinue}
                >
                    Continue →
                </Button>
            </Modal.Footer>
        </Modal>
    );

}
