import React, { useState, useEffect, useRef } from "react";
import { Row, Col, Form, Button, Table, Alert, Modal, Toast, ToastContainer, InputGroup } from "react-bootstrap";
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
  const [lhm, setLhm] = useState(hangoutMessages);
  const [lat, setLat] = useState(attendanceTableData);
  const [lom, setLom] = useState(otherMessagesTableData);
  const [lts, setLts] = useState(attendanceToSave);

  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Search state and visibility
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const textareaRef = useRef(null);
  const searchRef = useRef(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // sync props → local
  useEffect(() => { setLhm(hangoutMessages) }, [hangoutMessages]);
  useEffect(() => { setLat(attendanceTableData) }, [attendanceTableData]);
  useEffect(() => { setLom(otherMessagesTableData) }, [otherMessagesTableData]);
  useEffect(() => { setLts(attendanceToSave) }, [attendanceToSave]);

  // Ctrl+F / Cmd+F to toggle search
  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => {
          const next = !prev;
          if (next) setTimeout(() => searchRef.current?.focus(), 0);
          return next;
        });
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  // find matches in text
  useEffect(() => {
    if (searchTerm) {
      const text = lhm.toLowerCase();
      const term = searchTerm.toLowerCase();
      const ms = [];
      let idx = text.indexOf(term);
      while (idx !== -1) {
        ms.push(idx);
        idx = text.indexOf(term, idx + term.length);
      }
      setMatches(ms);
      setCurrentMatchIndex(0);
    } else {
      setMatches([]);
      setCurrentMatchIndex(0);
    }
  }, [searchTerm, lhm]);

  // scroll and select match
  const selectMatch = index => {
    if (!textareaRef.current || matches.length === 0) return;
    const ta = textareaRef.current;
    const start = matches[index];
    const end = start + searchTerm.length;

    // highlight
    ta.focus();
    ta.setSelectionRange(start, end);

    // compute line number of start
    const before = ta.value.slice(0, start);
    const lineNumber = before.split("\n").length - 1;

    // compute line height from computed style
    const cs = window.getComputedStyle(ta);
    const lineHeight = parseFloat(cs.lineHeight);

    // scroll so that matched line is centered
    const centerOffset = (ta.clientHeight / 2) - (lineHeight / 2);
    ta.scrollTop = (lineNumber * lineHeight) - centerOffset;
  };

  const jumpToMatch = () => {
    if (matches.length) {
      setCurrentMatchIndex(0);
      selectMatch(0);
    }
  };
  const nextMatch = () => {
    if (!matches.length) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    selectMatch(nextIdx);
  };
  const prevMatch = () => {
    if (!matches.length) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    selectMatch(prevIdx);
  };

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

  // save attendance
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
        setToastVariant("success");
        setToastMsg("Attendance records saved successfully!");
        setShowToast(true);
        socket.emit("attendanceSaved", { attendanceRecords: attendanceToSave });
        setLhm("");
        setLat([]);
        setLom([]);
        setLts([]);
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
        <Col md={3}>
          {showSearch && (
            <InputGroup className="mb-2">
              <Form.Control
                ref={searchRef}
                type="text"
                placeholder="Search Hangout Messages"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); jumpToMatch(); } }}
              />
              <Button variant="outline-secondary" onClick={prevMatch} disabled={!matches.length}>Prev</Button>
              <Button variant="outline-secondary" onClick={jumpToMatch} disabled={!matches.length}>Go</Button>
              <Button variant="outline-secondary" onClick={nextMatch} disabled={!matches.length}>Next</Button>
            </InputGroup>
          )}
          <Form.Control
            as="textarea"
            ref={textareaRef}
            value={lhm}
            onChange={e => {
              setLhm(e.target.value);
              setHangoutMessages(e.target.value);
            }}
            style={hangoutTextareaStyle}
            placeholder="Paste your data here. Press Ctrl+F to search."
          />
        </Col>

        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead><tr><th>EmpName</th><th>InTime</th><th>OutTime</th><th>Location</th><th>Date</th></tr></thead>
              <tbody>
                {lat.map((r,i) => <tr key={i}><td>{r.empName}</td><td>{r.inTime}</td><td>{r.outTime}</td><td>{r.location}</td><td>{r.date}</td></tr>)}
              </tbody>
            </Table>
          </div>
        </Col>

        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead><tr><th>SenderName</th><th>Message</th><th>MessageTime</th><th>MessageDate</th></tr></thead>
              <tbody>
                {lom.map((m,i) => <tr key={i}><td>{m.senderName}</td><td>{m.message}</td><td>{m.messageTime}</td><td>{m.messageDate}</td></tr>)}
              </tbody>
            </Table>
          </div>
        </Col>

        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead><tr><th>EmpName</th><th>InTime</th><th>OutTime</th><th>Location</th><th>Date</th></tr></thead>
              <tbody>
                {lts.map((r,i) => <tr key={i}><td>{r.empName}</td><td>{r.inTime}</td><td>{r.outTime}</td><td>{r.location}</td><td>{r.date}</td></tr>)}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <Row className="mt-3 text-center">
        <Col>
          <Button variant="primary" className="me-3" onClick={() => { handleFilter(); socket.emit("attendanceFilterRequested"); }}>
            Filter
          </Button>
          <Button variant="success" onClick={handleSaveAttendance} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </Col>
      </Row>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Save</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to save the attendance records?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="success" onClick={confirmSave}>Confirm Save</Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="middle-center" className="p-3">
        <Toast bg={toastVariant} onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide>
          <Toast.Header><strong className="me-auto">{toastVariant === "success" ? "Success" : "Notice"}</strong></Toast.Header>
          <Toast.Body className="text-white">{toastMsg}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default AttendanceEntry;
