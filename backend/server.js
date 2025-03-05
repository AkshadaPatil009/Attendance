// server.js
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const moment = require("moment");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection using your provided database name
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "indiscpx_taskdb_2", // Using the provided database name
});

// Login Route (No Encryption - remember to hash passwords in production)
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM logincrd WHERE Email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = results[0];
    if (password !== user.Password) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.Name, type: user.Type },
      "secret",
      { expiresIn: "1h" }
    );
    res.json({ token, name: user.Name, role: user.Type });
  });
});

// GET Holidays API - Fetch all holidays sorted by date
app.get("/api/holidays", (req, res) => {
  db.query("SELECT * FROM holidays ORDER BY holiday_date ASC", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// POST Holiday API - Add a new holiday
app.post("/api/holidays", (req, res) => {
  const { holiday_date, holiday_name, location } = req.body;
  db.query(
    "INSERT INTO holidays (holiday_date, holiday_name, location) VALUES (?, ?, ?)",
    [holiday_date, holiday_name, location],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to add holiday" });
      const insertedHoliday = {
        id: result.insertId,
        holiday_date,
        holiday_name,
        location,
      };
      res.json(insertedHoliday);
    }
  );
});

// PUT Holiday API - Update an existing holiday
app.put("/api/holidays/:id", (req, res) => {
  const { id } = req.params;
  const { holiday_date, holiday_name, location } = req.body;
  db.query(
    "UPDATE holidays SET holiday_date = ?, holiday_name = ?, location = ? WHERE id = ?",
    [holiday_date, holiday_name, location, id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to update holiday" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Holiday not found" });
      res.json({ id, holiday_date, holiday_name, location });
    }
  );
});

// DELETE Holiday API - Delete a holiday
app.delete("/api/holidays/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM holidays WHERE id = ?", [id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Failed to delete holiday" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Holiday not found" });
    res.json({ message: "Holiday deleted successfully" });
  });
});

// GET Employees API - Fetch distinct employee names from attendance table
app.get("/api/employees", (req, res) => {
  db.query("SELECT DISTINCT emp_name FROM attendance", (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Database error while fetching employee list" });
    res.json(results);
  });
});

const calculateWorkHoursAndDay = (inTime, outTime) => {
  let work_hour = 0;
  if (inTime && outTime) {
    // Use a format that includes the meridiem (AM/PM)
    let inMoment = moment(inTime, "h:mmA");
    let outMoment = moment(outTime, "h:mmA");
    if (inMoment.isValid() && outMoment.isValid()) {
      // If the out time is before the in time, assume it crossed midnight and add one day.
      if (outMoment.isBefore(inMoment)) {
        outMoment.add(1, "day");
      }
      // Calculate the difference in hours with a floating point result.
      work_hour = outMoment.diff(inMoment, "hours", true);
    }
  }
  
  let dayStatus = "";
  if (work_hour >= 8.5) {
    dayStatus = "Full Day";
  } else if (work_hour >= 4.5) {
    dayStatus = "Half Day";
  } else {
    dayStatus = "Absent";
  }
  
  return { work_hour, dayStatus };
};


// POST Attendance API - Save attendance records with automatic work hours calculation
app.post("/api/attendance", (req, res) => {
  const attendanceRecords = req.body.attendanceRecords;
  if (
    !attendanceRecords ||
    !Array.isArray(attendanceRecords) ||
    attendanceRecords.length === 0
  ) {
    return res.status(400).json({ error: "No attendance records provided" });
  }

  // Map attendanceRecords to a values array including calculated work_hour and day status
  const values = attendanceRecords.map((record) => {
    const { work_hour, dayStatus } = calculateWorkHoursAndDay(
      record.inTime,
      record.outTime
    );
    return [
      record.empName,
      record.inTime,
      record.outTime,
      record.location,
      record.date,
      work_hour,
      dayStatus,
    ];
  });

  db.query(
    "INSERT INTO attendance (emp_name, in_time, out_time, location, date, work_hour, day) VALUES ?",
    [values],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Database error while saving attendance records" });
      }
      res.json({ message: "Attendance records saved successfully" });
    }
  );
});

// PUT Attendance API - Update an existing attendance record with automatic work hours calculation
app.put("/api/attendance/:id", (req, res) => {
  const { id } = req.params;
  const { inTime, outTime, location, date, approved_by, reason } = req.body;
  const { work_hour, dayStatus } = calculateWorkHoursAndDay(inTime, outTime);

  const query = `
    UPDATE attendance
    SET in_time = ?, out_time = ?, location = ?, date = ?, approved_by = ?, reason = ?, work_hour = ?, day = ?
    WHERE id = ?
  `;
  db.query(
    query,
    [inTime, outTime, location, date, approved_by, reason, work_hour, dayStatus, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Database error while updating attendance record" });
      }
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Attendance record not found" });
      res.json({ message: "Attendance updated successfully", id });
    }
  );
});

// GET Attendance API - Fetch all attendance records (optional filtering via query parameters)
app.get("/api/attendance", (req, res) => {
  let query = "SELECT * FROM attendance";
  const params = [];
  // Filter by employee name if provided: /api/attendance?empName=EmployeeName
  if (req.query.empName) {
    query += " WHERE emp_name = ?";
    params.push(req.query.empName);
  }
  db.query(query, params, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Database error while fetching attendance records" });
    res.json(results);
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
