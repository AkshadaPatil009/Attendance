// src/components/RequestStatus/PendingLeaves.js
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
  Badge,
  Pagination
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Assign a border color per leave type
const BORDER_COLORS = {
  Vacation: "#4da6ff",
  Sick:     "#ff6666",
  Personal: "#ffcc66",
  Other:    "#ffa500",
};

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
  const [decisionType, setDecisionType]           = useState("");
  const [emailSubject, setEmailSubject]           = useState("");
  const [emailBody, setEmailBody]                 = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  const prepareEmailTemplate = (req, decision) => {
    const subj = `Leave Request #${req.request_id} ${decision === "approved" ? "Approved" : "Not Approved"}`;
    const decisionText = decision === "approved" ? "approved" : "non approved";
    const body =
      `Hello ${req.from_name},\n\n` +
      `Your ${req.leave_type} request submitted on ${new Date(req.created_at).toLocaleDateString()} ` +
      `has been *${decisionText}* by ${currentUserName}.\n\n` +
      `Best regards,\n${currentUserName}`;
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
    const req = selected;
    setModalLoading(true);
    setProcessing(ps => new Set(ps).add(req.request_id));

    try {
      await axios.post(
        `${API_URL}/api/requests/${req.request_id}/decision`,
        { decision: decisionType }
      );
      await axios.post(`${API_URL}/api/send-decision-email`, {
        to_email:    req.from_email,
        cc_email:    req.cc_email,
        subject:     emailSubject,
        body:        emailBody
      });
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

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" />
    </div>
  );
  if (error)   return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>;
  if (data.length === 0)
    return <Alert variant="info" className="mt-4 text-center">No pending requests.</Alert>;

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Container className="py-3">
        <Row xs={1} md={2} lg={3} className="g-3">
          {paginatedData.map((r, idx) => {
            const color = BORDER_COLORS[r.leave_type] || BORDER_COLORS.Other;
            const time  = new Date(r.created_at).toLocaleString();
            const displayNumber = startIndex + idx + 1;

            return (
              <Col key={r.request_id}>
                <Card
                  className="h-100 position-relative"
                  style={{
                    borderLeft: `6px solid ${color}`,
                    cursor: "pointer",
                    transition: "transform 0.1s ease-in-out",
                    paddingTop: "0.5rem"
                  }}
                  onClick={() => setSelected({ ...r, displayNumber })}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1.0)")}
                >
                  <Badge
                    bg="light"
                    text="dark"
                    className="position-absolute"
                    style={{
                      top: "0.5rem",
                      left: "0.5rem",
                      fontSize: "0.75rem",
                      padding: "0.25em 0.5em"
                    }}
                  >
                    #{displayNumber}
                  </Badge>

                  <Card.Body className="pt-4 pb-2 px-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Badge bg="warning">{r.leave_type}</Badge>
                      <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {time}
                      </small>
                    </div>

                    <Card.Title className="mb-1" style={{ fontSize: "1rem" }}>
                      {r.from_name}
                    </Card.Title>

                    <Card.Text className="mb-1" style={{ fontSize: "0.875rem" }}>
                      <strong>Subject:</strong> {r.subject}
                    </Card.Text>

                    <Card.Text
                      style={{
                        height: "2.5rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "0.875rem"
                      }}
                    >
                      {r.body}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Container>

      {/* Pagination Controls */}
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
          <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
          {[...Array(totalPages)].map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={i + 1 === currentPage}
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
          <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
        </Pagination>
      </div>

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
