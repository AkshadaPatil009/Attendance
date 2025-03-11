import React, { useState, useEffect } from "react";
import moment from "moment";
import { Container, Row, Col, Form, Table } from "react-bootstrap";
import axios from "axios";
import { io } from "socket.io-client"; // CHANGED: Import socket.io-client

/**
 * Return the text code and style for each record based on its work_hour and day.
 * Late Mark Logic: If an employee’s CI time is after 10:00 AM and day is "Full Day"
 * (and if the record is not for a Sunday or a site visit), then change the day to "Late Mark".
 */
function getDisplayForRecord(record) {
  // Apply late mark logic only if the record is "Full Day" and not a Sunday or a site visit.
  if (
    record.in_time &&
    record.day === "Full Day" &&
    !(record.location && record.location.toLowerCase().includes("sv"))
  ) {
    const recordDate = new Date(record.date);
    // Only apply late mark if the record's date is not Sunday.
    if (recordDate.getDay() !== 0) {
      const checkIn = moment(record.in_time, "YYYY-MM-DD HH:mm:ss");
      // Build a threshold moment for 10:00 AM of the same day.
      const threshold = moment(record.in_time, "YYYY-MM-DD").set({
        hour: 10,
        minute: 0,
        second: 0,
      });
      if (checkIn.isAfter(threshold)) {
        record.day = "Late Mark";
      }
    }
  }
  // New Site Visit Logic:
  // Only apply site visit logic if the record's day is NOT Holiday (or Sunday) so that those are not overwritten.
  if (
    record.day !== "Holiday" &&
    record.day !== "Sunday" &&
    record.location
  ) {
    const loc = record.location.toLowerCase();
    if (!(loc.includes("ro") || loc.includes("mo") || loc.includes("rso") || loc.includes("do") || loc.includes("wfh"))) {
      return { text: "SV", style: { backgroundColor: "#FFFF00" } };
    }
  }
  // If the record is not absent and work_hour is defined and less than 4.5,
  // show "AB" in a white box with bold black text.
  if (record.day !== "Absent" && record.work_hour !== undefined && record.work_hour < 4.5) {
    return {
      text: "AB",
      style: { backgroundColor: "#ffffff", color: "#000000", fontWeight: "bold" },
    };
  }
  // Determine display based on the (possibly updated) day value.
  switch (record.day) {
    case "Full Day":
      return { text: "P", style: { backgroundColor: "#90EE90" } }; // Light Green
    case "Half Day":
      return { text: "H", style: { backgroundColor: "#B0E0E6" } }; // Light Blue
    case "Late Mark":
      return {
        text: <span style={{ textDecoration: "underline" }}>P</span>,
        style: { backgroundColor: "#90EE90" },
      }; // Underlined P in full-day green
    case "Absent":
      return { text: "", style: { backgroundColor: "#FFC0CB" } }; // Pink
    case "Sunday":
      return { text: "SUN", style: { backgroundColor: "#ff9900" } }; // Orange
    case "Holiday":
      // Show P for holiday working employees.
      return { text: "P", style: { backgroundColor: "#ff0000", color: "#fff" } };
    default:
      return { text: "", style: {} };
  }
}

// Helper function to compare dates (ignoring time)
function areSameDate(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

const ViewAttendance = ({ viewMode, setViewMode }) => {
  // Filter states
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Attendance and holidays data from server
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // CHANGED: Set up a Socket.IO connection
  useEffect(() => {
    const socket = io("http://localhost:5000");
    socket.on("attendanceChanged", () => {
      fetchAttendance();
    });
    return () => {
      socket.off("attendanceChanged");
      socket.disconnect();
    };
  }, []);

  // Fetch employee list on mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/employees")
      .then((response) => {
        setEmployees(response.data);
      })
      .catch((error) => {
        console.error("Error fetching employee list:", error);
      });
  }, []);

  // Fetch holidays list on mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/holidays")
      .then((response) => {
        setHolidays(response.data);
      })
      .catch((error) => {
        console.error("Error fetching holidays:", error);
      });
  }, []);

  // CHANGED: Fetch attendance whenever filters change.
  useEffect(() => {
    fetchAttendance();
  }, [viewMode, selectedEmployee, selectedDate, selectedMonth, selectedYear]);

  const fetchAttendance = () => {
    const params = { viewMode };
    if (selectedEmployee) {
      params.empName = selectedEmployee;
    }
    if (viewMode === "datewise" && selectedDate) {
      params.date = selectedDate;
    }
    if (viewMode === "monthwise") {
      params.month = selectedMonth;
      params.year = selectedYear;
    }
    axios
      .get("http://localhost:5000/api/attendanceview", { params })
      .then((response) => {
        setAttendanceData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching attendance:", error);
      });
  };

  // Build a pivot-like table for Monthwise view
  const renderMonthwiseTable = () => {
    const daysInMonth = new Date(
      selectedYear,
      parseInt(selectedMonth, 10),
      0
    ).getDate();
    const pivotData = {};
    attendanceData.forEach((rec) => {
      const emp = rec.emp_name;
      if (!pivotData[emp]) {
        pivotData[emp] = { days: {}, presentDays: 0, lateMarkCount: 0, totalHours: 0, daysWorked: 0 };
      }
      const d = new Date(rec.date);
      const dayNum = d.getDate();
      pivotData[emp].days[dayNum] = rec;
      if (
        rec.day === "Full Day" ||
        rec.day === "Half Day" ||
        rec.day === "Late Mark" ||
        rec.day === "Working < 4.5 Hrs" ||
        (rec.day !== "Absent" && rec.work_hour !== undefined && rec.work_hour < 4.5)
      ) {
        pivotData[emp].presentDays++;
        pivotData[emp].daysWorked++;
        pivotData[emp].totalHours += rec.work_hour;
      }
      if (rec.day === "Late Mark") {
        pivotData[emp].lateMarkCount++;
      }
    });
    return (
      <div style={{ overflowX: "auto" }}>
        <Table bordered hover size="sm" style={{ tableLayout: "fixed", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ width: "180px" }}>Employee Name</th>
              <th style={{ width: "80px", textAlign: "center" }}>Present Days</th>
              <th style={{ width: "80px", textAlign: "center" }}>Late Mark</th>
              <th style={{ width: "80px", textAlign: "center" }}>Avg Hours</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => (
                <th key={dayNum} style={{ width: "40px", textAlign: "center" }}>{dayNum}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(pivotData).map((emp) => {
              const rowData = pivotData[emp];
              const avgHours =
                rowData.daysWorked > 0
                  ? (rowData.totalHours / rowData.daysWorked).toFixed(2)
                  : "0.00";
              return (
                <tr key={emp}>
                  <td style={{ width: "180px" }}>{emp}</td>
                  <td style={{ width: "80px", textAlign: "center" }}>{rowData.presentDays}</td>
                  <td style={{ width: "80px", textAlign: "center" }}>{rowData.lateMarkCount}</td>
                  <td style={{ width: "80px", textAlign: "center" }}>{avgHours}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNumber = i + 1;
                    const cellDate = new Date(selectedYear, parseInt(selectedMonth, 10) - 1, dayNumber);
                    const dayOfWeek = cellDate.getDay(); // 0 is Sunday
                    const holidayFound = holidays.find((holiday) =>
                      areSameDate(new Date(holiday.holiday_date), cellDate)
                    );
                    if (holidayFound) {
                      return (
                        <td
                          key={dayNumber}
                          style={{
                            width: "40px",
                            textAlign: "center",
                            backgroundColor: "#ff0000",
                            color: "#fff",
                          }}
                        />
                      );
                    }
                    const rec = rowData.days[dayNumber];
                    if (rec) {
                      const { text, style } = getDisplayForRecord(rec);
                      return (
                        <td key={dayNumber} style={{ width: "40px", textAlign: "center", ...style }}>
                          {text}
                        </td>
                      );
                    } else if (dayOfWeek === 0) {
                      return (
                        <td
                          key={dayNumber}
                          style={{ width: "40px", textAlign: "center", backgroundColor: "#ff9900" }}
                        ></td>
                      );
                    } else {
                      return <td key={dayNumber} style={{ width: "40px", textAlign: "center" }} />;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  };

  const renderDatewiseTable = () => {
    return (
      <div style={{ overflowX: "auto" }}>
        <Table bordered hover size="sm" style={{ fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Date</th>
              <th>In Time</th>
              <th>Out Time</th>
              <th>Work Hour</th>
              <th>Day Status</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((rec, idx) => {
              const { style } = getDisplayForRecord(rec);
              return (
                <tr key={idx} style={style}>
                  <td>{rec.emp_name}</td>
                  <td>{rec.date}</td>
                  <td>{rec.in_time}</td>
                  <td>{rec.out_time}</td>
                  <td>{rec.work_hour}</td>
                  <td>{rec.day}</td>
                  <td>{rec.location}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Container fluid className="p-1" style={{ backgroundColor: "#20B2AA" }}>
      <Row style={{ backgroundColor: "#20B2AA", padding: "5px", color: "#fff", borderRadius: "4px" }} className="g-1">
        <Col md={3}>
          <Form.Label className="fw-bold me-1">View By :</Form.Label>
          <div>
            <Form.Check
              type="radio"
              label="Monthwise"
              name="viewBy"
              value="monthwise"
              checked={viewMode === "monthwise"}
              onChange={(e) => setViewMode(e.target.value)}
              className="me-1"
            />
            <Form.Check
              type="radio"
              label="Datewise"
              name="viewBy"
              value="datewise"
              checked={viewMode === "datewise"}
              onChange={(e) => setViewMode(e.target.value)}
              className="me-1"
            />
          </div>
        </Col>
        <Col md={4}>
          <Row>
            <Col md={12}>
              <Form.Label>Employee Name</Form.Label>
              <Form.Select
                className="mb-1"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map((emp, index) => (
                  <option key={index} value={emp.emp_name}>
                    {emp.emp_name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            {viewMode === "monthwise" && (
              <>
                <Col md={6}>
                  <Form.Label>Month</Form.Label>
                  <Form.Select
                    className="mb-1"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label>Year</Form.Label>
                  <Form.Control
                    type="number"
                    className="mb-1"
                    placeholder="Enter Year"
                    value={selectedYear}
                    min="1900"
                    max="2100"
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </Col>
              </>
            )}
            {viewMode === "datewise" && (
              <Col md={12}>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  className="mb-1"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Col>
            )}
          </Row>
        </Col>
        <Col md={5}>
          <div className="d-flex flex-wrap align-items-center">
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div style={{ backgroundColor: "#90EE90", width: "20px", height: "20px", marginRight: "3px" }}></div>
              <span>P (Full Day)</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div style={{ backgroundColor: "#B0E0E6", width: "20px", height: "20px", marginRight: "3px" }}></div>
              <span>H (Half Day)</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div style={{ backgroundColor: "#FFC0CB", width: "20px", height: "20px", marginRight: "3px" }}></div>
              <span>AB (Absent)</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div style={{ backgroundColor: "#ff9900", width: "20px", height: "20px", marginRight: "3px" }}></div>
              <span>Sunday</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              {/* Late Mark legend for Full Day: Underlined P with white box */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  width: "20px",
                  height: "20px",
                  marginRight: "3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "underline",
                  color: "#000",
                }}
              >
                P
              </div>
              <span>P (Late Mark Full)</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div style={{ backgroundColor: "#FFFF00", width: "20px", height: "20px", marginRight: "3px" }}></div>
              <span>SV (Site Visit)</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div style={{ backgroundColor: "#ff0000", width: "20px", height: "20px", marginRight: "3px" }}></div>
              <span>Holiday</span>
            </div>
            <div className="legend-item d-flex align-items-center me-1 mb-1">
              <div
                style={{
                  backgroundColor: "#ffffff",
                  width: "20px",
                  height: "20px",
                  marginRight: "3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  color: "#000000",
                }}
              >
                AB
              </div>
              <span>(4.5 Hrs)</span>
            </div>
          </div>
        </Col>
      </Row>
      <Row className="mt-1">
        <Col>
          {viewMode === "datewise" && (
            <>
              <h5 className="mb-1">Datewise Attendance</h5>
              {renderDatewiseTable()}
            </>
          )}
          {viewMode === "monthwise" && (
            <>
              <h5 className="mb-1">Monthwise Attendance</h5>
              {renderMonthwiseTable()}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ViewAttendance;