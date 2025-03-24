import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AttendanceForm from "../components/AttendanceForm";
import Holidays from "../components/Holiday";
import AdminEmployeeView from "../components/AdminEmployeeView";
import EmployeeDashboard from "../components/EmployeeView";
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
      if (storedUser.role === "Admin") {
        setActiveSection("attendanceForm");
      }
    }
  }, [navigate]);

  useEffect(() => {
    // Set current date automatically when Admin logs in
    if (user && user.role === "Admin") {
      setSelectedDate(new Date().toISOString().split("T")[0]); // Format as YYYY-MM-DD
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null; // Prevent rendering until user data is loaded

  // Conditional logout button styling:
  // For employees (non-admin), place it absolutely at the top-right corner of the header.
  const logoutButtonStyle =
    user.role !== "Admin"
      ? { position: "absolute", top: "10px", right: "10px" }
      : {};

  return (
    <div>
      <Header role={user.role} />
      <Navbar bg="primary" variant="dark" expand="lg" className="mb-3 p-3" style={{ position: "relative" }}>
        <Container fluid>
          {/* Display user’s name on the left side */}
          <Navbar.Brand>
            {user.role === "Admin"
              ? `Admin Panel - Welcome, ${user.name}`
              : `Employee Dashboard - Welcome, ${user.name}`}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Row className="w-100">
              {/* Left-aligned Date Picker (only for Admin) */}
              {user.role === "Admin" && (
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
              {/* Right-aligned Section Buttons */}
              <Col xs={12} md={8} className="d-flex justify-content-md-end">
                <Nav className="d-flex flex-wrap">
                  {user.role === "Admin" && (
                    <>
                      <Button
                        variant={activeSection === "attendanceForm" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("attendanceForm")}
                      >
                        Attendance Form
                      </Button>
                      <Button
                        variant={activeSection === "holidays" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("holidays")}
                      >
                        Holidays
                      </Button>
                      <Button
                        variant={activeSection === "employeeView" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("employeeView")}
                      >
                        Employee View
                      </Button>
                    </>
                  )}
                  {/* For Admin, Logout button is rendered normally as part of Nav.
                      For employees, it will also be rendered inside Nav but with absolute positioning below. */}
                  {user.role === "Admin" && (
                    <Button variant="danger" className="ms-2 mb-2" onClick={handleLogout}>
                      Logout
                    </Button>
                  )}
                </Nav>
              </Col>
            </Row>
          </Navbar.Collapse>
          {/* For Employee Dashboard, position the Logout button in the corner */}
          {user.role !== "Admin" && (
            <Button variant="danger" style={logoutButtonStyle} onClick={handleLogout}>
              Logout
            </Button>
          )}
        </Container>
      </Navbar>

      {/* Dynamic Section Rendering - Full Screen (No Container) */}
      <div className="w-100">
        {activeSection === "dashboard" && (
          <h3 className="text-center mt-4">Dashboard Overview</h3>
        )}
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "holidays" && <Holidays />}
        {activeSection === "employeeView" &&
          (user.role === "Admin" ? <AdminEmployeeView /> : <EmployeeDashboard />)}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
