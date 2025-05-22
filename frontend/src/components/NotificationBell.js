// src/components/NotificationBell.js
import React, { useState, useEffect } from "react";
import {
  Dropdown,
  Badge,
  OverlayTrigger,
  Tooltip,
  ListGroup,
  Card,
  Modal,
  Button
} from "react-bootstrap";
import { BellFill } from "react-bootstrap-icons";
import { format } from "date-fns";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Customize border colors based on leave type
const BORDER_COLORS = {
  Vacation: "#4da6ff",
  Sick:     "#ff6666",
  Personal: "#ffcc66",
  Other:    "#ffa500",
};

export default function NotificationBell({ user, onSelect }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalShown, setModalShown] = useState(false);

  // Fetch pending leaves for Admin (role 4) & TL (role 2)
  useEffect(() => {
    if (!user) return;
    if (user.role === 4 || user.role === 2) {
      axios
        .get(`${API_URL}/api/pending-requests`)
        .then(res => {
          const email = user.email.toLowerCase();
          const relevant = res.data.filter(r => {
            const toMatch = r.to_email.toLowerCase() === email;
            const ccList = r.cc_email
              ? r.cc_email.split(",").map(e => e.trim().toLowerCase())
              : [];
            return toMatch || ccList.includes(email);
          });
          setRequests(relevant);
        })
        .catch(err => console.error("Failed to load pending requests", err));
    }
  }, [user]);

  // Show modal once on login if there are pending requests
  useEffect(() => {
    if (!modalShown && requests.length > 0) {
      setShowModal(true);
      setModalShown(true);
    }
  }, [requests, modalShown]);

  const renderTooltip = props => (
    <Tooltip id="bell-tooltip" {...props}>
      {requests.length
        ? `You have ${requests.length} pending ${requests.length === 1 ? "request" : "requests"}`
        : "No pending requests"}
    </Tooltip>
  );

  const handleItemClick = id => {
    if (onSelect) onSelect(id);
    setOpen(false);
  };

  return (
    <>
      <Dropdown
        show={open}
        onToggle={() => setOpen(o => !o)}
        align="end"
        className="me-3"
      >
        <OverlayTrigger placement="bottom" overlay={renderTooltip}>
          <Dropdown.Toggle
            as="button"
            id="notification-bell"
            className="position-relative p-0 border-0 bg-transparent"
          >
            <BellFill size={20} />
            {requests.length > 0 && (
              <Badge
                bg="danger"
                pill
                className="position-absolute top-0 start-100 translate-middle border border-light rounded-circle"
              >
                {requests.length}
              </Badge>
            )}
          </Dropdown.Toggle>
        </OverlayTrigger>

        <Dropdown.Menu
          style={{
            minWidth: 340,
            maxHeight: 440,
            overflowY: "auto",
            boxShadow: "0 0.5rem 1rem rgba(0,0,0,0.15)",
            padding: 0,
          }}
        >
          <Dropdown.Header className="bg-white text-primary fw-bold px-3 py-2">
            Notifications
          </Dropdown.Header>

          {requests.length === 0 ? (
            <div className="text-center text-muted py-4">No new requests</div>
          ) : (
            <ListGroup variant="flush">
              {requests.map((r, index) => {
                const color = BORDER_COLORS[r.leave_type] || BORDER_COLORS.Other;
                const time = format(new Date(r.created_at), "MMM d, yyyy");

                return (
                  <ListGroup.Item
                    key={r.request_id}
                    className="d-flex justify-content-between align-items-start"
                    style={{
                      borderLeft: `5px solid ${color}`,
                      padding: "0.75rem 1rem",
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                    onClick={() => handleItemClick(r.request_id)}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8f9fa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex-grow-1 pe-2">
                      <div className="d-flex align-items-center mb-1">
                        <Badge
                          bg="warning"
                          className="me-2 text-dark"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {r.leave_type}
                        </Badge>
                        <span className="fw-semibold text-truncate">{r.from_name}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          marginBottom: "0.25rem",
                          wordWrap: "break-word",
                        }}
                      >
                        {r.subject}
                      </div>
                      <small className="text-muted">{time}</small>
                    </div>
                    <div>
                      <Badge
                        bg="secondary"
                        pill
                        style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      >
                        {index + 1}
                      </Badge>
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Pending‐Requests Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>📋 Pending Leave Requests</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto", padding: "1rem 1.5rem" }}>
          {requests.map((r, idx) => {
            const borderColor = BORDER_COLORS[r.leave_type] || BORDER_COLORS.Other;
            return (
              <Card key={r.request_id} className="mb-3" style={{ borderLeft: `6px solid ${borderColor}` }}>
                <Card.Body className="py-2 px-3">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Badge bg="secondary" className="me-2">{idx + 1}</Badge>
                      <span className="fw-semibold">{r.from_name}</span>
                      <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: "0.75rem" }}>
                        {r.leave_type}
                      </Badge>
                    </div>
                    <small className="text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="mt-1" style={{ fontSize: "0.9rem" }}>
                    {r.subject}
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button size="sm" variant="primary" onClick={() => setShowModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
