import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { Container, Row, Col, Form, Button, Table, Modal } from "react-bootstrap";
import { io } from "socket.io-client";
import { FaFilter } from "react-icons/fa"; // Import for filter icon

const socket = io("http://localhost:5000"); // Connect to Socket.IO server

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

  // New state to control update confirmation modal
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  // New states for filter bar
  const [filterType, setFilterType] = useState("date"); // "date", "week", "month"
  const [filterDate, setFilterDate] = useState("");
  const [filterApprovedBy, setFilterApprovedBy] = useState("");
  // New state for Employee filter
  const [filterEmployee, setFilterEmployee] = useState("");

  // New state to control pagination (number of months to display)
  const [displayMonths, setDisplayMonths] = useState(1);

  // New state to control the visibility of the filter bar (icon toggle)
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Fetch attendance records with cache busting.
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

  // Fetch employees and sort them alphabetically by employee name
  const fetchEmployees = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/employees");
      setEmployees(response.data.sort((a, b) => a.emp_name.localeCompare(b.emp_name)));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Convert stored full datetime (e.g. "2025-03-06 9:07AM") 
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

  // Listen for socket event to update attendance records
  useEffect(() => {
    socket.on("attendanceChanged", () => {
      fetchAttendanceRecords();
    });
    return () => {
      socket.off("attendanceChanged");
    };
  }, []);

  // When an employee is selected, fetch their records if not a manual row selection
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

  // Populate the form when a table row is clicked
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

  // This function performs the actual update operation
  const doUpdate = async () => {
    if (!selectedRecord) {
      alert("No record selected for update! Please choose an employee record.");
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
      // Socket event triggers the refresh
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance record.");
    }
  };

  // Show confirmation modal when update is clicked.
  // If no record is selected, alert the user to select an employee.
  const handleUpdateClick = () => {
    if (!selectedEmployee || !selectedRecord) {
      alert("Please select an employee record to update attendance.");
      return;
    }
    setShowUpdateConfirm(true);
  };

  // Confirm update then perform the update operation
  const confirmUpdate = async () => {
    setShowUpdateConfirm(false);
    await doUpdate();
  };

  // Filter the attendanceRecords based on filter criteria
  const filteredRecords = attendanceRecords.filter((record) => {
    // Filter by Approved By
    let approvedByMatch = true;
    if (filterApprovedBy) {
      approvedByMatch =
        record.approved_by &&
        record.approved_by.toLowerCase().includes(filterApprovedBy.toLowerCase());
    }

    // Filter by Employee
    let employeeMatch = true;
    if (filterEmployee) {
      employeeMatch =
        record.emp_name &&
        record.emp_name.toLowerCase().includes(filterEmployee.toLowerCase());
    }

    // Filter by Date / Week / Month
    let dateMatch = true;
    if (filterDate) {
      if (filterType === "date") {
        dateMatch = moment(record.date).isSame(moment(filterDate, "YYYY-MM-DD"), "day");
      } else if (filterType === "week") {
        // HTML week input returns a value like "2025-W10"
        dateMatch = moment(record.date).format("GGGG-[W]WW") === filterDate;
      } else if (filterType === "month") {
        dateMatch = moment(record.date).isSame(moment(filterDate, "YYYY-MM"), "month");
      }
    }
    return approvedByMatch && dateMatch && employeeMatch;
  });

  // Pagination: If no filterDate is applied, group records by month and display only first N groups.
  let displayedRecords = filteredRecords;
  let uniqueMonths = [];
  if (!filterDate) {
    uniqueMonths = Array.from(
      new Set(filteredRecords.map((record) => moment(record.date).format("YYYY-MM")))
    ).sort((a, b) => moment(b, "YYYY-MM") - moment(a, "YYYY-MM"));
    const monthsToShow = uniqueMonths.slice(0, displayMonths);
    displayedRecords = filteredRecords.filter((record) =>
      monthsToShow.includes(moment(record.date).format("YYYY-MM"))
    );
  }

  // Prepare old and new values for the modal display
  const oldEmployee = selectedRecord ? selectedRecord.emp_name : "";
  const newEmployee = selectedEmployee;

  const oldApprovedBy = selectedRecord ? (selectedRecord.approved_by || "") : "";
  const newApprovedBy = approvedBy;

  const oldReason = selectedRecord ? (selectedRecord.reason || "") : "";
  const newReason = reason;

  const oldLocation = selectedRecord ? (selectedRecord.location || "") : "";
  const newLocation = location;

  const oldClockIn = selectedRecord && selectedRecord.in_time
    ? moment(selectedRecord.in_time, "YYYY-MM-DD h:mmA").format("YYYY-MM-DD h:mm A")
    : "";
  const newClockIn = updateClockIn && clockIn
    ? moment(clockIn).format("YYYY-MM-DD h:mm A")
    : oldClockIn;

  const oldClockOut = selectedRecord && selectedRecord.out_time
    ? moment(selectedRecord.out_time, "YYYY-MM-DD h:mmA").format("YYYY-MM-DD h:mm A")
    : "";
  const newClockOut = updateClockOut && clockOut
    ? moment(clockOut).format("YYYY-MM-DD h:mm A")
    : oldClockOut;

  return (
    <Container fluid className="mt-2 p-1" style={{ fontSize: "0.8rem" }}>
      <Row className="g-1">
        {/* Left Column: Attendance Records Table */}
        <Col md={9}>
          <Container
            className="p-1"
            style={{
              maxHeight: "500px",
              overflowY: "auto",
              border: "1px solid #ccc",
              fontSize: "0.75rem",
            }}
          >
            <h6 className="mb-2" style={{ fontSize: "0.85rem" }}>
              Attendance Records
            </h6>
            {/* Toggle Button placed under the Attendance Records header */}
            <div className="d-flex justify-content-start mb-1">
              <Button
                variant="light"
                size="sm"
                onClick={() => setShowFilterBar(!showFilterBar)}
                title="Toggle Filter"
                style={{ fontSize: "0.75rem" }}
              >
                <FaFilter />
              </Button>
            </div>
            {/* Filter Bar */}
            {showFilterBar && (
              <Container className="mb-2 p-1" style={{ border: "1px solid #ccc", fontSize: "0.75rem" }}>
                <Row className="align-items-end">
                  <Col md={3}>
                    <Form.Group controlId="filterType">
                      <Form.Label style={{ fontSize: "0.75rem" }}>Filter Type:</Form.Label>
                      <Form.Select
                        size="sm"
                        value={filterType}
                        onChange={(e) => {
                          setFilterType(e.target.value);
                          setFilterDate(""); // reset filter date when type changes
                        }}
                        style={{ fontSize: "0.75rem" }}
                      >
                        <option value="date">Date</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="filterDate">
                      <Form.Label style={{ fontSize: "0.75rem" }}>
                        Select {filterType.charAt(0).toUpperCase() + filterType.slice(1)}:
                      </Form.Label>
                      <Form.Control
                        size="sm"
                        type={filterType === "date" ? "date" : filterType}
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={{ fontSize: "0.75rem" }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="filterApprovedBy">
                      <Form.Label style={{ fontSize: "0.75rem" }}>Approved By:</Form.Label>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="Filter by name"
                        value={filterApprovedBy}
                        onChange={(e) => setFilterApprovedBy(e.target.value)}
                        style={{ fontSize: "0.75rem" }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="filterEmployee">
                      <Form.Label style={{ fontSize: "0.75rem" }}>Employee:</Form.Label>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="Filter by employee"
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        style={{ fontSize: "0.75rem" }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => {
                        // Reset filters
                        setFilterType("date");
                        setFilterDate("");
                        setFilterApprovedBy("");
                        setFilterEmployee("");
                      }}
                      style={{ fontSize: "0.75rem" }}
                    >
                      Clear Filters
                    </Button>
                  </Col>
                </Row>
              </Container>
            )}

            <Table bordered hover responsive size="sm" style={{ fontSize: "0.75rem" }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Approved By</th>
                  <th>Reason</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Work Hr</th>
                  <th>Day</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.map((record) => (
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
            {/* Show More Data Button */}
            {!filterDate && uniqueMonths.length > displayMonths && (
              <div className="text-center mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDisplayMonths(displayMonths + 1)}
                  style={{ fontSize: "0.75rem" }}
                >
                  Show More Data
                </Button>
              </div>
            )}
          </Container>
        </Col>

        {/* Right Column: Update Attendance Form */}
        <Col md={3} style={{ border: "1px solid #ccc", padding: "6px" }}>
          <h6 className="mb-2" style={{ fontSize: "0.9rem" }}>
            Update Attendance
          </h6>
          <Form style={{ fontSize: "0.8rem" }}>
            <Form.Group controlId="employeeName" className="mb-1">
              <Form.Label style={{ fontSize: "0.75rem" }}>
                Employee Name:
              </Form.Label>
              <Form.Select
                size="sm"
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  setManualSelection(false);
                }}
                style={{ fontSize: "0.75rem" }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp, index) => (
                  <option key={index} value={emp.emp_name}>
                    {emp.emp_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="approvedBy" className="mb-1">
              <Form.Label style={{ fontSize: "0.75rem" }}>
                Approved by:
              </Form.Label>
              <Form.Control
                size="sm"
                type="text"
                placeholder="Enter name"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                style={{ fontSize: "0.75rem" }}
              />
            </Form.Group>

            <Form.Group controlId="reason" className="mb-1">
              <Form.Label style={{ fontSize: "0.75rem" }}>
                Reason:
              </Form.Label>
              <Form.Control
                size="sm"
                as="textarea"
                rows={2}
                placeholder="Enter reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ fontSize: "0.75rem" }}
              />
            </Form.Group>

            <Form.Group controlId="location" className="mb-1">
              <Form.Label style={{ fontSize: "0.75rem" }}>
                Location:
              </Form.Label>
              <Form.Control
                size="sm"
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ fontSize: "0.75rem" }}
              />
            </Form.Group>

            <Form.Group controlId="clockIn" className="mb-1">
              <Form.Check
                type="checkbox"
                label="Update Clock In"
                checked={updateClockIn}
                onChange={(e) => setUpdateClockIn(e.target.checked)}
                style={{ fontSize: "0.75rem" }}
              />
              <Form.Control
                size="sm"
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={!updateClockIn}
                style={{ fontSize: "0.75rem" }}
              />
            </Form.Group>

            <Form.Group controlId="clockOut" className="mb-1">
              <Form.Check
                type="checkbox"
                label="Update Clock Out"
                checked={updateClockOut}
                onChange={(e) => setUpdateClockOut(e.target.checked)}
                style={{ fontSize: "0.75rem" }}
              />
              <Form.Control
                size="sm"
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={!updateClockOut}
                style={{ fontSize: "0.75rem" }}
              />
            </Form.Group>

            <Form.Group controlId="fullDay" className="mb-2">
              <Form.Check
                type="checkbox"
                label="Display Full day in Monthly Attendance"
                checked={fullDay}
                onChange={(e) => setFullDay(e.target.checked)}
                style={{ fontSize: "0.75rem" }}
              />
            </Form.Group>

            <Button
              variant="warning"
              size="sm"
              onClick={handleUpdateClick}
              style={{ fontSize: "0.75rem" }}
            >
              Update
            </Button>
          </Form>
        </Col>
      </Row>

      {/* Confirmation Modal for Update */}
      <Modal show={showUpdateConfirm} onHide={() => setShowUpdateConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord ? (
            <>
              {oldEmployee !== newEmployee && (
                <p>
                  <strong>Employee:</strong> Old: {oldEmployee} - New: {newEmployee}
                </p>
              )}
              {oldApprovedBy !== newApprovedBy && (
                <p>
                  <strong>Approved By:</strong> Old: {oldApprovedBy} - New: {newApprovedBy}
                </p>
              )}
              {oldReason !== newReason && (
                <p>
                  <strong>Reason:</strong> Old: {oldReason} - New: {newReason}
                </p>
              )}
              {oldLocation !== newLocation && (
                <p>
                  <strong>Location:</strong> Old: {oldLocation} - New: {newLocation}
                </p>
              )}
              {oldClockIn !== newClockIn && (
                <p>
                  <strong>Clock In:</strong> Old: {oldClockIn} - New: {newClockIn}
                </p>
              )}
              {oldClockOut !== newClockOut && (
                <p>
                  <strong>Clock Out:</strong> Old: {oldClockOut} - New: {newClockOut}
                </p>
              )}
              {oldEmployee === newEmployee &&
               oldApprovedBy === newApprovedBy &&
               oldReason === newReason &&
               oldLocation === newLocation &&
               oldClockIn === newClockIn &&
               oldClockOut === newClockOut && (
                 <p>No changes detected.</p>
              )}
            </>
          ) : (
            <p>No record selected.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateConfirm(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={confirmUpdate}>
            Confirm Update
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UpdateAttendance;
