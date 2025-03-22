import React, { useState, useEffect } from "react";
import { Form, Card, Button, Alert } from "react-bootstrap";

const AdminEmployeeView = () => {
  const [employees, setEmployees] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    allocatedUnplannedLeave: "",
    allocatedPlannedLeave: "",
  });

  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/employees-list")
      .then((response) => response.json())
      .then((data) => setEmployees(data))
      .catch((error) => console.error("Error fetching employees:", error));
  }, []);

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
  };

  const distributeLeaves = () => {
    const dataToSend = { ...leaveForm };

    fetch("http://localhost:5000/api/employee-leaves/bulk-insert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => {
        if (response.ok) {
          setMessage("Leaves have been distributed to all employees successfully.");
        } else {
          setMessage("Error distributing leaves.");
        }
      })
      .catch((error) => {
        console.error("Error distributing leaves:", error);
        setMessage("Error distributing leaves.");
      });
  };

  return (
    <div className="container mt-4">
      <h3 className="text-center mt-4">Admin Employee View</h3>
      {message && <Alert variant="info">{message}</Alert>}

      <Card className="p-3 shadow-sm mt-4" style={{ maxWidth: "500px", margin: "auto" }}>
        <h5><b>Distribute Leaves to All Employees</b></h5>
        <Form>
          <Form.Group>
            <Form.Label>Allocated Unplanned Leave</Form.Label>
            <Form.Control
              type="number"
              name="allocatedUnplannedLeave"
              value={leaveForm.allocatedUnplannedLeave}
              onChange={handleLeaveFormChange}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label>Allocated Planned Leave</Form.Label>
            <Form.Control
              type="number"
              name="allocatedPlannedLeave"
              value={leaveForm.allocatedPlannedLeave}
              onChange={handleLeaveFormChange}
            />
          </Form.Group>
          <Button variant="success" className="mt-3" onClick={distributeLeaves}>
            Distribute Leaves
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default AdminEmployeeView;
