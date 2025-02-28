import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const AttendanceForm = () => {
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [attendanceMessages, setAttendanceMessages] = useState("");
  const [otherMessages, setOtherMessages] = useState("");
  const [tableData, setTableData] = useState([]);

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

  // Handler to parse raw data and update tableData
  const handleFilter = () => {
    // Split the raw text into non-empty lines
    const lines = hangoutMessages.split("\n").filter(line => line.trim() !== "");
    const records = [];

    // Process every two lines as one record
    for (let i = 0; i < lines.length; i += 2) {
      // Ensure there is a detail line
      if (i + 1 >= lines.length) break;

      const headerLine = lines[i];
      const detailLine = lines[i + 1];

      // Parse header line: expected format "EmpName, Day Time"
      const headerParts = headerLine.split(",");
      const empName = headerParts[0].trim();
      let messageDate = "";
      let messageTime = "";
      if (headerParts.length > 1) {
        // Example header: "Thu 9:59?AM" – we remove the "?" if present
        const dateTimeStr = headerParts[1].trim();
        const dateTimeParts = dateTimeStr.split(" ");
        messageDate = dateTimeParts[0] || "";
        messageTime = (dateTimeParts[1] || "").replace("?", "");
      }

      // Parse detail line: expected format "CI RO" or "CO TECHNICO"
      const detailParts = detailLine.trim().split(" ").filter(part => part !== "");
      const recordType = detailParts[0] || "";
      const location = detailParts[1] || "";
      const inTime = recordType === "CI" ? messageTime : "";
      const outTime = recordType === "CO" ? messageTime : "";

      records.push({
        empName,
        inTime,
        outTime,
        location,
        messageTime,
        messageDate,
      });
    }
    setTableData(records);
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

        {/* Attendance Table */}
        <Col>
          <div
            style={{
              height: "300px",
              overflowX: "scroll",
              overflowY: "scroll",
              border: "1px solid #ccc",
              whiteSpace: "nowrap",
            }}
          >
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>EmpName</th>
                  <th>InTime</th>
                  <th>OutTime</th>
                  <th>Location</th>
                  <th>MessageTime</th>
                  <th>MessageDate</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((record, index) => (
                  <tr key={index}>
                    <td>{record.empName}</td>
                    <td>{record.inTime}</td>
                    <td>{record.outTime}</td>
                    <td>{record.location}</td>
                    <td>{record.messageTime}</td>
                    <td>{record.messageDate}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      {/* Buttons Section */}
      <Row className="mt-3 text-center">
        <Col>
          <Button variant="primary" className="me-3" onClick={handleFilter}>
            Filter
          </Button>
          <Button variant="success">Save</Button>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceForm;
