import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";
import { io } from "socket.io-client"; // NEW: Import socket.io-client

const socket = io("http://localhost:5000"); // NEW: Connect to Socket.IO server

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
  const [updateClockIn, setUpdateClockIn] = useState(false);
  const [updateClockOut, setUpdateClockOut] = useState(false);
  const [fullDay, setFullDay] = useState(false);
  const [manualSelection, setManualSelection] = useState(false);

  // Function to fetch attendance records with cache busting.
  const fetchAttendanceRecords = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/attendance?t=${Date.now()}`
      );
      const sortedRecords = response.data.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setAttendanceRecords(sortedRecords);
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

  // Fetch data on mount
  useEffect(() => {
    fetchAttendanceRecords();
    fetchEmployees();
  }, []);

  // NEW: Listen for socket event to update attendance records
  useEffect(() => {
    socket.on("attendanceChanged", () => {
      fetchAttendanceRecords();
    });
    return () => {
      socket.off("attendanceChanged");
    };
  }, []);

  // When an employee is selected, fetch their records.
  useEffect(() => {
    if (selectedEmployee && !manualSelection) {
      axios
        .get(
          `http://localhost:5000/api/attendance?empName=${encodeURIComponent(
            selectedEmployee
          )}&t=${Date.now()}`
        )
        .then((response) => {
          const empRecords = response.data;
          if (empRecords.length > 0) {
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
    }
  }, [selectedEmployee, manualSelection]);

  // When a table row is clicked, populate the form.
  const handleRowClick = (record) => {
    setManualSelection(true);
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

  // Handle update: format times and send update request.
  const handleUpdate = async () => {
    if (!selectedRecord) {
      alert("No record selected for update!");
      return;
    }
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
      await axios.put(
        `http://localhost:5000/api/attendance/${selectedRecord.id}`,
        requestBody
      );
      alert("Attendance updated successfully!");
      // No need to manually fetch data – socket event will trigger the update.
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
            <Form.Group controlId="employeeName" className="mb-2">
              <Form.Label>Employee Name:</Form.Label>
              <Form.Select
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  setManualSelection(false);
                }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp, index) => (
                  <option key={index} value={emp.emp_name}>
                    {emp.emp_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="approvedBy" className="mb-2">
              <Form.Label>Approved by:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter name"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
            </Form.Group>

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

            <Form.Group controlId="location" className="mb-2">
              <Form.Label>Location:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Form.Group>

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

            <Form.Group controlId="fullDay" className="mb-3">
              <Form.Check
                type="checkbox"
                label="Display Full day in Monthly Attendance"
                checked={fullDay}
                onChange={(e) => setFullDay(e.target.checked)}
              />
            </Form.Group>

            <Button variant="warning" onClick={handleUpdate}>
              Update
            </Button>
          </Form>
        </Col>

        {/* Right Column: Attendance Records Table */}
        <Col md={8}>
          <Container
            className="p-3"
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid #ccc",
            }}
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
