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

export default function AdminPendingLeaves() {
  // Get current admin info from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentAdminEmail = storedUser.email || "";
  const currentAdminName = storedUser.name || "Admin";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(new Set());

  // Email editor state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [decisionType, setDecisionType] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = () => {
    setLoading(true);
    setError("");
    axios
      .get(`${API_URL}/api/pending-requests`)
      .then((res) => {
        // Only include requests addressed to this admin
        const pendingForAdmin = res.data.filter((r) => {
          const toMatch = r.to_email.toLowerCase() === currentAdminEmail.toLowerCase();
          const ccList = r.cc_email
            ? r.cc_email.split(",").map((e) => e.trim().toLowerCase())
            : [];
          return toMatch || ccList.includes(currentAdminEmail.toLowerCase());
        });
        setRequests(
          pendingForAdmin.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        );
      })
      .catch(() => setError("Failed to load pending requests"))
      .finally(() => setLoading(false));
  };

  const prepareEmailTemplate = (req, decision) => {
    const subj = `Leave Request #${req.request_id} ${
      decision === "approved" ? "Approved" : "Not Approved"
    }`;
    const decisionText = decision === "approved" ? "approved" : "not approved";
    const body =
      `Hello ${req.from_name},\n\n` +
      `Your ${req.leave_type} request submitted on ${new Date(
        req.created_at
      ).toLocaleDateString()} has been *${decisionText}* by ${currentAdminName}.\n\n` +
      `Best regards,\n${currentAdminName}`;
    return { subj, body };
  };

  const openEmailEditor = (decision) => {
    if (!selected) return;
    const { subj, body } = prepareEmailTemplate(selected, decision);
    setDecisionType(decision);
    setEmailSubject(subj);
    setEmailBody(body);
    setEmailModalVisible(true);
  };

  const handleSendEmail = async () => {
    if (!selected) return;
    setModalLoading(true);
    setProcessing((ps) => new Set(ps).add(selected.request_id));
    try {
      // update decision in backend
      await axios.post(
        `${API_URL}/api/requests/${selected.request_id}/decision`,
        { decision: decisionType }
      );
      // send notification
      await axios.post(`${API_URL}/api/send-decision-email`, {
        to_email: selected.from_email,
        cc_email: selected.cc_email,
        subject: emailSubject,
        body: emailBody,
      });
      // remove from list
      setRequests((prev) => prev.filter((r) => r.request_id !== selected.request_id));
      setSelected(null);
      setEmailModalVisible(false);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${decisionType}`);
    } finally {
      setProcessing((ps) => {
        const copy = new Set(ps);
        copy.delete(selected.request_id);
        return copy;
      });
      setModalLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (requests.length === 0) return <Alert variant="info">No pending requests.</Alert>;

  return (
    <>
      <Container className="py-3">
        <Row className="g-3">
          {requests.map((r, idx) => (
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
                  <Card.Text
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.body}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <Modal show={!!selected} onHide={() => setSelected(null)} size="lg" centered>
        {selected && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>
                Request #{selected.displayNumber} — {selected.from_name}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ whiteSpace: "pre-wrap" }}>
              <p>
                <strong>From:</strong> {selected.from_email} ({selected.from_name})
              </p>
              <p>
                <strong>To:</strong> {selected.to_email}
              </p>
              {selected.cc_email && (
                <p>
                  <strong>CC:</strong> {selected.cc_email}
                </p>
              )}
              <p>
                <strong>Subject:</strong> {selected.subject}
              </p>
              <hr />
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
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="emailBody">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                style={{ whiteSpace: "pre-wrap" }}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
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
            {modalLoading ? <Spinner as="span" animation="border" size="sm" /> : "Send Email"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
