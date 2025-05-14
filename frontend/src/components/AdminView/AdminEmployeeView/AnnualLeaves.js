// src/components/AnnualLeaves.js
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  Button,
  Form,
  Modal,
  Row,
  Col,
} from "react-bootstrap";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const AnnualLeaves = () => {
  // 1️⃣ Input & modal state
  const [allocatedUnplannedLeave, setAllocatedUnplannedLeave] = useState("");
  const [allocatedPlannedLeave, setAllocatedPlannedLeave] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 2️⃣ Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // 3️⃣ Compute total
  const totalLeaves =
    (parseInt(allocatedUnplannedLeave, 10) || 0) +
    (parseInt(allocatedPlannedLeave, 10) || 0);

  // 4️⃣ Limit to 0–999
  const handleValueChange = (val) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) return num > 999 ? "999" : val;
    return val;
  };

  // 5️⃣ Helper to show toast
  const showCustomToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 6️⃣ "Save Leaves" clicked
  const handleSave = () => {
    if (!allocatedUnplannedLeave.trim() || !allocatedPlannedLeave.trim()) {
      setErrorMsg("Please fill out both leave fields.");
      setShowErrorModal(true);
      return;
    }
    setShowConfirmModal(true);
  };

  // 7️⃣ Confirm & call API
  const confirmSave = () => {
    setShowConfirmModal(false);
    const unplanned = parseInt(allocatedUnplannedLeave, 10) || 0;
    const planned = parseInt(allocatedPlannedLeave, 10) || 0;

    fetch(`${API_URL}/api/employee-leaves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allocatedUnplannedLeave: unplanned,
        allocatedPlannedLeave: planned,
        remainingUnplannedLeave: unplanned,
        remainingPlannedLeave: planned,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.text().then(t => { throw new Error(t || res.status) });
        return res.json();
      })
      .then((postData) =>
        fetch(`${API_URL}/api/employee-leaves`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allocatedUnplannedLeave: unplanned,
            allocatedPlannedLeave: planned,
            remainingUnplannedLeave: unplanned,
            remainingPlannedLeave: planned,
          }),
        })
      )
      .then((r2) => {
        if (!r2.ok) return r2.text().then(t => { throw new Error(t || r2.status) });
        return r2.json();
      })
      .then((putData) => {
        showCustomToast(
          `Saved! Unplanned: ${unplanned}, Planned: ${planned}, Total: ${totalLeaves}`
        );
      })
      .catch((e) => {
        console.error("Error saving:", e);
        showCustomToast("Error saving leaves");
      });
  };

  // 8️⃣ Real‑time via socket
  useEffect(() => {
    socket.emit("join", { room: "holiday-leaves" });
    socket.on("leavesSaved", ({ unplanned, planned }) => {
      showCustomToast(`Realtime update: Unplanned ${unplanned}, Planned ${planned}`);
    });
    return () => socket.disconnect();
  }, []);

  return (
    <>
      {/* Inputs */}
      <Row className="justify-content-center">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Allocated Unplanned Leaves</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter unplanned leaves"
              value={allocatedUnplannedLeave}
              onChange={e => setAllocatedUnplannedLeave(handleValueChange(e.target.value))}
              min="0"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Allocated Planned Leaves</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter planned leaves"
              value={allocatedPlannedLeave}
              onChange={e => setAllocatedPlannedLeave(handleValueChange(e.target.value))}
              min="0"
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Total */}
      <Row className="justify-content-center mt-3">
        <Col md={8} className="text-center">
          <h4>Total Leaves: {totalLeaves}</h4>
        </Col>
      </Row>

      {/* Save button */}
      <Row className="justify-content-center mt-4">
        <Col md={2}>
          <Button variant="primary" onClick={handleSave} className="w-100">
            Save Leaves
          </Button>
        </Col>
      </Row>

      {/* Confirm Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save Leaves</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save leaves with:
          <br /><strong>Unplanned:</strong> {allocatedUnplannedLeave || 0}
          <br /><strong>Planned:</strong> {allocatedPlannedLeave || 0}
          <br /><strong>Total:</strong> {totalLeaves}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmSave}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Error Modal */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Validation Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMsg}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowErrorModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Top‑Right */}
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
          <FaCheckCircle style={{ color: "#28a745", fontSize: 20, marginRight: 8 }} />
          <span style={{ flex: 1, fontSize: 14, color: "#333" }}>{toastMsg}</span>
          <button onClick={() => setShowToast(false)} style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: 16
          }}>
            <FaTimes />
          </button>
        </div>
      )}
    </>
  );
};

export default AnnualLeaves;
