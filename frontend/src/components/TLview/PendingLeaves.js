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
        // Ensure newest-first order on client, if needed:
        const sorted = res.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setData(sorted);
      })
      .catch(() => setError("Failed to load pending requests"))
      .finally(() => setLoading(false));
  };

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

  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">{error}</Alert>;
  if (data.length === 0)
    return <Alert variant="info">No pending requests.</Alert>;

  return (
    <>
      <Container className="py-3">
        <Row className="g-3">
          {data.map((r, idx) => {
            const displayNumber = idx + 1; // 1 = newest
            return (
              <Col key={r.request_id} xs={12} md={6} lg={4}>
                <Card
                  className="h-100 shadow-sm"
                  onClick={() => setSelected({ ...r, displayNumber })}
                  style={{ cursor: "pointer" }}
                >
                  <Card.Body>
                    <Card.Title>
                      #{displayNumber} — {r.from_name}
                    </Card.Title>
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
            );
          })}
        </Row>
      </Container>

      {/* Modal Popup */}
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
                onClick={() => decide(selected.request_id, "approved")}
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
