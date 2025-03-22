import React, { useState, useEffect } from "react";
import { Form, Button, Alert, Card, Row, Col } from "react-bootstrap";

const AdminEmployeeView = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState(null);

  // We assume each employee object includes:
  //   id, name,
  //   usedUnplannedLeave, usedPlannedLeave,
  //   allocatedUnplannedLeave, allocatedPlannedLeave
  // If your backend differs, adjust accordingly.
  const [usedUnplannedLeave, setUsedUnplannedLeave] = useState(0);
  const [usedPlannedLeave, setUsedPlannedLeave] = useState(0);
  const [remainingUnplannedLeave, setRemainingUnplannedLeave] = useState(0);
  const [remainingPlannedLeave, setRemainingPlannedLeave] = useState(0);

  // Fetch employees when component mounts
  useEffect(() => {
    fetch("http://localhost:5000/api/employees-list")
      .then((response) => response.json())
      .then((data) => {
        setEmployees(data);
        if (data.length > 0) {
          // Initialize with the first employee's data
          const firstEmployee = data[0];
          setSelectedEmployeeId(firstEmployee.id);
          populateLeaveFields(firstEmployee);
        }
      })
      .catch((error) => {
        console.error("Error fetching employees:", error);
        setMessage("Error fetching employee list.");
      });
  }, []);

  // Helper to set local state fields based on the chosen employee
  const populateLeaveFields = (employee) => {
    // "Used" fields (as provided by the employee object)
    const usedUnplanned = employee.usedUnplannedLeave || 0;
    const usedPlanned = employee.usedPlannedLeave || 0;

    // If you have allocated fields, you can calculate remaining automatically:
    // remaining = allocated - used.
    // However, if your backend already stores remaining, you can directly use it.
    const allocatedUnplanned = employee.allocatedUnplannedLeave || 0;
    const allocatedPlanned = employee.allocatedPlannedLeave || 0;

    const remainingUnplanned = allocatedUnplanned - usedUnplanned;
    const remainingPlanned = allocatedPlanned - usedPlanned;

    setUsedUnplannedLeave(usedUnplanned);
    setUsedPlannedLeave(usedPlanned);
    setRemainingUnplannedLeave(remainingUnplanned);
    setRemainingPlannedLeave(remainingPlanned);
  };

  // When user selects a new employee from the dropdown
  const handleEmployeeChange = (e) => {
    setMessage(null);
    const empId = e.target.value;
    setSelectedEmployeeId(empId);

    // Find the employee in the list
    const employee = employees.find(
      (emp) => emp.id.toString() === empId.toString()
    );
    if (employee) {
      populateLeaveFields(employee);
    }
  };

  // If you want to let the user directly edit the used leaves:
  const handleUsedUnplannedChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0;
    setUsedUnplannedLeave(value);

    // Recalculate remaining unplanned if you know allocated from the selected employee
    const employee = employees.find(
      (emp) => emp.id.toString() === selectedEmployeeId.toString()
    );
    if (employee) {
      const allocated = employee.allocatedUnplannedLeave || 0;
      setRemainingUnplannedLeave(allocated - value);
    }
  };

  const handleUsedPlannedChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0;
    setUsedPlannedLeave(value);

    // Recalculate remaining planned
    const employee = employees.find(
      (emp) => emp.id.toString() === selectedEmployeeId.toString()
    );
    if (employee) {
      const allocated = employee.allocatedPlannedLeave || 0;
      setRemainingPlannedLeave(allocated - value);
    }
  };

  // If you want to allow the user to manually adjust the remaining leaves as well,
  // create handlers for those. Otherwise, keep them read-only.

  // Update the employee's used leaves
  const updateEmployeeLeaves = () => {
    setMessage(null);

    fetch(`http://localhost:5000/api/employee-leaves/${selectedEmployeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usedUnplannedLeave,
        usedPlannedLeave,
        // If your backend needs the remaining as well, include it:
        remainingUnplannedLeave,
        remainingPlannedLeave,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setMessage("Employee leaves updated successfully.");
          // Optionally, update local employees array so the UI stays in sync
          setEmployees((prev) =>
            prev.map((emp) => {
              if (emp.id.toString() === selectedEmployeeId.toString()) {
                return {
                  ...emp,
                  usedUnplannedLeave,
                  usedPlannedLeave,
                  // If you want to store them locally as well
                  remainingUnplannedLeave,
                  remainingPlannedLeave,
                };
              }
              return emp;
            })
          );
        } else {
          setMessage("Error: Failed to update employee leaves.");
        }
      })
      .catch((error) => {
        console.error("Error updating leaves:", error);
        setMessage("Error: Could not update employee leaves.");
      });
  };

  return (
    <div className="container mt-4">
      <Form.Group className="mb-3">
        <Form.Label><b>Select Employee (Update Record)</b></Form.Label>
        <Form.Control
          as="select"
          value={selectedEmployeeId}
          onChange={handleEmployeeChange}
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </Form.Control>
      </Form.Group>

      <Card style={{ maxWidth: "500px", margin: "auto" }}>
        <Card.Body>
          <Card.Title>Update Employee Leave Details</Card.Title>
          {message && <Alert variant="info">{message}</Alert>}

          <Form>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Used Unplanned Leave</Form.Label>
                  <Form.Control
                    type="number"
                    value={usedUnplannedLeave}
                    onChange={handleUsedUnplannedChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Used Planned Leave</Form.Label>
                  <Form.Control
                    type="number"
                    value={usedPlannedLeave}
                    onChange={handleUsedPlannedChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Remaining Unplanned Leave</Form.Label>
                  <Form.Control
                    type="number"
                    value={remainingUnplannedLeave}
                    // If you want this read-only, uncomment the next line
                    readOnly
                    // If you want to allow manual editing, remove `readOnly` 
                    // and add a handler
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Remaining Planned Leave</Form.Label>
                  <Form.Control
                    type="number"
                    value={remainingPlannedLeave}
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>

            <Button variant="primary" onClick={updateEmployeeLeaves}>
              Update Employee Leaves
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminEmployeeView;
