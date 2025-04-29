import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Admin views
import AttendanceForm    from "../components/AdminView/AttendanceForm";
import Holidays          from "../components/AdminView/Holiday";
import AdminEmployeeView from "../components/AdminView/AdminEmployeeView";
import RequestStatus     from "../components/AdminView/RequestStatus";  // ← new

// Employee (and TL) views
import EmployeeAttendance from "../components/EmployeeView/EmployeeAttendance";
import LeavesEmployee     from "../components/EmployeeView/LeavesEmployee";
import HolidaysEmployee   from "../components/EmployeeView/HolidaysEmployee";
import MailRequest        from "../components/EmployeeView/MailRequest";
import RequestStatusEmp   from "../components/TLview/RequestStatusEmp"; // ← TL version

import { Navbar, Nav, Container, Button } from "react-bootstrap";
import "../pages/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [activeSection, setActiveSection] = useState("employeeAttendance");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (!stored) {
      navigate("/");
    } else {
      setUser(stored);
      if (stored.role === 4) {
        setActiveSection("attendanceForm");
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null;

  const isAdmin = user.role === 4;
  const isTL    = user.role === 2;

  // decide navbar title
  const navbarTitle = isAdmin
    ? `Admin Panel – Welcome, ${user.name}`
    : isTL
      ? `TL Dashboard – Welcome, ${user.name}`
      : `Employee Dashboard – Welcome, ${user.name}`;

  return (
    <div>
      <Header role={user.roleName} />

      <Navbar
        bg="primary"
        variant="dark"
        expand="lg"
        className="mb-3 py-1 px-3 custom-navbar"
        style={{ position: "relative" }}
      >
        <Container fluid>
          <Navbar.Brand>{navbarTitle}</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">

            {/* Admin nav */}
            {isAdmin && (
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
                  variant={activeSection === "requestStatus" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("requestStatus")}
                >
                  Request Status
                </Button>
                {/* —— remove style prop here so it lines up correctly —— */}
                <Button
                  variant="danger"
                  className="ms-2 mb-2 uniform-button"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Nav>
            )}

            {/* Employee & TL nav */}
            {!isAdmin && (
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

                {/* TL-only Request Status */}
                {isTL && (
                  <Button
                    variant={activeSection === "requestStatus" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("requestStatus")}
                  >
                    Request Status
                  </Button>
                )}

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
        {/* Admin views */}
        {activeSection === "attendanceForm"    && <AttendanceForm />}
        {activeSection === "holidays"          && <Holidays />}
        {activeSection === "adminemployeeView" && <AdminEmployeeView />}
        {activeSection === "requestStatus"     && isAdmin && <RequestStatus />}

        {/* Employee/TL views */}
        {activeSection === "employeeAttendance"&& <EmployeeAttendance />}
        {activeSection === "leavesEmployee"    && <LeavesEmployee />}
        {activeSection === "holidaysEmployee"  && <HolidaysEmployee />}
        {activeSection === "mailRequest"       && <MailRequest />}
        {activeSection === "requestStatus"     && isTL       && <RequestStatusEmp />}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
