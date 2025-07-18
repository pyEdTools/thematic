import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import '../App.css';

export default function TabNavigation() {
    return (
        <div className="nav-wrapper shadow-sm p-3 mb-4 bg-white">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
                <Nav variant="tabs" defaultActiveKey="/upload" className="custom-tabs">
                    <Nav.Item>
                        <Nav.Link as={NavLink} to="/upload" eventKey="/upload">
                            Thematic Analysis
                        </Nav.Link>
                    </Nav.Item>
                    {/* <Nav.Item>
                        <Nav.Link as={NavLink} to="/tbd" eventKey="/tbd">
                            TBD
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={NavLink} to="/cluster-existing" eventKey="/cluster-existing">
                            Cluster Existing Codes
                        </Nav.Link>
                    </Nav.Item> */}

                  
                </Nav>
            </div>
        </div>
    );
}

