import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Alert,
  Card,
  Row,
  Col,
  Tabs,
  Tab
} from "react-bootstrap";

const AdminEmployeeView = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState(null);

  // Existing "Update" states
  const [usedUnplannedLeave, setUsedUnplannedLeave] = useState(0);
  const [usedPlannedLeave, setUsedPlannedLeave] = useState(0);
  const [remainingUnplannedLeave, setRemainingUnplannedLeave] = useState(0);
  const [remainingPlannedLeave, setRemainingPlannedLeave] = useState(0);

  // NEW "Add" states
  const [selectedAddEmployeeId, setSelectedAddEmployeeId] = useState("");
  const [allocatedUnplannedLeaveAdd, setAllocatedUnplannedLeaveAdd] = useState(0);
  const [allocatedPlannedLeaveAdd, setAllocatedPlannedLeaveAdd] = useState(0);
  const [usedUnplannedLeaveAdd, setUsedUnplannedLeaveAdd] = useState(0);
  const [usedPlannedLeaveAdd, setUsedPlannedLeaveAdd] = useState(0);
  const [remainingUnplannedLeaveAdd, setRemainingUnplannedLeaveAdd] = useState(0);
  const [remainingPlannedLeaveAdd, setRemainingPlannedLeaveAdd] = useState(0);

  // Fetch employees on mount
  useEffect(() => {
    fetch("http://localhost:5000/api/employees-list")
      .then((response) => response.json())
      .then((data) => {
        setEmployees(data);
        if (data.length > 0) {
          // Initialize "update" section with the first employee
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

  // Helper to set the "update" fields
  const populateLeaveFields = (employee) => {
    const usedUnplanned = employee.usedUnplannedLeave || 0;
    const usedPlanned = employee.usedPlannedLeave || 0;
    const allocatedUnplanned = employee.allocatedUnplannedLeave || 0;
    const allocatedPlanned = employee.allocatedPlannedLeave || 0;

    setUsedUnplannedLeave(usedUnplanned);
    setUsedPlannedLeave(usedPlanned);
    setRemainingUnplannedLeave(allocatedUnplanned - usedUnplanned);
    setRemainingPlannedLeave(allocatedPlanned - usedPlanned);
  };

  // Handle "update" dropdown change
  const handleEmployeeChange = (e) => {
    setMessage(null);
    const empId = e.target.value;
    setSelectedEmployeeId(empId);

    const employee = employees.find((emp) => emp.id.toString() === empId.toString());
    if (employee) {
      populateLeaveFields(employee);
    }
  };

  // "Update" used unplanned
  const handleUsedUnplannedChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0;
    setUsedUnplannedLeave(value);

    const employee = employees.find(
      (emp) => emp.id.toString() === selectedEmployeeId.toString()
    );
    if (employee) {
      const allocated = employee.allocatedUnplannedLeave || 0;
      setRemainingUnplannedLeave(allocated - value);
    }
  };

  // "Update" used planned
  const handleUsedPlannedChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0;
    setUsedPlannedLeave(value);

    const employee = employees.find(
      (emp) => emp.id.toString() === selectedEmployeeId.toString()
    );
    if (employee) {
      const allocated = employee.allocatedPlannedLeave || 0;
      setRemainingPlannedLeave(allocated - value);
    }
  };

  // Update leaves (PUT)
  const updateEmployeeLeaves = () => {
    setMessage(null);

    fetch(`http://localhost:5000/api/employee-leaves/${selectedEmployeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usedUnplannedLeave,
        usedPlannedLeave,
        remainingUnplannedLeave,
        remainingPlannedLeave,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setMessage("Employee leaves updated successfully.");
          // Sync local state
          setEmployees((prev) =>
            prev.map((emp) => {
              if (emp.id.toString() === selectedEmployeeId.toString()) {
                return {
                  ...emp,
                  usedUnplannedLeave,
                  usedPlannedLeave,
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

  // -------------------
  // NEW "Add" tab logic
  // -------------------
  const handleAddEmployeeChange = (e) => {
    setSelectedAddEmployeeId(e.target.value);
  };

  const handleAddEmployeeLeaves = () => {
    setMessage(null);

    // POST new leave record
    fetch("http://localhost:5000/api/employee-leaves/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: selectedAddEmployeeId,
        allocatedUnplannedLeave: allocatedUnplannedLeaveAdd,
        allocatedPlannedLeave: allocatedPlannedLeaveAdd,
        usedUnplannedLeave: usedUnplannedLeaveAdd,
        usedPlannedLeave: usedPlannedLeaveAdd,
        remainingUnplannedLeave: remainingUnplannedLeaveAdd,
        remainingPlannedLeave: remainingPlannedLeaveAdd,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setMessage("Employee leave record added successfully.");
        } else {
          setMessage("Error: Failed to add employee leave record.");
        }
      })
      .catch((error) => {
        console.error("Error adding employee leave record:", error);
        setMessage("Error: Could not add employee leave record.");
      });
  };

  return (
    <div className="container mt-4">
      {message && <Alert variant="info">{message}</Alert>}

      {/* Create two tabs: "Add" and "Update" */}
      <Tabs defaultActiveKey="update" id="employee-leave-tabs" className="mb-3">
        {/* ------------------------ */}
        {/* TAB #1: Add New Employee */}
        {/* ------------------------ */}
        <Tab eventKey="add" title="Add New Employee Leave Record">
          <Card style={{ maxWidth: "500px", margin: "auto" }}>
            <Card.Body>
              <Card.Title>Add New Employee Leave Record</Card.Title>

              <Form.Group className="mb-3">
                <Form.Label>
                  <b>Select Employee (Add Record)</b>
                </Form.Label>
                <Form.Control
                  as="select"
                  value={selectedAddEmployeeId}
                  onChange={handleAddEmployeeChange}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Allocated Unplanned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={allocatedUnplannedLeaveAdd}
                      onChange={(e) =>
                        setAllocatedUnplannedLeaveAdd(
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Allocated Planned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={allocatedPlannedLeaveAdd}
                      onChange={(e) =>
                        setAllocatedPlannedLeaveAdd(
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Used Unplanned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={usedUnplannedLeaveAdd}
                      onChange={(e) =>
                        setUsedUnplannedLeaveAdd(
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Used Planned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={usedPlannedLeaveAdd}
                      onChange={(e) =>
                        setUsedPlannedLeaveAdd(parseInt(e.target.value, 10) || 0)
                      }
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
                      value={remainingUnplannedLeaveAdd}
                      onChange={(e) =>
                        setRemainingUnplannedLeaveAdd(
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Remaining Planned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={remainingPlannedLeaveAdd}
                      onChange={(e) =>
                        setRemainingPlannedLeaveAdd(
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Button variant="primary" onClick={handleAddEmployeeLeaves}>
                Add Employee Leave Record
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        {/* ------------------------- */}
        {/* TAB #2: Update (original) */}
        {/* ------------------------- */}
        <Tab eventKey="update" title="Update Employee Leaves">
          {/* Your existing "Update" code is untouched below */}
          <Form.Group className="mb-3">
            <Form.Label>
              <b>Select Employee (Update Record)</b>
            </Form.Label>
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
                        readOnly
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
        </Tab>
      </Tabs>
    </div>
  );
};

export default AdminEmployeeView;