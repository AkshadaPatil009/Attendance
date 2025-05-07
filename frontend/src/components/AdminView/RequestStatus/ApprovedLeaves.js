// src/components/RequestStatus/ApprovedLeaves.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Spinner, Alert, Badge, Pagination } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Assign a border color per leave type
const BORDER_COLORS = {
  Vacation: "#4da6ff",
  Sick:     "#ff6666",
  Personal: "#ffcc66",
  Other:    "#008000",
};

export default function ApprovedLeaves() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/api/approved-requests`)
      .then(res => {
        const sorted = res.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setData(sorted);
        setCurrentPage(1);
      })
      .catch(() => setError("Failed to load approved requests"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" />
    </div>
  );
  if (error) return (
    <Alert variant="danger" className="mt-4 text-center">
      {error}
    </Alert>
  );
  if (data.length === 0) return (
    <Alert variant="info" className="mt-4 text-center">
      No approved requests.
    </Alert>
  );

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Container className="py-3">
      <Row className="g-3">
        {paginatedData.map((r, idx) => {
          const color = BORDER_COLORS[r.leave_type] || BORDER_COLORS.Other;
          const time  = new Date(r.created_at).toLocaleString();

          return (
            <Col key={r.request_id} xs={12} md={6} lg={4}>
              <Card
                className="h-100 position-relative shadow-sm"
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
                  #{(currentPage - 1) * itemsPerPage + idx + 1}
                </Badge>

                <Card.Body className="pt-4 pb-2 px-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Badge bg="success">
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
                    <strong>To:</strong> {r.to_email}
                  </Card.Text>
                  {r.cc_email && (
                    <Card.Text className="mb-1" style={{ fontSize: "0.875rem" }}>
                      <strong>CC:</strong> {r.cc_email}
                    </Card.Text>
                  )}

                  <Card.Subtitle
                    className="mb-1 text-truncate"
                    style={{ maxWidth: "100%", fontSize: "0.875rem" }}
                  >
                    <strong>Subject:</strong> {r.subject}
                  </Card.Subtitle>

                  <Card.Text
                    style={{
                      height: "1rem",
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

      {totalPages > 1 && (
        <Pagination className="justify-content-center mt-4">
          <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
          <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
          {Array.from({ length: totalPages }).map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={i + 1 === currentPage}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
          <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
        </Pagination>
      )}
    </Container>
  );
}
