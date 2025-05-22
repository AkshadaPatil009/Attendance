// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  Navbar,
  Nav,
  Container,
  Button
} from "react-bootstrap";
import { BoxArrowRight } from 'react-bootstrap-icons';
import NotificationBell from "../components/NotificationBell";

// Admin views
import AttendanceForm    from "../components/AdminView/AttendanceForm";
import Holidays          from "../components/AdminView/Holiday";
import AdminEmployeeView from "../components/AdminView/AdminEmployeeView";
import RequestStatus     from "../components/AdminView/RequestStatus";

// Employee (and TL) views
import EmployeeAttendance from "../components/EmployeeView/EmployeeAttendance";
import LeavesEmployee     from "../components/EmployeeView/LeavesEmployee";
import HolidaysEmployee   from "../components/EmployeeView/HolidaysEmployee";
import MailRequest        from "../components/EmployeeView/MailRequest";
import RequestStatusEmp   from "../components/TLview/RequestStatusEmp";

import "../pages/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("employeeAttendance");

  // On mount: auth + default section
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

  const navbarTitle = isAdmin
    ? `Admin Panel – Welcome, ${user.name}`
    : isTL
      ? `TL Dashboard – Welcome, ${user.name}`
      : `Employee Dashboard – Welcome, ${user.name}`;

  // Navigate to Request Status with query param
  const goToRequest = (id) => {
    setActiveSection("requestStatus");
    navigate(`${location.pathname}?section=requestStatus&requestId=${id}`);
  };

  return (
    <div>
      <Header role={user.roleName} />

      <Navbar
        bg="primary"
        variant="dark"
        expand="lg"
        className="mb-3 py-1 px-3 custom-navbar"
      >
        <Container fluid>
          <Navbar.Brand>{navbarTitle}</Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-nav" />
          <Navbar.Collapse id="navbar-nav">
            <Nav className="ms-auto d-flex align-items-center">
              {(isAdmin || isTL) && (
                <NotificationBell
                  user={user}
                  onSelect={goToRequest}
                />
              )}

              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant={activeSection === "attendanceForm" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("attendanceForm")}
                  >
                    Attendance Report
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "holidays" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("holidays")}
                  >
                    Add Holidays
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "adminemployeeView" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("adminemployeeView")}
                  >
                    Add Leaves
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "employeeAttendance" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("employeeAttendance")}
                  >
                    Employee Attendance
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "leavesEmployee" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("leavesEmployee")}
                  >
                    Employee Leaves
                  </Button>
                </>
              )}

              {!isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant={activeSection === "employeeAttendance" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("employeeAttendance")}
                  >
                    Attendance
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "leavesEmployee" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("leavesEmployee")}
                  >
                    Leaves
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "holidaysEmployee" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("holidaysEmployee")}
                  >
                    Holidays
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSection === "mailRequest" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("mailRequest")}
                  >
                    Mail Request
                  </Button>
                </>
              )}

              {(isAdmin || isTL) && (
                <Button
                  size="sm"
                  variant={activeSection === "requestStatus" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("requestStatus")}
                >
                  Request Status
                </Button>
              )}

              {isAdmin && (
                <Button
                  size="sm"
                  variant={activeSection === "mailRequest" ? "secondary" : "light"}
                  className="me-2 mb-2 uniform-button"
                  onClick={() => setActiveSection("mailRequest")}
                >
                  Mail Request
                </Button>
              )}

              {/* ─── RED CIRCULAR LOGOUT BUTTON ─── */}
              <Button
                onClick={handleLogout}
                className="logout-circle-button"
                title="Logout"
              >
                <BoxArrowRight size={20} color="white" />
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <div className="w-100">
        {activeSection === "attendanceForm"    && <AttendanceForm />}
        {activeSection === "holidays"          && <Holidays />}
        {activeSection === "adminemployeeView" && <AdminEmployeeView />}
        {activeSection === "requestStatus"     && isAdmin && <RequestStatus />}
        {activeSection === "mailRequest"       && isAdmin && <MailRequest />}

        {activeSection === "employeeAttendance"&& <EmployeeAttendance />}
        {activeSection === "leavesEmployee"    && <LeavesEmployee />}
        {activeSection === "holidaysEmployee"  && <HolidaysEmployee />}
        {activeSection === "mailRequest"       && !isAdmin && <MailRequest />}
        {activeSection === "requestStatus"     && isTL    && <RequestStatusEmp />}
      </div>

      <Footer />

    </div>
);}
