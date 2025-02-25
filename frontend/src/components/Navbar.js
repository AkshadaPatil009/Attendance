import React, { useState, useEffect } from "react";
import { Navbar, Nav, Container, Button, Form, Row, Col } from "react-bootstrap";

const AdminNavbar = () => {
  const [selectedDate, setSelectedDate] = useState("");

  // Set today's date when the component loads
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-3 p-3">
      <Container fluid>
        <Navbar.Brand>Admin Panel</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Row className="w-100">
            {/* Left-aligned Date Picker */}
            <Col xs={12} md={4} className="d-flex align-items-center mt-2 mt-md-0">
              <Form className="w-100">
                <Form.Control 
                  type="date" 
                  className="w-100"
                  value={selectedDate} // Set default date
                  onChange={(e) => setSelectedDate(e.target.value)} // Update state on change
                />
              </Form>
            </Col>
            {/* Right-aligned Buttons */}
            <Col xs={12} md={8} className="d-flex justify-content-md-end">
              <Nav className="d-flex flex-wrap">
                <Button variant="light" className="me-2 mb-2">Attendance Form</Button>
                <Button variant="light" className="me-2 mb-2">Add Holidays</Button>
                <Button variant="light" className="me-2 mb-2">Emp View</Button>
                <Button variant="light" className="me-2 mb-2">Report</Button>
              </Nav>
            </Col>
          </Row>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AdminNavbar;
