import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Button,
  Spinner,
  Alert,
  Modal,
  Container,
  Row,
  Col,
  Form,
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PendingLeaves() {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentUserName = storedUser.name || "User";
  const myEmail = storedUser.email || "";

  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [processing, setProcessing] = useState(new Set());
  const [selected, setSelected]     = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // NEW state for email editor
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [decisionType, setDecisionType]           = useState(""); // "approved" | "rejected"
  const [emailSubject, setEmailSubject]           = useState("");
  const [emailBody, setEmailBody]                 = useState("");

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = () => {
    setLoading(true);
    setError("");
    axios
      .get(`${API_URL}/api/pending-requests`)
      .then(res => {
        const sorted = res.data
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .filter(r => {
            const toMatch = r.to_email.toLowerCase() === myEmail.toLowerCase();
            const ccs = r.cc_email
              ? r.cc_email.split(",").map(e => e.trim().toLowerCase())
              : [];
            return toMatch || ccs.includes(myEmail.toLowerCase());
          });
        setData(sorted);
      })
      .catch(() => setError("Failed to load pending requests"))
      .finally(() => setLoading(false));
  };

  // Build the default subject/body
  const prepareEmailTemplate = (req, decision) => {
    const subj = `Leave Request #${req.request_id} ${decision === "approved" ? "Approved" : "Not Approved"}`;
    const decisionText = decision === "approved" ? "approved" : "non approved";
    const body = 
      `Hello ${req.from_name},\n\n` +
      `Your ${req.leave_type} request submitted on ${new Date(req.created_at).toLocaleDateString()} ` +
      `has been *${decisionText}* by ${currentUserName}.\n\n` +
      `Best regards,\n` +
      `${currentUserName}`;
    return { subj, body };
  };

  // When Approve/Reject button clicked, open editor
  const openEmailEditor = (decision) => {
    if (!selected) return;
    const { subj, body } = prepareEmailTemplate(selected, decision);
    setDecisionType(decision);
    setEmailSubject(subj);
    setEmailBody(body);
    setEmailModalVisible(true);
  };

  // After tweaking, actually send
  const handleSendEmail = async () => {
    if (!selected) return;
    const req = selected;
    setModalLoading(true);
    setProcessing(ps => new Set(ps).add(req.request_id));

    try {
      // 1) mark in DB
      await axios.post(
        `${API_URL}/api/requests/${req.request_id}/decision`,
        { decision: decisionType }
      );

      // 2) send notification email (using edited subject/body)
      await axios.post(`${API_URL}/api/send-decision-email`, {
        to_email:    req.from_email,
        cc_email:    req.cc_email,
        subject:     emailSubject,
        body:        emailBody
      });

      // 3) cleanup & remove from UI
      setData(d => d.filter(r => r.request_id !== req.request_id));
      setSelected(null);
      setEmailModalVisible(false);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${decisionType}`);
    } finally {
      setProcessing(ps => {
        const copy = new Set(ps);
        copy.delete(req.request_id);
        return copy;
      });
      setModalLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">{error}</Alert>;
  if (data.length === 0)
    return <Alert variant="info">No pending requests.</Alert>;

  return (
    <>
      <Container className="py-3">
        <Row className="g-3">
          {data.map((r, idx) => (
            <Col key={r.request_id} xs={12} md={6} lg={4}>
              <Card
                className="h-100 shadow-sm"
                onClick={() => setSelected({ ...r, displayNumber: idx + 1 })}
                style={{ cursor: "pointer" }}
              >
                <Card.Body>
                  <Card.Title>#{idx + 1} — {r.from_name}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {r.leave_type} | {new Date(r.created_at).toLocaleString()}
                  </Card.Subtitle>
                  <Card.Text>
                    <strong>Subject:</strong> {r.subject}
                  </Card.Text>
                  <Card.Text style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {r.body}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Detail + Decision Modal */}
      <Modal
        show={!!selected}
        onHide={() => setSelected(null)}
        size="lg"
        centered
      >
        {selected && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>
                Request #{selected.displayNumber} — {selected.from_name}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ whiteSpace: "pre-wrap" }}>
              <p><strong>From:</strong> {selected.from_email} ({selected.from_name})</p>
              <p><strong>To:</strong> {selected.to_email}</p>
              {selected.cc_email && <p><strong>CC:</strong> {selected.cc_email}</p>}
              <p><strong>Subject:</strong> {selected.subject}</p>
              <hr/>
              <div className="border p-3" style={{ background: "#f8f9fa" }}>
                {selected.body}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="success"
                onClick={() => openEmailEditor("approved")}
                className="me-2"
                disabled={processing.has(selected.request_id)}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => openEmailEditor("rejected")}
                disabled={processing.has(selected.request_id)}
              >
                Reject
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Email-Editor Modal */}
      <Modal
        show={emailModalVisible}
        onHide={() => setEmailModalVisible(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Compose {decisionType === "approved" ? "Approval" : "Rejection"} Email
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="emailSubject" className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="emailBody">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                style={{ whiteSpace: "pre-wrap" }}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setEmailModalVisible(false)}
            disabled={modalLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSendEmail}
            disabled={modalLoading}
          >
            {modalLoading
              ? <Spinner as="span" animation="border" size="sm" />
              : "Send Email"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
