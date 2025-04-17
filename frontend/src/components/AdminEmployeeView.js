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
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
// initialize socket connection
const socket = io(API_URL);

const AdminEmployeeView = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState(null);

  // leave balances
  const [remainingUnplannedLeave, setRemainingUnplannedLeave] = useState(0);
  const [remainingPlannedLeave, setRemainingPlannedLeave] = useState(0);

  // update form rows
  const [updateLeaveRecords, setUpdateLeaveRecords] = useState([
    { leaveDate: "", leaveType: "Planned" }
  ]);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);

  // add‑new form
  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [addAllocatedPlanned, setAddAllocatedPlanned] = useState(0);
  const [addAllocatedUnplanned, setAddAllocatedUnplanned] = useState(0);

  // fetch employees on mount + setup socket listeners
  useEffect(() => {
    const fetchEmployees = () => {
      fetch(`${API_URL}/api/employees-list`)
        .then((res) => res.json())
        .then((data) => {
          setEmployees(data);
          if (data.length) {
            const first = data[0];
            setSelectedEmployeeId(first.id);
            setAddEmployeeId(first.id);
            populateLeaveFields(first);
          }
        })
        .catch((err) => {
          console.error(err);
          setMessage("Error fetching employee list.");
        });
    };
    fetchEmployees();

    // listen for real‑time updates
    socket.on("employeesListUpdated", (updatedList) => {
      setEmployees(updatedList);
      const emp = updatedList.find(e => e.id.toString() === selectedEmployeeId.toString());
      if (emp) populateLeaveFields(emp);
    });

    socket.on("employeeLeavesUpdated", ({ employeeId, remainingPlanned, remainingUnplanned }) => {
      setEmployees(prev =>
        prev.map(x =>
          x.id.toString() === employeeId.toString()
            ? { ...x,
                remainingPlannedLeave: remainingPlanned,
                remainingUnplannedLeave: remainingUnplanned }
            : x
        )
      );
      if (employeeId.toString() === selectedEmployeeId.toString()) {
        setRemainingPlannedLeave(remainingPlanned);
        setRemainingUnplannedLeave(remainingUnplanned);
      }
    });

    return () => {
      socket.off("employeesListUpdated");
      socket.off("employeeLeavesUpdated");
    };
  }, [selectedEmployeeId]);

  const populateLeaveFields = (emp) => {
    setRemainingUnplannedLeave(emp.remainingUnplannedLeave || 0);
    setRemainingPlannedLeave(emp.remainingPlannedLeave || 0);
  };

  const sortedEmployees = [...employees].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleEmployeeChange = (e) => {
    setMessage(null);
    const id = e.target.value;
    setSelectedEmployeeId(id);
    const emp = employees.find((x) => x.id.toString() === id.toString());
    if (emp) populateLeaveFields(emp);
  };

  const handleUpdateLeaveRecordChange = (i, field, val) => {
    setUpdateLeaveRecords((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))
    );
  };
  const addUpdateLeaveRecord = () =>
    setUpdateLeaveRecords((prev) => [
      ...prev,
      { leaveDate: "", leaveType: "Planned" }
    ]);
  const removeUpdateLeaveRecord = (i) => {
    if (updateLeaveRecords.length > 1)
      setUpdateLeaveRecords((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateEmployeeLeaves = () => {
    setMessage(null);
    const emp = employees.find((x) => x.id.toString() === selectedEmployeeId);
    if (!emp) {
      setMessage("Selected employee not found.");
      return;
    }

    const currRemUnplanned = emp.remainingUnplannedLeave || 0;
    const currRemPlanned = emp.remainingPlannedLeave || 0;

    const addPlanned = updateLeaveRecords.filter(
      (r) => r.leaveType === "Planned" && r.leaveDate
    ).length;
    const addUnplanned = updateLeaveRecords.filter(
      (r) => r.leaveType === "Unplanned" && r.leaveDate
    ).length;

    const newUsedPlanned = (emp.usedPlannedLeave || 0) + addPlanned;
    const newUsedUnplanned = (emp.usedUnplannedLeave || 0) + addUnplanned;
    const newRemPlanned = currRemPlanned - addPlanned;
    const newRemUnplanned = currRemUnplanned - addUnplanned;

    if (newRemPlanned < 0 || newRemUnplanned < 0) {
      return window.alert("Insufficient leave balance.");
    }

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
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update aggregates");

        // emit real‑time update
        socket.emit("employeeLeavesUpdated", {
          employeeId: selectedEmployeeId,
          remainingPlanned: newRemPlanned,
          remainingUnplanned: newRemUnplanned
        });

        setEmployees((prev) =>
          prev.map((x) =>
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
        setRemainingUnplannedLeave(newRemUnplanned);
        setRemainingPlannedLeave(newRemPlanned);
        return Promise.all(
          updateLeaveRecords.map((r) =>
            fetch(`${API_URL}/api/employee-leaves-date`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employeeId: selectedEmployeeId,
                leave_date: r.leaveDate,
                leave_type: r.leaveType
              })
            })
          )
        );
      })
      .then((responses) => {
        if (responses.every((r) => r.ok)) {
          setMessage("Employee leaves updated successfully.");
          setUpdateLeaveRecords([{ leaveDate: "", leaveType: "Planned" }]);
        } else {
          setMessage("Error adding one or more leave‑date records.");
        }
      })
      .catch((err) => {
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
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (ok) {
          setMessage(body.message || "Leave record added.");
          setJoinDate("");
          setAddAllocatedPlanned(0);
          setAddAllocatedUnplanned(0);

          // emit real‑time notification
          socket.emit("newEmployeeLeave", { employeeId: addEmployeeId });

          // refetch employees
          const fetchEmployees = () => {
            fetch(`${API_URL}/api/employees-list`)
              .then((res) => res.json())
              .then((data) => {
                setEmployees(data);
                if (data.length) {
                  const first = data.find(e => e.id === addEmployeeId) || data[0];
                  setSelectedEmployeeId(first.id);
                  populateLeaveFields(first);
                }
              });
          };
          fetchEmployees();
        } else {
          setMessage(body.error || "Error adding leave record.");
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage("Error: Could not add leave record.");
      });
  };

  return (
    <div className="container-fluid mt-4">
      {message && <Alert variant="info">{message}</Alert>}
      <Tabs defaultActiveKey="update" id="employee-leave-tabs" className="mb-3" fill>
        {/* UPDATE TAB */}
        <Tab eventKey="update" title="Update Employee Leaves">
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
                    <Form.Label>Remaining Unplanned Leave</Form.Label>
                    <Form.Control type="number" value={remainingUnplannedLeave} readOnly />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Remaining Planned Leave</Form.Label>
                    <Form.Control type="number" value={remainingPlannedLeave} readOnly />
                  </Form.Group>
                </Col>
              </Row>
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>Leave Date Records</Card.Title>
                  {updateLeaveRecords.map((r, i) => (
                    <Row key={i} className="mb-2 align-items-center">
                      <Col xs={5}>
                        <Form.Group>
                          <Form.Label>Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={r.leaveDate}
                            onChange={(e) =>
                              handleUpdateLeaveRecordChange(i, "leaveDate", e.target.value)
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={5}>
                        <Form.Group>
                          <Form.Label>Type</Form.Label>
                          <Form.Control
                            as="select"
                            value={r.leaveType}
                            onChange={(e) =>
                              handleUpdateLeaveRecordChange(i, "leaveType", e.target.value)
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
        </Tab>

        {/* ADD NEW TAB */}
        <Tab eventKey="add" title="Add New Employee Leave">
          <Card style={{ maxWidth: "600px", margin: "auto" }}>
            <Card.Body>
              <Card.Title>Add Leave Record for Mid‑Year Joiner</Card.Title>
              <Form.Group className="mb-3">
                <Form.Label><b>Select Employee</b></Form.Label>
                <Form.Control
                  as="select"
                  value={addEmployeeId}
                  onChange={(e) => setAddEmployeeId(e.target.value)}
                >
                  {sortedEmployees.map((emp) => (
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
                  onChange={(e) => setJoinDate(e.target.value)}
                />
              </Form.Group>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Allocated Unplanned Leave (Full Year)</Form.Label>
                    <Form.Control
                      type="number"
                      value={addAllocatedUnplanned}
                      onChange={(e) => setAddAllocatedUnplanned(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Allocated Planned Leave (Full Year)</Form.Label>
                    <Form.Control
                      type="number"
                      value={addAllocatedPlanned}
                      onChange={(e) => setAddAllocatedPlanned(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button variant="success" onClick={addEmployeeLeave} className="w-100">
                Add Leave Record
              </Button>
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
    </div>
  );
};

export default AdminEmployeeView;
