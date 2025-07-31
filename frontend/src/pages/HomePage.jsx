import { Container, Button, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
    const navigate = useNavigate();

    return (
        <Container fluid className="vh-100 d-flex justify-content-center align-items-center bg-light">
            <Row>
                <Col className="text-center">
                    <h1 className="mb-4 fw-bold">Thematic Analysis</h1>
                    <p className="text-muted mb-5">
                        Analyze qualitative feedback and discover themes within your data.
                    </p>
                    <Button
                        variant="outline-dark"
                        size="lg"
                        style={{
                            borderRadius: "50px",
                            padding: "12px 36px",
                            fontSize: "1.2rem",
                        }}
                        onClick={() => navigate("/upload")}
                    >
                        Begin Analysis
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}
