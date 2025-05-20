// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  Navbar,
  Nav,
  Container,
  Button,
  Modal,
  ListGroup,
  Badge,
  Card
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

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Border colors for leave types (used in modal)
const BORDER_COLORS = {
  Vacation: "#4da6ff",
  Sick:     "#ff6666",
  Personal: "#ffcc66",
  Other:    "#ffa500",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("employeeAttendance");
  const [pendingRequests, setPendingRequests] = useState([]);

  // Modal state
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalShown, setPendingModalShown] = useState(false);

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

  // Fetch pending leaves for Admin (role 4) & TL (role 2)
  useEffect(() => {
    if (!user) return;
    if (user.role === 4 || user.role === 2) {
      axios
        .get(`${API_URL}/api/pending-requests`)
        .then((res) => {
          const email = user.email.toLowerCase();
          const relevant = res.data.filter((r) => {
            const toMatch = r.to_email.toLowerCase() === email;
            const ccList = r.cc_email
              ? r.cc_email.split(",").map((e) => e.trim().toLowerCase())
              : [];
            return toMatch || ccList.includes(email);
          });
          setPendingRequests(relevant);
        })
        .catch((err) => console.error("Failed to load pending requests", err));
    }
  }, [user]);

  // Show modal once on login if there are pending requests
  useEffect(() => {
    if (
      !pendingModalShown &&
      (user?.role === 4 || user?.role === 2) &&
      pendingRequests.length > 0
    ) {
      setShowPendingModal(true);
      setPendingModalShown(true);
    }
  }, [pendingRequests, pendingModalShown, user]);

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
                  requests={pendingRequests}
                  onSelect={goToRequest}
                />
              )}
              {/* Admin-only buttons */}
              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant={activeSection === "attendanceForm" ? "secondary" : "light"}
                    className="me-2 mb-2 uniform-button"
                    onClick={() => setActiveSection("attendanceForm")}
                  >
                    Attendance
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
                </>
              )}

              {/* Employee & TL nav */}
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

              {/* Admin & TL: Request Status */}
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

              {/* Admin-only: Mail Request in Admin panel */}
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

              <Button
  variant="light"
  className="logout-circle-button"
  onClick={handleLogout}
  title="Logout"
>
  <BoxArrowRight color="red" size={20} />
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

      {/* Pending Requests Modal (Admin & TL on first load) */}
      <Modal
        show={showPendingModal}
        onHide={() => setShowPendingModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>📋 Pending Leave Requests</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            padding: "1rem 1.5rem"
          }}
        >
          <ListGroup variant="flush">
            {pendingRequests.map((r, idx) => {
              const borderColor = BORDER_COLORS[r.leave_type] || BORDER_COLORS.Other;
              return (
                <Card
                  key={r.request_id}
                  className="mb-3"
                  style={{ borderLeft: `6px solid ${borderColor}` }}
                >
                  <Card.Body className="py-2 px-3">
                    <div className="d-flex justify-content-between">
                      <div>
                        <Badge bg="secondary" className="me-2">
                          {idx + 1}
                        </Badge>
                        <span className="fw-semibold">{r.from_name}</span>
                        <Badge
                          bg="warning"
                          text="dark"
                          className="ms-2"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {r.leave_type}
                        </Badge>
                      </div>
                      <small className="text-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="mt-1" style={{ fontSize: "0.9rem" }}>
                      {r.subject}
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button size="sm" variant="primary" onClick={() => setShowPendingModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}