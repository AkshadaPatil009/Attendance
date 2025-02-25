import React from "react";
import { Navbar, Nav, Container, Button, Form } from "react-bootstrap";

const AdminNavbar = () => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-3">
      <Container>
        <Navbar.Brand>Admin Panel</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Button variant="light" className="mx-2">Attendance Form</Button>
            <Button variant="light" className="mx-2">Add Holidays</Button>
            <Button variant="light" className="mx-2">Emp View</Button>
            <Button variant="light" className="mx-2">Report</Button>
          </Nav>
          <Form className="d-flex">
            <Form.Control type="date" className="me-2" />
          </Form>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AdminNavbar;
