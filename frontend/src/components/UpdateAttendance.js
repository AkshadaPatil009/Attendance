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
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  // These checkboxes indicate whether to update the clock times.
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

  // Helper: Convert full datetime (stored in in_time or out_time) in 12-hour format with date 
  // (e.g. "2023-03-25 8:30AM") into datetime-local input format ("YYYY-MM-DDTHH:mm") in 24-hour time.
  const convertToDatetimeLocal = (fullDateTime) => {
    if (!fullDateTime) return "";
    return moment(fullDateTime, "YYYY-MM-DD h:mmA").format("YYYY-MM-DDTHH:mm");
  };

  // When an employee is selected, fetch their attendance records and populate the form with the latest record.
  useEffect(() => {
    if (selectedEmployee) {
      axios
        .get(`http://localhost:5000/api/attendance?empName=${encodeURIComponent(selectedEmployee)}`)
        .then((response) => {
          const empRecords = response.data;
          if (empRecords.length > 0) {
            // Sort by date descending and pick the latest record.
            const sortedRecords = empRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            const latestRecord = sortedRecords[0];
            setSelectedRecord(latestRecord);
            setApprovedBy(latestRecord.approved_by || "");
            setReason(latestRecord.reason || "");
            setLocation(latestRecord.location || "");
            // Fetch the full date from in_time/out_time instead of combining with record.date.
            setClockIn(convertToDatetimeLocal(latestRecord.in_time));
            setClockOut(convertToDatetimeLocal(latestRecord.out_time));
            // Automatically check the clock update boxes if times exist.
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

  // When a row in the table is clicked, manually populate the form.
  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setApprovedBy(record.approved_by || "");
    setReason(record.reason || "");
    setLocation(record.location || "");
    setClockIn(convertToDatetimeLocal(record.in_time));
    setClockOut(convertToDatetimeLocal(record.out_time));
    setUpdateClockIn(!!record.in_time);
    setUpdateClockOut(!!record.out_time);
  };

  // When updating, if a clock checkbox is checked, convert the input (which is in datetime-local format)
  // to 12-hour format (e.g. "8:30AM"); otherwise use the original value.
  const handleUpdate = async () => {
    if (!selectedRecord) {
      alert("No record selected for update!");
      return;
    }
    const formattedClockIn =
      updateClockIn && clockIn
        ? moment(clockIn, "YYYY-MM-DDTHH:mm").format("h:mmA")
        : selectedRecord.in_time || "";
    const formattedClockOut =
      updateClockOut && clockOut
        ? moment(clockOut, "YYYY-MM-DDTHH:mm").format("h:mmA")
        : selectedRecord.out_time || "";

    const requestBody = {
      inTime: formattedClockIn,
      outTime: formattedClockOut,
      location,
      date: selectedRecord.date,
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
              <Form.Select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
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
              <Form.Control type="text" placeholder="Enter name" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
            </Form.Group>

            {/* Reason */}
            <Form.Group controlId="reason" className="mb-2">
              <Form.Label>Reason:</Form.Label>
              <Form.Control as="textarea" rows={2} placeholder="Enter reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Form.Group>

            {/* Location */}
            <Form.Group controlId="location" className="mb-2">
              <Form.Label>Location:</Form.Label>
              <Form.Control type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </Form.Group>

            {/* Clock In */}
            <Form.Group controlId="clockIn" className="mb-2">
              <Form.Check type="checkbox" label="Update Clock In" checked={updateClockIn} onChange={(e) => setUpdateClockIn(e.target.checked)} />
              <Form.Control
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={!updateClockIn}
              />
            </Form.Group>

            {/* Clock Out */}
            <Form.Group controlId="clockOut" className="mb-2">
              <Form.Check type="checkbox" label="Update Clock Out" checked={updateClockOut} onChange={(e) => setUpdateClockOut(e.target.checked)} />
              <Form.Control
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={!updateClockOut}
              />
            </Form.Group>

            {/* Full Day */}
            <Form.Group controlId="fullDay" className="mb-3">
              <Form.Check type="checkbox" label="Display Full day in Monthly Attendance" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} />
            </Form.Group>

            {/* Update Button */}
            <Button variant="warning" onClick={handleUpdate}>
              Update
            </Button>
          </Form>
        </Col>

        {/* Right Column: Attendance Records Table */}
        <Col md={8}>
          <Container className="p-3" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc" }}>
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
                    {/* Format the date column to show only "YYYY-MM-DD" */}
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
