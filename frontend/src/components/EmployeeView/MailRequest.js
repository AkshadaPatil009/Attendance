import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Button,
  Modal,
  Badge,
  InputGroup,
  Row,
  Col,
  Table,
  Spinner,
  Alert,
  Pagination,
  Toast,
  ToastContainer,
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const MailRequest = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeId = storedUser.employeeId;

  const [templates, setTemplates] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    to: "",
    ccList: [
      "tushar.mahadik@protovec.com",
      "kalpesh.urunkar@protovec.com",
    ],
    subject: "",
    body: "",
  });
  const [newCc, setNewCc] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validated, setValidated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [usingCustomSubject, setUsingCustomSubject] = useState(false);
  const [selectedTemplateSubject, setSelectedTemplateSubject] = useState("");

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariantState, setToastVariantState] = useState("success");

  // — My Requests state & pagination —
  const [myReqs, setMyReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [errorReqs, setErrorReqs] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  // fetch subject templates
  useEffect(() => {
    fetch(`${API_URL}/api/subject-templates`)
      .then((res) => res.json())
      .then(setTemplates)
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // fetch this employee’s past requests
  const loadMyRequests = () => {
    setLoadingReqs(true);
    setErrorReqs("");
    fetch(`${API_URL}/api/my-requests?employee_id=${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => {
        setMyReqs(data);
        setCurrentPage(1); // reset to first page on reload
      })
      .catch((err) => {
        console.error("Error fetching my-requests:", err);
        setErrorReqs("Could not load your requests");
      })
      .finally(() => setLoadingReqs(false));
  };
  useEffect(() => {
    if (employeeId) loadMyRequests();
  }, [employeeId]);

  // pagination helpers
  const totalPages = Math.ceil(myReqs.length / itemsPerPage);
  const paginatedReqs = myReqs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handlePageChange = (page) => setCurrentPage(page);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => {
      const updated = { ...prev };
      if (name === "body") {
        const wordCount = value.trim().split(/\s+/).length;
        if (wordCount > 500) return prev;
        updated.body = value;
      } else {
        updated[name] = value;
        if (name === "subject") {
          const match = templates.find(
            (t) => t.subject.toLowerCase() === value.toLowerCase()
          );
          if (match) updated.body = match.body;
        }
      }
      return updated;
    });
  };

  const handleTemplateSelect = (e) => {
    const subj = e.target.value;
    setSelectedTemplateSubject(subj);
    if (subj === "__custom") {
      setUsingCustomSubject(true);
      setLeaveForm((prev) => ({ ...prev, subject: "" }));
    } else {
      setUsingCustomSubject(false);
      setLeaveForm((prev) => {
        const match = templates.find((t) => t.subject === subj);
        return {
          ...prev,
          subject: subj,
          body: match ? match.body : prev.body,
        };
      });
    }
  };

  const handleAddCc = (e) => {
    e.preventDefault();
    const email = newCc.trim();
    if (
      email &&
      !leaveForm.ccList.includes(email) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setLeaveForm((prev) => ({
        ...prev,
        ccList: [...prev.ccList, email],
      }));
    }
    setNewCc("");
  };
  const handleRemoveCc = (email) => {
    setLeaveForm((prev) => ({
      ...prev,
      ccList: prev.ccList.filter((c) => c !== email),
    }));
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
    } else {
      setValidated(false);
      setShowConfirmModal(true);
    }
  };
  const confirmSend = async () => {
    if (isSending) return;
    setIsSending(true);
    const payload = {
      employee_id: employeeId,
      from_email: storedUser.email,
      from_name: storedUser.name || "",
      leave_type: leaveForm.leaveType,
      to_email: leaveForm.to,
      cc_email: leaveForm.ccList.join(","),
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

      // show success toast
      setToastVariantState("success");
      setToastMsg("Email sent successfully!");
      setShowToast(true);

      setLeaveForm({
        leaveType: "",
        to: "",
        ccList: [],
        subject: "",
        body: "",
      });
      loadMyRequests(); // refresh list
    } catch (err) {
      console.error("Send error:", err);

      // show error toast
      setToastVariantState("danger");
      setToastMsg("Error sending leave email.");
      setShowToast(true);
    } finally {
      setIsSending(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      <Row className="g-4">
        {/* Left: Apply for Leave */}
        <Col md={6}>
          <Card className="p-4 shadow-sm">
            <h5><b>Apply for Leave</b></h5>
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              {/* ... your existing leave form fields ... */}
              <Form.Group className="mb-3 mt-2">
                <Form.Label>Leave Type</Form.Label>
                <Form.Select
                  name="leaveType"
                  value={leaveForm.leaveType}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">-- Select Leave Type --</option>
                  <option value="Attendance CI/CO Correction">Attendance CI/CO Correction</option>
                  <option value="Planned Leave">Planned Leave</option>
                  <option value="Unplanned Leave">Unplanned Leave</option>
                  <option value="Work From Home Request">Work From Home Request</option>
                  <option value="Compup">Compup</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  Please select a leave type.
                </Form.Control.Feedback>
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
                <Form.Control.Feedback type="invalid">
                  Please enter a valid recipient email.
                </Form.Control.Feedback>
              </Form.Group>
              {/* CC, Subject, Body fields unchanged */}
              <Form.Group className="mb-3">
                <Form.Label>CC</Form.Label>
                <div className="mb-2">
                  {leaveForm.ccList.map((email) => (
                    <Badge
                      pill
                      bg="secondary"
                      key={email}
                      className="me-1"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleRemoveCc(email)}
                    >
                      {email} &times;
                    </Badge>
                  ))}
                </div>
                <InputGroup>
                  <Form.Control
                    type="email"
                    placeholder="Add CC email"
                    value={newCc}
                    onChange={(e) => setNewCc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCc(e);
                    }}
                  />
                  <Button variant="outline-secondary" onClick={handleAddCc}>
                    Add
                  </Button>
                </InputGroup>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Subject</Form.Label>
                <Form.Select
                  name="templateSelect"
                  value={selectedTemplateSubject}
                  onChange={handleTemplateSelect}
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {templates.map((tpl, i) => (
                    <option key={i} value={tpl.subject}>
                      {tpl.subject}
                    </option>
                  ))}
                  <option value="__custom">Other</option>
                </Form.Select>

                {usingCustomSubject && (
                  <Form.Control
                    type="text"
                    name="subject"
                    value={leaveForm.subject}
                    onChange={handleFormChange}
                    placeholder="Type your custom subject"
                    className="mt-2"
                    required
                  />
                )}

                <Form.Control.Feedback type="invalid">
                  Please enter or select a subject.
                </Form.Control.Feedback>
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
                <Form.Text className="text-muted">
                  {leaveForm.body
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean).length}{" "}
                  / 500 words
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  Please enter the email body.
                </Form.Control.Feedback>
              </Form.Group>
              <Button type="submit" variant="primary">
                Send Mail
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right: My Leave Requests */}
        <Col md={6}>
          <Card className="p-4 shadow-sm">
            <h5><b>My Leave Requests</b></h5>

            {loadingReqs ? (
              <Spinner animation="border" />
            ) : errorReqs ? (
              <Alert variant="danger">{errorReqs}</Alert>
            ) : myReqs.length === 0 ? (
              <Alert variant="info">No requests found.</Alert>
            ) : (
              <>
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReqs.map((r, idx) => (
                      <tr key={r.request_id}>
                        <td>
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td>
                          {new Date(r.created_at)
                            .toISOString()
                            .slice(0, 10)}
                        </td>
                        <td>{r.subject}</td>
                        <td>
                          {r.status === "pending" && (
                            <Badge bg="warning">Pending</Badge>
                          )}
                          {r.status === "approved" && (
                            <Badge bg="success">Approved</Badge>
                          )}
                          {r.status === "rejected" && (
                            <Badge bg="danger">Rejected</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Pagination className="justify-content-center">
                  <Pagination.First
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  />
                  <Pagination.Prev
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  />
                  {[...Array(totalPages)].map((_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === currentPage}
                      onClick={() => handlePageChange(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                  <Pagination.Last
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  />
                </Pagination>
              </>
            )}
          </Card>
        </Col>

        {/* Confirmation Modal (unchanged) */}
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
            <p><strong>CC:</strong> {leaveForm.ccList.join(", ")}</p>
            <p><strong>Subject:</strong> {leaveForm.subject}</p>
            <p><strong>Body:</strong></p>
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
            <Button
              variant="primary"
              onClick={confirmSend}
              disabled={isSending}
            >
              {isSending ? "Sending…" : "Yes, Send"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Row>

      {/* Toast Container */}
      <ToastContainer position="middle-center" className="p-3">
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          bg={toastVariantState}
          delay={3000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariantState === "success" ? "Success" : "Error"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMsg}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default MailRequest;
