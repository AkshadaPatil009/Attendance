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
  const [templates, setTemplates] = useState([]);

  // ── Fetch templates from backend ──
  useEffect(() => {
    fetch(`${API_URL}/api/subject-templates`)
      .then((res) => res.json())
      .then(setTemplates)
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // ── Fetch leave balance ──
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
      .catch((err) =>
        console.error("Error fetching employee leaves:", err)
      );
  }, [employeeId]);

  // ── When subject changes, check if it matches a template ──
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "subject") {
        const match = templates.find(
          (t) => t.subject.toLowerCase() === value.toLowerCase()
        );
        if (match) {
          updated.body = match.body;
        }
      }

      return updated;
    });
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
      const res = await fetch(`${API_URL}/api/send-leave-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to send email");

      alert("Leave email sent successfully!");
      setLeaveForm({
        leaveType: "",
        to: "",
        cc: "",
        subject: "",
        body: "",
      });
    } catch (err) {
      console.error("Send error:", err);
      alert("Error sending leave email.");
    } finally {
      setShowConfirmModal(false);
    }
  };

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

      <Col md={6}>
        <Card className="p-4 shadow-sm">
          <h5><b>Apply for Leave</b></h5>
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
                list="subjectList"
                name="subject"
                value={leaveForm.subject}
                onChange={handleFormChange}
                placeholder="Choose or type subject"
                required
              />
              <datalist id="subjectList">
                {templates.map((tpl, i) => (
                  <option key={i} value={tpl.subject} />
                ))}
              </datalist>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                name="body"
                value={leaveForm.body}
                onChange={handleFormChange}
                rows={5}
                placeholder="Email body will appear here"
                required
              />
            </Form.Group>

            <Button variant="primary" onClick={handleSendMail}>
              Send Mail
            </Button>
          </Form>
        </Card>
      </Col>

      {/* Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Email Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>To:</strong> {leaveForm.to}</p>
          <p><strong>CC:</strong> {leaveForm.cc}</p>
          <p><strong>Subject:</strong> {leaveForm.subject}</p>
          <p><strong>Body:</strong></p>
          <div className="border rounded p-2 bg-light" style={{ whiteSpace: "pre-wrap" }}>
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
