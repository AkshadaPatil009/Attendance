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
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PendingLeaves({ tlName }) {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentUserName = storedUser.name || "User";
  const myEmail = storedUser.email || "";

  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [processing, setProcessing] = useState(new Set());
  const [selected, setSelected]     = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  // general reject or other decision
  const decide = async (requestId, decision) => {
    setModalLoading(true);
    setProcessing(ps => new Set(ps).add(requestId));
    try {
      await axios.post(
        `${API_URL}/api/requests/${requestId}/decision`,
        { decision }
      );
      setData(d => d.filter(r => r.request_id !== requestId));
      setSelected(null);
    } catch {
      alert("Failed to update decision");
    } finally {
      setProcessing(ps => {
        const copy = new Set(ps);
        copy.delete(requestId);
        return copy;
      });
      setModalLoading(false);
    }
  };

  // APPROVE + notification email
  const handleApprove = async () => {
    if (!selected) return;
    const { request_id, from_email, cc_email, from_name, leave_type, created_at } = selected;
    setModalLoading(true);
    setProcessing(ps => new Set(ps).add(request_id));

    try {
      // 1) mark approved in DB
      await axios.post(
        `${API_URL}/api/requests/${request_id}/decision`,
        { decision: "approved" }
      );

      // 2) send the notification email
      await axios.post(`${API_URL}/api/send-decision-email`, {
        to_email: from_email,
        cc_email: cc_email,
        subject: `Leave Request #${request_id} Approved`,
        body: `Hello ${from_name},

Your ${leave_type} request submitted on ${new Date(created_at).toLocaleDateString()} has been *approved* by ${currentUserName}.

Best regards,
${currentUserName}`
      });

      // 3) remove from UI
      setData(d => d.filter(r => r.request_id !== request_id));
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert("Failed to approve and notify");
    } finally {
      setProcessing(ps => {
        const copy = new Set(ps);
        copy.delete(selected.request_id);
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
              <Button
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
              <Button
                variant="success"
                disabled={modalLoading || processing.has(selected.request_id)}
                onClick={handleApprove}
                className="me-2"
              >
                {modalLoading && processing.has(selected.request_id)
                  ? <Spinner as="span" animation="border" size="sm" />
                  : "Approve"}
              </Button>
              <Button
                variant="danger"
                disabled={modalLoading || processing.has(selected.request_id)}
                onClick={() => decide(selected.request_id, "rejected")}
              >
                {modalLoading && processing.has(selected.request_id)
                  ? <Spinner as="span" animation="border" size="sm" />
                  : "Reject"}
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
}
