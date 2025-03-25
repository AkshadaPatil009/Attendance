import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Alert,
  Card,
  Row,
  Col,
  Tabs,
  Tab,
  Modal
} from "react-bootstrap";
import { FaPlus, FaMinus } from "react-icons/fa";

const AdminEmployeeView = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState(null);

  // "Update" states for aggregated leave values
  const [usedUnplannedLeave, setUsedUnplannedLeave] = useState(0);
  const [usedPlannedLeave, setUsedPlannedLeave] = useState(0);
  const [remainingUnplannedLeave, setRemainingUnplannedLeave] = useState(0);
  const [remainingPlannedLeave, setRemainingPlannedLeave] = useState(0);

  // Multiple leave date records for the UPDATE tab only
  const [updateLeaveRecords, setUpdateLeaveRecords] = useState([
    { leaveDate: "", leaveType: "Planned" }
  ]);

  // "Add" states (for adding new aggregate record, WITHOUT multiple date records)
  const [selectedAddEmployeeId, setSelectedAddEmployeeId] = useState("");
  const [allocatedUnplannedLeaveAdd, setAllocatedUnplannedLeaveAdd] = useState(0);
  const [allocatedPlannedLeaveAdd, setAllocatedPlannedLeaveAdd] = useState(0);
  const [usedUnplannedLeaveAdd, setUsedUnplannedLeaveAdd] = useState(0);
  const [usedPlannedLeaveAdd, setUsedPlannedLeaveAdd] = useState(0);
  const [remainingUnplannedLeaveAdd, setRemainingUnplannedLeaveAdd] = useState(0);
  const [remainingPlannedLeaveAdd, setRemainingPlannedLeaveAdd] = useState(0);

  // State for confirmation popup for update and add
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showAddConfirmation, setShowAddConfirmation] = useState(false);

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

  // Sorting employees alphabetically by name
  const sortedEmployees = [...employees].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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

  // Update used unplanned leave and recalculate remaining leave with negative value validation
  const handleUsedUnplannedChange = (e) => {
    let value = parseInt(e.target.value, 10) || 0;
    if (value < 0) {
      setMessage("Negative values are not allowed for Used Unplanned Leave.");
      value = 0;
    } else {
      setMessage(null);
    }
    setUsedUnplannedLeave(value);
    const employee = employees.find(
      (emp) => emp.id.toString() === selectedEmployeeId.toString()
    );
    if (employee) {
      const allocated = employee.allocatedUnplannedLeave || 0;
      setRemainingUnplannedLeave(allocated - value);
    }
  };

  // Update used planned leave and recalculate remaining leave with negative value validation
  const handleUsedPlannedChange = (e) => {
    let value = parseInt(e.target.value, 10) || 0;
    if (value < 0) {
      setMessage("Negative values are not allowed for Used Planned Leave.");
      value = 0;
    } else {
      setMessage(null);
    }
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
    setUpdateLeaveRecords((prev) => [
      ...prev,
      { leaveDate: "", leaveType: "Planned" }
    ]);
  };

  // Remove a leave record from update tab (if more than one exists)
  const removeUpdateLeaveRecord = (index) => {
    if (updateLeaveRecords.length > 1) {
      const updatedRecords = updateLeaveRecords.filter((_, i) => i !== index);
      setUpdateLeaveRecords(updatedRecords);
    }
  };

  // Update employee leaves (aggregate update + multiple leave date records)
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
        if (!response.ok) {
          throw new Error("Error: Failed to update employee leaves.");
        }
        // Optionally sync local state
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
      })
      .then((responses) => {
        if (responses.every((res) => res.ok)) {
          setMessage("Employee leaves updated successfully.");
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

  // "Add" tab handlers (without multiple date records)
  const handleAddEmployeeChange = (e) => {
    setSelectedAddEmployeeId(e.target.value);
  };

  const handleAddEmployeeLeaves = () => {
    setMessage(null);
    // Only add the employee's aggregate record
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
        if (!response.ok) {
          throw new Error("Error: Failed to add employee leave record.");
        }
        setMessage("Employee leave record added successfully.");
      })
      .catch((error) => {
        console.error("Error adding employee leave record:", error);
        setMessage("Error: Could not add employee leave record.");
      });
  };

  // Handler to open confirmation popup for updating employee leaves
  const handleUpdateConfirmation = () => {
    setShowUpdateConfirmation(true);
  };

  // Handler when update confirmation is accepted
  const handleConfirmUpdate = () => {
    setShowUpdateConfirmation(false);
    updateEmployeeLeaves();
  };

  // Handler when update confirmation is canceled
  const handleCancelUpdate = () => {
    setShowUpdateConfirmation(false);
  };

  // Handler to open confirmation popup for adding employee leave record
  const handleAddConfirmation = () => {
    setShowAddConfirmation(true);
  };

  // Handler when add confirmation is accepted
  const handleConfirmAdd = () => {
    setShowAddConfirmation(false);
    handleAddEmployeeLeaves();
  };

  // Handler when add confirmation is canceled
  const handleCancelAdd = () => {
    setShowAddConfirmation(false);
  };

  return (
    <div className="container-fluid mt-4">
      {message && <Alert variant="info">{message}</Alert>}
      <Tabs defaultActiveKey="update" id="employee-leave-tabs" className="mb-3" fill>
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
                  {sortedEmployees.map((emp) => (
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
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10) || 0;
                        if (val < 0) {
                          setMessage("Negative values are not allowed for Allocated Unplanned Leave.");
                          val = 0;
                        } else {
                          setMessage(null);
                        }
                        setAllocatedUnplannedLeaveAdd(val);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Allocated Planned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={allocatedPlannedLeaveAdd}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10) || 0;
                        if (val < 0) {
                          setMessage("Negative values are not allowed for Allocated Planned Leave.");
                          val = 0;
                        } else {
                          setMessage(null);
                        }
                        setAllocatedPlannedLeaveAdd(val);
                      }}
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
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10) || 0;
                        if (val < 0) {
                          setMessage("Negative values are not allowed for Used Unplanned Leave.");
                          val = 0;
                        } else {
                          setMessage(null);
                        }
                        setUsedUnplannedLeaveAdd(val);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Used Planned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={usedPlannedLeaveAdd}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10) || 0;
                        if (val < 0) {
                          setMessage("Negative values are not allowed for Used Planned Leave.");
                          val = 0;
                        } else {
                          setMessage(null);
                        }
                        setUsedPlannedLeaveAdd(val);
                      }}
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
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10) || 0;
                        if (val < 0) {
                          setMessage("Negative values are not allowed for Remaining Unplanned Leave.");
                          val = 0;
                        } else {
                          setMessage(null);
                        }
                        setRemainingUnplannedLeaveAdd(val);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Remaining Planned Leave</Form.Label>
                    <Form.Control
                      type="number"
                      value={remainingPlannedLeaveAdd}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10) || 0;
                        if (val < 0) {
                          setMessage("Negative values are not allowed for Remaining Planned Leave.");
                          val = 0;
                        } else {
                          setMessage(null);
                        }
                        setRemainingPlannedLeaveAdd(val);
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* No Leave Date Records section in Add tab */}
              <Button variant="primary" onClick={handleAddConfirmation} className="w-100">
                Add Employee Leave Record
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        {/* TAB 2: Update Employee Leaves */}
        <Tab eventKey="update" title="Update Employee Leaves">
          <Card style={{ maxWidth: "600px", margin: "auto" }}>
            <Card.Body>
              <Card.Title>Update Employee Leave Details</Card.Title>
              {/* Moved Select Employee dropdown inside the card */}
              <Form.Group className="mb-3">
                <Form.Label>
                  <b>Select Employee (Update Record)</b>
                </Form.Label>
                <Form.Control
                  as="select"
                  value={selectedEmployeeId}
                  onChange={handleEmployeeChange}
                >
                  {sortedEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
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

                {/* Multiple leave date records for Update tab with plus and minus icons */}
                <Card className="mb-3">
                  <Card.Body>
                    <Card.Title>Leave Date Records</Card.Title>
                    {updateLeaveRecords.map((record, index) => (
                      <Row key={index} className="mb-2 align-items-center">
                        <Col xs={5}>
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
                        <Col xs={5}>
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
                        <Col xs={2} className="text-center">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeUpdateLeaveRecord(index)}
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
                        <Button
                          variant="success"
                          onClick={addUpdateLeaveRecord}
                          size="sm"
                        >
                          <FaPlus /> Add
                        </Button>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Button variant="primary" onClick={handleUpdateConfirmation} className="w-100">
                  Update Employee Leaves
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Update Confirmation Modal */}
      <Modal show={showUpdateConfirmation} onHide={handleCancelUpdate}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to update the employee leaves?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelUpdate}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmUpdate}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Confirmation Modal */}
      <Modal show={showAddConfirmation} onHide={handleCancelAdd}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Add</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to add the new employee leave record?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelAdd}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmAdd}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminEmployeeView;
