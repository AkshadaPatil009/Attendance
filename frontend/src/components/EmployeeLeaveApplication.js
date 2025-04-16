// EmployeeLeaveApplication.js
import React, { useEffect, useState } from "react";
import { Card, Form, Row, Col, Button, Modal } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeLeaveApplication = ({ storedUser }) => {
  const employeeId = storedUser?.employeeId;

  const [employeeLeaves, setEmployeeLeaves] = useState({
    unplannedLeave: "",
    plannedLeave: "",
    remainingUnplannedLeave: "",
    remainingPlannedLeave: "",
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    to: "",
    cc: "",
    subject: "",
    body: "",
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      console.error("No employeeId found in localStorage user data.");
      return;
    }
    fetch(`${API_URL}/api/employees-leaves/${employeeId}`)
      .then((response) => {
        if (!response.ok)
          throw new Error("No leave record found or server error.");
        return response.json();
      })
      .then((data) => {
        setEmployeeLeaves({
          unplannedLeave: data.usedUnplannedLeave || 0,
          plannedLeave: data.usedPlannedLeave || 0,
          remainingUnplannedLeave: data.remainingUnplannedLeave || 0,
          remainingPlannedLeave: data.remainingPlannedLeave || 0,
        });
      })
      .catch((error) =>
        console.error("Error fetching employee leaves:", error)
      );
  }, [employeeId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendMail = () => {
    setShowConfirmModal(true);
  };

  const confirmSend = async () => {
    const payload = {
      employee_id: employeeId,
      from_email: storedUser?.email,
      from_name: storedUser?.name || "",
      leave_type: leaveForm.leaveType,
      to_email: leaveForm.to,
      cc_email: leaveForm.cc,
      subject: leaveForm.subject,
      body: leaveForm.body,
    };

    try {
      const response = await fetch(`${API_URL}/api/leave/apply-leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        alert(
          "Leave request sent successfully! Your application ID is: " + result.id
        );
        setLeaveForm({
          leaveType: "",
          to: "",
          cc: "",
          subject: "",
          body: "",
        });
      } else {
        alert("Error: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error sending leave request:", error);
      alert("Failed to connect to server.");
    } finally {
      setShowConfirmModal(false);
    }
  };

  return (
    <Row className="mt-3">
      <Col md={6}>
        <Card className="p-4 shadow-sm">
          <h5>
            <b>Used Leaves</b>
          </h5>
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

          <h5 className="mt-4">
            <b>Remaining Leaves</b>
          </h5>
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

      <Col md={6}>
        <Card className="p-4 shadow-sm">
          <h5>
            <b>Apply for Leave</b>
          </h5>
          <Form>
            <Form.Group className="mb-3 mt-2">
              <Form.Label>Leave Type</Form.Label>
              <Form.Select
                name="leaveType"
                value={leaveForm.leaveType}
                onChange={handleFormChange}
              >
                <option value="">-- Select Leave Type --</option>
                <option value="Planned Leave">Planned Leave</option>
                <option value="Unplanned Leave">Unplanned Leave</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>From</Form.Label>
              <Form.Control
                type="email"
                readOnly
                value={storedUser?.email || ""}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>To</Form.Label>
              <Form.Control
                type="email"
                name="to"
                value={leaveForm.to}
                onChange={handleFormChange}
                placeholder="Enter recipient email"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>CC</Form.Label>
              <Form.Control
                type="text"
                name="cc"
                value={leaveForm.cc}
                onChange={handleFormChange}
                placeholder="Enter CC email addresses, if any"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                name="subject"
                value={leaveForm.subject}
                onChange={handleFormChange}
                placeholder="Enter email subject"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                name="body"
                value={leaveForm.body}
                onChange={handleFormChange}
                rows={4}
                placeholder="Enter email body text"
                required
              />
            </Form.Group>

            <Button variant="primary" onClick={handleSendMail}>
              Send Mail
            </Button>
          </Form>
        </Card>
      </Col>

      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Email Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>From:</strong> {storedUser?.email}
          </p>
          <p>
            <strong>To:</strong> {leaveForm.to}
          </p>
          <p>
            <strong>CC:</strong> {leaveForm.cc}
          </p>
          <p>
            <strong>Subject:</strong> {leaveForm.subject}
          </p>
          <p>
            <strong>Body:</strong>
          </p>
          <div
            className="border rounded p-2 bg-light"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {leaveForm.body}
          </div>
          <hr />
          <p className="text-danger fw-bold">
            Are you sure you want to send this mail?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmSend}>
            Yes, Send
          </Button>
        </Modal.Footer>
      </Modal>
    </Row>
  );
};

export default EmployeeLeaveApplication;
