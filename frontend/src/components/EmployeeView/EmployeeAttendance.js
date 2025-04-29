import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Card, Row, Col, Button, Spinner, Form, Table } from "react-bootstrap";
import "./EmployeeAttendance.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const monthNames = [
  "January", "February", "March",
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December"
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeAttendance() {
  const [employees, setEmployees] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    axios.get(`${API_URL}/api/employees`)
      .then(r => setEmployees(r.data.map(e => e.emp_name || e.Name)))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    setLoading(true);

    const holP = axios
      .get(`${API_URL}/api/holidays`, { params: { year } })
      .then(r => r.data.map(h => h.holiday_date))
      .then(setHolidays)
      .catch(() => setHolidays([]));

    const attP = axios
      .get(`${API_URL}/api/attendancecalendar`, {
        params: { year, empName: selectedName }
      })
      .then(r => setAttendanceData(r.data))
      .catch(() => setAttendanceData([]));

    Promise.all([holP, attP])
      .finally(() => setLoading(false));
  }, [year, selectedName]);

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  const recordMap = useMemo(() => {
    const m = {};
    attendanceData.forEach(r => {
      m[r.date] = m[r.date] || [];
      m[r.date].push(r);
    });
    return m;
  }, [attendanceData]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleYearChange = e => {
    const newYear = parseInt(e.target.value, 10) || year;
    setCurrentDate(prev => new Date(newYear, prev.getMonth(), 1));
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" /> Loading…
      </div>
    );
  }

  const buildCalendarCells = () => {
    const cells = [];
    const totalSlots = firstDayOfMonth + daysInMonth;
    for (let i = 0; i < totalSlots; i++) {
      if (i < firstDayOfMonth) {
        cells.push(
          <td key={`empty-${i}`} className="calendar-day-cell empty-cell"></td>
        );
      } else {
        const day = i - firstDayOfMonth + 1;
        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const dateKey = `${year}-${mm}-${dd}`;
        const isHoliday = holidays.includes(dateKey);
        const events = recordMap[dateKey] || [];

        cells.push(
          <td key={dateKey} className="calendar-day-cell">
            <div className="day-number">{day}</div>
            {isHoliday && <div className="event holiday">Holiday</div>}
            {events.map((ev, idx) => (
              <div
                key={idx}
                className="event"
                style={{
                  backgroundColor: ev.color,
                  color: ev.color === "#ff0000" ? "#fff" : "#000"
                }}
              >
                {ev.status.replace("_", " ")}
              </div>
            ))}
          </td>
        );
      }
    }

    const rows = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(<tr key={r}>{cells.slice(r, r + 7)}</tr>);
    }
    return rows;
  };

  return (
    <div className="employee-attendance-container p-3">
      {/* Controls */}
      <Row className="align-items-center mb-3">
        <Col md={3}>
          <Form.Label>Employee:</Form.Label>
          <Form.Select
            value={selectedName}
            onChange={e => setSelectedName(e.target.value)}
          >
            <option value="">— All —</option>
            {employees.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Form.Select>
        </Col>
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
        <Col md={6} className="text-end">
          <Button onClick={handleToday} className="me-2">
            Today
          </Button>
          <Button onClick={handlePrevMonth}>&larr;</Button>
          <strong className="mx-2">
            {monthNames[month]} {year}
          </strong>
          <Button onClick={handleNextMonth}>&rarr;</Button>
        </Col>
      </Row>

      {/* Calendar */}
      <Card>
        <Card.Body>
          <Card.Title className="text-center mb-4">
            {monthNames[month]} {year}{" "}
            {selectedName && `— ${selectedName}`}
          </Card.Title>
          <Table bordered className="calendar-table" size="sm">
            <thead>
              <tr>
                {daysOfWeek.map(d => (
                  <th key={d} className="text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{buildCalendarCells()}</tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}

