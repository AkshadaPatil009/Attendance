// src/components/HolidayAndLeavesTabs.jsx
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Button, Form, Modal, Table, Tabs, Tab, Row, Col } from "react-bootstrap";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
import "../pages/Dashboard.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Custom component for multi-select location dropdown
const LocationMultiSelect = ({ options, selectedLocations, setSelectedLocations }) => {
  const [open, setOpen] = useState(false);

  const toggleOption = (option) => {
    if (selectedLocations.includes(option)) {
      setSelectedLocations(selectedLocations.filter((loc) => loc !== option));
    } else {
      setSelectedLocations([...selectedLocations, option]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLocations.length === options.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations([...options]);
    }
  };

  return (
    <div className="position-relative">
      <Button
        variant="outline-secondary"
        onClick={() => setOpen(!open)}
        className="w-100 text-start"
      >
        {selectedLocations.length > 0 ? selectedLocations.join(", ") : "Select Locations"}
      </Button>
      {open && (
        <div
          className="border position-absolute bg-white p-2"
          style={{ zIndex: 1000, width: "100%" }}
        >
          <Form.Check
            type="checkbox"
            label="Select All"
            checked={selectedLocations.length === options.length}
            onChange={toggleSelectAll}
          />
          {options.map((option) => (
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

// Holidays component
const Holidays = ({ socket }) => {
  const [holidays, setHolidays] = useState([]);
  const [offices, setOffices] = useState([]);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showOfficeConfirmModal, setShowOfficeConfirmModal] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "", locations: [] });
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [approvalName, setApprovalName] = useState("");
  const [showDateErrorModal, setShowDateErrorModal] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState("");

  // Fetch holidays and offices
  const fetchHolidays = () => {
    fetch(`${API_URL}/api/holidays`)
      .then((res) => res.json())
      .then((data) => setHolidays(data))
      .catch((error) => console.error("Error fetching holidays:", error));
  };
  const fetchOffices = () => {
    fetch(`${API_URL}/api/offices`)
      .then((res) => res.json())
      .then((data) => setOffices(data.map((o) => o.name)))
      .catch((err) => console.error("Error fetching offices:", err));
  };

  useEffect(() => {
    fetchHolidays();
    fetchOffices();
  }, []);

  // Real‑time socket listeners
  useEffect(() => {
    if (!socket) return;
    socket.on("holidayAdded", fetchHolidays);
    socket.on("holidayUpdated", fetchHolidays);
    socket.on("holidayDeleted", fetchHolidays);
    return () => {
      socket.off("holidayAdded", fetchHolidays);
      socket.off("holidayUpdated", fetchHolidays);
      socket.off("holidayDeleted", fetchHolidays);
    };
  }, [socket]);

  // Add a new office
  const handleAddOffice = () => {
    if (!newOfficeName.trim()) return;
    fetch(`${API_URL}/api/offices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOfficeName.trim() }),
    })
      .then((res) => res.json())
      .then(() => {
        fetchOffices();
        setNewOfficeName("");
        setShowOfficeConfirmModal(false);
        setShowOfficeModal(false);
      })
      .catch((err) => console.error("Error adding office:", err));
  };

  // Add holiday
  const handleAddHoliday = () => {
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newHoliday.date);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < todayOnly) {
      setDateErrorMessage("Cannot add a holiday in the past.");
      setShowDateErrorModal(true);
      return;
    }
    if (newHoliday.date && newHoliday.name && newHoliday.locations.length > 0) {
      const addHolidayPromises = newHoliday.locations.map((location) =>
        fetch(`${API_URL}/api/holidays`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holiday_date: newHoliday.date,
            holiday_name: newHoliday.name,
            location,
          }),
        }).then((res) => res.json())
      );
      Promise.all(addHolidayPromises)
        .then(() => {
          fetchHolidays();
          setNewHoliday({ date: "", name: "", locations: [] });
          setShowAddModal(false);
          socket.emit("holidayAdded");
        })
        .catch((error) => console.error("Error adding holiday(s):", error));
    }
  };

  // Edit holiday
  const handleEdit = (holiday) => {
    const date = new Date(holiday.holiday_date);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const formattedDate = date.toISOString().split("T")[0];
    setEditingHoliday({
      ...holiday,
      holiday_date: formattedDate,
      groupLocations: holiday.locations,
      locationMap: holiday.locationMap,
    });
    setShowEditModal(true);
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingHoliday((prev) => ({ ...prev, [name]: value }));
  };
  const handleUpdateHoliday = () => {
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);
    const updatedDate = new Date(editingHoliday.holiday_date);
    updatedDate.setHours(0, 0, 0, 0);
    if (updatedDate < todayOnly) {
      setDateErrorMessage("Cannot set the holiday to a past date.");
      setShowDateErrorModal(true);
      return;
    }
    if (editingHoliday && editingHoliday.locations.length > 0) {
      const newLocations = editingHoliday.locations;
      const originalLocations = editingHoliday.groupLocations;
      const locationMap = editingHoliday.locationMap;
      const promises = [];

      originalLocations.forEach((loc) => {
        const id = locationMap[loc];
        if (!newLocations.includes(loc)) {
          promises.push(fetch(`${API_URL}/api/holidays/${id}`, { method: "DELETE" }));
        } else {
          promises.push(
            fetch(`${API_URL}/api/holidays/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                holiday_date: editingHoliday.holiday_date,
                holiday_name: editingHoliday.holiday_name,
                location: loc,
                approval_status: "Pending",
                approved_by: "",
                approved_date: "",
              }),
            }).then((res) => res.json())
          );
        }
      });

      newLocations.forEach((loc) => {
        if (!originalLocations.includes(loc)) {
          promises.push(
            fetch(`${API_URL}/api/holidays`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                holiday_date: editingHoliday.holiday_date,
                holiday_name: editingHoliday.holiday_name,
                location: loc,
              }),
            }).then((res) => res.json())
          );
        }
      });

      Promise.all(promises)
        .then(() => {
          fetchHolidays();
          setShowEditModal(false);
          setEditingHoliday(null);
          socket.emit("holidayUpdated");
        })
        .catch((error) => console.error("Error updating holiday:", error));
    }
  };

  // Delete handlers
  const handleDelete = (holiday) => {
    setHolidayToDelete(holiday);
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = () => {
    const deletePromises = holidayToDelete.ids.map((id) =>
      fetch(`${API_URL}/api/holidays/${id}`, { method: "DELETE" })
    );
    Promise.all(deletePromises)
      .then(() => {
        fetchHolidays();
        setShowDeleteModal(false);
        setHolidayToDelete(null);
        socket.emit("holidayDeleted");
      })
      .catch((error) => console.error("Error deleting holiday:", error));
  };

  // Approve All handlers
  const handleApproveAll = () => {
    const pendingHolidays = holidays.filter((h) => h.approval_status === "Pending");
    if (pendingHolidays.length === 0) {
      alert("No pending holidays to approve.");
      return;
    }
    setShowApproveConfirmModal(true);
  };
  const handleConfirmApproveAll = () => {
    if (!approvalName) return;
    const pendingHolidays = holidays.filter((h) => h.approval_status === "Pending");
    const approvePromises = pendingHolidays.map((h) =>
      fetch(`${API_URL}/api/holidays/approve/${h.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: approvalName }),
      }).then((res) => res.json())
    );
    Promise.all(approvePromises)
      .then(() => {
        fetchHolidays();
        setShowApproveConfirmModal(false);
        setApprovalName("");
        alert("All pending holidays approved successfully!");
        socket.emit("holidayUpdated");
      })
      .catch((error) => console.error("Error approving holidays:", error));
  };

  // Group holidays by date/name
  const groupedHolidays = Object.values(
    holidays.reduce((acc, holiday) => {
      const key = `${holiday.holiday_date}-${holiday.holiday_name}`;
      if (!acc[key]) {
        acc[key] = {
          holiday_date: holiday.holiday_date,
          holiday_name: holiday.holiday_name,
          locations: new Set([holiday.location]),
          ids: [holiday.id],
          locationMap: { [holiday.location]: holiday.id },
          approval_status: holiday.approval_status,
          approved_by: holiday.approved_by,
          approved_date: holiday.approved_datetime,
        };
      } else {
        acc[key].locations.add(holiday.location);
        acc[key].ids.push(holiday.id);
        acc[key].locationMap[holiday.location] = holiday.id;
      }
      return acc;
    }, {})
  ).map((item) => ({
    ...item,
    locations: Array.from(item.locations),
  }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="container-fluid mt-4">
      <div className="border p-3 mt-3">
        {groupedHolidays.length > 0 ? (
          <Table bordered striped hover responsive>
            <thead className="bg-primary text-white text-center">
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                {offices.map((office) => (
                  <th key={office}>{office}</th>
                ))}
                <th>Actions</th>
                <th>Approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {groupedHolidays.map((holiday) => {
                const hd = new Date(holiday.holiday_date);
                const hdOnly = new Date(hd.getFullYear(), hd.getMonth(), hd.getDate());
                const sevenDaysLater = new Date(today);
                sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                const isPast = hdOnly < today;
                const isWithin7Days = hdOnly >= today && hdOnly <= sevenDaysLater;
                const isDisabled = isPast || isWithin7Days;
                const formattedDate = hd.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const actionStyle = isDisabled
                  ? { opacity: 0.5, pointerEvents: "none" }
                  : { cursor: "pointer", marginRight: "10px" };

                return (
                  <tr
                    key={holiday.ids[0]}
                    className={isPast ? "completedHoliday" : ""}
                    style={{ backgroundColor: !isPast ? "#ff0000" : undefined, color: "#fff" }}
                  >
                    <td className="text-center">{formattedDate}</td>
                    <td>{holiday.holiday_name}</td>
                    {offices.map((office) => (
                      <td key={office} className="text-center">
                        {holiday.locations.includes(office) ? "✓" : ""}
                      </td>
                    ))}
                    <td className="text-center">
                      <FaPencilAlt
                        onClick={() => !isDisabled && handleEdit(holiday)}
                        style={actionStyle}
                      />
                      <FaTrash
                        onClick={() => !isDisabled && handleDelete(holiday)}
                        style={actionStyle}
                      />
                    </td>
                    <td className="text-center">
                      {holiday.approval_status === "Pending" ? (
                        <span style={{ color: "red" }}>Pending</span>
                      ) : (
                        <span style={{ color: "green" }}>Approved</span>
                      )}
                    </td>
                    <td className="text-center">{isPast ? "Completed" : "Upcoming"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p className="text-center">No holidays found.</p>
        )}
      </div>

      <div className="d-flex justify-content-center mt-3">
        <Button
          variant="primary"
          onClick={handleApproveAll}
          style={{ width: "200px", marginRight: "10px" }}
        >
          Approve All Holidays
        </Button>
        <Button
          variant="primary"
          onClick={() => setShowOfficeModal(true)}
          style={{ width: "200px", marginRight: "10px" }}
        >
          Add Office
        </Button>
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          style={{ width: "200px" }}
        >
          Add Holiday
        </Button>
      </div>

      {/* Add Office Modal */}
      <Modal show={showOfficeModal} onHide={() => setShowOfficeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Office</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Office Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter office name"
              value={newOfficeName}
              onChange={(e) => setNewOfficeName(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOfficeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowOfficeConfirmModal(true)}>
            Add Office
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Office Confirmation Modal */}
      <Modal
        show={showOfficeConfirmModal}
        onHide={() => setShowOfficeConfirmModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Add Office</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to add the office "{newOfficeName}"?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOfficeConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddOffice}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

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
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Holiday Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter holiday name"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Locations</Form.Label>
              <LocationMultiSelect
                options={offices}
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
                <Form.Label>Locations</Form.Label>
                <LocationMultiSelect
                  options={offices}
                  selectedLocations={editingHoliday.locations}
                  setSelectedLocations={(locations) =>
                    setEditingHoliday((prev) => ({ ...prev, locations }))
                  }
                />
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
          Are you sure you want to delete the holiday "{holidayToDelete?.holiday_name}"?
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

      {/* Approve All Confirmation Modal */}
      <Modal show={showApproveConfirmModal} onHide={() => setShowApproveConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Approve All Holidays</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Enter your name to approve all pending holidays:</Form.Label>
              <Form.Control
                type="text"
                value={approvalName}
                onChange={(e) => setApprovalName(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmApproveAll}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Date Validation Error Modal */}
      <Modal show={showDateErrorModal} onHide={() => setShowDateErrorModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Invalid Date</Modal.Title>
        </Modal.Header>
        <Modal.Body>{dateErrorMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowDateErrorModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

// Leaves component
const Leaves = ({ socket }) => {
  const [allocatedUnplannedLeave, setAllocatedUnplannedLeave] = useState("");
  const [allocatedPlannedLeave, setAllocatedPlannedLeave] = useState("");
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const totalLeaves =
    (parseInt(allocatedUnplannedLeave, 10) || 0) +
    (parseInt(allocatedPlannedLeave, 10) || 0);

  const handleValueChange = (value) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      return num > 999 ? "999" : value;
    }
    return value;
  };

  // Save leaves handlers
  const handleSaveLeaves = () => {
    if (
      !allocatedUnplannedLeave.toString().trim() ||
      !allocatedPlannedLeave.toString().trim()
    ) {
      setErrorMessage("Please fill out both leave fields.");
      setShowValidationErrorModal(true);
      return;
    }
    setShowSaveConfirmModal(true);
  };

  const handleConfirmSave = () => {
    const unplanned = parseInt(allocatedUnplannedLeave, 10) || 0;
    const planned = parseInt(allocatedPlannedLeave, 10) || 0;

    setShowSaveConfirmModal(false);

    // 1) POST
    fetch(`${API_URL}/api/employee-leaves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allocatedUnplannedLeave: unplanned,
        allocatedPlannedLeave: planned,
        remainingUnplannedLeave: unplanned,
        remainingPlannedLeave: planned,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            console.error("Server error text:", text);
            throw new Error(`Server error: ${res.status}`);
          });
        }
        return res.json();
      })
      .then((postData) => {
        // 2) PUT
        return fetch(`${API_URL}/api/employee-leaves`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allocatedUnplannedLeave: unplanned,
            allocatedPlannedLeave: planned,
            remainingUnplannedLeave: unplanned,
            remainingPlannedLeave: planned,
          }),
        })
          .then((res2) => {
            if (!res2.ok) {
              return res2.text().then((text) => {
                console.error("Server error text:", text);
                throw new Error(`Server error: ${res2.status}`);
              });
            }
            return res2.json();
          })
          .then((putData) => {
            alert(
              `Leaves saved successfully!\n` +
                `New records added: ${postData.insertedCount || 0}\n` +
                `Records updated: ${putData.affectedRows || 0}`
            );
            socket.emit("leavesSaved", { unplanned, planned });
          });
      })
      .catch((error) => {
        console.error("Error saving leaves:", error);
        alert("Error saving leaves");
      });
  };

  // Real‑time notification
  useEffect(() => {
    if (!socket) return;
    socket.on("leavesSaved", ({ unplanned, planned }) => {
      alert(`Leaves were updated in real time!\nUnplanned: ${unplanned}\nPlanned: ${planned}`);
    });
    return () => {
      socket.off("leavesSaved");
    };
  }, [socket]);

  return (
    <div className="container mt-4" style={{ minHeight: "600px" }}>
      <h3 className="text-center mb-4">Leaves for All Employees</h3>
      <Row className="justify-content-center mt-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Allocated Unplanned Leaves</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter unplanned leaves"
              value={allocatedUnplannedLeave}
              onChange={(e) => setAllocatedUnplannedLeave(handleValueChange(e.target.value))}
              min="0"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Allocated Planned Leaves</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter planned leaves"
              value={allocatedPlannedLeave}
              onChange={(e) => setAllocatedPlannedLeave(handleValueChange(e.target.value))}
              min="0"
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="justify-content-center mt-3">
        <Col md={8} className="text-center">
          <h4>Total Leaves: {totalLeaves}</h4>
        </Col>
      </Row>
      <Row className="justify-content-center mt-4">
        <Col md={2} className="text-center">
          <Button variant="primary" onClick={handleSaveLeaves} className="w-100">
            Save Leaves
          </Button>
        </Col>
      </Row>

      {/* Confirm Save Modal */}
      <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save Leaves</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save leaves for all employees with the
          following details?
          <br />
          <strong>Unplanned Leaves:</strong> {allocatedUnplannedLeave || 0}
          <br />
          <strong>Planned Leaves:</strong> {allocatedPlannedLeave || 0}
          <br />
          <strong>Total Leaves:</strong> {totalLeaves}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmSave}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Validation Error Modal */}
      <Modal
        show={showValidationErrorModal}
        onHide={() => setShowValidationErrorModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Validation Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowValidationErrorModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

// Parent component with tabs for Holidays and Leaves
const HolidayAndLeavesTabs = () => {
  const [activeTab, setActiveTab] = useState("holidays");
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(API_URL);
    socketRef.current.emit("join", { room: "holiday-leaves" });
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="container-fluid mt-4" style={{ minHeight: "600px" }}>
      <Tabs
        activeKey={activeTab}
        onSelect={(tab) => setActiveTab(tab)}
        className="mb-3"
      >
        <Tab eventKey="holidays" title="Holidays">
          <Holidays socket={socketRef.current} />
        </Tab>
        <Tab eventKey="leaves" title="Leaves">
          <Leaves socket={socketRef.current} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default HolidayAndLeavesTabs;
