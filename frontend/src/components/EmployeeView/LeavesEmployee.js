import React, { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Form, Table, Spinner } from "react-bootstrap";
import io from "socket.io-client";
import "./EmployeeLeaveApplication.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeLeaveApplication = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeId = storedUser.employeeId;
  const socketRef = useRef(null);

  // ─── STATE ──────────────────────────────────────────────────────────────
  const [escalatedEmployees, setEscalatedEmployees] = useState([]);
  const [selectedEscalationId, setSelectedEscalationId] = useState(employeeId);
  const [employeeLeaves, setEmployeeLeaves] = useState({
    unplannedLeave: 0,
    plannedLeave: 0,
    remainingUnplannedLeave: 0,
    remainingPlannedLeave: 0,
  });
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // ─── SOCKET.IO JOIN ─────────────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io(API_URL, { transports: ["polling"] });
    socketRef.current.emit("join", { userId: storedUser.id });
    return () => socketRef.current.disconnect();
  }, [storedUser.id]);

  // ─── FETCH ESCALATABLE LIST ─────────────────────────────────────────────
  useEffect(() => {
    if (!employeeId) return;
    fetch(`${API_URL}/api/escalated-employees?empId=${employeeId}`)
      .then(res => res.json())
      .then(data => {
        setEscalatedEmployees(data);
        setSelectedEscalationId(employeeId);
      })
      .catch(err => {
        console.error("Error loading escalations:", err);
        setEscalatedEmployees([{ id: employeeId, name: storedUser.name }]);
      });
  }, [employeeId]);

  // ─── FETCH LEAVE BALANCES ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEscalationId) return;
    fetch(`${API_URL}/api/employees-leaves/${selectedEscalationId}`)
      .then(res => res.json())
      .then(data =>
        setEmployeeLeaves({
          unplannedLeave: data.usedUnplannedLeave || 0,
          plannedLeave: data.usedPlannedLeave || 0,
          remainingUnplannedLeave: data.remainingUnplannedLeave || 0,
          remainingPlannedLeave: data.remainingPlannedLeave || 0,
        })
      )
      .catch(err => console.error("Error fetching leaves:", err));
  }, [selectedEscalationId]);

  // ─── FETCH DETAILED LEAVE RECORDS ──────────────────────────────────────
  useEffect(() => {
    if (!selectedEscalationId) return;
    setLoadingRecords(true);
    fetch(`${API_URL}/api/employeeleavesdate?employeeId=${selectedEscalationId}`)
      .then(res => res.json())
      .then(data => setLeaveRecords(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("Error fetching leave records:", err);
        setLeaveRecords([]);
      })
      .finally(() => setLoadingRecords(false));
  }, [selectedEscalationId]);

  return (
    <div className="leave-application-container">
      {/* ── TOP ROW: Dropdown ─────────────────────────────────────────────── */}
      <Row className="mt-3 gx-4">
        <Col lg={6} className="mb-3">
          <Form.Group controlId="escalate-to">
            <Form.Label>View Records For:</Form.Label>
            <Form.Select
              value={selectedEscalationId}
              onChange={e => setSelectedEscalationId(Number(e.target.value))}
            >
              {escalatedEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.id === employeeId ? "(You)" : ""}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* ── SECOND ROW: Balances & Records ───────────────────────────────── */}
      <Row className="gx-4">
        {/* Leave Balances */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm leave-card">
            <Card.Header className="leave-card-header">
              <h5>Leave Balances</h5>
            </Card.Header>
            <Card.Body>
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

                <h6 className="mt-4">Remaining</h6>
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
            </Card.Body>
          </Card>
        </Col>

        {/* Leave Records (horizontal) */}
        <Col lg={6}>
          <Card className="shadow-sm leave-card">
            <Card.Header className="leave-card-header">
              <h5>
                Leave Records —{" "}
                {escalatedEmployees.find(e => e.id === selectedEscalationId)?.name}
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
                      leaveRecords.map(rec => (
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
