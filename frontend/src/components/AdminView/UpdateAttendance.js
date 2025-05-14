import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { Container, Row, Col, Form, Button, Table, Modal } from "react-bootstrap";
import { io } from "socket.io-client";
import { FaFilter } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  const [manualSelection, setManualSelection] = useState(false);

  // NEW: States for toggling each field update
  const [updateApprovedBy, setUpdateApprovedBy] = useState(false);
  const [updateReason, setUpdateReason] = useState(false);
  const [updateLocation, setUpdateLocation] = useState(false);

  // State to control update confirmation modal
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  // States for filter bar
  const [filterType, setFilterType] = useState("date"); // "date", "week", "month"
  const [filterDate, setFilterDate] = useState("");
  const [filterApprovedBy, setFilterApprovedBy] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  // Pagination control
  const [displayMonths, setDisplayMonths] = useState(1);

  // Toggle filter bar visibility
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/attendance?t=${Date.now()}`);
      const sorted = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceRecords(sorted);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      toast.error("Failed to load attendance records.");
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/employees`);
      setEmployees(response.data.sort((a, b) => a.emp_name.localeCompare(b.emp_name)));
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees.");
    }
  };

  // Convert stored datetime to HTML datetime-local format
  const convertToDatetimeLocal = (fullDateTime) => {
    if (!fullDateTime) return "";
    return moment(fullDateTime, "YYYY-MM-DD h:mmA").format("YYYY-MM-DDTHH:mm");
  };

  // On mount: load data
  useEffect(() => {
    fetchAttendanceRecords();
    fetchEmployees();
  }, []);

  // Socket.IO for real-time updates
  useEffect(() => {
    const socket = io(API_URL);
    socket.on("attendanceChanged", fetchAttendanceRecords);
    return () => {
      socket.off("attendanceChanged", fetchAttendanceRecords);
      socket.disconnect();
    };
  }, []);

  // Load latest record when employee selected (unless manual row click)
  useEffect(() => {
    if (selectedEmployee && !manualSelection) {
      axios
        .get(
          `${API_URL}/api/attendance?empName=${encodeURIComponent(
            selectedEmployee
          )}&t=${Date.now()}`
        )
        .then((response) => {
          const sorted = response.data.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          if (sorted.length > 0) {
            const latest = sorted[0];
            setSelectedRecord(latest);
            setApprovedBy(latest.approved_by || "");
            setReason(latest.reason || "");
            setLocation(latest.location || "");
            setClockIn(convertToDatetimeLocal(latest.in_time));
            setClockOut(convertToDatetimeLocal(latest.out_time));
            // Reset all toggles
            setUpdateClockIn(false);
            setUpdateClockOut(false);
            setUpdateApprovedBy(false);
            setUpdateReason(false);
            setUpdateLocation(false);
          } else {
            // No records
            setSelectedRecord(null);
            setApprovedBy("");
            setReason("");
            setLocation("");
            setClockIn("");
            setClockOut("");
            setUpdateClockIn(false);
            setUpdateClockOut(false);
            setUpdateApprovedBy(false);
            setUpdateReason(false);
            setUpdateLocation(false);
          }
        })
        .catch((error) => {
          console.error("Error fetching attendance for selected employee:", error);
          toast.error("Error fetching attendance for employee.");
        });
    }
  }, [selectedEmployee, manualSelection]);

  // Handle table row click (manual selection)
  const handleRowClick = (record) => {
    setManualSelection(true);
    setSelectedRecord(record);
    setSelectedEmployee(record.emp_name);
    setApprovedBy(record.approved_by || "");
    setReason(record.reason || "");
    setLocation(record.location || "");
    setClockIn(convertToDatetimeLocal(record.in_time));
    setClockOut(convertToDatetimeLocal(record.out_time));
    setUpdateClockIn(false);
    setUpdateClockOut(false);
    setUpdateApprovedBy(false);
    setUpdateReason(false);
    setUpdateLocation(false);
  };

  // Perform update
  const doUpdate = async () => {
    if (!selectedRecord) {
      toast.warn("No record selected for update.");
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
      location: updateLocation ? location : selectedRecord.location,
      date: recordDate,
      approved_by: updateApprovedBy ? approvedBy : selectedRecord.approved_by,
      reason: updateReason ? reason : selectedRecord.reason,
    };

    try {
      await axios.put(
        `${API_URL}/api/attendance/${selectedRecord.id}`,
        requestBody
      );
      toast.success("Attendance updated successfully!");
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance record.");
    }
  };

  // Show confirmation modal
  const handleUpdateClick = () => {
    if (!selectedEmployee || !selectedRecord) {
      toast.warn("Please select an employee record to update.");
      return;
    }
    setShowUpdateConfirm(true);
  };

  // Confirm and execute update
  const confirmUpdate = async () => {
    setShowUpdateConfirm(false);
    await doUpdate();
  };

  // Filtering logic
  const filteredRecords = attendanceRecords.filter((record) => {
    let approvedMatch = true;
    if (filterApprovedBy) {
      approvedMatch =
        record.approved_by &&
        record.approved_by.toLowerCase().includes(filterApprovedBy.toLowerCase());
    }
    let employeeMatch = true;
    if (filterEmployee) {
      employeeMatch =
        record.emp_name &&
        record.emp_name.toLowerCase().includes(filterEmployee.toLowerCase());
    }
    let dateMatch = true;
    if (filterDate) {
      if (filterType === "date") {
        dateMatch = moment(record.date).isSame(
          moment(filterDate, "YYYY-MM-DD"),
          "day"
        );
      } else if (filterType === "week") {
        dateMatch =
          moment(record.date).format("GGGG-[W]WW") === filterDate;
      } else if (filterType === "month") {
        dateMatch = moment(record.date).isSame(
          moment(filterDate, "YYYY-MM"),
          "month"
        );
      }
    }
    return approvedMatch && employeeMatch && dateMatch;
  });

  // Pagination by month groups
  let displayedRecords = filteredRecords;
  let uniqueMonths = [];
  if (!filterDate) {
    uniqueMonths = Array.from(
      new Set(
        filteredRecords.map((r) =>
          moment(r.date).format("YYYY-MM")
        )
      )
    ).sort((a, b) =>
      moment(b, "YYYY-MM").diff(moment(a, "YYYY-MM"))
    );
    const monthsToShow = uniqueMonths.slice(0, displayMonths);
    displayedRecords = filteredRecords.filter((r) =>
      monthsToShow.includes(moment(r.date).format("YYYY-MM"))
    );
  }

  // Prepare old/new values for modal
  const oldApprovedBy = selectedRecord?.approved_by || "";
  const newApprovedBy = approvedBy;
  const oldReason = selectedRecord?.reason || "";
  const newReason = reason;
  const oldLocation = selectedRecord?.location || "";
  const newLocation = location;
  const oldClockIn = selectedRecord?.in_time
    ? moment(selectedRecord.in_time, "YYYY-MM-DD h:mmA").format(
        "YYYY-MM-DD h:mm A"
      )
    : "";
  const newClockIn = updateClockIn && clockIn
    ? moment(clockIn).format("YYYY-MM-DD h:mm A")
    : oldClockIn;
  const oldClockOut = selectedRecord?.out_time
    ? moment(selectedRecord.out_time, "YYYY-MM-DD h:mmA").format(
        "YYYY-MM-DD h:mm A"
      )
    : "";
  const newClockOut = updateClockOut && clockOut
    ? moment(clockOut).format("YYYY-MM-DD h:mm A")
    : oldClockOut;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Container fluid className="mt-2 p-1" style={{ fontSize: "0.8rem" }}>
        <Row className="g-1">
          {/* Left Column: Attendance Records */}
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
              {showFilterBar && (
                <Container
                  className="mb-2 p-1"
                  style={{
                    border: "1px solid #ccc",
                    fontSize: "0.75rem",
                  }}
                >
                  <Row className="align-items-end">
                    <Col md={3}>
                      <Form.Group controlId="filterType">
                        <Form.Label style={{ fontSize: "0.75rem" }}>
                          Filter Type:
                        </Form.Label>
                        <Form.Select
                          size="sm"
                          value={filterType}
                          onChange={(e) => {
                            setFilterType(e.target.value);
                            setFilterDate("");
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
                          Select{" "}
                          {filterType.charAt(0).toUpperCase() +
                            filterType.slice(1)}
                          :
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
                        <Form.Label style={{ fontSize: "0.75rem" }}>
                          Approved By:
                        </Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Filter by name"
                          value={filterApprovedBy}
                          onChange={(e) =>
                            setFilterApprovedBy(e.target.value)
                          }
                          style={{ fontSize: "0.75rem" }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group controlId="filterEmployee">
                        <Form.Label style={{ fontSize: "0.75rem" }}>
                          Employee:
                        </Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Filter by employee"
                          value={filterEmployee}
                          onChange={(e) =>
                            setFilterEmployee(e.target.value)
                          }
                          style={{ fontSize: "0.75rem" }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => {
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
              <Table
                bordered
                hover
                responsive
                size="sm"
                style={{ fontSize: "0.75rem" }}
              >
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
                    <tr
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                    >
                      <td>{record.emp_name}</td>
                      <td>{record.approved_by}</td>
                      <td>{record.reason}</td>
                      <td>{record.in_time}</td>
                      <td>{record.out_time}</td>
                      <td>{record.location}</td>
                      <td>
                        {moment(record.date).format("YYYY-MM-DD")}
                      </td>
                      <td>{record.work_hour}</td>
                      <td>{record.day}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!filterDate && uniqueMonths.length > displayMonths && (
                <div className="text-center mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setDisplayMonths(displayMonths + 1)
                    }
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
                  {employees.map((emp, idx) => (
                    <option key={idx} value={emp.emp_name}>
                      {emp.emp_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group controlId="approvedBy" className="mb-1">
                <Form.Check
                  type="checkbox"
                  label="Update Approved By"
                  checked={updateApprovedBy}
                  onChange={(e) =>
                    setUpdateApprovedBy(e.target.checked)
                  }
                  style={{ fontSize: "0.75rem" }}
                />
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Enter name"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  disabled={!updateApprovedBy}
                  style={{ fontSize: "0.75rem" }}
                />
              </Form.Group>

              <Form.Group controlId="reason" className="mb-1">
                <Form.Check
                  type="checkbox"
                  label="Update Reason"
                  checked={updateReason}
                  onChange={(e) => setUpdateReason(e.target.checked)}
                  style={{ fontSize: "0.75rem" }}
                />
                <Form.Control
                  size="sm"
                  as="textarea"
                  rows={2}
                  placeholder="Enter reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={!updateReason}
                  style={{ fontSize: "0.75rem" }}
                />
              </Form.Group>

              <Form.Group controlId="location" className="mb-1">
                <Form.Check
                  type="checkbox"
                  label="Update Location"
                  checked={updateLocation}
                  onChange={(e) =>
                    setUpdateLocation(e.target.checked)
                  }
                  style={{ fontSize: "0.75rem" }}
                />
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!updateLocation}
                  style={{ fontSize: "0.75rem" }}
                />
              </Form.Group>

              <Form.Group controlId="clockIn" className="mb-1">
                <Form.Check
                  type="checkbox"
                  label="Update Clock In"
                  checked={updateClockIn}
                  onChange={(e) =>
                    setUpdateClockIn(e.target.checked)
                  }
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
                  onChange={(e) =>
                    setUpdateClockOut(e.target.checked)
                  }
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
      </Container>

      {/* Confirmation Modal */}
      <Modal
        show={showUpdateConfirm}
        onHide={() => setShowUpdateConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord ? (
            <>
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
              {oldApprovedBy === newApprovedBy &&
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
    </>
  );
};

export default UpdateAttendance;
