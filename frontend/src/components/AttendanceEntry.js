// AttendanceEntry.js
import React from "react";
import { Row, Col, Form, Button, Table } from "react-bootstrap";

const AttendanceEntry = ({
  hangoutMessages,
  setHangoutMessages,
  attendanceTableData,
  otherMessagesTableData,
  attendanceToSave,
  loading,
  handleFilter,
  handleSave,
  hangoutTextareaStyle,
  tableContainerStyle,
}) => {
  return (
    <>
      <Row className="mb-2 text-center fw-bold">
        <Col md={3}>
          <h5>Hangout Messages</h5>
        </Col>
        <Col md={3}>
          <h5>Attendance Messages</h5>
        </Col>
        <Col md={3}>
          <h5>Other Messages</h5>
        </Col>
        <Col md={3}>
          <h5>Attendance to Save</h5>
        </Col>
      </Row>

      <Row>
        {/* Left Column: Hangout Messages */}
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={hangoutMessages}
            onChange={(e) => setHangoutMessages(e.target.value)}
            style={hangoutTextareaStyle}
            placeholder="Paste your data here."
          />
        </Col>

        {/* Middle Column: Attendance Table */}
        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>EmpName</th>
                  <th>InTime</th>
                  <th>OutTime</th>
                  <th>Location</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attendanceTableData.map((record, index) => (
                  <tr key={index}>
                    <td>{record.empName}</td>
                    <td>{record.inTime}</td>
                    <td>{record.outTime}</td>
                    <td>{record.location}</td>
                    <td>{record.date}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>

        {/* Next Column: Other Messages Table */}
        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>SenderName</th>
                  <th>Message</th>
                  <th>MessageTime</th>
                  <th>MessageDate</th>
                </tr>
              </thead>
              <tbody>
                {otherMessagesTableData.map((msg, index) => (
                  <tr key={index}>
                    <td>{msg.senderName}</td>
                    <td>{msg.message}</td>
                    <td>{msg.messageTime}</td>
                    <td>{msg.messageDate}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>

        {/* Last Column: Attendance to Save */}
        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>EmpName</th>
                  <th>InTime</th>
                  <th>OutTime</th>
                  <th>Location</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attendanceToSave.map((record, index) => (
                  <tr key={index}>
                    <td>{record.empName}</td>
                    <td>{record.inTime}</td>
                    <td>{record.outTime}</td>
                    <td>{record.location}</td>
                    <td>{record.date}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <Row className="mt-3 text-center">
        <Col>
          <Button variant="primary" className="me-3" onClick={handleFilter}>
            Filter
          </Button>
          <Button variant="success" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default AttendanceEntry;
