import React, { useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";

const AttendanceForm = () => {
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [attendanceMessages, setAttendanceMessages] = useState("");
  const [otherMessages, setOtherMessages] = useState("");

  // Textarea style with horizontal & vertical scrollbars
  const textareaStyle = {
    height: "300px",
    width: "100%",
    overflowX: "scroll", // Horizontal scroll
    overflowY: "scroll", // Vertical scroll
    border: "1px solid #ccc",
    padding: "8px",
    resize: "none", // Prevents manual resizing
    whiteSpace: "pre", // Maintains formatting and forces horizontal scrolling
    wordWrap: "normal", // Ensures horizontal scroll instead of wrapping text
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-3 text-center fw-bold">
        <Col><h5>Hangout Messages</h5></Col>
        <Col><h5>Attendance Messages</h5></Col>
        <Col><h5>Other Messages</h5></Col>
        <Col><h5>Attendance to Save in Database</h5></Col>
      </Row>

      <Row>
        {/* Hangout Messages */}
        <Col>
          <Form.Control
            as="textarea"
            value={hangoutMessages}
            onChange={(e) => setHangoutMessages(e.target.value)}
            style={textareaStyle}
          />
        </Col>

        {/* Attendance Messages */}
        <Col>
          <Form.Control
            as="textarea"
            value={attendanceMessages}
            onChange={(e) => setAttendanceMessages(e.target.value)}
            style={textareaStyle}
          />
        </Col>

        {/* Other Messages */}
        <Col>
          <Form.Control
            as="textarea"
            value={otherMessages}
            onChange={(e) => setOtherMessages(e.target.value)}
            style={textareaStyle}
          />
        </Col>

        {/* Attendance Table Placeholder */}
        <Col>
          <div
            style={{
              height: "300px",
              overflowX: "scroll", // Enables horizontal scroll
              overflowY: "scroll", // Enables vertical scroll
              border: "1px solid #ccc",
              whiteSpace: "nowrap", // Ensures table content scrolls horizontally
            }}
          >
            {/* Placeholder for future table content */}
          </div>
        </Col>
      </Row>

      {/* Buttons Section */}
      <Row className="mt-3 text-center">
        <Col>
          <Button variant="primary" className="me-3">Filter</Button>
          <Button variant="success">Save</Button>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceForm;
