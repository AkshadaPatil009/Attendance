// src/components/AnnualLeaves.js
import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Alert,
  Card,
  Row,
  Col
} from "react-bootstrap";
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const NewJoinerLeaves = () => {
  const [employees, setEmployees] = useState([]);
  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [addAllocatedPlanned, setAddAllocatedPlanned] = useState("");
  const [addAllocatedUnplanned, setAddAllocatedUnplanned] = useState("");
  const [message, setMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/api/employees-list`)
      .then((res) => res.json())
      .then(setEmployees)
      .catch(() => setMessage("Error fetching employee list."));

    socket.on("newEmployeeLeave", () => {
      fetch(`${API_URL}/api/employees-list`)
        .then((r) => r.json())
        .then(setEmployees);
    });

    return () => {
      socket.off("newEmployeeLeave");
    };
  }, []);

  const sortedEmployees = [...employees].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const validateInputs = () => {
    const errors = {};
    const today = new Date().toISOString().split("T")[0];

    if (!addEmployeeId) {
      errors.employeeId = "Please select an employee.";
    }

    if (!joinDate) {
      errors.joinDate = "Please select a joining date.";
    } else if (joinDate > today) {
      errors.joinDate = "Joining date cannot be in the future.";
    }

    if (addAllocatedUnplanned === "") {
      errors.unplannedLeave = "Unplanned leave is required.";
    } else if (isNaN(addAllocatedUnplanned) || Number(addAllocatedUnplanned) < 0) {
      errors.unplannedLeave = "Unplanned leave must be a non-negative number.";
    }

    if (addAllocatedPlanned === "") {
      errors.plannedLeave = "Planned leave is required.";
    } else if (isNaN(addAllocatedPlanned) || Number(addAllocatedPlanned) < 0) {
      errors.plannedLeave = "Planned leave must be a non-negative number.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addEmployeeLeave = () => {
    setMessage(null);

    if (!validateInputs()) return;

    fetch(`${API_URL}/api/employee-leaves-midyear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: addEmployeeId,
        joinDate,
        allocatedUnplannedLeave: Number(addAllocatedUnplanned),
        allocatedPlannedLeave: Number(addAllocatedPlanned)
      })
    })
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (ok) {
          setMessage(body.message || "Leave record added.");
          setJoinDate("");
          setAddAllocatedPlanned("");
          setAddAllocatedUnplanned("");
          setAddEmployeeId("");
          setValidationErrors({});
          socket.emit("newEmployeeLeave", { employeeId: addEmployeeId });
        } else {
          setMessage(body.error || "Error adding leave record.");
        }
      })
      .catch(() => {
        setMessage("Error: Could not add leave record.");
      });
  };

  return (
    <div className="p-4">
      {message && <Alert variant="info">{message}</Alert>}

      <Card style={{ maxWidth: "600px", margin: "auto" }}>
        <Card.Body>
          <Card.Title>Add Leave for New Joiner</Card.Title>

          <Form.Group className="mb-3">
            <Form.Label><b>Select Employee</b></Form.Label>
            <Form.Control
              as="select"
              value={addEmployeeId}
              onChange={e => setAddEmployeeId(e.target.value)}
              isInvalid={!!validationErrors.employeeId}
            >
              <option value="">-- select an employee --</option>
              {sortedEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </Form.Control>
            {validationErrors.employeeId && (
              <Form.Text className="text-danger">
                {validationErrors.employeeId}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Joining Date</Form.Label>
            <Form.Control
              type="date"
              value={joinDate}
              onChange={e => setJoinDate(e.target.value)}
              isInvalid={!!validationErrors.joinDate}
            />
            {validationErrors.joinDate && (
              <Form.Text className="text-danger">
                {validationErrors.joinDate}
              </Form.Text>
            )}
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Allocated Unplanned Leave</Form.Label>
                <Form.Control
                  type="number"
                  value={addAllocatedUnplanned}
                  onChange={e => setAddAllocatedUnplanned(e.target.value)}
                  min="0"
                  isInvalid={!!validationErrors.unplannedLeave}
                />
                {validationErrors.unplannedLeave && (
                  <Form.Text className="text-danger">
                    {validationErrors.unplannedLeave}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Allocated Planned Leave</Form.Label>
                <Form.Control
                  type="number"
                  value={addAllocatedPlanned}
                  onChange={e => setAddAllocatedPlanned(e.target.value)}
                  min="0"
                  isInvalid={!!validationErrors.plannedLeave}
                />
                {validationErrors.plannedLeave && (
                  <Form.Text className="text-danger">
                    {validationErrors.plannedLeave}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Button variant="success" onClick={addEmployeeLeave} className="w-100">
            Add Leave Record
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default NewJoinerLeaves;
