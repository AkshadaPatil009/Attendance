// src/components/AttendanceEntry.js
import React, { useState, useEffect, useRef } from "react";
import {
  Row,
  Col,
  Form,
  Button,
  Table,
  Alert,
  Modal,
  InputGroup,
} from "react-bootstrap";
import io from "socket.io-client";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

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
  // local copies of props
  const [lhm, setLhm] = useState(hangoutMessages);
  const [lat, setLat] = useState(attendanceTableData);
  const [lom, setLom] = useState(otherMessagesTableData);
  const [lts, setLts] = useState(attendanceToSave);

  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // search state
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const textareaRef = useRef(null);
  const searchRef = useRef(null);

  // custom toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // sync props → state
  useEffect(() => setLhm(hangoutMessages), [hangoutMessages]);
  useEffect(() => setLat(attendanceTableData), [attendanceTableData]);
  useEffect(() => setLom(otherMessagesTableData), [otherMessagesTableData]);
  useEffect(() => setLts(attendanceToSave), [attendanceToSave]);

  // Ctrl+F to toggle search
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey||e.metaKey) && e.key==="f") {
        e.preventDefault();
        setShowSearch(s => { if(!s) setTimeout(()=>searchRef.current?.focus(),0); return !s; });
      }
      if (e.key==="Escape") setShowSearch(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // find matches
  useEffect(() => {
    if (!searchTerm) {
      setMatches([]); setCurrentMatchIndex(0);
      return;
    }
    const text = lhm.toLowerCase();
    const term = searchTerm.toLowerCase();
    const ms = [];
    let idx = text.indexOf(term);
    while (idx !== -1) {
      ms.push(idx);
      idx = text.indexOf(term, idx + term.length);
    }
    setMatches(ms); setCurrentMatchIndex(0);
  }, [searchTerm, lhm]);

  // highlight match
  const selectMatch = i => {
    const ta = textareaRef.current;
    if (!ta||!matches.length) return;
    const start = matches[i], end = start + searchTerm.length;
    ta.focus(); ta.setSelectionRange(start,end);
    const lines = ta.value.slice(0,start).split("\n").length - 1;
    const lh = parseFloat(getComputedStyle(ta).lineHeight);
    const offset = (ta.clientHeight/2)-(lh/2);
    ta.scrollTop = (lines*lh) - offset;
  };
  const jumpToMatch = () => selectMatch(0);
  const nextMatch   = () => selectMatch((currentMatchIndex+1)%matches.length) && setCurrentMatchIndex(n=> (n+1)%matches.length);
  const prevMatch   = () => selectMatch((currentMatchIndex-1+matches.length)%matches.length) && setCurrentMatchIndex(n=> (n-1+matches.length)%matches.length);

  // real-time alert
  useEffect(()=>{
    socket.on("attendanceSaved", ()=> alert("Attendance saved by another user."));
    return ()=>{ socket.off("attendanceSaved"); socket.disconnect(); };
  },[]);

  // show custom toast
  const showCustomToast = msg => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(()=>setShowToast(false),3000);
  };

  // save
  const doSaveAttendance = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/attendance`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({attendanceRecords:attendanceToSave})
      });
      if(!resp.ok) {
        const err = await resp.json();
        setErrorMessage(err.error||"Failed to save");
      } else {
        setErrorMessage("");
        showCustomToast("Attendance records saved successfully!");
        socket.emit("attendanceSaved", {attendanceRecords:attendanceToSave});
        setLhm(""); setLat([]); setLom([]); setLts([]);
        setHangoutMessages("");
      }
    } catch(e) {
      setErrorMessage("Unexpected error: "+e.message);
    }
  };

  // confirm & save
  const confirmSave = async () => { setShowConfirm(false); await doSaveAttendance(); };

  return (
    <>
      {errorMessage && <Alert variant="danger" onClose={()=>setErrorMessage("")} dismissible>{errorMessage}</Alert>}

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
                placeholder="Search Hangout..."
                value={searchTerm}
                onChange={e=>setSearchTerm(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&jumpToMatch()}
              />
              <Button onClick={prevMatch} disabled={!matches.length}>Prev</Button>
              <Button onClick={jumpToMatch} disabled={!matches.length}>Go</Button>
              <Button onClick={nextMatch} disabled={!matches.length}>Next</Button>
            </InputGroup>
          )}
          <Form.Control
            as="textarea"
            ref={textareaRef}
            value={lhm}
            onChange={e=>{setLhm(e.target.value); setHangoutMessages(e.target.value);}}
            style={hangoutTextareaStyle}
            placeholder="Paste data here (Ctrl+F to search)"
          />
        </Col>

        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead><tr><th>EmpName</th><th>InTime</th><th>OutTime</th><th>Location</th><th>Date</th></tr></thead>
              <tbody>{lat.map((r,i)=><tr key={i}><td>{r.empName}</td><td>{r.inTime}</td><td>{r.outTime}</td><td>{r.location}</td><td>{r.date}</td></tr>)}</tbody>
            </Table>
          </div>
        </Col>

        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead><tr><th>Sender</th><th>Msg</th><th>Time</th><th>Date</th></tr></thead>
              <tbody>{lom.map((m,i)=><tr key={i}><td>{m.senderName}</td><td>{m.message}</td><td>{m.messageTime}</td><td>{m.messageDate}</td></tr>)}</tbody>
            </Table>
          </div>
        </Col>

        <Col md={3}>
          <div style={tableContainerStyle}>
            <Table striped bordered hover size="sm">
              <thead><tr><th>EmpName</th><th>InTime</th><th>OutTime</th><th>Location</th><th>Date</th></tr></thead>
              <tbody>{lts.map((r,i)=><tr key={i}><td>{r.empName}</td><td>{r.inTime}</td><td>{r.outTime}</td><td>{r.location}</td><td>{r.date}</td></tr>)}</tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <Row className="mt-3 text-center">
        <Col>
          <Button variant="primary" className="me-3" onClick={()=>{ handleFilter(); socket.emit("attendanceFilterRequested"); }}>
            Filter
          </Button>
          <Button variant="success" onClick={()=>setShowConfirm(true)} disabled={loading}>
            {loading?"Saving...":"Save"}
          </Button>
        </Col>
      </Row>

      <Modal show={showConfirm} onHide={()=>setShowConfirm(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Save</Modal.Title></Modal.Header>
        <Modal.Body>Save attendance records?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowConfirm(false)}>Cancel</Button>
          <Button variant="success" onClick={confirmSave}>Confirm Save</Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Toast in Top-Right */}
      {showToast && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: "#fff",
          borderLeft: "4px solid #28a745",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: "10px 16px",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          zIndex: 1050
        }}>
          <FaCheckCircle style={{ color: "#28a745", marginRight: 8, fontSize: 20 }} />
          <span style={{ flex: 1, fontSize: 14, color: "#333" }}>{toastMsg}</span>
          <button onClick={()=>setShowToast(false)} style={{
            background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16
          }}>
            <FaTimes />
          </button>
        </div>
      )}
    </>
  );
};

export default AttendanceEntry;
