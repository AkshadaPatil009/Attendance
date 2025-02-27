import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  Navbar,
  Nav,
  Container,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Card,
  Table,
} from "react-bootstrap";
import { FaPencilAlt, FaTrash } from "react-icons/fa";

// Custom component for multi-select location dropdown
const LocationMultiSelect = ({ selectedLocations, setSelectedLocations }) => {
  const locationOptions = ["Ratnagiri Office", "Mumbai Office", "Delhi Office"];
  const [open, setOpen] = useState(false);

  const toggleOption = (option) => {
    if (selectedLocations.includes(option)) {
      setSelectedLocations(selectedLocations.filter((loc) => loc !== option));
    } else {
      setSelectedLocations([...selectedLocations, option]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLocations.length === locationOptions.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations([...locationOptions]);
    }
  };

  return (
    <div className="position-relative">
      <Button
        variant="outline-secondary"
        onClick={() => setOpen(!open)}
        className="w-100 text-start"
      >
        {selectedLocations.length > 0
          ? selectedLocations.join(", ")
          : "Select Locations"}
      </Button>
      {open && (
        <div
          className="border position-absolute bg-white p-2"
          style={{ zIndex: 1000, width: "100%" }}
        >
          <Form.Check
            type="checkbox"
            label="Select All"
            checked={selectedLocations.length === locationOptions.length}
            onChange={toggleSelectAll}
          />
          {locationOptions.map((option) => (
            <Form.Check
              key={option}
              type="checkbox"
              label={option}
              checked={selectedLocations.includes(option)}
              onChange={() => toggleOption(option)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
                <Col
                  xs={12}
                  md={4}
                  className="d-flex align-items-center mt-2 mt-md-0"
                >
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
                        variant={
                          activeSection === "attendanceForm" ? "secondary" : "light"
                        }
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
                  <Button
                    variant="danger"
                    className="ms-2 mb-2"
                    onClick={handleLogout}
                  >
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
        {activeSection === "holidays" && <Holidays />}
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

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    date: "",
    name: "",
    locations: [],
  });
  const [filterLocation, setFilterLocation] = useState("All");
  const locationOptions = ["Ratnagiri Office", "Mumbai Office", "Delhi Office"];

  // For editing
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // For deletion
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch holiday list from the backend API
  const fetchHolidays = () => {
    fetch("http://localhost:5000/api/holidays")
      .then((res) => res.json())
      .then((data) => {
        setHolidays(data);
      })
      .catch((error) => {
        console.error("Error fetching holidays:", error);
      });
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // Filter holidays based on selected location
  const filteredHolidays =
    filterLocation === "All"
      ? holidays
      : holidays.filter((holiday) => holiday.location === filterLocation);

  const handleAddHoliday = () => {
    if (newHoliday.date && newHoliday.name && newHoliday.locations.length > 0) {
      // Create an array of promises to add a holiday for each selected location
      const addHolidayPromises = newHoliday.locations.map((location) =>
        fetch("http://localhost:5000/api/holidays", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            holiday_date: newHoliday.date,
            holiday_name: newHoliday.name,
            location,
          }),
        }).then((res) => res.json())
      );

      Promise.all(addHolidayPromises)
        .then(() => {
          // Re-fetch the holidays list after adding
          fetchHolidays();
          setNewHoliday({ date: "", name: "", locations: [] });
          setShowAddModal(false);
        })
        .catch((error) => {
          console.error("Error adding holiday(s):", error);
        });
    }
  };

  // Edit holiday functions
  const handleEdit = (holiday) => {
    // Format the holiday date to YYYY-MM-DD for the input
    const formattedDate = new Date(holiday.holiday_date)
      .toISOString()
      .split("T")[0];
    setEditingHoliday({ ...holiday, holiday_date: formattedDate });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingHoliday((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateHoliday = () => {
    fetch(`http://localhost:5000/api/holidays/${editingHoliday.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        holiday_date: editingHoliday.holiday_date,
        holiday_name: editingHoliday.holiday_name,
        location: editingHoliday.location,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        // Re-fetch the updated holidays list
        fetchHolidays();
        setShowEditModal(false);
        setEditingHoliday(null);
      })
      .catch((error) => {
        console.error("Error updating holiday:", error);
      });
  };

  // Delete holiday functions
  const handleDelete = (holiday) => {
    setHolidayToDelete(holiday);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    fetch(`http://localhost:5000/api/holidays/${holidayToDelete.id}`, {
      method: "DELETE",
    })
      .then(() => {
        // Re-fetch holidays after deletion
        fetchHolidays();
        setShowDeleteModal(false);
        setHolidayToDelete(null);
      })
      .catch((error) => {
        console.error("Error deleting holiday:", error);
      });
  };

  return (
    <div className="container mt-4">
      <h3 className="text-center">Holidays</h3>

      {/* Filter Dropdown for Location */}
      <div className="mb-3">
        <Form.Group controlId="filterLocation">
          <Form.Label>Filter by Location</Form.Label>
          <Form.Control
            as="select"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="All">All Locations</option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
      </div>

      {/* Table of Holidays */}
      <div className="border p-3 mt-3">
        {filteredHolidays.length > 0 ? (
          <Table bordered striped hover responsive>
            <thead className="bg-primary text-white text-center">
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHolidays.map((holiday) => {
                const formattedDate = new Date(
                  holiday.holiday_date
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <tr key={holiday.id}>
                    <td className="text-center">{formattedDate}</td>
                    <td>{holiday.holiday_name}</td>
                    <td>{holiday.location}</td>
                    <td className="text-center">
                      <FaPencilAlt
                        onClick={() => handleEdit(holiday)}
                        style={{ cursor: "pointer", marginRight: "10px" }}
                      />
                      <FaTrash
                        onClick={() => handleDelete(holiday)}
                        style={{ cursor: "pointer", color: "red" }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p className="text-center">No holidays found.</p>
        )}
      </div>

      {/* Button to open "Add Holiday" modal */}
      <Button className="mt-3" onClick={() => setShowAddModal(true)}>
        Add Holiday
      </Button>

      {/* Add Holiday Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Holiday</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={newHoliday.date}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, date: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Holiday Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter holiday name"
                value={newHoliday.name}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, name: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Locations</Form.Label>
              <LocationMultiSelect
                selectedLocations={newHoliday.locations}
                setSelectedLocations={(locations) =>
                  setNewHoliday({ ...newHoliday, locations })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddHoliday}>
            Add
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Holiday Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Holiday</Modal.Title>
        </Modal.Header>
        {editingHoliday && (
          <Modal.Body>
            <Form>
              <Form.Group>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  name="holiday_date"
                  value={editingHoliday.holiday_date}
                  onChange={handleEditChange}
                />
              </Form.Group>
              <Form.Group className="mt-2">
                <Form.Label>Holiday Name</Form.Label>
                <Form.Control
                  type="text"
                  name="holiday_name"
                  value={editingHoliday.holiday_name}
                  onChange={handleEditChange}
                />
              </Form.Group>
              <Form.Group className="mt-2">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  as="select"
                  name="location"
                  value={editingHoliday.location}
                  onChange={handleEditChange}
                >
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateHoliday}>
            Update
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Holiday</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the holiday "
          {holidayToDelete && holidayToDelete.holiday_name}"?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
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

    // In a real scenario, fetch employee leave data from an API.
    // Here, we hardcode sample data.
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
        {role === "admin" ? "Admin Employee View" : "Employee View"}
      </h3>

      {/* Employee Selection Dropdown */}
      {role === "admin" && (
        <div className="mb-4">
          <Form.Group controlId="employeeSelect">
            <Form.Label>Select Employee</Form.Label>
            <Form.Control
              as="select"
              onChange={handleEmployeeSelect}
              value={selectedEmployee}
            >
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
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.sickLeave}
            readOnly
          />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leaves</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.plannedLeave}
            readOnly
          />
        </div>

        <h5 className="mt-3">
          <b>Remaining Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingSickLeave}
            readOnly
          />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leaves</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingPlannedLeave}
            readOnly
          />
        </div>
      </Card>
    </div>
  );
};

const Report = () => <h3 className="text-center mt-4"> Report Section</h3>;

export default Dashboard;
