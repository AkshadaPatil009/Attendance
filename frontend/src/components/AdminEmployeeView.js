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

  // "Update" states for aggregated leave values
  const [usedUnplannedLeave, setUsedUnplannedLeave] = useState(0);
  const [usedPlannedLeave, setUsedPlannedLeave] = useState(0);
  const [remainingUnplannedLeave, setRemainingUnplannedLeave] = useState(0);
  const [remainingPlannedLeave, setRemainingPlannedLeave] = useState(0);

  // Instead of single leave date and type, use an array to store multiple leave records for update
  const [updateLeaveRecords, setUpdateLeaveRecords] = useState([
    { leaveDate: "", leaveType: "Planned" }
  ]);

  // "Add" states (for adding new aggregate record)
  const [selectedAddEmployeeId, setSelectedAddEmployeeId] = useState("");
  const [allocatedUnplannedLeaveAdd, setAllocatedUnplannedLeaveAdd] = useState(0);
  const [allocatedPlannedLeaveAdd, setAllocatedPlannedLeaveAdd] = useState(0);
  const [usedUnplannedLeaveAdd, setUsedUnplannedLeaveAdd] = useState(0);
  const [usedPlannedLeaveAdd, setUsedPlannedLeaveAdd] = useState(0);
  const [remainingUnplannedLeaveAdd, setRemainingUnplannedLeaveAdd] = useState(0);
  const [remainingPlannedLeaveAdd, setRemainingPlannedLeaveAdd] = useState(0);
  // Use an array for adding multiple leave date records in the add tab
  const [addLeaveRecords, setAddLeaveRecords] = useState([
    { leaveDate: "", leaveType: "Planned" }
  ]);

  // Fetch employees on mount
  useEffect(() => {
    fetch("http://localhost:5000/api/employees-list")
      .then((response) => response.json())
      .then((data) => {
        setEmployees(data);
        if (data.length > 0) {
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

  // Helper to set update fields based on the selected employee's record
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

  // Handle employee selection change in the update tab
  const handleEmployeeChange = (e) => {
    setMessage(null);
    const empId = e.target.value;
    setSelectedEmployeeId(empId);
    const employee = employees.find(
      (emp) => emp.id.toString() === empId.toString()
    );
    if (employee) {
      populateLeaveFields(employee);
    }
  };

  // Update used unplanned leave and recalculate remaining leave
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

  // Update used planned leave and recalculate remaining leave
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

  // Handle change in individual update leave record (for multiple dates)
  const handleUpdateLeaveRecordChange = (index, field, value) => {
    const updatedRecords = updateLeaveRecords.map((record, i) => {
      if (i === index) {
        return { ...record, [field]: value };
      }
      return record;
    });
    setUpdateLeaveRecords(updatedRecords);
  };

  // Add a new empty leave record field for update tab
  const addUpdateLeaveRecord = () => {
    setUpdateLeaveRecords([
      ...updateLeaveRecords,
      { leaveDate: "", leaveType: "Planned" }
    ]);
  };

  // Update employee leaves (aggregate update and adding multiple leave date records)
  const updateEmployeeLeaves = () => {
    setMessage(null);
    // First, update the employee leave aggregate record
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
          // Optionally sync local state if needed
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
          // Now add each leave date record
          return Promise.all(
            updateLeaveRecords.map((record) =>
              fetch("http://localhost:5000/api/employee-leaves-date", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  employeeId: selectedEmployeeId,
                  leave_date: record.leaveDate,
                  leave_type: record.leaveType,
                }),
              })
            )
          );
        } else {
          throw new Error("Error: Failed to update employee leaves.");
        }
      })
      .then((responses) => {
        // Check if all responses are OK
        if (responses.every((res) => res.ok)) {
          setMessage("Employee leaves updated successfully.");
          // Clear the update leave records (or keep them if you want)
          setUpdateLeaveRecords([{ leaveDate: "", leaveType: "Planned" }]);
        } else {
          setMessage("Error: Failed to add one or more leave date records.");
        }
      })
      .catch((error) => {
        console.error("Error updating leaves:", error);
        setMessage("Error: Could not update employee leaves.");
      });
  };

  // "Add" tab handlers
  const handleAddEmployeeChange = (e) => {
    setSelectedAddEmployeeId(e.target.value);
  };

  // Handle change in individual add leave record (for multiple dates)
  const handleAddLeaveRecordChange = (index, field, value) => {
    const updatedRecords = addLeaveRecords.map((record, i) => {
      if (i === index) {
        return { ...record, [field]: value };
      }
      return record;
    });
    setAddLeaveRecords(updatedRecords);
  };

  // Add a new empty leave record field for add tab
  const addAddLeaveRecord = () => {
    setAddLeaveRecords([
      ...addLeaveRecords,
      { leaveDate: "", leaveType: "Planned" }
    ]);
  };

  // Add employee leave record (aggregate record + multiple leave dates)
  const handleAddEmployeeLeaves = () => {
    setMessage(null);
    // First add the employee leave aggregate record
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
          // Then add each leave date record for the same employee
          return Promise.all(
            addLeaveRecords.map((record) =>
              fetch("http://localhost:5000/api/employee-leaves-date", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  employeeId: selectedAddEmployeeId,
                  leave_date: record.leaveDate,
                  leave_type: record.leaveType,
                }),
              })
            )
          );
        } else {
          throw new Error("Error: Failed to add employee leave record.");
        }
      })
      .then((responses) => {
        if (responses.every((res) => res.ok)) {
          setMessage("Employee leave record added successfully.");
          // Optionally clear the add leave records
          setAddLeaveRecords([{ leaveDate: "", leaveType: "Planned" }]);
        } else {
          setMessage("Error: Failed to add one or more leave date records.");
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
      <Tabs defaultActiveKey="update" id="employee-leave-tabs" className="mb-3">
        {/* TAB 1: Add New Employee Leave Record */}
        <Tab eventKey="add" title="Add New Employee Leave Record">
          <Card style={{ maxWidth: "600px", margin: "auto" }}>
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
                        setUsedPlannedLeaveAdd(
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
              {/* Multiple leave date records for add tab */}
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>Leave Date Records</Card.Title>
                  {addLeaveRecords.map((record, index) => (
                    <Row key={index} className="mb-2">
                      <Col>
                        <Form.Group>
                          <Form.Label>Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={record.leaveDate}
                            onChange={(e) =>
                              handleAddLeaveRecordChange(
                                index,
                                "leaveDate",
                                e.target.value
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col>
                        <Form.Group>
                          <Form.Label>Type</Form.Label>
                          <Form.Control
                            as="select"
                            value={record.leaveType}
                            onChange={(e) =>
                              handleAddLeaveRecordChange(
                                index,
                                "leaveType",
                                e.target.value
                              )
                            }
                          >
                            <option value="Planned">Planned</option>
                            <option value="Unplanned">Unplanned</option>
                          </Form.Control>
                        </Form.Group>
                      </Col>
                    </Row>
                  ))}
                  <Button variant="secondary" onClick={addAddLeaveRecord}>
                    Add Another Leave
                  </Button>
                </Card.Body>
              </Card>
              <Button variant="primary" onClick={handleAddEmployeeLeaves}>
                Add Employee Leave Record
              </Button>
            </Card.Body>
          </Card>
        </Tab>
        {/* TAB 2: Update Employee Leaves */}
        <Tab eventKey="update" title="Update Employee Leaves">
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
          <Card style={{ maxWidth: "600px", margin: "auto" }}>
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
                {/* Multiple leave date records for update tab */}
                <Card className="mb-3">
                  <Card.Body>
                    <Card.Title>Leave Date Records</Card.Title>
                    {updateLeaveRecords.map((record, index) => (
                      <Row key={index} className="mb-2">
                        <Col>
                          <Form.Group>
                            <Form.Label>Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={record.leaveDate}
                              onChange={(e) =>
                                handleUpdateLeaveRecordChange(
                                  index,
                                  "leaveDate",
                                  e.target.value
                                )
                              }
                            />
                          </Form.Group>
                        </Col>
                        <Col>
                          <Form.Group>
                            <Form.Label>Type</Form.Label>
                            <Form.Control
                              as="select"
                              value={record.leaveType}
                              onChange={(e) =>
                                handleUpdateLeaveRecordChange(
                                  index,
                                  "leaveType",
                                  e.target.value
                                )
                              }
                            >
                              <option value="Planned">Planned</option>
                              <option value="Unplanned">Unplanned</option>
                            </Form.Control>
                          </Form.Group>
                        </Col>
                      </Row>
                    ))}
                    <Button variant="secondary" onClick={addUpdateLeaveRecord}>
                      Add Another Leave
                    </Button>
                  </Card.Body>
                </Card>
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
