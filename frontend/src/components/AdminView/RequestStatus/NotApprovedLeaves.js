// src/components/RequestStatus/NotApprovedLeaves.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
  Pagination,
  Button,
  Form,
  InputGroup
} from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Assign a border color per leave type (use red for rejected)
const BORDER_COLORS = {
  Vacation:              "#4da6ff",
  Sick:                  "#ff6666",
  Personal:              "#ffcc66",
  "CI/CO Correction":    "#bb2124",
  "Planned Leave":       "#bb2124",
  "Unplanned Leave":     "#bb2124",
  "Work From Home Request": "#bb2124",
  Compup:                "#bb2124",
  Other:                 "#bb2124",
};

export default function NotApprovedLeaves() {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const myEmail = (storedUser.email || "").toLowerCase();

  const [allData, setAllData]       = useState([]);
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMine, setShowMine]     = useState(false);
  const [leaveType, setLeaveType]   = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const itemsPerPage = 9;

  const leaveTypes = [
    "All",
    "Attendance CI/CO Correction",
    "Planned Leave",
    "Unplanned Leave",
    "Work From Home Request",
    "Compup"
  ];

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/api/rejected-requests`)
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : [];
        const sorted = arr.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setAllData(sorted);
        setData(sorted);
        setCurrentPage(1);
      })
      .catch(() => setError("Failed to load rejected requests"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let temp = allData;

    if (showMine) {
      temp = temp.filter(r => {
        const toMatch = r.to_email.toLowerCase() === myEmail;
        const ccs = r.cc_email
          ? r.cc_email.split(/[,;]+/).map(e => e.trim().toLowerCase())
          : [];
        return toMatch || ccs.includes(myEmail);
      });
    }

    if (leaveType !== "All") {
      temp = temp.filter(r => r.leave_type === leaveType);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      temp = temp.filter(r =>
        r.subject.toLowerCase().includes(q) ||
        r.from_name.toLowerCase().includes(q)
      );
    }

    if (filterDate) {
      const start = new Date(filterDate);
      start.setHours(0,0,0,0);
      const end = new Date(filterDate);
      end.setHours(23,59,59,999);
      temp = temp.filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      });
    }

    setData(temp);
    setCurrentPage(1);
  }, [showMine, leaveType, searchTerm, filterDate, allData, myEmail]);

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

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Container className="py-4">
      {/* Filters */}
      <Row className="align-items-center mb-3 gx-2">
        <Col xs="auto">
          <Button
            variant={showMine ? "outline-secondary" : "primary"}
            onClick={() => setShowMine(prev => !prev)}
          >
            {showMine ? "Show All Requests" : "Show My Requests"}
          </Button>
        </Col>

        <Col xs={12} sm={4} md={3}>
          <Form.Select
            value={leaveType}
            onChange={e => setLeaveType(e.target.value)}
          >
            {leaveTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Form.Select>
        </Col>

        <Col xs={12} sm={4} md={3}>
          <InputGroup>
            <Form.Control
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <Button variant="outline-secondary" onClick={() => setFilterDate("")}>
                Clear
              </Button>
            )}
          </InputGroup>
        </Col>

        <Col xs>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search by name or subject…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button variant="outline-secondary" onClick={() => setSearchTerm("")}>
                Clear
              </Button>
            )}
          </InputGroup>
        </Col>
      </Row>

      {paginatedData.length > 0 ? (
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
                      <Badge bg="danger">{r.leave_type}</Badge>
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
      ) : (
        <Alert variant="info" className="mt-4 text-center">
          No rejected requests matching these filters.
        </Alert>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination>
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, i) => (
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
        </div>
      )}
    </Container>
  );
}
