import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AttendanceForm from "../components/AttendanceForm";
import Holidays from "../components/Holiday";
import AdminEmployeeView from "../components/AdminEmployeeView";


// newly added imports for employee-specific sections
import EmployeeAttendance from "../components/EmployeeView/EmployeeAttendance";
import LeavesEmployee from "../components/EmployeeView/LeavesEmployee";
import HolidaysEmployee from "../components/EmployeeView/HolidaysEmployee";
import MailRequest from "../components/EmployeeView/MailRequest";

import { Navbar, Nav, Container, Button, Row, Col } from "react-bootstrap";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("employeeAttendance");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/");
    } else {
      setUser(storedUser);
      if (storedUser.role === "Admin") {
        setActiveSection("attendanceForm");
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null;

  const logoutButtonStyle =
    user.role !== "Admin"
      ? { position: "absolute", top: "10px", right: "10px" }
      : {};

  return (
    <div>
      <Header role={user.role} />
      <Navbar
        bg="primary"
        variant="dark"
        expand="lg"
        className="mb-3 py-1 px-3 custom-navbar"
        style={{ position: "relative" }}
      >
        <Container fluid>
          <Navbar.Brand>
            {user.role === "Admin"
              ? `Admin Panel - Welcome, ${user.name}`
              : `Employee Dashboard - Welcome, ${user.name}`}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Row className="w-100">
              <Col xs={12} md={8}>
                {/* nothing here; buttons floated via CSS */}
              </Col>
            </Row>

            {/* Admin buttons */}
            {user.role === "Admin" && (
              <Nav className="d-flex flex-wrap corner-buttons">
                <Button
                  variant={activeSection === "attendanceForm" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("attendanceForm")}
                >
                  Attendance
                </Button>
                <Button
                  variant={activeSection === "holidays" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("holidays")}
                >
                  Holidays
                </Button>
                <Button
                  variant={activeSection === "adminemployeeView" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("adminemployeeView")}
                >
                  Leaves
                </Button>
                <Button
                  variant="danger"
                  style={logoutButtonStyle}
                  className="ms-2 mb-2 uniform-button"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Nav>
            )}

            {/* Employee buttons */}
            {user.role !== "Admin" && (
              <Nav className="d-flex flex-wrap corner-buttons">
                <Button
                  variant={activeSection === "employeeAttendance" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("employeeAttendance")}
                >
                  Attendance
                </Button>
                <Button
                  variant={activeSection === "leavesEmployee" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("leavesEmployee")}
                >
                  Leaves
                </Button>
                <Button
                  variant={activeSection === "holidaysEmployee" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("holidaysEmployee")}
                >
                  Holidays
                </Button>
                <Button
                  variant={activeSection === "mailRequest" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("mailRequest")}
                >
                  Mail Request
                </Button>
                
                <Button
                  variant="danger"
                  className="ms-2 mb-2 uniform-button"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Nav>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <div className="w-100">
        {activeSection === "dashboard" && (
          <h3 className="text-center mt-4">Dashboard Overview</h3>
        )}

        {/* Admin sections */}
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "holidays" && <Holidays />}
        {activeSection === "adminemployeeView" && user.role === "Admin" && (
          <AdminEmployeeView />
        )}

        {/* Employee sections */}
        {activeSection === "leavesEmployee" && <LeavesEmployee />}
        {activeSection === "holidaysEmployee" && <HolidaysEmployee />}
        {activeSection === "mailRequest" && <MailRequest />}
        {activeSection === "employeeAttendance" && user.role !== "Admin" && (
          <EmployeeAttendance />
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
