// UpdateAttendance.js
import React from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const UpdateAttendance = ({
  employees,
  selectedEmployee,
  setSelectedEmployee,
  employeeAttendance,
  handleRowClick,
  handleUpdate,
  approvedBy,
  setApprovedBy,
  reason,
  setReason,
  location,
  setLocation,
  clockIn,
  setClockIn,
  clockOut,
  setClockOut,
  fullDay,
  setFullDay,
}) => {
  return (
    <Container fluid>
      <Row>
        {/* Left side: Update form */}
        <Col md={4} style={{ border: "1px solid #ccc", padding: "10px" }}>
          <h5>Update Attendance</h5>
          <Form>
            {/* Employee Dropdown */}
            <Form.Group controlId="employeeName" className="mb-2">
              <Form.Label>Employee Name:</Form.Label>
              <Form.Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp, index) => (
                  <option key={index} value={emp.emp_name}>
                    {emp.emp_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Approved by */}
            <Form.Group controlId="approvedBy" className="mb-2">
              <Form.Label>Approved by:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter name"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
            </Form.Group>

            {/* Reason */}
            <Form.Group controlId="reason" className="mb-2">
              <Form.Label>Reason:</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Enter reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Form.Group>

            {/* Location */}
            <Form.Group controlId="location" className="mb-2">
              <Form.Label>Location:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Form.Group>

            {/* Clock In */}
            <Form.Group controlId="clockIn" className="mb-2">
              <Form.Check
                type="checkbox"
                label="Clock In"
                checked={!!clockIn}
                onChange={(e) => !e.target.checked && setClockIn("")}
              />
              <Form.Control
                type="text"
                placeholder="YYYY-MM-DD HH:MM"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </Form.Group>

            {/* Clock Out */}
            <Form.Group controlId="clockOut" className="mb-2">
              <Form.Check
                type="checkbox"
                label="Clock Out"
                checked={!!clockOut}
                onChange={(e) => !e.target.checked && setClockOut("")}
              />
              <Form.Control
                type="text"
                placeholder="YYYY-MM-DD HH:MM"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </Form.Group>

            {/* Full Day */}
            <Form.Group controlId="fullDay" className="mb-3">
              <Form.Check
                type="checkbox"
                label="Display Full day in Monthly Attendance"
                checked={fullDay}
                onChange={(e) => setFullDay(e.target.checked)}
              />
            </Form.Group>

            {/* Update Button */}
            <Button variant="warning" onClick={handleUpdate}>
              Update
            </Button>
          </Form>
        </Col>

        {/* Right side: Table of attendance for the selected employee */}
        <Col md={8}>
          <Table bordered hover size="sm" className="mb-3">
            <thead>
              <tr>
                <th>EmployeeName</th>
                <th>ApprovedBy</th>
                <th>Reason</th>
                <th>InTime</th>
                <th>OutTime</th>
                <th>Location</th>
                <th>Date</th>
                <th>Work Hour</th>
                <th>Day</th>
              </tr>
            </thead>
            <tbody>
              {employeeAttendance.map((record) => (
                <tr key={record.id} onClick={() => handleRowClick(record)}>
                  <td>{record.emp_name}</td>
                  <td>{record.approved_by}</td>
                  <td>{record.reason}</td>
                  <td>{record.in_time}</td>
                  <td>{record.out_time}</td>
                  <td>{record.location}</td>
                  <td>{record.date}</td>
                  <td>{record.work_hour}</td>
                  <td>{record.day}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  );
};

export default UpdateAttendance;
