// src/components/NotificationBell.js
import React, { useState } from "react";
import { Dropdown, Badge, OverlayTrigger, Tooltip, ListGroup } from "react-bootstrap";
import { BellFill } from "react-bootstrap-icons";
import { format } from "date-fns";

// Customize border colors based on leave type
const BORDER_COLORS = {
  Vacation: "#4da6ff",
  Sick: "#ff6666",
  Personal: "#ffcc66",
  Other: "#ffa500",
};

export default function NotificationBell({ requests = [] }) {
  const [open, setOpen] = useState(false);

  const renderTooltip = props => (
    <Tooltip id="bell-tooltip" {...props}>
      {requests.length
        ? `You have ${requests.length} pending ${requests.length === 1 ? "request" : "requests"}`
        : "No pending requests"}
    </Tooltip>
  );

  return (
    <Dropdown
      show={open}
      onToggle={() => setOpen(o => !o)}
      align="end"
      className="me-3"
    >
      <OverlayTrigger placement="bottom" overlay={renderTooltip}>
        <Dropdown.Toggle
          variant="light"
          id="notification-bell"
          className="position-relative p-2 shadow-sm"
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
                    cursor: "default",
                  }}
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
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 8px",
                      }}
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
  );
}
