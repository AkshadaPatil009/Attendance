// src/pages/Dashboard.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  Navbar,
  Nav,
  Container,
  Button,
  Dropdown
} from "react-bootstrap";
import { GearFill } from "react-bootstrap-icons";
import NotificationBell from "../components/NotificationBell";
import EmployeeTabs from "../components/AdminView/EmployeeTabs";
import AttendanceForm from "../components/AdminView/AttendanceForm";
import AdminEmployeeView from "../components/AdminView/AdminEmployeeView";
import RequestStatus from "../components/AdminView/RequestStatus";
import EmployeeAttendance from "../components/EmployeeView/EmployeeAttendance";
import LeavesEmployee from "../components/EmployeeView/LeavesEmployee";
import HolidaysEmployee from "../components/EmployeeView/HolidaysEmployee";
import MailRequest from "../components/EmployeeView/MailRequest";
import RequestStatusEmp from "../components/TLview/RequestStatusEmp";
import StatusView from "../components/EmployeeView/StatusView";
import CiCo from "../components/CiCo";
import ProfileUpdate from "../components/ProfileUpdate";
import RuleBook from "../components/RuleBook";
import "../pages/Dashboard.css";

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("cico");

  const isAdmin = user.role === 4;
  const isTL = user.role === 2;

  const navbarTitle = isAdmin
    ? `Admin Panel: Welcome, ${user.name}`
    : isTL
    ? `TL Dashboard: Welcome, ${user.name}`
    : `Employee Dashboard: Welcome, ${user.name}`;

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

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
                <NotificationBell user={user} onSelect={goToRequest} />
              )}

              <Button
                size="sm"
                variant={activeSection === "cico" ? "secondary" : "light"}
                className="me-2 mb-1 uniform-button"
                onClick={() => setActiveSection("cico")}
              >
                CI/CO
              </Button>
              <Button
                size="sm"
                variant={activeSection === "status" ? "secondary" : "light"}
                className="me-2 mb-1 uniform-button"
                onClick={() => setActiveSection("status")}
              >
                Status
              </Button>

              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "attendanceForm"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("attendanceForm")}
                  >
                    Attendance Report
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "adminemployeeView"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("adminemployeeView")}
                  >
                    Holidays/Leaves
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "employeeTabs"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("employeeTabs")}
                  >
                    Employee Overview
                  </Button>
                </>
              )}

              {(isTL || (!isAdmin && !isTL)) && (
                <>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "employeeAttendance"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("employeeAttendance")}
                  >
                    Attendance
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "leavesEmployee"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("leavesEmployee")}
                  >
                    Leaves
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "holidaysEmployee"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("holidaysEmployee")}
                  >
                    Holidays
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "mailRequest"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("mailRequest")}
                  >
                    Mail Request
                  </Button>
                </>
              )}

              {(isAdmin || isTL) && (
                <>
                  <Button
                    size="sm"
                    variant={
                      activeSection === "requestStatus"
                        ? "secondary"
                        : "light"
                    }
                    className="me-2 mb-1 uniform-button"
                    onClick={() => setActiveSection("requestStatus")}
                  >
                    Request Status
                  </Button>
                  {!isTL && (
                    <Button
                      size="sm"
                      variant={
                        activeSection === "mailRequest"
                          ? "secondary"
                          : "light"
                      }
                      className="me-2 mb-1 uniform-button"
                      onClick={() => setActiveSection("mailRequest")}
                    >
                      Mail Request
                    </Button>
                  )}
                </>
              )}

              <Dropdown align="end" className="me-2 mb-1">
                <Dropdown.Toggle
                  as={Button}
                  className="profile-circle-button"
                  id="gear-dropdown"
                >
                  <GearFill size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item
                    onClick={() => setActiveSection("profileUpdate")}
                  >
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setActiveSection("ruleBook")}>
                    Rule Book
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <div className="w-100">
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "adminemployeeView" && <AdminEmployeeView />}
        {activeSection === "employeeTabs" && isAdmin && <EmployeeTabs />}
        {activeSection === "requestStatus" && isAdmin && <RequestStatus />}
        {activeSection === "mailRequest" && isAdmin && <MailRequest />}

        {!isTL && !isAdmin && activeSection === "employeeAttendance" && (
          <EmployeeAttendance />
        )}
        {!isTL && !isAdmin && activeSection === "leavesEmployee" && (
          <LeavesEmployee />
        )}
        {!isTL && !isAdmin && activeSection === "holidaysEmployee" && (
          <HolidaysEmployee />
        )}
        {!isTL && !isAdmin && activeSection === "mailRequest" && (
          <MailRequest />
        )}

        {isTL && !isAdmin && activeSection === "employeeAttendance" && (
          <EmployeeAttendance />
        )}
        {isTL && !isAdmin && activeSection === "leavesEmployee" && (
          <LeavesEmployee />
        )}
        {isTL && !isAdmin && activeSection === "holidaysEmployee" && (
          <HolidaysEmployee />
        )}
        {isTL && !isAdmin && activeSection === "mailRequest" && (
          <MailRequest />
        )}
        {isTL && !isAdmin && activeSection === "requestStatus" && (
          <RequestStatusEmp />
        )}

        {activeSection === "cico" && <CiCo />}
        {activeSection === "status" && <StatusView />}
        {activeSection === "ruleBook" && <RuleBook user={user} />}
        {activeSection === "profileUpdate" && (
          <ProfileUpdate user={user} />
        )}
      </div>

      <Footer />
    </div>
  );
}
