import React, { useState } from "react";
import { Row, Col, Form, Button, Table, Alert, Modal } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AttendanceEntry = ({
  hangoutMessages,
  setHangoutMessages,
  attendanceTableData,
  otherMessagesTableData,
  attendanceToSave,
  loading,
  handleFilter,
  hangoutTextareaStyle,
  tableContainerStyle,
}) => {
  const [errorMessage, setErrorMessage] = useState(""); // State for error message
  const [showConfirm, setShowConfirm] = useState(false);  // State for confirmation modal

  // This function performs the actual save operation
  const doSaveAttendance = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendanceRecords: attendanceToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Failed to save attendance records");
      } else {
        setErrorMessage(""); // Clear any previous errors
        alert("Attendance records saved successfully!");
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred: " + error.message);
    }
  };

  // When user clicks Save, show the confirmation modal first
  const handleSaveAttendance = () => {
    setShowConfirm(true);
  };

  // Called when user confirms saving
  const confirmSave = async () => {
    setShowConfirm(false);
    await doSaveAttendance();
  };

  return (
    <>
      {errorMessage && (
        <Alert variant="danger" onClose={() => setErrorMessage("")} dismissible>
          {errorMessage}
        </Alert>
      )}

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
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={hangoutMessages}
            onChange={(e) => setHangoutMessages(e.target.value)}
            style={hangoutTextareaStyle}
            placeholder="Paste your data here."
          />
        </Col>

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
          <Button variant="success" onClick={handleSaveAttendance} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to save the attendance records?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={confirmSave}>
            Confirm Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AttendanceEntry;
