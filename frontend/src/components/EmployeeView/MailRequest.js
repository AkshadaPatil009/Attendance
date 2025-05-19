// src/components/MailRequest.js
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
} from "react-bootstrap";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const MailRequest = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeId = storedUser.employeeId;

  const [templates, setTemplates] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    to: "",
    ccList: ["tushar.mahadik@protovec.com", "kalpesh.urunkar@protovec.com"],
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

  // — My Requests state & pagination —
  const [myReqs, setMyReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [errorReqs, setErrorReqs] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // helper to show toast
  const showCustomToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // fetch subject templates
  useEffect(() => {
    fetch(`${API_URL}/api/subject-templates`)
      .then((res) => res.json())
      .then(setTemplates)
      .catch(() => showCustomToast("Failed to load templates"));
  }, []);

  // fetch this employee’s past requests
  const loadMyRequests = () => {
    setLoadingReqs(true);
    setErrorReqs("");
    fetch(`${API_URL}/api/my-requests?employee_id=${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setMyReqs(data);
        setCurrentPage(1);
      })
      .catch(() => setErrorReqs("Could not load your requests"))
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

  // form change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => {
      const updated = { ...prev };
      if (name === "body") {
        const count = value.trim().split(/\s+/).length;
        if (count > 500) return prev;
        updated.body = value;
      } else {
        updated[name] = value;
        if (name === "subject") {
          const match = templates.find((t) => t.subject === value);
          if (match) updated.body = match.body;
        }
      }
      return updated;
    });
  };

  // subject template select
  const handleTemplateSelect = (e) => {
    const subj = e.target.value;
    setSelectedTemplateSubject(subj);
    if (subj === "__custom") {
      setUsingCustomSubject(true);
      setLeaveForm((p) => ({ ...p, subject: "" }));
    } else {
      setUsingCustomSubject(false);
      setLeaveForm((p) => {
        const match = templates.find((t) => t.subject === subj);
        return { ...p, subject: subj, body: match?.body || p.body };
      });
    }
  };

  // add CC email
  const handleAddCc = (e) => {
    e.preventDefault();
    const email = newCc.trim();
    if (
      email &&
      !leaveForm.ccList.includes(email) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setLeaveForm((p) => ({ ...p, ccList: [...p.ccList, email] }));
      showCustomToast(`CC added: ${email}`);
    }
    setNewCc("");
  };

  // remove CC
  const handleRemoveCc = (email) => {
    setLeaveForm((p) => ({ ...p, ccList: p.ccList.filter((c) => c !== email) }));
    showCustomToast(`CC removed: ${email}`);
  };

  // form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
    } else {
      setValidated(false);
      setShowConfirmModal(true);
    }
  };

  // confirm send
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
      if (!res.ok) throw new Error();
      showCustomToast("Email sent successfully!");
      setLeaveForm({ leaveType: "", to: "", ccList: [], subject: "", body: "" });
      loadMyRequests();
    } catch {
      showCustomToast("Error sending email");
    } finally {
      setIsSending(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      <Row className="g-4">
        {/* Apply for Leave */}
        <Col md={6}>
          <Card className="p-4 shadow-sm">
            <h5><b>Apply for Leave</b></h5>
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              {/* Leave Type */}
              <Form.Group className="mb-3 mt-2">
                <Form.Label>Leave Type</Form.Label>
                <Form.Select
                  name="leaveType"
                  value={leaveForm.leaveType}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">-- Select Leave Type --</option>
                  <option>Attendance CI/CO Correction</option>
                  <option>Planned Leave</option>
                  <option>Unplanned Leave</option>
                  <option>Work From Home Request</option>
                  <option>Compup</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  Please select a leave type.
                </Form.Control.Feedback>
              </Form.Group>

              {/* To */}
              <Form.Group className="mb-3">
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="email"
                  name="to"
                  value={leaveForm.to}
                  onChange={handleFormChange}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  Please enter a valid email.
                </Form.Control.Feedback>
              </Form.Group>

              {/* CC */}
              <Form.Group className="mb-3">
                <Form.Label>CC</Form.Label>
                <div className="mb-2">
                  {leaveForm.ccList.map((c) => (
                    <Badge
                      pill
                      bg="secondary"
                      className="me-1"
                      key={c}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleRemoveCc(c)}
                    >
                      {c} &times;
                    </Badge>
                  ))}
                </div>
                <InputGroup>
                  <Form.Control
                    type="email"
                    placeholder="Add CC"
                    value={newCc}
                    onChange={(e) => setNewCc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCc(e)}
                  />
                  <Button onClick={handleAddCc}>Add</Button>
                </InputGroup>
              </Form.Group>

              {/* Subject */}
              <Form.Group className="mb-3">
                <Form.Label>Subject</Form.Label>
                <Form.Select
                  name="templateSelect"
                  value={selectedTemplateSubject}
                  onChange={handleTemplateSelect}
                  required
                >
                  <option value="">-- Select --</option>
                  {templates.map((t, i) => (
                    <option key={i} value={t.subject}>{t.subject}</option>
                  ))}
                  <option value="__custom">Other</option>
                </Form.Select>
                {usingCustomSubject && (
                  <Form.Control
                    type="text"
                    name="subject"
                    value={leaveForm.subject}
                    onChange={handleFormChange}
                    className="mt-2"
                    required
                  />
                )}
                <Form.Control.Feedback type="invalid">
                  Please enter a subject.
                </Form.Control.Feedback>
              </Form.Group>

              {/* Body */}
              <Form.Group className="mb-3">
                <Form.Label>Body</Form.Label>
                <Form.Control
                  as="textarea"
                  name="body"
                  rows={5}
                  value={leaveForm.body}
                  onChange={handleFormChange}
                  required
                />
                <Form.Text className="text-muted">
                  {leaveForm.body.trim().split(/\s+/).filter(Boolean).length}/500 words
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  Please enter the email body.
                </Form.Control.Feedback>
              </Form.Group>

              <Button type="submit" disabled={isSending}>
                {isSending ? <Spinner animation="border" size="sm" /> : "Send Mail"}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* My Leave Requests */}
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
                      <th>#</th><th>Date</th><th>Subject</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReqs.map((r) => {
                      // compute the global index of this request
                      const globalIndex =
                        myReqs.findIndex((item) => item.request_id === r.request_id) + 1;
                      return (
                        <tr key={r.request_id}>
                          <td>{globalIndex}</td>
                          <td>{new Date(r.created_at).toISOString().slice(0,10)}</td>
                          <td>{r.subject}</td>
                          <td>
                            <Badge bg={
                              r.status==="approved" ? "success" :
                              r.status==="pending"  ? "warning" : "danger"
                            }>
                              {r.status.charAt(0).toUpperCase()+r.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                <Pagination className="justify-content-center">
                  <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage===1}/>
                  <Pagination.Prev onClick={() => handlePageChange(currentPage-1)} disabled={currentPage===1}/>
                  {[...Array(totalPages)].map((_,i)=>(
                    <Pagination.Item
                      key={i+1}
                      active={i+1===currentPage}
                      onClick={()=>handlePageChange(i+1)}
                    >
                      {i+1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next onClick={()=>handlePageChange(currentPage+1)} disabled={currentPage===totalPages}/>
                  <Pagination.Last onClick={()=>handlePageChange(totalPages)} disabled={currentPage===totalPages}/>
                </Pagination>
              </>
            )}
          </Card>
        </Col>

        {/* Confirmation Modal */}
        <Modal show={showConfirmModal} onHide={()=>setShowConfirmModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Email Preview</Modal.Title></Modal.Header>
          <Modal.Body>
            <p><strong>To:</strong> {leaveForm.to}</p>
            <p><strong>CC:</strong> {leaveForm.ccList.join(", ")}</p>
            <p><strong>Subject:</strong> {leaveForm.subject}</p>
            <div className="border p-2 bg-light" style={{whiteSpace:"pre-wrap"}}>
              {leaveForm.body}
            </div>
            <hr/>
            <p className="text-danger"><b>Send this email?</b></p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={()=>setShowConfirmModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmSend} disabled={isSending}>
              {isSending ? "Sending…" : "Yes, Send"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Row>

      {/* Custom Toast in Top-Right */}
      {showToast && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: "#fff",
          borderLeft: "4px solid #28a745",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: "10px 16px",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          zIndex: 1050
        }}>
          <FaCheckCircle style={{ color: "#28a745", fontSize: 20, marginRight: 8 }} />
          <span style={{ flex: 1, fontSize: 14, color: "#333" }}>{toastMsg}</span>
          <button onClick={() => setShowToast(false)} style={{
            background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16
          }}>
            <FaTimes />
          </button>
        </div>
      )}
    </>
  );
};

export default MailRequest;
