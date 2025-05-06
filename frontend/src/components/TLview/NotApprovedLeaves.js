import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  Spinner,
  Alert,
  Container,
  Row,
  Col,
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function NotApprovedLeaves() {
  // Pull the current TL’s email from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const myEmail = (storedUser.email || "").toLowerCase();

  // State
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Fetch & filter (only by to_email)
  const fetchRejected = useCallback(() => {
    setLoading(true);
    setError("");

    axios
      .get(`${API_URL}/api/rejected-requests`)
      .then(res => {
        if (!Array.isArray(res.data)) {
          throw new Error("Invalid data format");
        }

        const filtered = res.data
          .filter(r => r.to_email.toLowerCase() === myEmail)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setData(filtered);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError("Failed to load non-approved requests");
      })
      .finally(() => setLoading(false));
  }, [myEmail]);

  useEffect(() => {
    fetchRejected();
  }, [fetchRejected]);

  // Render states
  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">{error}</Alert>;
  if (data.length === 0)
    return <Alert variant="info">No rejected leave requests for you.</Alert>;

  // Display cards
  return (
    <Container className="py-3">
      <Row className="g-3">
        {data.map((r, idx) => (
          <Col key={r.request_id} xs={12} md={6} lg={4}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title>
                  #{idx + 1} — {r.from_name}
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  {r.leave_type} | {new Date(r.created_at).toLocaleString()}
                </Card.Subtitle>
                <Card.Text>
                  <strong>Subject:</strong> {r.subject}
                </Card.Text>
                <Card.Text>
                  <strong>To:</strong> {r.to_email}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
