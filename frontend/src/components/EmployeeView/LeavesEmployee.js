import React, { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Form, Table, Spinner } from "react-bootstrap";
import io from "socket.io-client";
import "./EmployeeLeaveApplication.css";    // ← import the new stylesheet

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeLeaveApplication = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeId = storedUser.employeeId;
  const socketRef = useRef(null);

  const [employeeLeaves, setEmployeeLeaves] = useState({
    unplannedLeave: 0,
    plannedLeave: 0,
    remainingUnplannedLeave: 0,
    remainingPlannedLeave: 0,
  });
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // socket init & join
  useEffect(() => {
    socketRef.current = io(API_URL, { transports: ["polling"] });
    socketRef.current.emit("join", { userId: storedUser.id });
    return () => socketRef.current.disconnect();
  }, [storedUser.id]);

  // fetch leave balances
  useEffect(() => {
    if (!employeeId) return;
    fetch(`${API_URL}/api/employees-leaves/${employeeId}`)
      .then((res) => res.json())
      .then((data) =>
        setEmployeeLeaves({
          unplannedLeave: data.usedUnplannedLeave || 0,
          plannedLeave: data.usedPlannedLeave || 0,
          remainingUnplannedLeave: data.remainingUnplannedLeave || 0,
          remainingPlannedLeave: data.remainingPlannedLeave || 0,
        })
      )
      .catch((err) => console.error("Error fetching employee leaves:", err));
  }, [employeeId]);

  // fetch detailed leave records
  useEffect(() => {
    if (!employeeId) return;
    setLoadingRecords(true);
    fetch(`${API_URL}/api/employeeleavesdate/${employeeId}`)
      .then((res) => res.json())
      .then((data) => {
        setLeaveRecords(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error fetching detailed leave records:", err);
        setLeaveRecords([]);
      })
      .finally(() => setLoadingRecords(false));
  }, [employeeId]);

  return (
    <div className="leave-application-container">
      <Row className="mt-3 gx-4">
        {/* Used / Remaining Leaves */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm leave-card">
            <Card.Header className="leave-card-header">
              <h5>Leave Balances</h5>
            </Card.Header>
            <Card.Body>
              <div className="balances-section">
                <h6>Used</h6>
                <Form.Group className="mb-2">
                  <Form.Label>Unplanned</Form.Label>
                  <Form.Control
                    readOnly
                    value={employeeLeaves.unplannedLeave}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Planned</Form.Label>
                  <Form.Control
                    readOnly
                    value={employeeLeaves.plannedLeave}
                  />
                </Form.Group>

                <h6 className="mt-4">Remaining</h6>
                <Form.Group className="mb-2">
                  <Form.Label>Unplanned</Form.Label>
                  <Form.Control
                    readOnly
                    value={employeeLeaves.remainingUnplannedLeave}
                  />
                </Form.Group>
                <Form.Group>
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

        {/* Detailed Leave Records */}
        <Col lg={6}>
          <Card className="shadow-sm leave-card">
            <Card.Header className="leave-card-header">
              <h5>Leave Records</h5>
            </Card.Header>
            <Card.Body className="record-table-container">
              {loadingRecords ? (
                <div className="text-center my-3">
                  <Spinner animation="border" variant="secondary" />
                </div>
              ) : (
                <Table
                  bordered
                  hover
                  size="sm"
                  className="leave-records-table"
                >
                  <thead>
                    <tr>
                      <th>Leave Date</th>
                      <th>Leave Type</th>
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
