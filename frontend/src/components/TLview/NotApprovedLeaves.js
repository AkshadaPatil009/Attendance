// src/components/RequestStatus/NotApprovedLeaves.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
  Pagination
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Assign a border color per leave type
const BORDER_COLORS = {
  Vacation: "#4da6ff",
  Sick:     "#ff6666",
  Personal: "#ffcc66",
  Other:    "#bb2124",
};

export default function NotApprovedLeaves() {
  // Pull the current TL’s email from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const myEmail = (storedUser.email || "").toLowerCase();

  // State
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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
  if (loading)
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  if (error)
    return (
      <Alert variant="danger" className="mt-4 text-center">
        {error}
      </Alert>
    );
  if (data.length === 0)
    return (
      <Alert variant="info" className="mt-4 text-center">
        No rejected leave requests for you.
      </Alert>
    );

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Display cards
  return (
    <Container className="py-3">
      <Row xs={1} md={2} lg={3} className="g-4">
        {paginatedData.map((r, idx) => {
          const color = BORDER_COLORS[r.leave_type] || BORDER_COLORS.Other;
          const time  = new Date(r.created_at).toLocaleString();
          const globalIndex = startIndex + idx + 1;

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
                  #{globalIndex}
                </Badge>

                <Card.Body className="pt-4 pb-2 px-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                   <Badge bg="danger">
                      {r.leave_type}
                    </Badge>
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
                  <Card.Text className="mb-1" style={{ fontSize: "0.875rem" }}>
                    <strong>To:</strong> {r.to_email}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

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
    </Container>
  );
}
