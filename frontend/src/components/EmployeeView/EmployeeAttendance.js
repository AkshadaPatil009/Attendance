import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Card, Row, Col, Button, Spinner, Form, Table } from "react-bootstrap";
import "./EmployeeAttendance.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const daysOfWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function EmployeeAttendance() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const empName    = storedUser.name || "";
  const empId      = storedUser.employeeId || "";

  const [currentDate, setCurrentDate]    = useState(new Date());
  const [loading, setLoading]            = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays]          = useState([]);
  const [escalatedEmployees, setEscalatedEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(empId); // Default to logged-in user

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth     = useMemo(() => new Date(year, month+1, 0).getDate(), [year, month]);
  const firstDayOfMonth = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const recordMap = useMemo(() => {
    const m = {};
    attendanceData.forEach(r => { m[r.date] = r; });
    return m;
  }, [attendanceData]);

  useEffect(() => {
    if (!empId) return;
    axios.get(`${API_URL}/api/reports-by-id`, {
      params: { empId }
    })
    .then(res => {
      setEscalatedEmployees(res.data || []);
    })
    .catch(err => {
      console.error("Error loading dropdown:", err);
      setEscalatedEmployees([]);
    });
  }, [empId]);

  useEffect(() => {
    if (!empName || !selectedEmpId) return;
    setLoading(true);

    const selectedEmpName = escalatedEmployees.find(e => e.id === selectedEmpId)?.name || empName;

    const holReq = axios
      .get(`${API_URL}/api/holidays`, { params: { year } })
      .then(r => r.data.map(h => h.holiday_date))
      .then(setHolidays)
      .catch(() => setHolidays([]));

    const attReq = axios
      .get(`${API_URL}/api/attendancecalendar`, {
        params: { year, empName: selectedEmpName }
      })
      .then(r => setAttendanceData(r.data))
      .catch(() => setAttendanceData([]));

    Promise.all([holReq, attReq]).finally(() => setLoading(false));
  }, [year, selectedEmpId, escalatedEmployees, empName]);

  const handlePrevMonth = () =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1));
  const handleNextMonth = () =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1));
  const handleToday = () =>
    setCurrentDate(new Date());
  const handleYearChange = e => {
    const y = parseInt(e.target.value, 10) || year;
    setCurrentDate(d => new Date(y, d.getMonth(), 1));
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const buildCalendar = () => {
    const cells = [];
    const total = firstDayOfMonth + daysInMonth;

    for (let i = 0; i < total; i++) {
      if (i < firstDayOfMonth) {
        cells.push(<td key={`empty-${i}`} className="empty-cell" />);
      } else {
        const day = i - firstDayOfMonth + 1;
        const mm  = String(month+1).padStart(2,"0");
        const dd  = String(day).padStart(2,"0");
        const key = `${year}-${mm}-${dd}`;
        const rec = recordMap[key];
        const isPureHoliday = !rec && holidays.includes(key);
        const isToday = key === todayKey;

        let badgeText = rec?.status?.replace("_"," ") || "";
        if (rec) {
          if (!rec.in_time && rec.out_time) badgeText = "Incomplete CI";
          else if (rec.in_time && !rec.out_time) badgeText = "Incomplete CO";
        }

        cells.push(
          <td
            key={key}
            className="calendar-day-cell"
          >
            <div
              className="day-number"
              style={
                isToday
                  ? {
                      backgroundColor: "#0d6efd",
                      color: "#fff",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      lineHeight: "28px",
                      textAlign: "center",
                      display: "inline-block"
                    }
                  : {}
              }
            >
              {day}
            </div>

            {(rec?.isHoliday || isPureHoliday) && (
              <div className="event holiday">
                {rec?.holiday_name || "Holiday"}
              </div>
            )}

            {rec && rec.status !== (rec.holiday_name || "Holiday") && (
              <div
                className="event"
                style={{
                  backgroundColor: rec.color,
                  color: rec.color === "#ff0000" ? "#fff" : "#000",
                  marginTop: (rec.isHoliday || isPureHoliday) ? "4px" : "0"
                }}
              >
                {badgeText}
              </div>
            )}
          </td>
        );
      }
    }

    const rows = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(<tr key={r}>{cells.slice(r, r+7)}</tr>);
    }
    return rows;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" /> Loading…
      </div>
    );
  }

  return (
    <div className="employee-attendance-container p-3">
      {/* Controls */}
      <Row className="align-items-center mb-3">
        <Col md={3}>
          <Form.Label>Year:</Form.Label>
          <Form.Control
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={handleYearChange}
          />
        </Col>

        <Col md={5}>
          <Form.Label>Select Employee:</Form.Label>
          <Form.Select
            value={selectedEmpId || ""}
            onChange={e => setSelectedEmpId(Number(e.target.value))}
          >
            <option value={empId}>{empName} (You)</option>
            {escalatedEmployees
              .filter(emp => emp.id !== empId)
              .map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
          </Form.Select>
        </Col>

        <Col md={4} className="text-end mt-4">
          <Button onClick={handleToday} className="me-2">Today</Button>
          <Button onClick={handlePrevMonth}>&larr;</Button>
          <strong className="mx-2">{monthNames[month]} {year}</strong>
          <Button onClick={handleNextMonth}>&rarr;</Button>
        </Col>
      </Row>

      {/* Calendar */}
      <Card>
        <Card.Body>
          <Card.Title className="text-center mb-4">
            {monthNames[month]} {year} — {escalatedEmployees.find(e => e.id === selectedEmpId)?.name || empName}
          </Card.Title>
          <Table bordered className="calendar-table" size="sm">
            <thead>
              <tr>
                {daysOfWeek.map(d => (
                  <th key={d} className="text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>{buildCalendar()}</tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
