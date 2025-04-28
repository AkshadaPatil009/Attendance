import React, { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Form } from "react-bootstrap";
import io from "socket.io-client";


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

  return (
    <Row className="mt-3">
      <Col md={6}>
        <Card className="p-4 shadow-sm">
          <h5><b>Used Leaves</b></h5>
          <Form.Group className="mb-3">
            <Form.Label>Unplanned Leave</Form.Label>
            <Form.Control
              type="text"
              value={employeeLeaves.unplannedLeave}
              readOnly
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Planned Leave</Form.Label>
            <Form.Control
              type="text"
              value={employeeLeaves.plannedLeave}
              readOnly
            />
          </Form.Group>

          <h5 className="mt-4"><b>Remaining Leaves</b></h5>
          <Form.Group className="mb-3">
            <Form.Label>Unplanned Leave</Form.Label>
            <Form.Control
              type="text"
              value={employeeLeaves.remainingUnplannedLeave}
              readOnly
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Planned Leave</Form.Label>
            <Form.Control
              type="text"
              value={employeeLeaves.remainingPlannedLeave}
              readOnly
            />
          </Form.Group>
        </Card>
      </Col>

      
    </Row>
  );
};

export default EmployeeLeaveApplication;
