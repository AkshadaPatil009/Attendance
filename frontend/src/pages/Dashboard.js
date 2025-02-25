import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Navbar, Nav, Container, Button, Form, Row, Col, Card } from "react-bootstrap";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/"); // Redirect to login if no user is found
    } else {
      setUser(storedUser);
      if (storedUser.role === "admin") {
        setActiveSection("attendanceForm");
      }
    }
  }, [navigate]);

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
                  {user.role === "admin" ? (
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
                        Add Holidays
                      </Button>
                      <Button
                        variant={activeSection === "report" ? "secondary" : "light"}
                        className="me-2 mb-2"
                        onClick={() => setActiveSection("report")}
                        active={activeSection === "report"}
                      >
                        Report
                      </Button>
                      <Button
                         variant={activeSection === "nameSection" ? "secondary" : "light"}
                         className="me-2 mb-2"
                        onClick={() => setActiveSection("nameSection")}
                         active={activeSection === "nameSection"}
                      >
                        EmployeeView
                        </Button>
                        

                    </>
                  ) : null}
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
        
        {activeSection === "attendanceForm" && <AttendanceForm />}
        {activeSection === "addHolidays" && <AddHolidays />}
        {user.role === "employee" && <EmployeeView />}
        {activeSection === "report" && <Report />}
      </Container>

      <Footer />
    </div>
  );
};

const AttendanceForm = () => {
  const [attendanceText, setAttendanceText] = useState("");

  const handleChange = (e) => {
    setAttendanceText(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Attendance Data:", attendanceText);
  };
const NameSection = () => (
  <h3 className="text-center mt-4">📝 Name Section</h3>
);

  return (
    <div className="mt-4">
      <h3 className="text-center">Attendance Form</h3>
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
    </div>
  );
};

const AddHolidays = () => (
  <h3 className="text-center mt-4">🎉 Add Holidays</h3>
);


const EmployeeView = () => (
  <div className="container mt-4">
    <h3 className="text-center"> Employee Dashboard</h3>

    {/* Leave Section */}
    <Card className="p-3 shadow-sm mt-3" style={{ maxWidth: "400px", margin: "auto" }}>
      <h5><b>Used Leaves</b></h5>
      <div className="d-flex justify-content-between align-items-center">
        <span>Sick Leave</span>
        <input type="text" className="form-control w-50" />
      </div>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <span>Planned Leaves</span>
        <input type="text" className="form-control w-50" />
      </div>

      <h5 className="mt-3"><b>Remaining Leaves</b></h5>
      <div className="d-flex justify-content-between align-items-center">
        <span>Sick Leave</span>
        <input type="text" className="form-control w-50" />
      </div>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <span>Planned Leaves</span>
        <input type="text" className="form-control w-50" />
      </div>
    </Card>
  </div>
);

const Report = () => (
  <h3 className="text-center mt-4">📊 Report Section</h3>
);

export default Dashboard;
