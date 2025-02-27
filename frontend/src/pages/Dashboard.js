import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Navbar, Nav, Container, Button, Form, Row, Col, Modal, Card } from "react-bootstrap";
import { Table } from "react-bootstrap";


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
                        variant={activeSection === "addHolidays" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("addHolidays")}
                        active={activeSection === "addHolidays"}
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

      {/* Dynamic Section Rendering Based on Active State */}
      <Container>
        {activeSection === "dashboard" && (
          <h3 className="text-center mt-4"> Dashboard Overview</h3>
        )}
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "addHolidays" && <AddHolidays />}
        {activeSection === "employeeView" && <EmployeeView role={user.role} />}
        {activeSection === "report" && <Report />}
      </Container>

      <Footer />
    </div>
  );
};

const AttendanceForm = () => {
  const [attendanceText, setAttendanceText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleChange = (e) => {
    setAttendanceText(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Open the confirmation popup instead of submitting immediately
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    // Place your actual submission logic here
    console.log("Submitted Attendance Data:", attendanceText);
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="mt-4">
      <h3 className="text-center"> Attendance Form</h3>
      <Form onSubmit={handleSubmit} className="mt-3">
        <Form.Group controlId="attendanceTextarea">
          <Form.Control
            as="textarea"
            rows={13}
            value={attendanceText}
            onChange={handleChange}
            placeholder="Attendance data here..."
          />
        </Form.Group>
        <div className="d-flex justify-content-end mt-2">
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </div>
      </Form>

      <Modal show={showConfirmation} onHide={handleCancel}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Submission</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure want to submit?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel}>
            No
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const AddHolidays = () => {
  const holidays = [
    { date: "January 14, 2025", name: "Makar Sankranti" },
    { date: "February 26, 2025", name: "Mahashivaratri" },
    { date: "March 14, 2025", name: "Dhulivandan" },
    { date: "May 1, 2025", name: "Maharashtra Day" },
    { date: "June 7, 2025", name: "Eid al-Adha" },
    { date: "August 9, 2025", name: "Raksha Bandhan" },
    { date: "August 15, 2025", name: "Independence Day" },
    { date: "August 27, 2025", name: "Shri Ganesh Chaturthi" },
    { date: "September 2, 2025", name: "Gauri Visarjan" },
    { date: "October 2, 2025", name: "Dassera" },
    { date: "October 20, 2025", name: "Narak Chaturdashi" },
    { date: "October 21, 2025", name: "Laxmi Pujan" },
    { date: "October 23, 2025", name: "Bhaubij" },
    { date: "December 25, 2025", name: "Christmas" },
  ];

  return (
    <Container className="mt-4">
      <h3 className="text-center mb-4">Ratnagiri Office Holidays</h3>
      <Table bordered striped hover>
        <thead>
          <tr className="table-primary text-center">
            <th>Date</th>
            <th>Holiday</th>
          </tr>
        </thead>
        <tbody>
          {holidays.map((holiday, index) => (
            <tr key={index}>
              <td className="text-center">{holiday.date}</td>
              <td>{holiday.name}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

const EmployeeView = ({ role }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeLeaves, setEmployeeLeaves] = useState({
    sickLeave: "",
    plannedLeave: "",
    remainingSickLeave: "",
    remainingPlannedLeave: "",
  });

  const employees = [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Smith" },
    { id: 3, name: "Emily Johnson" },
  ];

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);

    // In a real scenario, you would fetch employee leave data from an API
    // For now, we are hardcoding the employee data
    if (employeeId === "1") {
      setEmployeeLeaves({
        sickLeave: "3",
        plannedLeave: "5",
        remainingSickLeave: "7",
        remainingPlannedLeave: "3",
      });
    } else if (employeeId === "2") {
      setEmployeeLeaves({
        sickLeave: "2",
        plannedLeave: "4",
        remainingSickLeave: "8",
        remainingPlannedLeave: "6",
      });
    } else if (employeeId === "3") {
      setEmployeeLeaves({
        sickLeave: "5",
        plannedLeave: "2",
        remainingSickLeave: "4",
        remainingPlannedLeave: "6",
      });
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="text-center mt-4">
        {role === "admin" ? "Admin Employee View" : " Employee View"}
      </h3>

      {/* Employee Selection Dropdown */}
      {role === "admin" && (
        <div className="mb-4">
          <Form.Group controlId="employeeSelect">
            <Form.Label>Select Employee</Form.Label>
            <Form.Control as="select" onChange={handleEmployeeSelect} value={selectedEmployee}>
              <option value="">-- Select Employee --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </div>
      )}

      {/* Leave Section */}
      <Card className="p-3 shadow-sm mt-3" style={{ maxWidth: "400px", margin: "auto" }}>
        <h5>
          <b>Used Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.sickLeave} readOnly />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leaves</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.plannedLeave} readOnly />
        </div>

        <h5 className="mt-3">
          <b>Remaining Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.remainingSickLeave} readOnly />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leaves</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.remainingPlannedLeave} readOnly />
        </div>
      </Card>
    </div>
  );
};

const Report = () => (
  <h3 className="text-center mt-4"> Report Section</h3>
);

export default Dashboard;
