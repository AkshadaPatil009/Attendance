import React, { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

const AttendanceForm = () => {
  const [attendanceText, setAttendanceText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleChange = (e) => {
    setAttendanceText(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Open the confirmation popup instead of submitting immediately
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    // Place your actual submission logic here
    console.log("Submitted Attendance Data:", attendanceText);
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="mt-4">
      <h3 className="text-center"> Attendance Form</h3>
      <Form onSubmit={handleSubmit} className="mt-3">
        <Form.Group controlId="attendanceTextarea">
          <Form.Control
            as="textarea"
            rows={13}
            value={attendanceText}
            onChange={handleChange}
            placeholder="Attendance data here..."
          />
        </Form.Group>
        <div className="d-flex justify-content-end mt-2">
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </div>
      </Form>

      <Modal show={showConfirmation} onHide={handleCancel}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Submission</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure want to submit?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel}>
            No
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AttendanceForm;
