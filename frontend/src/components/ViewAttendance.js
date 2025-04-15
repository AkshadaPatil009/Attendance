import React, { useState, useEffect, useCallback, useRef } from "react";
import moment from "moment";
import { Container, Row, Col, Form, Table, Button } from "react-bootstrap";
import axios from "axios";
import html2canvas from "html2canvas";
import { io } from "socket.io-client";

// Define API_URL from environment variable (fallback to localhost for development)
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Return the text code and style for a combined record based on its total work_hour and day.
 * Late Mark Logic: If an employee’s CI time is after 10:00 AM and day is "Full Day"
 * (and if the record is not for a Sunday or a site visit), then change the day to "Late Mark".
 * 
 * Updated Site Visit Logic: If the record qualifies as site visit (location exists and does not include
 * any valid code), check the CI/CO. If missing either check‑in or check‑out, show SV.I (Site Visit Incomplete);
 * if both are present then show SV.P (Site Visit Present).
 */
function getDisplayForRecord(record) {
  // If the record is for Holiday, immediately return holiday style.
  if (record.day === "Holiday") {
    return { text: "P", style: { backgroundColor: "#ff0000", color: "#fff" } };
  }

  // Apply late mark logic only if the record is "Full Day" and not a site visit.
  if (
    record.in_time &&
    record.day === "Full Day" &&
    !(record.location && record.location.toLowerCase().includes("sv"))
  ) {
    const recordDate = new Date(record.date);
    // Only apply late mark if the record's date is not Sunday.
    if (recordDate.getDay() !== 0) {
      const checkIn = moment(record.in_time, "YYYY-MM-DD HH:mm:ss");
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

  // Updated Site Visit Logic: if location exists and the day is not Sunday or Holiday.
  if (record.day !== "Sunday" && record.day !== "Holiday" && record.location) {
    const validCodes = ["ro", "mo", "rso", "do", "wfh"];
    const words = record.location.toLowerCase().trim().split(/\s+/);
    const hasValidCode = words.some((word) => validCodes.includes(word));
    if (!hasValidCode) {
      // Check if either CI or CO is missing.
      if (!record.in_time || !record.out_time) {
        return { text: "SV.I", style: { backgroundColor: "#FFFF00" } };
      } else {
        return { text: "SV.P", style: { backgroundColor: "#FFFF00" } };
      }
    }
  }

  // If work_hour is less than 4.5 and record is not absent, show "AB".
  if (
    record.day !== "Absent" &&
    record.work_hour !== undefined &&
    record.work_hour < 4.5
  ) {
    return {
      text: "AB",
      style: { backgroundColor: "#ffffff", color: "#000", fontWeight: "bold" },
    };
  }

  // Determine display based on the (possibly updated) day value.
  switch (record.day) {
    case "Full Day":
      return { text: "P", style: { backgroundColor: "#90EE90" } };
    case "Half Day":
      return { text: "H", style: { backgroundColor: "#B0E0E6" } };
    case "Late Mark":
      return {
        text: <span style={{ textDecoration: "underline" }}>P</span>,
        style: { backgroundColor: "#90EE90" },
      };
    case "Absent":
      return { text: "", style: { backgroundColor: "#FFC0CB" } };
    case "Sunday":
      return { text: "SUN", style: { backgroundColor: "#ff9900" } };
    case "SV.I":
      return { text: "SV.I", style: { backgroundColor: "#FFFF00" } };
    case "SV.P":
      return { text: "SV.P", style: { backgroundColor: "#FFFF00" } };
    default:
      return { text: "", style: {} };
  }
}

// Helper function to apply late mark logic.
function applyLateMarkLogic(record) {
  if (
    record.in_time &&
    record.day === "Full Day" &&
    !(record.location && record.location.toLowerCase().includes("sv"))
  ) {
    const recordDate = new Date(record.date);
    if (recordDate.getDay() !== 0) {
      const checkIn = moment(record.in_time, "YYYY-MM-DD HH:mm:ss");
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
}

// Compare two dates ignoring time.
function areSameDate(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

const ViewAttendance = ({ viewMode, setViewMode }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Ref for the container (for PNG download)
  const attendanceRef = useRef(null);

  // Download PNG function (temporarily hides the download button)
  const handleDownload = async () => {
    try {
      // Hide the download button using its ID ("downloadReport")
      const downloadButton = document.getElementById("downloadReport");
      if (downloadButton) {
        downloadButton.style.visibility = "hidden";
      }
      // Wait for the DOM to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(attendanceRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `attendance_${viewMode}.png`;
      link.click();

      // Restore the download button's visibility
      if (downloadButton) {
        downloadButton.style.visibility = "visible";
      }
    } catch (error) {
      console.error("Error generating image", error);
    }
  };

  // Fetch employees.
  useEffect(() => {
    axios
      .get(`${API_URL}/api/employees`)
      .then((response) => {
        const sortedEmployees = [...response.data].sort((a, b) =>
          a.emp_name.localeCompare(b.emp_name)
        );
        setEmployees(sortedEmployees);
      })
      .catch((error) => {
        console.error("Error fetching employees:", error);
      });
  }, []);

  // Fetch holidays.
  useEffect(() => {
    axios
      .get(`${API_URL}/api/holidays`)
      .then((response) => {
        setHolidays(response.data);
      })
      .catch((error) => {
        console.error("Error fetching holidays:", error);
      });
  }, []);

  // Fetch attendance based on filters.
  const fetchAttendance = useCallback(() => {
    const params = { viewMode };
    if (selectedEmployee) params.empName = selectedEmployee;
    if (viewMode === "datewise" && selectedDate) params.date = selectedDate;
    if (viewMode === "monthwise") {
      params.month = selectedMonth;
      params.year = selectedYear;
    }
    axios
      .get(`${API_URL}/api/attendanceview`, { params })
      .then((response) => {
        setAttendanceData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching attendance:", error);
      });
  }, [viewMode, selectedEmployee, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ------------------ Socket.io Integration ------------------
  useEffect(() => {
    const socket = io(API_URL);
    socket.on("attendanceChanged", (data) => {
      console.log("Attendance changed event received:", data);
      fetchAttendance();
    });
    socket.on("holidayChanged", (data) => {
      console.log("Holiday changed event received:", data);
      axios
        .get(`${API_URL}/api/holidays`)
        .then((response) => {
          setHolidays(response.data);
        })
        .catch((error) => {
          console.error("Error fetching holidays:", error);
        });
      fetchAttendance();
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchAttendance]);
  // -----------------------------------------------------------

  // Group attendance records per employee per day.
  const groupAttendanceByDay = () => {
    const pivotData = {};
    attendanceData.forEach((rec) => {
      // First, apply late mark logic.
      applyLateMarkLogic(rec);

      // Updated Site Visit Logic in grouping: if location exists and the record is not for Sunday/Holiday.
      if (rec.location && rec.day !== "Sunday" && rec.day !== "Holiday") {
        const validCodes = ["ro", "mo", "rso", "do", "wfh"];
        const words = rec.location.toLowerCase().trim().split(/\s+/);
        const hasValidCode = words.some((word) => validCodes.includes(word));
        if (!hasValidCode) {
          if (!rec.in_time || !rec.out_time) {
            rec.day = "SV.I";
          } else {
            rec.day = "SV.P";
          }
        }
      }
      const emp = rec.emp_name;
      if (!pivotData[emp]) {
        pivotData[emp] = {
          days: {},
          presentDays: 0,
          lateMarkCount: 0,
          totalHours: 0,
          daysWorked: 0,
        };
      }
      const recDate = new Date(rec.date);
      const dayNum = recDate.getDate();
      if (!pivotData[emp].days[dayNum]) {
        pivotData[emp].days[dayNum] = {
          work_hour: Number(rec.work_hour) || 0,
          in_time: rec.in_time || "",
          out_time: rec.out_time || "",
          day: rec.day,
          location: rec.location || "",
          date: rec.date,
        };
      } else {
        pivotData[emp].days[dayNum].work_hour += Number(rec.work_hour) || 0;
        if (rec.in_time) {
          if (
            !pivotData[emp].days[dayNum].in_time ||
            moment(rec.in_time, "YYYY-MM-DD HH:mm:ss").isBefore(
              moment(pivotData[emp].days[dayNum].in_time, "YYYY-MM-DD HH:mm:ss")
            )
          ) {
            pivotData[emp].days[dayNum].in_time = rec.in_time;
          }
        }
        if (rec.out_time) {
          if (
            !pivotData[emp].days[dayNum].out_time ||
            moment(rec.out_time, "YYYY-MM-DD HH:mm:ss").isAfter(
              moment(pivotData[emp].days[dayNum].out_time, "YYYY-MM-DD HH:mm:ss")
            )
          ) {
            pivotData[emp].days[dayNum].out_time = rec.out_time;
          }
        }
        if (rec.day === "Late Mark") {
          pivotData[emp].days[dayNum].day = "Late Mark";
        }
        if (!pivotData[emp].days[dayNum].location && rec.location) {
          pivotData[emp].days[dayNum].location = rec.location;
        }
      }
    });

    // Compute a new "displayStatus" for each aggregated day without modifying the original "day"
    Object.keys(pivotData).forEach((emp) => {
      Object.keys(pivotData[emp].days).forEach((dayKey) => {
        let rec = pivotData[emp].days[dayKey];
        const recordDate = new Date(rec.date);
        // Compute displayStatus for records not marked as SV.I, SV.P, Absent, or Holiday.
        if (
          rec.in_time &&
          rec.day !== "SV.I" &&
          rec.day !== "SV.P" &&
          rec.day !== "Absent" &&
          rec.day !== "Holiday"
        ) {
          if (rec.work_hour < 4.5) {
            rec.displayStatus = "AB";
          } else if (rec.work_hour < 8.5) {
            rec.displayStatus = "Half Day";
          } else {
            const checkIn = moment(rec.in_time, "YYYY-MM-DD HH:mm:ss");
            const threshold = moment(rec.in_time, "YYYY-MM-DD").set({
              hour: 10,
              minute: 0,
              second: 0,
            });
            rec.displayStatus = checkIn.isAfter(threshold)
              ? "Late Mark"
              : "Full Day";
          }
          if (recordDate.getDay() === 0) {
            rec.day = rec.displayStatus;
          }
        } else {
          rec.displayStatus = rec.day;
        }
      });
    });

    // Calculate summary stats per employee.
    Object.keys(pivotData).forEach((emp) => {
      const days = pivotData[emp].days;
      Object.keys(days).forEach((dayKey) => {
        const currentDay = days[dayKey];
        if (currentDay.day === "SV.P") {
          pivotData[emp].presentDays += 1;
          pivotData[emp].daysWorked += 1;
          pivotData[emp].totalHours += currentDay.work_hour;
        } else if (currentDay.day === "SV.I") {
          // Do not count as present if site visit is incomplete
          pivotData[emp].totalHours += currentDay.work_hour;
        } else if (currentDay.day !== "Absent" && currentDay.work_hour >= 4.5) {
          if (currentDay.day === "Half Day") {
            pivotData[emp].presentDays += 0.5;
            pivotData[emp].daysWorked += 0.5;
          } else {
            pivotData[emp].presentDays += 1;
            pivotData[emp].daysWorked += 1;
          }
          pivotData[emp].totalHours += currentDay.work_hour;
        }
        if (currentDay.day === "Late Mark") {
          pivotData[emp].lateMarkCount++;
        }
      });
    });
    return pivotData;
  };

  // Updated renderDatewiseTable: now shows "Site Visit Incomplete" or "Site Visit Present"
  const renderDatewiseTable = () => {
    const sortedData = [...attendanceData].sort((a, b) =>
      a.emp_name.localeCompare(b.emp_name)
    );
    return (
      <div style={{ overflowX: "auto" }}>
        <Table
          bordered
          hover
          size="sm"
          style={{ fontSize: "0.75rem", minWidth: "800px" }}
        >
          <thead style={{ fontSize: "0.75rem" }}>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>In Time</th>
              <th>Out Time</th>
              <th>Work Hr</th>
              <th>Day</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((rec, idx) => {
              const dayDisplay = getDisplayForRecord(rec);

              // Determine full text for Day column,
              // with site‑visit detail if applicable:
              let fullText = "";
              const validCodes = ["ro", "mo", "rso", "do", "wfh"];
              const hasValidCode =
                rec.location &&
                rec.location
                  .toLowerCase()
                  .trim()
                  .split(/\s+/)
                  .some((word) => validCodes.includes(word));

              if (rec.location && !hasValidCode) {
                // Site Visit
                if (!rec.in_time || !rec.out_time) {
                  fullText = "Site Visit Incomplete";
                } else {
                  fullText = "Site Visit Present";
                }
              } else {
                // All other cases
                switch (rec.day) {
                  case "Holiday":
                    fullText = "Holiday";
                    break;
                  case "Full Day":
                    fullText = "Full Day";
                    break;
                  case "Half Day":
                    fullText = "Half Day";
                    break;
                  case "Late Mark":
                    fullText = "Full Day (Late Mark)";
                    break;
                  case "Absent":
                    fullText = "Absent";
                    break;
                  case "Sunday":
                    fullText = "Sunday";
                    break;
                  default:
                    fullText = rec.day;
                }
              }

              return (
                <tr key={idx}>
                  <td>{rec.emp_name}</td>
                  <td>{moment(rec.date).format("YYYY-MM-DD")}</td>
                  <td>{rec.in_time}</td>
                  <td>{rec.out_time}</td>
                  <td>{rec.work_hour}</td>
                  <td style={dayDisplay.style}>{fullText}</td>
                  <td>{rec.location}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  };

  const renderMonthwiseTable = () => {
    const daysInMonth = new Date(selectedYear, parseInt(selectedMonth, 10), 0).getDate();
    const pivotData = groupAttendanceByDay();
    return (
      <div style={{ overflowX: "auto" }}>
        <Table
          bordered
          hover
          size="sm"
          style={{
            tableLayout: "fixed",
            fontSize: "0.75rem",
            minWidth: "900px",
          }}
          className="mb-0 custom-border-table"
        >
          <thead style={{ fontSize: "0.75rem" }}>
            <tr>
              <th style={{ width: "180px" }}>Employee Name</th>
              <th style={{ width: "60px", textAlign: "center" }}>Present</th>
              <th style={{ width: "60px", textAlign: "center" }}>Late</th>
              <th style={{ width: "60px", textAlign: "center" }}>AvgHr</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => (
                <th key={dayNum} style={{ width: "30px", textAlign: "center" }}>
                  {dayNum}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ fontSize: "0.75rem" }}>
            {Object.keys(pivotData)
              .sort((a, b) => a.localeCompare(b))
              .map((emp) => {
                const rowData = pivotData[emp];
                // NEW: calculate average in hours.minutes format
                let avgHours;
                if (rowData.daysWorked > 0) {
                  const avgDecimal = rowData.totalHours / rowData.daysWorked;
                  const totalMins = Math.round(avgDecimal * 60);
                  const hrs = Math.floor(totalMins / 60);
                  const mins = totalMins % 60;
                  avgHours = `${hrs}.${mins < 10 ? "0" : ""}${mins}`;
                } else {
                  avgHours = "0.00";
                }
                return (
                  <tr key={emp}>
                    <td style={{ width: "180px" }}>{emp}</td>
                    <td style={{ width: "60px", textAlign: "center" }}>
                      {rowData.presentDays}
                    </td>
                    <td style={{ width: "60px", textAlign: "center" }}>
                      {rowData.lateMarkCount}
                    </td>
                    <td style={{ width: "60px", textAlign: "center" }}>
                      {avgHours}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dayNumber = i + 1;
                      const cellDate = new Date(
                        selectedYear,
                        parseInt(selectedMonth, 10) - 1,
                        dayNumber
                      );
                      const dayOfWeek = cellDate.getDay(); // 0 is Sunday
                      const holidayFound = holidays.find((holiday) =>
                        areSameDate(new Date(holiday.holiday_date), cellDate)
                      );
                      let forcedStyle = {};
                      let cellText = "";
                      const rec = rowData.days[dayNumber];
                      if (holidayFound) {
                        forcedStyle = { backgroundColor: "#ff0000", color: "#fff" };
                      } else if (dayOfWeek === 0) {
                        forcedStyle = { backgroundColor: "#ff9900" };
                      }
                      if (rec) {
                        const display = getDisplayForRecord({
                          ...rec,
                          day: rec.displayStatus,
                        });
                        cellText = display.text;
                        if (!holidayFound && dayOfWeek !== 0) {
                          forcedStyle = { ...display.style };
                        }
                      }
                      return (
                        <td
                          key={dayNumber}
                          style={{
                            width: "30px",
                            textAlign: "center",
                            ...forcedStyle,
                          }}
                        >
                          {cellText}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <div ref={attendanceRef}>
      <Container
        fluid
        className="p-1"
        style={{ backgroundColor: "#20B2AA", fontSize: "0.75rem" }}
      >
        <Row
          className="g-0"
          style={{
            backgroundColor: "#20B2AA",
            padding: "3px",
            color: "#fff",
            borderRadius: "4px",
          }}
        >
          {/* Filter Controls */}
          <Col md={3}>
            <Form.Label className="fw-bold me-1" style={{ fontSize: "0.8rem" }}>
              View By :
            </Form.Label>
            <div style={{ fontSize: "1.2rem" }}>
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

          {/* Employee / Date/Month/Year selection */}
          <Col md={4} className="g-0">
            <Row className="g-1">
              <Col md={12}>
                <Form.Label style={{ fontSize: "1rem" }}>Employee Name</Form.Label>
                <Form.Select
                  className="mb-1"
                  style={{ fontSize: "0.9rem" }}
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
                    <Form.Label style={{ fontSize: "1rem" }}>Month</Form.Label>
                    <Form.Select
                      className="mb-1"
                      style={{ fontSize: "0.9rem" }}
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
                    <Form.Label style={{ fontSize: "1rem" }}>Year</Form.Label>
                    <Form.Control
                      type="number"
                      className="mb-1"
                      style={{ fontSize: "0.9rem" }}
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
                  <Form.Label style={{ fontSize: "0.8rem" }}>Date</Form.Label>
                  <Form.Control
                    type="date"
                    className="mb-1"
                    style={{ fontSize: "0.75rem" }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </Col>
              )}
            </Row>
          </Col>

          {/* Legend and Download Button */}
          <Col md={5}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "35px 20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, auto)",
                  gap: "10px",
                  fontSize: "1rem",
                }}
              >
                {/* ... legend items unchanged ... */}
              </div>
              <Button onClick={handleDownload} id="downloadReport" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                Download Report
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="mt-1 g-0">
          <Col style={{ fontSize: "0.75rem" }}>
            {viewMode === "datewise" && (
              <>
                <h5 className="mb-1" style={{ fontSize: "0.8rem" }}>Datewise Attendance</h5>
                {renderDatewiseTable()}
              </>
            )}
            {viewMode === "monthwise" && (
              <>
                <h5 className="mb-1" style={{ fontSize: "0.8rem" }}>Monthwise Attendance</h5>
                {renderMonthwiseTable()}
              </>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ViewAttendance;
