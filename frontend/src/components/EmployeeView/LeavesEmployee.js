// EmployeeLeaveApplication.js
import React, { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Form, Table, Spinner } from "react-bootstrap";
import io from "socket.io-client";
import "./EmployeeLeaveApplication.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeLeaveApplication = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeId = storedUser.employeeId;
  const socketRef = useRef(null);

  const [escalatedEmployees, setEscalatedEmployees] = useState([]);
  const [selectedEscalationId, setSelectedEscalationId] = useState(employeeId);
  const [employeeLeaves, setEmployeeLeaves] = useState({
    unplannedLeave: 0,
    plannedLeave: 0,
    remainingUnplannedLeave: 0,
    remainingPlannedLeave: 0,
    pendingComoff: 0,
    completedComoff: 0,
  });
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    socketRef.current = io(API_URL, { transports: ["polling"] });
    socketRef.current.emit("join", { userId: storedUser.id });
    return () => socketRef.current.disconnect();
  }, [storedUser.id]);

  useEffect(() => {
    if (!employeeId) return;
    fetch(`${API_URL}/api/escalated-employees?empId=${employeeId}`)
      .then((res) => res.json())
      .then((data) => {
        setEscalatedEmployees(data);
        setSelectedEscalationId(employeeId);
      })
      .catch((err) => {
        console.error("Error loading escalations:", err);
        setEscalatedEmployees([{ id: employeeId, name: storedUser.name }]);
      });
  }, [employeeId]);

  useEffect(() => {
    if (!selectedEscalationId) return;
    fetch(`${API_URL}/api/employees-leaves/${selectedEscalationId}`)
      .then((res) => res.json())
      .then((data) =>
        setEmployeeLeaves((prev) => ({
          ...prev,
          unplannedLeave: data.usedUnplannedLeave || 0,
          plannedLeave: data.usedPlannedLeave || 0,
          remainingUnplannedLeave: data.remainingUnplannedLeave || 0,
          remainingPlannedLeave: data.remainingPlannedLeave || 0,
        }))
      )
      .catch((err) => console.error("Error fetching leaves:", err));
  }, [selectedEscalationId]);

  // NEW: Fetch compoff counts from dedicated API
  useEffect(() => {
    if (!selectedEscalationId) return;
    fetch(`${API_URL}/api/employees-comoff/${selectedEscalationId}`)
      .then((res) => res.json())
      .then((data) => {
        setEmployeeLeaves((prev) => ({
          ...prev,
          pendingComoff: data.pendingComoff || 0,
          completedComoff: data.completedComoff || 0,
        }));
      })
      .catch((err) => {
        console.error("Error fetching compoff counts:", err);
        setEmployeeLeaves((prev) => ({
          ...prev,
          pendingComoff: 0,
          completedComoff: 0,
        }));
      });
  }, [selectedEscalationId]);

  useEffect(() => {
    if (!selectedEscalationId) return;
    setLoadingRecords(true);
    fetch(`${API_URL}/api/employees-comoff/${selectedEscalationId}`)
      .then((res) => res.json())
      .then((data) => setLeaveRecords(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching leave records:", err);
        setLeaveRecords([]);
      })
      .finally(() => setLoadingRecords(false));
  }, [selectedEscalationId]);

  return (
    <div className="leave-application-container">
      <Row className="mt-3 gx-4">
        <Col lg={6} className="mb-3">
          <Form.Group controlId="escalate-to">
            <Form.Label>View Records For:</Form.Label>
            <Form.Select
              value={selectedEscalationId}
              onChange={(e) => setSelectedEscalationId(Number(e.target.value))}
            >
              {escalatedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.id === employeeId ? "(You)" : ""}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row className="gx-4">
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm leave-card">
            <Card.Header className="leave-card-header">
              <h5>Leave Balances</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="balances-section">
                    <h6>Used</h6>
                    <Form.Group controlId="used-unplanned" className="mb-2">
                      <Form.Label>Unplanned</Form.Label>
                      <Form.Control
                        readOnly
                        value={employeeLeaves.unplannedLeave}
                      />
                    </Form.Group>
                    <Form.Group controlId="used-planned" className="mb-3">
                      <Form.Label>Planned</Form.Label>
                      <Form.Control
                        readOnly
                        value={employeeLeaves.plannedLeave}
                      />
                    </Form.Group>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="balances-section">
                    <h6>Remaining</h6>
                    <Form.Group controlId="remaining-unplanned" className="mb-2">
                      <Form.Label>Unplanned</Form.Label>
                      <Form.Control
                        readOnly
                        value={employeeLeaves.remainingUnplannedLeave}
                      />
                    </Form.Group>
                    <Form.Group controlId="remaining-planned">
                      <Form.Label>Planned</Form.Label>
                      <Form.Control
                        readOnly
                        value={employeeLeaves.remainingPlannedLeave}
                      />
                    </Form.Group>
                  </div>
                </Col>
              </Row>

              <hr className="my-3" />
              <Row>
                <Col md={6}>
                  <Form.Group controlId="pending-comoff">
                    <Form.Label>Approved Comoff</Form.Label>
                    <Form.Control
                      readOnly
                      value={employeeLeaves.pendingComoff}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="completed-comoff">
                    <Form.Label>Used Comoff</Form.Label>
                    <Form.Control
                      readOnly
                      value={employeeLeaves.completedComoff}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm leave-card">
            <Card.Header className="leave-card-header">
              <h5>
                Leave Records —{" "}
                {escalatedEmployees.find(
                  (e) => e.id === selectedEscalationId
                )?.name}
              </h5>
            </Card.Header>
            <Card.Body className="record-table-container">
              {loadingRecords ? (
                <div className="text-center my-3">
                  <Spinner animation="border" variant="secondary" />
                </div>
              ) : (
                <Table bordered hover size="sm" className="leave-records-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRecords.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center">
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      leaveRecords.map((rec) => (
                        <tr key={rec.id}>
                          <td>{rec.leave_date}</td>
                          <td>{rec.leave_type}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeLeaveApplication;
