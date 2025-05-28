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
import { FaCheckCircle, FaTimes, FaEdit, FaSave, FaUndo, FaPlus } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const MailRequest = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeId = storedUser.employeeId;
  const isAdmin = storedUser.role === 4; // role 4 = admin

  // templates list
  const [templates, setTemplates] = useState([]);

  // Add-template modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // existing leave form state
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    to: "",
    ccList: ["tushar.mahadik@protovec.com", "kalpesh.urunkar@protovec.com"],
    subject: "",
    customSubject: "",
    body: "",
  });
  const [newCc, setNewCc] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validated, setValidated] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // inline-edit state for body
  const [editingBody, setEditingBody] = useState(false);
  const [editBody, setEditBody] = useState("");

  // inline-edit state for subject
  const [editingSubject, setEditingSubject] = useState(false);
  const [editSubject, setEditSubject] = useState("");

  // toast
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // my requests
  const [myReqs, setMyReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [errorReqs, setErrorReqs] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showCustomToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // ── load templates ──
  const loadTemplates = () => {
    fetch(`${API_URL}/api/subject-templates`)
      .then((res) => res.json())
      .then(setTemplates)
      .catch(() => showCustomToast("Failed to load templates"));
  };
  useEffect(loadTemplates, []);

  // ── load my requests ──
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

  // ── pagination ──
  const totalPages = Math.ceil(myReqs.length / itemsPerPage);
  const paginatedReqs = myReqs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handlePageChange = (page) => setCurrentPage(page);

  // ── leave form handlers ──
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
        // clear customSubject if switching off "__custom"
        if (name === "subject" && value !== "__custom") {
          updated.customSubject = "";
        }
        if (name === "subject") {
          const match = templates.find((t) => t.subject === value);
          if (match) {
            updated.body = match.body;
            setEditingBody(false);
            setEditBody(match.body);
          }
        }
      }
      return updated;
    });
  };

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

  const handleRemoveCc = (email) => {
    setLeaveForm((p) => ({ ...p, ccList: p.ccList.filter((c) => c !== email) }));
    showCustomToast(`CC removed: ${email}`);
  };

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
      subject:
        leaveForm.subject === "__custom"
          ? leaveForm.customSubject
          : leaveForm.subject,
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
      setLeaveForm({
        leaveType: "",
        to: "",
        ccList: [],
        subject: "",
        customSubject: "",
        body: "",
      });
      loadMyRequests();
    } catch {
      showCustomToast("Error sending email");
    } finally {
      setIsSending(false);
      setShowConfirmModal(false);
    }
  };

  // ── inline edit + save body ──
  const saveEditBody = async () => {
    const tmpl = templates.find((t) => t.subject === leaveForm.subject);
    if (!tmpl) return;
    setEditingBody(false);
    try {
      const res = await fetch(`${API_URL}/api/subject-templates/${tmpl.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody }),
      });
      if (!res.ok) throw new Error();
      showCustomToast("Template updated");
      loadTemplates();
      setLeaveForm((p) => ({ ...p, body: editBody }));
    } catch {
      showCustomToast("Failed to update template");
    }
  };

  // ── add-template save ──
  const saveNewTemplate = async () => {
    if (!newSubject.trim() || !newBody.trim()) return;
    setAddSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/subject-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject.trim(), body: newBody.trim() }),
      });
      if (!res.ok) throw new Error();
      showCustomToast("New template added");
      setShowAddModal(false);
      setNewSubject("");
      setNewBody("");
      loadTemplates();
    } catch {
      showCustomToast("Failed to add template");
    } finally {
      setAddSaving(false);
    }
  };

  // commit edited subject
  const commitSubjectEdit = () => {
    const val = editSubject.trim();
    if (val) {
      setLeaveForm((p) => ({
        ...p,
        subject: "__custom",
        customSubject: val,
      }));
      setEditingSubject(false);
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
                  <option>Compensatory Off(Leave)</option>
                  <option>Compensatory Off(Cash)</option>
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
                      key={c}
                      pill
                      bg="secondary"
                      className="me-1"
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

              {/* Subject + inline edit + add-button */}
              <Form.Group className="mb-3">
                <Form.Label>Subject</Form.Label>

                {editingSubject ? (
                  <Form.Control
                    type="text"
                    value={editSubject}
                    autoFocus
                    onChange={(e) => setEditSubject(e.target.value)}
                    onBlur={commitSubjectEdit}
                    onKeyDown={(e) => e.key === "Enter" && commitSubjectEdit()}
                    required
                  />
                ) : (
                  <InputGroup
                    onDoubleClick={() => {
                      setEditingSubject(true);
                      setEditSubject(
                        leaveForm.subject === "__custom"
                          ? leaveForm.customSubject
                          : leaveForm.subject
                      );
                    }}
                  >
                    <Form.Select
                      name="subject"
                      value={leaveForm.subject}
                      onChange={handleFormChange}
                      required
                    >
                      <option key="default" value="">
                        -- Select --
                      </option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.subject}>
                          {t.subject}
                        </option>
                      ))}
                      <option key="__custom" value="__custom">
                        Other
                      </option>
                    </Form.Select>
                    {isAdmin && (
                      <>
                        {leaveForm.subject && leaveForm.subject !== "__custom" && (
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setEditingBody((e) => !e);
                              setEditBody(leaveForm.body);
                            }}
                          >
                            <FaEdit />
                          </Button>
                        )}
                        <Button
                          variant="outline-primary"
                          onClick={() => setShowAddModal(true)}
                        >
                          <FaPlus />
                        </Button>
                      </>
                    )}
                  </InputGroup>
                )}

                {leaveForm.subject === "__custom" && !editingSubject && (
                  <Form.Control
                    className="mt-2"
                    type="text"
                    placeholder="Enter custom subject"
                    value={leaveForm.customSubject}
                    onChange={handleFormChange}
                    name="customSubject"
                    required
                  />
                )}
                <Form.Control.Feedback type="invalid">
                  Please enter a subject.
                </Form.Control.Feedback>
              </Form.Group>

              {/* Body or inline edit view */}
              <Form.Group className="mb-3">
                <Form.Label>Body</Form.Label>
                {editingBody ? (
                  <>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={saveEditBody}
                        className="me-2"
                      >
                        <FaSave /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingBody(false);
                          setEditBody(leaveForm.body);
                        }}
                      >
                        <FaUndo /> Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Form.Control
                    as="textarea"
                    name="body"
                    rows={5}
                    value={leaveForm.body}
                    onChange={handleFormChange}
                    required
                  />
                )}
                {!editingBody && (
                  <Form.Text className="text-muted">
                    {leaveForm.body.trim().split(/\s+/).filter(Boolean).length}/500 words
                  </Form.Text>
                )}
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
                  <thead><tr><th>#</th><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
                  <tbody>
                    {paginatedReqs.map((r) => (
                      <tr key={r.request_id}>
                        <td>
                          {myReqs.findIndex((x) => x.request_id === r.request_id) + 1}
                        </td>
                        <td>{new Date(r.created_at).toISOString().slice(0,10)}</td>
                        <td>{r.subject}</td>
                        <td>
                          <Badge bg={
                            r.status==="approved" ? "success" :
                            r.status==="pending"  ? "warning" : "danger"
                          }>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <Pagination className="justify-content-center">
                  <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage===1}/>
                  <Pagination.Prev onClick={() => handlePageChange(currentPage-1)} disabled={currentPage===1}/>
                  {[...Array(totalPages)].map((_, i) => (
                    <Pagination.Item
                      key={i}
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
      </Row>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Email Preview</Modal.Title></Modal.Header>
        <Modal.Body>
          <p><strong>To:</strong> {leaveForm.to}</p>
          <p><strong>CC:</strong> {leaveForm.ccList.join(", ")}</p>
          <p>
            <strong>Subject:</strong>{" "}
            {leaveForm.subject === "__custom"
              ? leaveForm.customSubject
              : leaveForm.subject}
          </p>
          <div className="border p-2 bg-light" style={{ whiteSpace: "pre-wrap" }}>
            {leaveForm.body}
          </div>
          <hr/>
          <p className="text-danger"><b>Send this email?</b></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmSend} disabled={isSending}>
            {isSending ? "Sending…" : "Yes, Send"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add-Template Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Add New Template</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Body</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveNewTemplate} disabled={addSaving}>
            {addSaving ? <Spinner size="sm" animation="border" /> : <><FaPlus /> Add</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast */}
      {showToast && (
        <div style={{
          position: "fixed", top: 20, right: 20, background: "#fff",
          borderLeft: "4px solid #28a745", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: "10px 16px", borderRadius: 4, display: "flex",
          alignItems: "center", zIndex: 1050
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
