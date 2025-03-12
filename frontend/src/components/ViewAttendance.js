import React, { useState, useEffect, useCallback, useRef } from "react";
import moment from "moment";
import { Container, Row, Col, Form, Table, Button } from "react-bootstrap";
import axios from "axios";
import html2canvas from "html2canvas";

/**
 * Return the text code and style for each record based on its work_hour and day.
 * Late Mark Logic: If an employee’s CI time is after 10:00 AM and day is "Full Day"
 * (and if the record is not for a Sunday or a site visit), then change the day to "Late Mark".
 */
function getDisplayForRecord(record) {
  // If the record is for Holiday, immediately return holiday style: "P" in red/white.
  if (record.day === "Holiday") {
    return { text: "P", style: { backgroundColor: "#ff0000", color: "#fff" } };
  }

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

  // Site Visit Logic: only if not Sunday/Holiday and location not ro/mo/rso/do/wfh
  if (record.day !== "Sunday" && record.location) {
    const validCodes = ["ro", "mo", "rso", "do", "wfh"];
    // Split the location into words and check if any word exactly matches one of the valid codes.
    const words = record.location.toLowerCase().trim().split(/\s+/);
    const hasValidCode = words.some(word => validCodes.includes(word));
    if (!hasValidCode) {
      return { text: "SV", style: { backgroundColor: "#FFFF00" } };
    }
  }

  // If the record is not absent and work_hour < 4.5, show "AB" in a white bold box.
  if (record.day !== "Absent" && record.work_hour !== undefined && record.work_hour < 4.5) {
    return {
      text: "AB",
      style: { backgroundColor: "#ffffff", color: "#000", fontWeight: "bold" },
    };
  }

  // Determine display based on day value
  switch (record.day) {
    case "Full Day":
      return { text: "P", style: { backgroundColor: "#90EE90" } }; // Light Green
    case "Half Day":
      return { text: "H", style: { backgroundColor: "#B0E0E6" } }; // Light Blue
    case "Late Mark":
      return {
        text: <span style={{ textDecoration: "underline" }}>P</span>,
        style: { backgroundColor: "#90EE90" },
      };
    case "Absent":
      return { text: "", style: { backgroundColor: "#FFC0CB" } }; // Pink
    case "Sunday":
      return { text: "SUN", style: { backgroundColor: "#ff9900" } }; // Orange
    default:
      return { text: "", style: {} };
  }
}

// Compare dates ignoring time
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
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Ref to capture the attendance view (filters, legend, and table)
  const attendanceRef = useRef(null);

  // Download handler using html2canvas
  const handleDownload = async () => {
    if (attendanceRef.current) {
      try {
        const canvas = await html2canvas(attendanceRef.current, {
          scale: 2, // Increase scale for higher quality image
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `attendance_${viewMode}.png`;
        link.click();
      } catch (error) {
        console.error("Error generating image", error);
      }
    }
  };

  // Fetch employees
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/employees")
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

  // Fetch holidays
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

  // Fetch attendance on filter changes
  const fetchAttendance = useCallback(() => {
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
  }, [viewMode, selectedEmployee, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Render Monthwise Table
  const renderMonthwiseTable = () => {
    const daysInMonth = new Date(selectedYear, parseInt(selectedMonth, 10), 0).getDate();
    const pivotData = {};

    attendanceData.forEach((rec) => {
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
        <Table
          bordered
          hover
          size="sm"
          style={{
            tableLayout: "fixed",
            fontSize: "0.75rem",
            minWidth: "900px",
          }}
          className="mb-0"
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
                const avgHours =
                  rowData.daysWorked > 0
                    ? (rowData.totalHours / rowData.daysWorked).toFixed(2)
                    : "0.00";

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

                      // Force style if holiday or Sunday
                      if (holidayFound) {
                        forcedStyle = { backgroundColor: "#ff0000", color: "#fff" };
                      } else if (dayOfWeek === 0) {
                        forcedStyle = { backgroundColor: "#ff9900" };
                      }

                      // If there's an attendance record for that day
                      if (rec) {
                        const display = getDisplayForRecord(rec);
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

  // Render Datewise Table
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
          style={{
            fontSize: "0.75rem",
            minWidth: "800px",
          }}
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
              const { style } = getDisplayForRecord(rec);
              return (
                <tr key={idx} style={style}>
                  <td>{rec.emp_name}</td>
                  <td>{moment(rec.date).format("YYYY-MM-DD")}</td>
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
    <div ref={attendanceRef}>
      <Container
        fluid
        className="p-1"
        style={{
          backgroundColor: "#20B2AA",
          fontSize: "0.75rem", // overall smaller font
        }}
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
            <div style={{ fontSize: "1.3rem" }}>
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

          {/* Color Legend using CSS Grid */}
          <Col md={5}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, auto)",
                gap: "10px",
                marginLeft: "100px",
                fontSize: "1rem",
                padding: "35px 0",
              }}
            >
              {/* Half Day */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#B0E0E6",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                  }}
                ></div>
                <span>Half day</span>
              </div>

              {/* Full Day (8.5 Hrs) */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#90EE90",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                  }}
                ></div>
                <span>Full Day (8.5 Hrs)</span>
              </div>

              {/* Absent */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#FFC0CB",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                  }}
                ></div>
                <span>Absent</span>
              </div>

              {/* Sunday */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#ff9900",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                  }}
                ></div>
                <span>Sunday</span>
              </div>

              {/* Late Mark */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    border: "1px solid #000",
                  }}
                >
                  –
                </div>
                <span>Late Mark</span>
              </div>

              {/* Working less than 5 Hrs (AB) */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    width: "20px",
                    height: "20px",
                    marginRight: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    color: "#000",
                    border: "1px solid #000",
                  }}
                >
                  AB
                </div>
                <span>Working less than 5 Hrs</span>
              </div>

              {/* Site Visit */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#FFFF00",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                  }}
                ></div>
                <span>Site Visit</span>
              </div>

              {/* Holiday */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    backgroundColor: "#ff0000",
                    width: "16px",
                    height: "16px",
                    marginRight: "4px",
                  }}
                ></div>
                <span>Holiday</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Download Button placed under the legend.
            The attribute data-html2canvas-ignore="true" ensures it is not captured in the PNG image */}
        <Row className="mt-1">
          <Col style={{ textAlign: "right" }}>
            <Button
              variant="primary"
              onClick={handleDownload}
              data-html2canvas-ignore="true"
            >
              Download Report
            </Button>
          </Col>
        </Row>

        <Row className="mt-1 g-0">
          <Col style={{ fontSize: "0.75rem" }}>
            {viewMode === "datewise" && (
              <>
                <h5 className="mb-1" style={{ fontSize: "0.8rem" }}>
                  Datewise Attendance
                </h5>
                {renderDatewiseTable()}
              </>
            )}
            {viewMode === "monthwise" && (
              <>
                <h5 className="mb-1" style={{ fontSize: "0.8rem" }}>
                  Monthwise Attendance
                </h5>
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
