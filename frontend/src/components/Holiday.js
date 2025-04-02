import React, { useState, useEffect } from "react";
import { Button, Form, Modal, Table, Tabs, Tab, Row, Col } from "react-bootstrap";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
import "../pages/Dashboard.css"; // Ensure your CSS is applied

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
      <Button variant="outline-secondary" onClick={() => setOpen(!open)} className="w-100 text-start">
        {selectedLocations.length > 0 ? selectedLocations.join(", ") : "Select Locations"}
      </Button>
      {open && (
        <div className="border position-absolute bg-white p-2" style={{ zIndex: 1000, width: "100%" }}>
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

// Holidays component
const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "", locations: [] });

  // For editing
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // For deletion
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchHolidays = () => {
    fetch("http://localhost:5000/api/holidays")
      .then((res) => res.json())
      .then((data) => setHolidays(data))
      .catch((error) => console.error("Error fetching holidays:", error));
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = () => {
    if (newHoliday.date && newHoliday.name && newHoliday.locations.length > 0) {
      const addHolidayPromises = newHoliday.locations.map((location) =>
        fetch("http://localhost:5000/api/holidays", {
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
        })
        .catch((error) => console.error("Error adding holiday(s):", error));
    }
  };

  // Group holidays by date and holiday name, preserving a mapping of location to its record ID
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

  const handleEdit = (holiday) => {
    const date = new Date(holiday.holiday_date);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const formattedDate = date.toISOString().split("T")[0];
    // Save original locations and locationMap as part of editingHoliday
    setEditingHoliday({
      ...holiday,
      holiday_date: formattedDate,
      // 'locations' here will be the updated selection,
      // while we also store the original set for comparison
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
    if (editingHoliday && editingHoliday.locations.length > 0) {
      const newLocations = editingHoliday.locations; // current selection from the dropdown
      const originalLocations = editingHoliday.groupLocations; // original locations in the group
      const locationMap = editingHoliday.locationMap; // mapping of original location to record id

      const promises = [];

      // For each original location, update if it still exists, or delete if removed.
      originalLocations.forEach((loc) => {
        if (!newLocations.includes(loc)) {
          // delete the record for this removed location
          const id = locationMap[loc];
          promises.push(
            fetch(`http://localhost:5000/api/holidays/${id}`, {
              method: "DELETE",
            })
          );
        } else {
          // update the record with the current holiday_date and holiday_name
          const id = locationMap[loc];
          promises.push(
            fetch(`http://localhost:5000/api/holidays/${id}`, {
              method: "PUT",
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

      // For any new location that was added (i.e. not in the original set), add a new record.
      newLocations.forEach((loc) => {
        if (!originalLocations.includes(loc)) {
          promises.push(
            fetch("http://localhost:5000/api/holidays", {
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
        })
        .catch((error) => console.error("Error updating holiday:", error));
    }
  };

  const handleDelete = (holiday) => {
    setHolidayToDelete(holiday);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    fetch(`http://localhost:5000/api/holidays/${holidayToDelete.ids[0]}`, {
      method: "DELETE",
    })
      .then(() => {
        fetchHolidays();
        setShowDeleteModal(false);
        setHolidayToDelete(null);
      })
      .catch((error) => console.error("Error deleting holiday:", error));
  };

  // Get today's date without time for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="container-fluid mt-4">
      <h3 className="text-center">Holidays</h3>
      {/* Table of Holidays */}
      <div className="border p-3 mt-3">
        {groupedHolidays.length > 0 ? (
          <Table bordered striped hover responsive>
            <thead className="bg-primary text-white text-center">
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th>Ratnagiri Office</th>
                <th>Mumbai Office</th>
                <th>Delhi Office</th>
                <th>Actions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {groupedHolidays.map((holiday) => {
                const holidayDate = new Date(holiday.holiday_date);
                // Compare date-only for determining "past" status
                const todayOnly = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate()
                );
                const holidayDateOnly = new Date(
                  holidayDate.getFullYear(),
                  holidayDate.getMonth(),
                  holidayDate.getDate()
                );
                const isPast = holidayDateOnly < todayOnly;
                const formattedDate = holidayDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                // For each location column, check if the holiday's locations include the office.
                const ratnagiriCheck = holiday.locations.includes("Ratnagiri Office") ? "✓" : "";
                const mumbaiCheck = holiday.locations.includes("Mumbai Office") ? "✓" : "";
                const delhiCheck = holiday.locations.includes("Delhi Office") ? "✓" : "";

                // For completed holidays, disable edit & delete by applying a disabled style.
                const actionStyle = isPast
                  ? { opacity: 0.5, pointerEvents: "none" }
                  : { cursor: "pointer", marginRight: "10px" };

                return (
                  <tr
                    key={holiday.ids[0]}
                    className={isPast ? "completedHoliday" : ""}
                    style={{
                      backgroundColor: !isPast ? "#ff0000" : undefined,
                      color: "#fff",
                    }}
                  >
                    <td className="text-center">{formattedDate}</td>
                    <td>{holiday.holiday_name}</td>
                    <td className="text-center">{ratnagiriCheck}</td>
                    <td className="text-center">{mumbaiCheck}</td>
                    <td className="text-center">{delhiCheck}</td>
                    <td className="text-center">
                      <FaPencilAlt
                        onClick={() => !isPast && handleEdit(holiday)}
                        style={actionStyle}
                      />
                      <FaTrash
                        onClick={() => !isPast && handleDelete(holiday)}
                        style={actionStyle}
                      />
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

      {/* Button to open "Add Holiday" modal */}
      <Button
        className="mt-3"
        onClick={() => setShowAddModal(true)}
        style={{ width: "200px", display: "block", margin: "auto" }}
      >
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
          Are you sure you want to delete the holiday "{holidayToDelete && holidayToDelete.holiday_name}"?
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

// Leaves component with inline input fields, separate confirmation popups for Add and Update actions,
// and a separate validation error popup that shows when the confirm button is clicked and fields are empty.
const Leaves = () => {
  const [allocatedUnplannedLeave, setAllocatedUnplannedLeave] = useState("");
  const [allocatedPlannedLeave, setAllocatedPlannedLeave] = useState("");
  const [showAddConfirmModal, setShowAddConfirmModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Calculate total as numbers (0 if empty)
  const totalLeaves =
    (parseInt(allocatedUnplannedLeave, 10) || 0) +
    (parseInt(allocatedPlannedLeave, 10) || 0);

  // ADD new leave records for employees who don't have any record yet
  const handleAddLeaves = () => {
    if (!allocatedUnplannedLeave.toString().trim() || !allocatedPlannedLeave.toString().trim()) {
      setErrorMessage("Please fill out both leave fields.");
      setShowValidationErrorModal(true);
      return;
    }
    const unplanned = parseInt(allocatedUnplannedLeave, 10) || 0;
    const planned = parseInt(allocatedPlannedLeave, 10) || 0;

    fetch("http://localhost:5000/api/employee-leaves", {
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
      .then((data) => {
        console.log("Added leaves for all employees:", data);
        alert(
          `Leaves added for employees who have no record:\nUnplanned: ${unplanned}, Planned: ${planned}, Total: ${
            unplanned + planned
          }`
        );
        setShowAddConfirmModal(false);
      })
      .catch((error) => {
        console.error("Error adding leaves:", error);
        alert("Error adding leaves");
      });
  };

  // UPDATE existing leave records for all employees
  const handleUpdateLeaves = () => {
    if (!allocatedUnplannedLeave.toString().trim() || !allocatedPlannedLeave.toString().trim()) {
      setErrorMessage("Please fill out both leave fields.");
      setShowValidationErrorModal(true);
      return;
    }
    const unplanned = parseInt(allocatedUnplannedLeave, 10) || 0;
    const planned = parseInt(allocatedPlannedLeave, 10) || 0;

    fetch("http://localhost:5000/api/employee-leaves", {
      method: "PUT",
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
      .then((data) => {
        console.log("Updated leaves for all employees:", data);
        alert(
          `Leaves updated for all employees:\nUnplanned: ${unplanned}, Planned: ${planned}, Total: ${
            unplanned + planned
          }`
        );
        setShowUpdateConfirmModal(false);
      })
      .catch((error) => {
        console.error("Error updating leaves:", error);
        alert("Error updating leaves");
      });
  };

  return (
    <div className="container mt-4" style={{ minHeight: "600px" }}>
      <h3 className="text-center mb-4">Add / Update Leaves for All Employees</h3>
      <Row className="justify-content-center mt-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Allocated Unplanned Leaves</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter unplanned leaves"
              value={allocatedUnplannedLeave}
              onChange={(e) => setAllocatedUnplannedLeave(e.target.value)}
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
              onChange={(e) => setAllocatedPlannedLeave(e.target.value)}
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
          <Button variant="primary" onClick={() => setShowAddConfirmModal(true)} className="w-100">
            Add Leaves
          </Button>
        </Col>
        <Col md={2} className="text-center">
          <Button variant="success" onClick={() => setShowUpdateConfirmModal(true)} className="w-100">
            Update Leaves
          </Button>
        </Col>
      </Row>
      {/* Add Confirmation Modal */}
      <Modal show={showAddConfirmModal} onHide={() => setShowAddConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Add Leaves</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to add leaves for all employees with the following details?
          <br />
          <strong>Unplanned Leaves:</strong> {allocatedUnplannedLeave || 0}
          <br />
          <strong>Planned Leaves:</strong> {allocatedPlannedLeave || 0}
          <br />
          <strong>Total Leaves:</strong> {totalLeaves}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddLeaves}>
            Confirm Add
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Update Confirmation Modal */}
      <Modal show={showUpdateConfirmModal} onHide={() => setShowUpdateConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update Leaves</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to update leaves for all employees with the following details?
          <br />
          <strong>Unplanned Leaves:</strong> {allocatedUnplannedLeave || 0}
          <br />
          <strong>Planned Leaves:</strong> {allocatedPlannedLeave || 0}
          <br />
          <strong>Total Leaves:</strong> {totalLeaves}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleUpdateLeaves}>
            Confirm Update
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Validation Error Modal */}
      <Modal show={showValidationErrorModal} onHide={() => setShowValidationErrorModal(false)}>
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

  return (
    <div className="container-fluid mt-4" style={{ minHeight: "600px" }}>
      <Tabs activeKey={activeTab} onSelect={(tab) => setActiveTab(tab)} className="mb-3">
        <Tab eventKey="holidays" title="Holidays">
          <Holidays />
        </Tab>
        <Tab eventKey="leaves" title="Leaves">
          <Leaves />
        </Tab>
      </Tabs>
    </div>
  );
};

export default HolidayAndLeavesTabs;
