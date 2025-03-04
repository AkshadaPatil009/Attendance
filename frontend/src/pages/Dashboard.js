import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AttendanceForm from "../components/AttendanceForm";
import Holidays from "../components/Holiday";
import EmployeeView from "../components/EmployeeView";
import Report from "../components/Report";
import { Navbar, Nav, Container, Button, Form, Row, Col } from "react-bootstrap";
import "./Dashboard.css"; // Import the CSS that forces the background color

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeSection, setActiveSection] = useState("employeeView");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/"); // Redirect to login if no user is found
    } else {
      setUser(storedUser);
      // Set default section based on user role:
      if (storedUser.role === "admin") {
        setActiveSection("attendanceForm");
      }
    }
  }, [navigate]);

  useEffect(() => {
    // Set current date automatically when admin logs in
    if (user && user.role === "admin") {
      setSelectedDate(new Date().toISOString().split("T")[0]); // Format as YYYY-MM-DD
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null; // Prevent rendering until user data is loaded

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
              {/* Left-aligned Date Picker (only for admin) */}
              {user.role === "admin" && (
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
              )}
              {/* Right-aligned Buttons */}
              <Col xs={12} md={8} className="d-flex justify-content-md-end">
                <Nav className="d-flex flex-wrap">
                  {user.role === "admin" && (
                    <>
                      <Button
                        variant={activeSection === "attendanceForm" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("attendanceForm")}
                        active={activeSection === "attendanceForm"}
                      >
                        Attendance Form
                      </Button>
                      <Button
                        variant={activeSection === "holidays" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("holidays")}
                        active={activeSection === "holidays"}
                      >
                        Holidays
                      </Button>
                      <Button
                        variant={activeSection === "report" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("report")}
                        active={activeSection === "report"}
                      >
                        Report
                      </Button>
                    </>
                  )}

                  {/* Remove "Employee View" Button if Logged in as Employee */}
                  {user.role === "admin" && (
                    <Button
                      variant={activeSection === "employeeView" ? "secondary" : "light"}
                      className="me-2 mb-2"
                      onClick={() => setActiveSection("employeeView")}
                      active={activeSection === "employeeView"}
                    >
                      Employee View
                    </Button>
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

      {/* Dynamic Section Rendering - Full Screen (No Container) */}
      <div className="w-100">
        {activeSection === "dashboard" && (
          <h3 className="text-center mt-4">Dashboard Overview</h3>
        )}
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "holidays" && <Holidays />}
        {activeSection === "employeeView" && <EmployeeView role={user.role} />}
        {activeSection === "report" && <Report />}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
