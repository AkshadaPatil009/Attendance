import React, { useState, useEffect } from "react";
import { Button, Form, Modal, Table } from "react-bootstrap";
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

  const handleEdit = (holiday) => {
    // Adjust the date using timezone offset so that the correct date appears
    const date = new Date(holiday.holiday_date);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const formattedDate = date.toISOString().split("T")[0];
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
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const holidayDate = new Date(holiday.holiday_date);
                holidayDate.setHours(0, 0, 0, 0);
                const isCompleted = holidayDate < today;
                const formattedDate = holidayDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <tr
                    key={holiday.id}
                    className={isCompleted ? "completedHoliday" : ""}
                  >
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

export default Holidays;
