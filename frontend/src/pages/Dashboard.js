import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Navbar, Nav, Container, Button, Form, Row, Col } from "react-bootstrap";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard"); // Default view

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/"); // Redirect to login if no user is found
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null; // Prevents rendering until user data is loaded

  return (
    <div>
      <Header role={user.role} />
      <Navbar bg="primary" variant="dark" expand="lg" className="mb-3 p-3">
        <Container fluid>
          <Navbar.Brand>
            {user.role === "admin" ? "Admin Panel" : "Employee Dashboard"}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Row className="w-100">
              {/* Left-aligned Date Picker */}
              <Col xs={12} md={4} className="d-flex align-items-center mt-2 mt-md-0">
                <Form className="w-100">
                  <Form.Control 
                    type="date" 
                    className="w-100"
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </Form>
              </Col>
              {/* Right-aligned Buttons */}
              <Col xs={12} md={8} className="d-flex justify-content-md-end">
                <Nav className="d-flex flex-wrap">
                  {user.role === "employee" ? (
                    <Button 
                      variant="light" 
                      className="me-2 mb-2" 
                      onClick={() => setActiveSection("employeeView")}
                    >
                      Employee View
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="light" 
                        className="me-2 mb-2" 
                        onClick={() => setActiveSection("attendanceForm")}
                      >
                        Attendance Form
                      </Button>
                      <Button 
                        variant="light" 
                        className="me-2 mb-2" 
                        onClick={() => setActiveSection("addHolidays")}
                      >
                        Add Holidays
                      </Button>
                      <Button 
                        variant="light" 
                        className="me-2 mb-2" 
                        onClick={() => setActiveSection("employeeView")}
                      >
                        Employee View
                      </Button>
                      <Button 
                        variant="light" 
                        className="me-2 mb-2" 
                        onClick={() => setActiveSection("report")}
                      >
                        Report
                      </Button>
                    </>
                  )}
                  {/* Logout Button */}
                  <Button variant="danger" className="ms-2 mb-2" onClick={handleLogout}>
                    Logout
                  </Button>
                </Nav>
              </Col>
            </Row>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Dynamic Section Rendering Based on Active State */}
      <Container>
        <h2 className="text-center mt-4">Welcome, {user.name}!</h2>
        {activeSection === "dashboard" && <h3 className="text-center mt-4">🏠 Dashboard Overview</h3>}
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "addHolidays" && <AddHolidays />}
        {activeSection === "employeeView" && <EmployeeView />}
        {activeSection === "report" && <Report />}
      </Container>

      <Footer />
    </div>
  );
};

// Placeholder Components
const AttendanceForm = () => <h3 className="text-center mt-4">📋 Attendance Form</h3>;
const AddHolidays = () => <h3 className="text-center mt-4">🎉 Add Holidays</h3>;
const EmployeeView = () => <h3 className="text-center mt-4">👨‍💼 Employee View</h3>;
const Report = () => <h3 className="text-center mt-4">📊 Report Section</h3>;

export default Dashboard;
