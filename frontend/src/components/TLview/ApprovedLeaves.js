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

export default function ApprovedLeaves() {
  // 1. Get current TL's email from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const myEmail = (storedUser.email || "").toLowerCase();

  // 2. State
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // 3. Fetch + filter logic, wrapped in useCallback for stable identity
  const fetchApproved = useCallback(() => {
    setLoading(true);
    setError("");

    axios
      .get(`${API_URL}/api/approved-requests`)
      .then(res => {
        if (!Array.isArray(res.data)) {
          throw new Error("Invalid data format");
        }

        // Keep only those where current TL is in to_email or cc_email
        const filtered = res.data
          .filter(r => {
            const toMatch = r.to_email.toLowerCase() === myEmail;
            const ccs = r.cc_email
              ? r.cc_email.split(/[,;]+/).map(e => e.trim().toLowerCase())
              : [];
            return toMatch || ccs.includes(myEmail);
          })
          // Optionally sort by newest first
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setData(filtered);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load approved requests");
      })
      .finally(() => setLoading(false));
  }, [myEmail]);

  // 4. On mount
  useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);

  // 5. Render states
  if (loading) return <Spinner animation="border" />;

  if (error) return <Alert variant="danger">{error}</Alert>;

  if (data.length === 0)
    return <Alert variant="info">No approved leave requests for you.</Alert>;

  // 6. Display filtered cards
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
                  {r.leave_type} |{" "}
                  {new Date(r.created_at).toLocaleString()}
                </Card.Subtitle>
                <Card.Text>
                  <strong>Subject:</strong> {r.subject}
                </Card.Text>
                <Card.Text>
                  <strong>To:</strong> {r.to_email}
                </Card.Text>
                {r.cc_email && (
                  <Card.Text>
                    <strong>CC:</strong> {r.cc_email}
                  </Card.Text>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
