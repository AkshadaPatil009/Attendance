import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const UpdateAttendance = () => {
  // States for form fields and data
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  // clockIn and clockOut hold the datetime-local input values.
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  // Checkboxes indicate whether to update the corresponding clock field.
  const [updateClockIn, setUpdateClockIn] = useState(false);
  const [updateClockOut, setUpdateClockOut] = useState(false);
  const [fullDay, setFullDay] = useState(false);

  // Fetch attendance records and employee list on mount
  useEffect(() => {
    fetchAttendanceRecords();
    fetchEmployees();
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/attendance");
      setAttendanceRecords(response.data);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/employees");
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Helper: Convert stored full datetime (e.g. "2025-03-06 9:07AM") 
  // into HTML datetime-local format ("YYYY-MM-DDTHH:mm")
  const convertToDatetimeLocal = (fullDateTime) => {
    if (!fullDateTime) return "";
    return moment(fullDateTime, "YYYY-MM-DD h:mmA").format("YYYY-MM-DDTHH:mm");
  };

  // When an employee is selected from the dropdown, fetch their attendance records 
  // and populate the form with the latest record.
  useEffect(() => {
    if (selectedEmployee) {
      axios
        .get(
          `http://localhost:5000/api/attendance?empName=${encodeURIComponent(
            selectedEmployee
          )}`
        )
        .then((response) => {
          const empRecords = response.data;
          if (empRecords.length > 0) {
            // Sort records by date descending and pick the latest record.
            const sortedRecords = empRecords.sort(
              (a, b) => new Date(b.date) - new Date(a.date)
            );
            const latestRecord = sortedRecords[0];
            setSelectedRecord(latestRecord);
            setApprovedBy(latestRecord.approved_by || "");
            setReason(latestRecord.reason || "");
            setLocation(latestRecord.location || "");
            setClockIn(convertToDatetimeLocal(latestRecord.in_time));
            setClockOut(convertToDatetimeLocal(latestRecord.out_time));
            setUpdateClockIn(!!latestRecord.in_time);
            setUpdateClockOut(!!latestRecord.out_time);
          } else {
            // Clear form if no records found.
            setSelectedRecord(null);
            setApprovedBy("");
            setReason("");
            setLocation("");
            setClockIn("");
            setClockOut("");
            setUpdateClockIn(false);
            setUpdateClockOut(false);
          }
        })
        .catch((error) => {
          console.error("Error fetching attendance for selected employee:", error);
        });
    } else {
      // Clear form if no employee is selected.
      setSelectedRecord(null);
      setApprovedBy("");
      setReason("");
      setLocation("");
      setClockIn("");
      setClockOut("");
      setUpdateClockIn(false);
      setUpdateClockOut(false);
    }
  }, [selectedEmployee]);

  // When a row in the table is clicked, populate the form and update the dropdown.
  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setSelectedEmployee(record.emp_name);
    setApprovedBy(record.approved_by || "");
    setReason(record.reason || "");
    setLocation(record.location || "");
    setClockIn(convertToDatetimeLocal(record.in_time));
    setClockOut(convertToDatetimeLocal(record.out_time));
    setUpdateClockIn(!!record.in_time);
    setUpdateClockOut(!!record.out_time);
  };

  // On update, if a clock checkbox is checked, extract only the time portion 
  // from the datetime-local input and combine it with the original date.
  const handleUpdate = async () => {
    if (!selectedRecord) {
      alert("No record selected for update!");
      return;
    }
    // Force the original date into "YYYY-MM-DD" format.
    const recordDate = moment(selectedRecord.date).format("YYYY-MM-DD");
    const formattedClockIn =
      updateClockIn && clockIn
        ? `${recordDate} ${moment(clockIn).format("h:mmA")}`
        : selectedRecord.in_time || "";
    const formattedClockOut =
      updateClockOut && clockOut
        ? `${recordDate} ${moment(clockOut).format("h:mmA")}`
        : selectedRecord.out_time || "";

    const requestBody = {
      inTime: formattedClockIn,
      outTime: formattedClockOut,
      location,
      date: recordDate,
      approved_by: approvedBy,
      reason,
    };

    try {
      await axios.put(`http://localhost:5000/api/attendance/${selectedRecord.id}`, requestBody);
      alert("Attendance updated successfully!");
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance record.");
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row>
        {/* Left Column: Update Attendance Form */}
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
                label="Update Clock In"
                checked={updateClockIn}
                onChange={(e) => setUpdateClockIn(e.target.checked)}
              />
              <Form.Control
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={!updateClockIn}
              />
            </Form.Group>

            {/* Clock Out */}
            <Form.Group controlId="clockOut" className="mb-2">
              <Form.Check
                type="checkbox"
                label="Update Clock Out"
                checked={updateClockOut}
                onChange={(e) => setUpdateClockOut(e.target.checked)}
              />
              <Form.Control
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={!updateClockOut}
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

        {/* Right Column: Attendance Records Table */}
        <Col md={8}>
          <Container
            className="p-3"
            style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc" }}
          >
            <h3 className="mb-3">Attendance Records</h3>
            <Table bordered hover responsive size="sm">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Approved By</th>
                  <th>Reason</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Work Hour</th>
                  <th>Day</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id} onClick={() => handleRowClick(record)}>
                    <td>{record.emp_name}</td>
                    <td>{record.approved_by}</td>
                    <td>{record.reason}</td>
                    <td>{record.in_time}</td>
                    <td>{record.out_time}</td>
                    <td>{record.location}</td>
                    <td>{moment(record.date).format("YYYY-MM-DD")}</td>
                    <td>{record.work_hour}</td>
                    <td>{record.day}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Container>
        </Col>
      </Row>
    </Container>
  );
};

export default UpdateAttendance;
