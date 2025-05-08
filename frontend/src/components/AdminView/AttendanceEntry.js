import React, { useState, useEffect } from "react";
import { Row, Col, Form, Button, Table, Alert, Modal } from "react-bootstrap";
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
// initialize socket connection
const socket = io(API_URL);

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
  // — local mirrors of your props
  const [lhm,  setLhm]  = useState(hangoutMessages);
  const [lat,  setLat]  = useState(attendanceTableData);
  const [lom,  setLom]  = useState(otherMessagesTableData);
  const [lts,  setLts]  = useState(attendanceToSave);

  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirm,   setShowConfirm]   = useState(false);

  // whenever parent props change (e.g. after you Filter), sync them locally
  useEffect(() => { setLhm(hangoutMessages)  }, [hangoutMessages]);
  useEffect(() => { setLat(attendanceTableData) }, [attendanceTableData]);
  useEffect(() => { setLom(otherMessagesTableData) }, [otherMessagesTableData]);
  useEffect(() => { setLts(attendanceToSave)      }, [attendanceToSave]);

  // real-time notifications
  useEffect(() => {
    socket.on("attendanceSaved", () =>
      alert("Attendance was just saved by another user.")
    );
    return () => {
      socket.off("attendanceSaved");
      socket.disconnect();
    };
  }, []);

  // actual save
  const doSaveAttendance = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceRecords: attendanceToSave }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        setErrorMessage(err.error || "Failed to save attendance records");
      } else {
        setErrorMessage("");
        alert("Attendance records saved successfully!");
        socket.emit("attendanceSaved", { attendanceRecords: attendanceToSave });

        // —— CLEAR ALL LOCAL COPIES —— 
        setLhm("");
        setLat([]);
        setLom([]);
        setLts([]);
        // also clear the parent textarea so new paste starts fresh:
        setHangoutMessages("");
      }
    } catch (e) {
      setErrorMessage("An unexpected error occurred: " + e.message);
    }
  };

  const handleSaveAttendance = () => setShowConfirm(true);
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
        <Col md={3}><h5>Hangout Messages</h5></Col>
        <Col md={3}><h5>Attendance Messages</h5></Col>
        <Col md={3}><h5>Other Messages</h5></Col>
        <Col md={3}><h5>Attendance to Save</h5></Col>
      </Row>

      <Row>
        {/* Hangout textarea */}
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={lhm}
            onChange={e => {
              setLhm(e.target.value);
              setHangoutMessages(e.target.value);
            }}
            style={hangoutTextareaStyle}
            placeholder="Paste your data here."
          />
        </Col>

        {/* Attendance Messages table */}
        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>EmpName</th><th>InTime</th><th>OutTime</th>
                  <th>Location</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {lat.map((r,i) => (
                  <tr key={i}>
                    <td>{r.empName}</td>
                    <td>{r.inTime}</td>
                    <td>{r.outTime}</td>
                    <td>{r.location}</td>
                    <td>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>

        {/* Other Messages table */}
        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>SenderName</th><th>Message</th>
                  <th>MessageTime</th><th>MessageDate</th>
                </tr>
              </thead>
              <tbody>
                {lom.map((m,i) => (
                  <tr key={i}>
                    <td>{m.senderName}</td>
                    <td>{m.message}</td>
                    <td>{m.messageTime}</td>
                    <td>{m.messageDate}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>

        {/* Attendance to Save table */}
        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>EmpName</th><th>InTime</th><th>OutTime</th>
                  <th>Location</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {lts.map((r,i) => (
                  <tr key={i}>
                    <td>{r.empName}</td>
                    <td>{r.inTime}</td>
                    <td>{r.outTime}</td>
                    <td>{r.location}</td>
                    <td>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <Row className="mt-3 text-center">
        <Col>
          <Button
            variant="primary"
            className="me-3"
            onClick={() => {
              handleFilter();
              socket.emit("attendanceFilterRequested");
            }}
          >
            Filter
          </Button>
          <Button
            variant="success"
            onClick={handleSaveAttendance}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </Col>
      </Row>

      <Modal
        show={showConfirm}
        onHide={() => setShowConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save the attendance records?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(false)}
          >
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
