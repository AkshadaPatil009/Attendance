// src/components/Holiday.js
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { FaPencilAlt, FaTrash } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Multi‑select dropdown for Locations
const LocationMultiSelect = ({ options, selectedLocations, setSelectedLocations }) => {
  const [open, setOpen] = useState(false);
  const toggleOption = (opt) =>
    selectedLocations.includes(opt)
      ? setSelectedLocations(selectedLocations.filter((l) => l !== opt))
      : setSelectedLocations([...selectedLocations, opt]);
  const toggleSelectAll = () =>
    selectedLocations.length === options.length
      ? setSelectedLocations([])
      : setSelectedLocations([...options]);

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
            checked={selectedLocations.length === options.length}
            onChange={toggleSelectAll}
          />
          {options.map((o) => (
            <Form.Check
              key={o}
              type="checkbox"
              label={o}
              checked={selectedLocations.includes(o)}
              onChange={() => toggleOption(o)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Holiday = () => {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const [holidays, setHolidays] = useState([]);
  const [offices, setOffices] = useState([]);

  // Modals & form state
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [showOfficeConfirm, setShowOfficeConfirm] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "", locations: [] });

  const [editing, setEditing] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [dateError, setDateError] = useState("");
  const [showDateError, setShowDateError] = useState(false);

  // Fetchers
  const fetchHolidays = () =>
    fetch(`${API_URL}/api/holidays`)
      .then((r) => r.json())
      .then(setHolidays)
      .catch(console.error);

  const fetchOffices = () =>
    fetch(`${API_URL}/api/offices`)
      .then((r) => r.json())
      .then((data) => setOffices(data.map((o) => o.name)))
      .catch(console.error);

  useEffect(() => {
    fetchHolidays();
    fetchOffices();
  }, []);

  // Socket.IO for real‑time
  useEffect(() => {
    const socket = io(API_URL);
    socket.emit("join", { room: "holiday-leaves" });
    socket.on("holidayAdded", fetchHolidays);
    socket.on("holidayUpdated", fetchHolidays);
    socket.on("holidayDeleted", fetchHolidays);
    return () => socket.disconnect();
  }, []);

  // --- Office addition ---
  const handleAddOffice = () => {
    if (!newOfficeName.trim()) return;
    fetch(`${API_URL}/api/offices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOfficeName.trim() }),
    })
      .then(() => {
        fetchOffices();
        setNewOfficeName("");
        setShowOfficeConfirm(false);
        setShowOfficeModal(false);
      })
      .catch(console.error);
  };

  // --- Add Holiday ---
  const handleAddHoliday = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const sel = new Date(newHoliday.date); sel.setHours(0,0,0,0);
    if (sel < today) {
      setDateError("Cannot add a holiday in the past.");
      setShowDateError(true);
      return;
    }
    if (!newHoliday.date || !newHoliday.name || newHoliday.locations.length === 0) return;
    Promise.all(
      newHoliday.locations.map((loc) =>
        fetch(`${API_URL}/api/holidays`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holiday_date: newHoliday.date,
            holiday_name: newHoliday.name,
            location: loc,
          }),
        }).then((r) => r.json())
      )
    )
      .then(() => {
        fetchHolidays();
        setNewHoliday({ date: "", name: "", locations: [] });
        setShowAddModal(false);
      })
      .catch(console.error);
  };

  // --- Edit Holiday ---
  const openEdit = (h) => {
    const d = new Date(h.holiday_date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setEditing({
      ...h,
      holiday_date: d.toISOString().split("T")[0],
      groupLocations: h.locations,
      locationMap: h.locationMap,
    });
    setShowEditModal(true);
  };
  const handleUpdate = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const upd = new Date(editing.holiday_date); upd.setHours(0,0,0,0);
    if (upd < today) {
      setDateError("Cannot set the holiday to a past date.");
      setShowDateError(true);
      return;
    }
    const { groupLocations, locationMap, ...rest } = editing;
    const toDeleteLocs = groupLocations.filter((l) => !rest.locations.includes(l));
    const toUpdateLocs = groupLocations.filter((l) => rest.locations.includes(l));
    const toAddLocs    = rest.locations.filter((l) => !groupLocations.includes(l));

    const calls = [
      ...toDeleteLocs.map((loc) => fetch(`${API_URL}/api/holidays/${locationMap[loc]}`, { method: "DELETE" })),
      ...toUpdateLocs.map((loc) =>
        fetch(`${API_URL}/api/holidays/${locationMap[loc]}`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            holiday_date: rest.holiday_date,
            holiday_name: rest.holiday_name,
            location: loc,
            approval_status: "Pending",
            approved_by: "",
            approved_date: "",
          }),
        }).then((r) => r.json())
      ),
      ...toAddLocs.map((loc) =>
        fetch(`${API_URL}/api/holidays`, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            holiday_date: rest.holiday_date,
            holiday_name: rest.holiday_name,
            location: loc,
          }),
        }).then((r) => r.json())
      ),
    ];

    Promise.all(calls)
      .then(() => {
        fetchHolidays();
        setShowEditModal(false);
        setEditing(null);
      })
      .catch(console.error);
  };

  // --- Delete Holiday ---
  const handleDelete = (h) => {
    setToDelete(h);
    setShowDeleteModal(true);
  };
  const confirmDelete = () => {
    Promise.all(toDelete.ids.map((id) => fetch(`${API_URL}/api/holidays/${id}`, { method: "DELETE" })))
      .then(() => {
        fetchHolidays();
        setShowDeleteModal(false);
        setToDelete(null);
      })
      .catch(console.error);
  };

  // --- Approve All ---
  const handleApproveAll = () => {
    const pending = holidays.filter((h) => h.approval_status === "Pending");
    if (pending.length === 0) {
      return alert("No pending holidays to approve.");
    }
    if (!window.confirm("Approve all pending holidays?")) return;
    const now = new Date().toISOString();
    Promise.all(
      pending.map((h) =>
        fetch(`${API_URL}/api/holidays/approve/${h.id}`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ approved_by: storedUser.name, approved_date: now }),
        }).then((r) => r.json())
      )
    )
      .then(() => {
        fetchHolidays();
        alert("All pending holidays approved!");
      })
      .catch(console.error);
  };

  // Group by date+name
  const grouped = Object.values(
    holidays.reduce((acc, h) => {
      const key = `${h.holiday_date}-${h.holiday_name}`;
      if (!acc[key]) acc[key] = {
        holiday_date: h.holiday_date,
        holiday_name: h.holiday_name,
        locations: new Set(),
        ids: [],
        locationMap: {},
        approval_status: h.approval_status,
      };
      acc[key].locations.add(h.location);
      acc[key].ids.push(h.id);
      acc[key].locationMap[h.location] = h.id;
      return acc;
    }, {})
  ).map((x) => ({ ...x, locations: Array.from(x.locations) }));

  // Today + 7
  const today = new Date(); today.setHours(0,0,0,0);
  const in7 = new Date(today); in7.setDate(in7.getDate()+7);

  return (
    <div className="container-fluid mt-4">
      <div className="border p-3 mt-3">
        {grouped.length > 0 ? (
          <Table bordered striped hover responsive>
            <thead className="bg-primary text-white text-center">
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                {offices.map((o) => <th key={o}>{o}</th>)}
                <th>Actions</th>
                <th>Approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((h) => {
                const hd = new Date(h.holiday_date);
                const only = new Date(hd.getFullYear(), hd.getMonth(), hd.getDate());
                const isPast = only < today;
                const within7 = only >= today && only <= in7;
                const disabled = isPast || within7;
                const formatted = hd.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
                const style = disabled
                  ? { opacity: 0.5, pointerEvents: "none" }
                  : { cursor: "pointer", marginRight: "10px" };

                return (
                  <tr key={h.ids[0]} className={isPast ? "completedHoliday" : ""} style={{ backgroundColor: !isPast ? "#ff0000" : undefined, color:"#fff" }}>
                    <td className="text-center">{formatted}</td>
                    <td>{h.holiday_name}</td>
                    {offices.map((o) => (
                      <td key={o} className="text-center">
                        {h.locations.includes(o) ? "✓" : ""}
                      </td>
                    ))}
                    <td className="text-center">
                      <FaPencilAlt onClick={() => !disabled && openEdit(h)} style={style} />
                      <FaTrash    onClick={() => !disabled && handleDelete(h)} style={style} />
                    </td>
                    <td className="text-center">
                      {h.approval_status === "Pending"
                        ? <span style={{ color: "red" }}>Pending</span>
                        : <span style={{ color: "green" }}>Approved</span>}
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
        <Button variant="primary" onClick={handleApproveAll} style={{ width: 200, marginRight: 10 }}>
          Approve All Holidays
        </Button>
        <Button variant="primary" onClick={() => setShowOfficeModal(true)} style={{ width: 200, marginRight: 10 }}>
          Add Office
        </Button>
        <Button variant="primary" onClick={() => setShowAddModal(true)} style={{ width: 200 }}>
          Add Holiday
        </Button>
      </div>

      {/* Add Office */}
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
          <Button variant="secondary" onClick={() => setShowOfficeModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setShowOfficeConfirm(true)}>Add Office</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showOfficeConfirm} onHide={() => setShowOfficeConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Add Office</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to add "{newOfficeName}"?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOfficeConfirm(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddOffice}>Confirm</Button>
        </Modal.Footer>
      </Modal>

      {/* Add Holiday */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton><Modal.Title>Add Holiday</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}/>
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Holiday Name</Form.Label>
              <Form.Control type="text" placeholder="Enter holiday name" value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}/>
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Locations</Form.Label>
              <LocationMultiSelect
                options={offices}
                selectedLocations={newHoliday.locations}
                setSelectedLocations={(locs) => setNewHoliday({ ...newHoliday, locations: locs })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddHoliday}>Add</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Holiday */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton><Modal.Title>Edit Holiday</Modal.Title></Modal.Header>
        {editing && (
          <Modal.Body>
            <Form>
              <Form.Group>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  name="holiday_date"
                  value={editing.holiday_date}
                  onChange={(e) => setEditing({ ...editing, holiday_date: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mt-2">
                <Form.Label>Holiday Name</Form.Label>
                <Form.Control
                  type="text"
                  name="holiday_name"
                  value={editing.holiday_name}
                  onChange={(e) => setEditing({ ...editing, holiday_name: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mt-2">
                <Form.Label>Locations</Form.Label>
                <LocationMultiSelect
                  options={offices}
                  selectedLocations={editing.locations}
                  setSelectedLocations={(locs) => setEditing({ ...editing, locations: locs })}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdate}>Update</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Holiday */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton><Modal.Title>Delete Holiday</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete "{toDelete?.holiday_name}"?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* Date Error */}
      <Modal show={showDateError} onHide={() => setShowDateError(false)}>
        <Modal.Header closeButton><Modal.Title>Invalid Date</Modal.Title></Modal.Header>
        <Modal.Body>{dateError}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowDateError(false)}>OK</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Holiday;
