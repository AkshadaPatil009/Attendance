// src/components/UpdateLeaves.js

import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Button,
  Alert,
  Card,
  Row,
  Col,
  Modal
} from "react-bootstrap";
import { FaPlus, FaMinus } from "react-icons/fa";
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const UpdateLeaves = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState(null);

  // track both used and remaining as plain numbers
  const [usedUnplannedLeave, setUsedUnplannedLeave] = useState(0);
  const [usedPlannedLeave, setUsedPlannedLeave] = useState(0);
  const [remainingUnplannedLeave, setRemainingUnplannedLeave] = useState(0);
  const [remainingPlannedLeave, setRemainingPlannedLeave] = useState(0);

  const [updateLeaveRecords, setUpdateLeaveRecords] = useState([
    { leaveDate: "", leaveType: "Planned", leaveDay: "Full" }
  ]);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);

  const selectedEmployeeIdRef = useRef(selectedEmployeeId);
  useEffect(() => {
    selectedEmployeeIdRef.current = selectedEmployeeId;
  }, [selectedEmployeeId]);

  // fetch and socket setup
  useEffect(() => {
    fetch(`${API_URL}/api/employees-list`)
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        const emp = data.find(e => e.id.toString() === selectedEmployeeIdRef.current);
        if (emp) populateLeaveFields(emp);
      })
      .catch(() => setMessage("Error fetching employee list."));

    socket.on("employeesListUpdated", updated => {
      setEmployees(updated);
      const emp = updated.find(e => e.id.toString() === selectedEmployeeIdRef.current);
      if (emp) populateLeaveFields(emp);
    });

    socket.on("employeeLeavesUpdated", ({ employeeId, remainingPlanned, remainingUnplanned, usedPlanned, usedUnplanned }) => {
      setEmployees(prev =>
        prev.map(x =>
          x.id.toString() === employeeId.toString()
            ? {
                ...x,
                remainingPlannedLeave: remainingPlanned,
                remainingUnplannedLeave: remainingUnplanned,
                usedPlannedLeave: usedPlanned,
                usedUnplannedLeave: usedUnplanned
              }
            : x
        )
      );
      if (employeeId.toString() === selectedEmployeeIdRef.current) {
        setRemainingPlannedLeave(parseFloat(remainingPlanned) || 0);
        setRemainingUnplannedLeave(parseFloat(remainingUnplanned) || 0);
        setUsedPlannedLeave(parseFloat(usedPlanned) || 0);
        setUsedUnplannedLeave(parseFloat(usedUnplanned) || 0);
      }
    });

    return () => {
      socket.off("employeesListUpdated");
      socket.off("employeeLeavesUpdated");
      socket.disconnect();
    };
  }, []);

  // update when selection changes
  useEffect(() => {
    const emp = employees.find(x => x.id.toString() === selectedEmployeeId);
    if (emp) populateLeaveFields(emp);
  }, [selectedEmployeeId, employees]);

  const populateLeaveFields = emp => {
    // parse string decimals into JS numbers—avoids "10.50" and yields 10.5
    setRemainingUnplannedLeave(parseFloat(emp.remainingUnplannedLeave) || 0);
    setRemainingPlannedLeave(parseFloat(emp.remainingPlannedLeave) || 0);
    setUsedUnplannedLeave(parseFloat(emp.usedUnplannedLeave) || 0);
    setUsedPlannedLeave(parseFloat(emp.usedPlannedLeave) || 0);
  };

  const sortedEmployees = [...employees].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleEmployeeChange = e => {
    setMessage(null);
    setSelectedEmployeeId(e.target.value);
  };

  const handleUpdateLeaveRecordChange = (i, field, val) => {
    setUpdateLeaveRecords(prev =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))
    );
  };

  const addUpdateLeaveRecord = () =>
    setUpdateLeaveRecords(prev => [
      ...prev,
      { leaveDate: "", leaveType: "Planned", leaveDay: "Full" }
    ]);

  const removeUpdateLeaveRecord = i => {
    if (updateLeaveRecords.length > 1)
      setUpdateLeaveRecords(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateEmployeeLeaves = () => {
    setMessage(null);
    const emp = employees.find(x => x.id.toString() === selectedEmployeeId);
    if (!emp) {
      setMessage("Selected employee not found.");
      return;
    }

    // Calculate planned / unplanned usage in fractional days
    let addPlannedCount = 0;
    let addUnplannedCount = 0;
    updateLeaveRecords.forEach(r => {
      if (!r.leaveDate) return;
      const factor = r.leaveDay === "Half" ? 0.5 : 1;
      if (r.leaveType === "Planned") addPlannedCount += factor;
      if (r.leaveType === "Unplanned") addUnplannedCount += factor;
    });

    const newUsedPlanned = usedPlannedLeave + addPlannedCount;
    const newUsedUnplanned = usedUnplannedLeave + addUnplannedCount;
    const newRemPlanned = remainingPlannedLeave - addPlannedCount;
    const newRemUnplanned = remainingUnplannedLeave - addUnplannedCount;

    if (newRemPlanned < 0 || newRemUnplanned < 0) {
      return window.alert("Insufficient leave balance.");
    }

    // PUT aggregates for single employee
    fetch(`${API_URL}/api/employee-leaves/${selectedEmployeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usedUnplannedLeave: newUsedUnplanned,
        usedPlannedLeave: newUsedPlanned,
        remainingUnplannedLeave: newRemUnplanned,
        remainingPlannedLeave: newRemPlanned
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update aggregates");
        socket.emit("employeeLeavesUpdated", {
          employeeId: selectedEmployeeId,
          remainingPlanned: newRemPlanned,
          remainingUnplanned: newRemUnplanned,
          usedPlanned: newUsedPlanned,
          usedUnplanned: newUsedUnplanned
        });
        // update local state
        setRemainingPlannedLeave(newRemPlanned);
        setRemainingUnplannedLeave(newRemUnplanned);
        setUsedPlannedLeave(newUsedPlanned);
        setUsedUnplannedLeave(newUsedUnplanned);
        setEmployees(prev =>
          prev.map(x =>
            x.id.toString() === selectedEmployeeId
              ? {
                  ...x,
                  usedUnplannedLeave: newUsedUnplanned,
                  usedPlannedLeave: newUsedPlanned,
                  remainingUnplannedLeave: newRemUnplanned,
                  remainingPlannedLeave: newRemPlanned
                }
              : x
          )
        );
        // then post each leave date record
        return Promise.all(
          updateLeaveRecords.map(r =>
            fetch(`${API_URL}/api/employee-leaves-date`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employeeId: selectedEmployeeId,
                leave_date: r.leaveDate,
                leave_type: r.leaveType,
                leave_day: r.leaveDay
              })
            })
          )
        );
      })
      .then(responses => {
        if (responses.every(r => r.ok)) {
          setMessage("Employee leaves updated successfully.");
          setUpdateLeaveRecords([{ leaveDate: "", leaveType: "Planned", leaveDay: "Full" }]);
        } else {
          setMessage("Error adding one or more leave-date records.");
        }
      })
      .catch(err => {
        console.error(err);
        setMessage("Error: Could not update employee leaves.");
      });
  };

  const handleUpdateConfirmation = () => setShowUpdateConfirmation(true);
  const handleConfirmUpdate = () => {
    setShowUpdateConfirmation(false);
    updateEmployeeLeaves();
  };
  const handleCancelUpdate = () => setShowUpdateConfirmation(false);

  // Helper to render numbers without unnecessary trailing zeros
  const formatNumber = num => {
    // If integer, show no decimal; if fractional, strip trailing zero (e.g. 10.50 -> 10.5)
    if (Number.isInteger(num)) return num.toString();
    return num.toString().replace(/\.?0+$/, "");
  };

  return (
    <div className="p-4">
      {message && <Alert variant="info">{message}</Alert>}

      <Card style={{ maxWidth: "600px", margin: "auto" }}>
        <Card.Body>
          <Card.Title>Update Employee Leave Details</Card.Title>

          <Form.Group className="mb-3">
            <Form.Label><b>Select Employee</b></Form.Label>
            <Form.Control
              as="select"
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
            >
              <option value="">-- select an employee --</option>
              {sortedEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Used Unplanned Leave</Form.Label>
                <Form.Control
                  type="text"
                  value={formatNumber(usedUnplannedLeave)}
                  readOnly
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Used Planned Leave</Form.Label>
                <Form.Control
                  type="text"
                  value={formatNumber(usedPlannedLeave)}
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Remaining Unplanned Leave</Form.Label>
                <Form.Control
                  type="text"
                  value={formatNumber(remainingUnplannedLeave)}
                  readOnly
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Remaining Planned Leave</Form.Label>
                <Form.Control
                  type="text"
                  value={formatNumber(remainingPlannedLeave)}
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Leave Date Records</Card.Title>
              {updateLeaveRecords.map((r, i) => (
                <Row key={i} className="mb-2 align-items-center">
                  <Col xs={4}>
                    <Form.Group>
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={r.leaveDate}
                        onChange={e =>
                          handleUpdateLeaveRecordChange(i, "leaveDate", e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={4}>
                    <Form.Group>
                      <Form.Label>Type</Form.Label>
                      <Form.Control
                        as="select"
                        value={r.leaveType}
                        onChange={e =>
                          handleUpdateLeaveRecordChange(i, "leaveType", e.target.value)
                        }
                      >
                        <option value="Planned">Planned</option>
                        <option value="Unplanned">Unplanned</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col xs={2}>
                    <Form.Group>
                      <Form.Label>Day</Form.Label>
                      <Form.Control
                        as="select"
                        value={r.leaveDay}
                        onChange={e =>
                          handleUpdateLeaveRecordChange(i, "leaveDay", e.target.value)
                        }
                      >
                        <option value="Full">Full</option>
                        <option value="Half">Half</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col xs={2} className="text-center">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeUpdateLeaveRecord(i)}
                      disabled={updateLeaveRecords.length === 1}
                      style={{ fontSize: "0.6rem", padding: "0.1rem 0.2rem" }}
                    >
                      <FaMinus />
                    </Button>
                  </Col>
                </Row>
              ))}
              <Row className="mt-2">
                <Col className="text-center">
                  <Button variant="success" size="sm" onClick={addUpdateLeaveRecord}>
                    <FaPlus /> Add
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Button variant="primary" onClick={handleUpdateConfirmation} className="w-100">
            Update Employee Leaves
          </Button>
        </Card.Body>
      </Card>

      <Modal show={showUpdateConfirmation} onHide={handleCancelUpdate}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to update the employee leaves?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelUpdate}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirmUpdate}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UpdateLeaves;
