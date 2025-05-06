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
  const [addAllocatedPlanned, setAddAllocatedPlanned] = useState(0);
  const [addAllocatedUnplanned, setAddAllocatedUnplanned] = useState(0);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/employees-list`)
      .then((res) => res.json())
      .then(setEmployees)
      .catch(() => setMessage("Error fetching employee list."));

    socket.on("newEmployeeLeave", () => {
      // refetch list to pick up new records
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

  const addEmployeeLeave = () => {
    setMessage(null);
    if (!addEmployeeId || !joinDate) {
      return window.alert("Please select employee and join date.");
    }
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
          setAddAllocatedPlanned(0);
          setAddAllocatedUnplanned(0);
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
          <Card.Title>Add Leave for Mid‑year Joiner</Card.Title>

          <Form.Group className="mb-3">
            <Form.Label><b>Select Employee</b></Form.Label>
            <Form.Control
              as="select"
              value={addEmployeeId}
              onChange={e => setAddEmployeeId(e.target.value)}
            >
              <option value="">-- select an employee --</option>
              {sortedEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Joining Date</Form.Label>
            <Form.Control
              type="date"
              value={joinDate}
              onChange={e => setJoinDate(e.target.value)}
            />
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Allocated Unplanned Leave</Form.Label>
                <Form.Control
                  type="number"
                  value={addAllocatedUnplanned}
                  onChange={e => setAddAllocatedUnplanned(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Allocated Planned Leave</Form.Label>
                <Form.Control
                  type="number"
                  value={addAllocatedPlanned}
                  onChange={e => setAddAllocatedPlanned(e.target.value)}
                />
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
