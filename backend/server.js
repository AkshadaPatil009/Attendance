const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const moment = require("moment");
require("dotenv").config();

// NEW: Import http and socket.io
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for your client domain in production
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Emit a socket event helper function
const emitAttendanceChange = () => {
  io.emit("attendanceChanged", { message: "Attendance data updated" });
};

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
  res.set("Cache-Control", "no-store");
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
  res.set("Cache-Control", "no-store");
  db.query("SELECT DISTINCT emp_name FROM attendance", (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Database error while fetching employee list" });
    res.json(results);
  });
});

// Updated calculateWorkHoursAndDay function
const calculateWorkHoursAndDay = (inTime, outTime) => {
  let work_hour = 0;
  if (inTime && outTime) {
    let inMoment = moment(inTime, "YYYY-MM-DD h:mmA");
    let outMoment = moment(outTime, "YYYY-MM-DD h:mmA");
    if (inMoment.isValid() && outMoment.isValid()) {
      if (outMoment.isBefore(inMoment)) {
        outMoment.add(1, "day");
      }
      work_hour = outMoment.diff(inMoment, "hours", true);
    }
  }
  
  let dayStatus = "";
  if (work_hour >= 8.5) {
    dayStatus = "Full Day";
  } else if (work_hour >= 4.5) {
    dayStatus = "Half Day";
  } else {
    dayStatus = "Less than 4.5";
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

  const commonDate = attendanceRecords[0].date;

  db.query(
    "SELECT COUNT(*) as count FROM attendance WHERE date = ?",
    [commonDate],
    (err, countResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error while validating duplicate date" });
      }
      if (countResult[0].count > 0) {
        return res.status(400).json({ error: "Attendance records for this date already exist" });
      }

      const isSunday = moment(commonDate, "YYYY-MM-DD").day() === 0;
      db.query(
        "SELECT COUNT(*) as holidayCount FROM holidays WHERE holiday_date = ?",
        [commonDate],
        (err, holidayResult) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while checking holiday" });
          }
          const isHoliday = holidayResult[0].holidayCount > 0;
          const insertAbsent = !(isSunday || isHoliday);

          db.query(
            "SELECT Name FROM logincrd WHERE disableemp = 0",
            (err, allowedResults) => {
              if (err) {
                console.error(err);
                return res.status(500).json({
                  error: "Database error while fetching allowed employees",
                });
              }

              const allowedEmployeeNames = allowedResults.map((row) => row.Name);

              const invalidRecords = attendanceRecords.filter(
                (record) => !allowedEmployeeNames.includes(record.empName)
              );
              if (invalidRecords.length > 0) {
                const invalidNames = invalidRecords
                  .map((record) => record.empName)
                  .join(", ");
                return res.status(400).json({
                  error:
                    "Attendance records could not be saved for the following employees (not allowed): " +
                    invalidNames,
                });
              }

              const validRecords = attendanceRecords.filter((record) =>
                allowedEmployeeNames.includes(record.empName)
              );

              const recordedNames = new Set(validRecords.map((record) => record.empName));

              const absentEmployees = insertAbsent
                ? allowedEmployeeNames.filter((name) => !recordedNames.has(name))
                : [];

              const valuesValid = validRecords.map((record) => {
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
                  0 // is_absent flag for present records
                ];
              });

              const valuesAbsent = absentEmployees.map((empName) => {
                return [
                  empName,
                  "",
                  "",
                  "",
                  commonDate,
                  0,
                  "Absent",
                  1
                ];
              });

              const allValues = valuesValid.concat(valuesAbsent);

              const insertQuery = `
                INSERT INTO attendance (emp_name, in_time, out_time, location, date, work_hour, day, is_absent)
                VALUES ?
              `;
              db.query(insertQuery, [allValues], (err, result) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({
                    error: "Database error while saving attendance records",
                  });
                }
                // NEW: Emit socket event when records are saved.
                emitAttendanceChange();
                res.json({ message: "Attendance records saved successfully" });
              });
            }
          );
        }
      );
    }
  );
});

// PUT Attendance API – Updated to only change is_absent status based on updated clock fields.
app.put("/api/attendance/:id", (req, res) => {
  const { id } = req.params;
  const { inTime, outTime, location, date, approved_by, reason } = req.body;

  db.query("SELECT * FROM attendance WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error while fetching record" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    const existingRecord = results[0];

    const newInTime = inTime && inTime.trim() !== "" ? inTime : existingRecord.in_time;
    const newOutTime = outTime && outTime.trim() !== "" ? outTime : existingRecord.out_time;

    const { work_hour, dayStatus: computedDayStatus } = calculateWorkHoursAndDay(newInTime, newOutTime);
    const newIsAbsent = (newInTime && newOutTime) ? 0 : 1;
    const newDayStatus = newIsAbsent ? "Absent" : computedDayStatus;

    const newLocation = location !== undefined ? location : existingRecord.location;
    const newDate = date !== undefined ? date : existingRecord.date;
    const newApprovedBy = approved_by !== undefined ? approved_by : existingRecord.approved_by;
    const newReason = reason !== undefined ? reason : existingRecord.reason;

    const query = `
      UPDATE attendance
      SET in_time = ?, out_time = ?, location = ?, date = ?, approved_by = ?, reason = ?, work_hour = ?, day = ?, is_absent = ?
      WHERE id = ?
    `;
    db.query(
      query,
      [newInTime, newOutTime, newLocation, newDate, newApprovedBy, newReason, work_hour, newDayStatus, newIsAbsent, id],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error while updating attendance record" });
        }
        if (result.affectedRows === 0)
          return res.status(404).json({ error: "Attendance record not found" });
        // NEW: Emit socket event when record is updated.
        emitAttendanceChange();
        res.json({ message: "Attendance updated successfully", id });
      }
    );
  });
});

// GET Attendance API - Fetch all attendance records (optional filtering via query parameters)
app.get("/api/attendance", (req, res) => {
  res.set("Cache-Control", "no-store");
  let query = "SELECT * FROM attendance";
  const params = [];
  if (req.query.empName) {
    query += " WHERE emp_name = ?";
    params.push(req.query.empName);
  }
  db.query(query, params, (err, results) => {
    if (err)
      return res.status(500).json({
        error: "Database error while fetching attendance records",
      });
    res.json(results);
  });
});

// GET Attendance API - Fetch attendance records based on query parameters.
app.get("/api/attendanceview", (req, res) => {
  res.set("Cache-Control", "no-store");
  const { viewMode, empName, date, month, year } = req.query;
  let query = "SELECT * FROM attendance";
  const conditions = [];
  const params = [];
  if (viewMode === "datewise" && date) {
    conditions.push("date = ?");
    params.push(date);
  }
  if (viewMode === "monthwise" && month && year) {
    conditions.push("MONTH(date) = ?");
    conditions.push("YEAR(date) = ?");
    params.push(month);
    params.push(year);
  }
  if (empName && empName.trim() !== "") {
    conditions.push("emp_name = ?");
    params.push(empName);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error while fetching attendance records" });
    }
    res.json(results);
  });
});

// NEW: Listen for socket connections.
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start the server using the HTTP server with Socket.IO
server.listen(5000, () => console.log("Server running on port 5000"));
