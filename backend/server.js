// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const multer  = require('multer');
const path    = require('path');
require("dotenv").config();
const { sendLeaveEmail } = require("./mailer");
const { sendDecisionEmail } = require("./mailer");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");


const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost";
const isProduction = process.env.NODE_ENV === "production";


const app = express();
app.use(cors());
app.use(express.json());
// Serve uploaded uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === Multer for image uploads ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `profile_${req.params.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".jpg") {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Production: HTTPS Setup

if (isProduction) {
  try {
    const privateKey = fs.readFileSync("/etc/letsencrypt/live/attendance.protovec.com/privkey.pem", "utf8");
    const certificate = fs.readFileSync("/etc/letsencrypt/live/attendance.protovec.com/fullchain.pem", "utf8");
    const credentials = { key: privateKey, cert: certificate };

    const httpsServer = https.createServer(credentials, app);

    const io = new Server(httpsServer, {
      cors: {
        origin: "*", // Replace with frontend domain in production
        methods: ["GET", "POST", "PUT", "DELETE"],
      },
    });

    io.on("connection", (socket) => {
      console.log("HTTPS client connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("HTTPS client disconnected:", socket.id);
      });
    });

    httpsServer.listen(PORT, HOST, () => {
      console.log(`HTTPS Server running at https://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Error loading SSL certificates", err.message);
    process.exit(1);
  }

// Development: HTTP Setup
} else {
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // OK in local
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🌐 HTTP client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ HTTP client disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 HTTP Server running at http://${HOST}:${PORT}`);
  });
}

// Emit a socket event helper function
const emitAttendanceChange = () => {
  io.emit("attendanceChanged", { message: "Attendance data updated" });
};

// MySQL database connection using env variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
// Login Route (No Encryption – remember to hash in production!)
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = `
    SELECT 
      id,
      Name,
      Email,
      Location,
      attendance_role,
      disableemp,
      Password
    FROM logincrd
    WHERE Email = ?
  `;

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = results[0];

    // 1) check disabled flag
    if (user.disableemp !== 0) {
      return res.status(403).json({ error: "Your account has been disabled." });
    }

    // 2) verify password (swap for bcrypt.compare in prod)
    if (password !== user.Password) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 3) all good → issue JWT
    const token = jwt.sign(
      {
        id:           user.id,
        name:         user.Name,
        attendance_role: user.attendance_role,
        location:     user.Location || "",
        email:        user.Email,
      },
      "secret",
      { expiresIn: "1h" }
    );

    res.json({
      token,
      name:       user.Name,
      role:       user.attendance_role,
      employeeId: user.id,
      email:      user.Email,
      location:   user.Location || "",
    });
  });
});

//Testing API
app.get('/', (req, res) => {
  const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata'
  };

  const timestamp = new Date().toLocaleString('en-GB', options);

  res.json({
      status: 'Active',
      timestamp: timestamp
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
  const approval_status = "Pending"; // New: default status
  db.query(
    "INSERT INTO holidays (holiday_date, holiday_name, location, approval_status) VALUES (?, ?, ?, ?)",
    [holiday_date, holiday_name, location, approval_status],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to add holiday" });
      const insertedHoliday = {
        id: result.insertId,
        holiday_date,
        holiday_name,
        location,
        approval_status,
        approved_by: null,
        approved_date: null,
      };
      res.json(insertedHoliday);
    }
  );
});

// PUT Holiday API - Update an existing holiday
// Updated to always reset approval to pending when a holiday is edited.
app.put("/api/holidays/:id", (req, res) => {
  const { id } = req.params;
  const { holiday_date, holiday_name, location } = req.body;
  db.query(
    "UPDATE holidays SET holiday_date = ?, holiday_name = ?, location = ?, approval_status = 'Pending', approved_by = NULL, approved_date = NULL WHERE id = ?",
    [holiday_date, holiday_name, location, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to update holiday" });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Holiday not found" });
      res.json({ id, holiday_date, holiday_name, location, approval_status: "Pending", approved_by: null, approved_date: null });
    }
  );
});

// DELETE Holiday API - Delete a holiday
app.delete("/api/holidays/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM holidays WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete holiday" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Holiday not found" });
    res.json({ message: "Holiday deleted successfully" });
  });
});

// PUT Holiday Approval API - Approve a holiday
app.put("/api/holidays/approve/:id", (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offsetMs);
  const approved_date = localDate.toISOString().slice(0, 19).replace('T', ' ');
  db.query(
    "UPDATE holidays SET approval_status = 'Approved', approved_by = ?, approved_date = ? WHERE id = ?",
    [approved_by, approved_date, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to approve holiday" });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Holiday not found" });
      res.json({ message: "Holiday approved successfully", id, approved_by, approved_date });
    }
  );
});

// GET Employees API - Fetch distinct employee names from attendance table
app.get("/api/employees", (req, res) => {
  res.set("Cache-Control", "no-store");
  db.query("SELECT DISTINCT emp_name FROM attendance", (err, results) => {
    if (err)
      return res.status(500).json({
        error: "Database error while fetching employee list",
      });
    res.json(results);
  });
});

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
  } else if (work_hour >= 5) { // updated threshold from 4.5 to 5 hours
    dayStatus = "Half Day";
  } else {
    dayStatus = "Less than 5";
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
        return res
          .status(500)
          .json({ error: "Database error while validating duplicate date" });
      }
      if (countResult[0].count > 0) {
        return res
          .status(400)
          .json({ error: "Attendance records for this date already exist" });
      }

      const isSunday = moment(commonDate, "YYYY-MM-DD").day() === 0;
      db.query(
        "SELECT COUNT(*) as holidayCount FROM holidays WHERE holiday_date = ?",
        [commonDate],
        (err, holidayResult) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ error: "Database error while checking holiday" });
          }
          const isHoliday = holidayResult[0].holidayCount > 0;
          const insertAbsent = !(isSunday || isHoliday);

          // Use UNION query to combine allowed employees from both tables
          db.query(
            "SELECT Name FROM logincrd WHERE disableemp = 0 AND Type != 'admin' UNION SELECT Name FROM employee_master",
            (err, allowedResults) => {
              if (err || allowedResults.length === 0) {
                console.error(err);
                return res
                  .status(500)
                  .json({ error: "Database error while fetching allowed employees" });
              }
              processAttendanceRecords(allowedResults.map((row) => row.Name));
            }
          );

          // Helper function to process attendance records
          function processAttendanceRecords(allowedEmployeeNames) {
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

            // Build VALUES clause for present employees with dynamic CASE logic
            const presentValueClauses = validRecords.map((record) => {
              const { work_hour, dayStatus } = calculateWorkHoursAndDay(
                record.inTime,
                record.outTime
              );
              // sanitize all values via db.escape
              const empEsc = db.escape(record.empName);
              const inEsc = db.escape(record.inTime);
              const outEsc = db.escape(record.outTime);
              const locEsc = db.escape(record.location);
              const dateEsc = db.escape(record.date);
              const workEsc = db.escape(work_hour);
              const dayEsc = db.escape(dayStatus);
              const absentEsc = db.escape(0);

              return `(
  CASE
    WHEN EXISTS (
      SELECT 1 FROM employee_master em
      WHERE em.Name = ${empEsc}
    )
    THEN (
      SELECT em2.NickName
      FROM employee_master em2
      WHERE em2.Name = ${empEsc}
      LIMIT 1
    )
    ELSE ${empEsc}
  END,
  ${inEsc},
  ${outEsc},
  ${locEsc},
  ${dateEsc},
  ${workEsc},
  ${dayEsc},
  ${absentEsc}
)`;
            });

            // Build VALUES clause for absent employees (literal names)
            const absentValueClauses = absentEmployees.map((empName) => {
              const empEsc = db.escape(empName);
              const dateEsc = db.escape(commonDate);
              return `(
  ${empEsc},
  '',
  '',
  '',
  ${dateEsc},
  0,
  'Absent',
  1
)`;
            });

            const allValueClauses = presentValueClauses.concat(absentValueClauses).join(",\n");

            const insertQuery = `
              INSERT INTO attendance
                (emp_name, in_time, out_time, location, date, work_hour, day, is_absent)
              VALUES
              ${allValueClauses};
            `;

            db.query(insertQuery, (err, result) => {
              if (err) {
                console.error(err);
                return res
                  .status(500)
                  .json({ error: "Database error while saving attendance records" });
              }
              // NEW: Emit socket event when records are saved.
              emitAttendanceChange();
              res.json({ message: "Attendance records saved successfully" });
            });
          }
        }
      );
    }
  );
});

app.post('/api/attendance/manual', (req, res) => {
  const { empName, timestamp, entryText } = req.body;

  const [typeRaw, ...locationParts] = entryText.trim().split(" ");
  const type = typeRaw?.toUpperCase();
  const location = locationParts.join(" ").trim();
  const date = moment(timestamp, 'YYYY-MM-DD h:mmA').format('YYYY-MM-DD');

  if (!["CI", "CO"].includes(type) || !location) {
    return res.status(400).json({ error: 'Invalid entry format. Use "CI RO" or "CO RO"' });
  }

  if (type === "CI") {
    // Insert new CI record
    db.query(
      `INSERT INTO attendance
        (emp_name, in_time, out_time, location, date, work_hour, day, is_absent)
       VALUES (?, ?, "", ?, ?, 0, "", 0)`,
      [empName, timestamp, location, date],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to save CI entry' });
        }
        emitAttendanceChange();
        res.json({ message: 'CI entry recorded at ' + timestamp });
      }
    );
  } else {
    // Handle CO
    db.query(
      `SELECT id, in_time 
         FROM attendance
        WHERE emp_name = ? 
          AND date = ? 
          AND in_time <> "" 
          AND (out_time = "" OR out_time IS NULL)
        ORDER BY in_time DESC
        LIMIT 1`,
      [empName, date],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error checking CI entry' });
        }

        if (results.length === 0) {
          // No CI, insert CO as standalone
          db.query(
            `INSERT INTO attendance
              (emp_name, in_time, out_time, location, date, work_hour, day, is_absent)
             VALUES (?, "", ?, ?, ?, 0, "", 0)`,
            [empName, timestamp, location, date],
            (insertErr) => {
              if (insertErr) {
                console.error(insertErr);
                return res.status(500).json({ error: 'Failed to insert standalone CO' });
              }
              emitAttendanceChange();
              res.json({ message: 'Standalone CO entry added at ' + timestamp });
            }
          );
        } else {
          const { id, in_time } = results[0];
          const { work_hour, dayStatus } = calculateWorkHoursAndDay(in_time, timestamp);

          db.query(
            `UPDATE attendance
               SET out_time = ?, location = ?, work_hour = ?, day = ?, is_absent = 0
             WHERE id = ?`,
            [timestamp, location, work_hour, dayStatus, id],
            (updateErr) => {
              if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ error: 'Failed to update CO entry' });
              }
              emitAttendanceChange();
              res.json({ message: 'CO entry paired at ' + timestamp });
            }
          );
        }
      }
    );
  }
});

// ----------------------------------------------------------------------------
// PUT /api/attendance/:id 
// – Updates the attendance row, then logs only those fields that truly changed.
// ----------------------------------------------------------------------------
app.put("/api/attendance/:id", (req, res) => {
  const { id } = req.params;
  // The frontend must send a `changedBy` field in the request body:
  //   e.g. { inTime, outTime, location, date, approved_by, reason, changedBy }
  const { inTime, outTime, location, date, approved_by, reason, changedBy } = req.body;

  // 1) Fetch the existing attendance record first
  db.query("SELECT * FROM attendance WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("DB Error fetching attendance:", err);
      return res.status(500).json({ error: "Database error while fetching record" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    const existingRecord = results[0];
    const oldEmpName = existingRecord.emp_name; // needed for logging

    // 2) Determine “new” values (fall back to existing if not provided / empty)
    const newInTime =
      inTime && inTime.trim() !== "" ? inTime : existingRecord.in_time;
    const newOutTime =
      outTime && outTime.trim() !== "" ? outTime : existingRecord.out_time;

    // Compute work_hour & day status
    const { work_hour, dayStatus: computedDayStatus } = calculateWorkHoursAndDay(
      newInTime,
      newOutTime
    );
    const newIsAbsent = newInTime && newOutTime ? 0 : 1;
    const newDayStatus = newIsAbsent ? "Absent" : computedDayStatus;

    const newLocation = location !== undefined ? location : existingRecord.location;
    const newDate = date !== undefined ? date : existingRecord.date;
    const newApprovedBy =
      approved_by !== undefined ? approved_by : existingRecord.approved_by;
    const newReason = reason !== undefined ? reason : existingRecord.reason;

    // Determine if clock fields actually changed
    const timeChanged =
      (inTime && inTime.trim() !== "" && inTime !== existingRecord.in_time) ||
      (outTime && outTime.trim() !== "" && outTime !== existingRecord.out_time);

    // 3) Build a list of changed fields (fieldName, oldValue, newValue)
    const logEntries = [];
    function addLogEntry(field, oldVal, newVal) {
      if ((oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)) {
        return;
      }
      if (String(oldVal) !== String(newVal)) {
        logEntries.push([
          id,                              // attendance_id
          oldEmpName,                      // emp_name
          changedBy || "unknown",          // changed_by
          field,                           // field_name
          oldVal !== null && oldVal !== undefined ? String(oldVal) : null,
          newVal !== null && newVal !== undefined ? String(newVal) : null,
        ]);
      }
    }

    // Only log in_time / out_time if they actually differ
    addLogEntry("in_time", existingRecord.in_time, newInTime);
    addLogEntry("out_time", existingRecord.out_time, newOutTime);

    // Only log work_hour, day, is_absent if clock fields changed
    if (timeChanged) {
      addLogEntry("work_hour", existingRecord.work_hour, work_hour);
      addLogEntry("day", existingRecord.day, newDayStatus);
      addLogEntry("is_absent", existingRecord.is_absent, newIsAbsent);
    }

    // Only log location if it truly changed
    addLogEntry("location", existingRecord.location, newLocation);

    // Only log approved_by if it truly changed
    addLogEntry("approved_by", existingRecord.approved_by, newApprovedBy);

    // Only log reason if it truly changed
    addLogEntry("reason", existingRecord.reason, newReason);

    // 4) Perform the UPDATE on attendance table
    const updateQuery = `
      UPDATE attendance
      SET in_time = ?, out_time = ?, location = ?, date = ?, approved_by = ?, reason = ?, work_hour = ?, day = ?, is_absent = ?
      WHERE id = ?
    `;
    db.query(
      updateQuery,
      [
        newInTime,
        newOutTime,
        newLocation,
        newDate,
        newApprovedBy,
        newReason,
        work_hour,
        newDayStatus,
        newIsAbsent,
        id,
      ],
      (updateErr, updateResult) => {
        if (updateErr) {
          console.error("DB Error updating attendance:", updateErr);
          return res
            .status(500)
            .json({ error: "Database error while updating attendance record" });
        }
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: "Attendance record not found" });
        }

        // 5) Insert each log entry into attendance_logs
        if (logEntries.length > 0) {
          const logInsertQuery = `
            INSERT INTO attendance_logs
              (attendance_id, emp_name, changed_by, field_name, old_value, new_value)
            VALUES ?
          `;
          db.query(logInsertQuery, [logEntries], (logErr) => {
            if (logErr) {
              console.error("DB Error inserting into attendance_logs:", logErr);
              // We continue even if logging fails
            }
          });
        }

        // 6) Emit real-time event, if you already have socket.io set up:
        if (typeof emitAttendanceChange === "function") {
          emitAttendanceChange();
        }

        // 7) Finally, respond to the client
        return res.json({ message: "Attendance updated successfully", id });
      }
    );
  });
});

// ----------------------------------------------------------------------------
// GET /api/attendance/logs 
// – Retrieve all logs for all attendance records.
// ----------------------------------------------------------------------------
app.get("/api/attendance/logs", (req, res) => {
  const fetchAllLogsSql = `
    SELECT
      log_id,
      attendance_id,
      emp_name,
      changed_by,
      changed_at,
      field_name,
      old_value,
      new_value
    FROM attendance_logs
    ORDER BY changed_at DESC
  `;
  db.query(fetchAllLogsSql, (err, results) => {
    if (err) {
      console.error("DB Error fetching all attendance_logs:", err);
      return res.status(500).json({ error: "Database error while fetching all logs" });
    }
    res.json(results);
  });
});

// GET Attendance API - Fetch all attendance records (optional filtering via query parameters)
app.get("/api/attendance", (req, res) => {
  res.set("Cache-Control", "no-store");
  let query = "SELECT * FROM attendance";
  const params = [];
  // Check if we need to filter by employee name
  if (req.query.empName) {
    query += " WHERE emp_name = ?";
    params.push(req.query.empName);
  }
  // Order by emp_name in ascending alphabetical order
  query += " ORDER BY emp_name ASC";
  
  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error while fetching attendance records" });
    }
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

// 1) GET /api/employees-list
//    Return all employees with their leaves (used, remaining, allocated).
app.get("/api/employees-list", (req, res) => {
  // Prevent caching
  res.set("Cache-Control", "no-store");

  const sql = `
    SELECT
      l.id,
      l.Name AS name,
      COALESCE(e.allocatedUnplannedLeave, 0) AS allocatedUnplannedLeave,
      COALESCE(e.allocatedPlannedLeave, 0) AS allocatedPlannedLeave,
      COALESCE(e.usedUnplannedLeave, 0) AS usedUnplannedLeave,
      COALESCE(e.usedPlannedLeave, 0) AS usedPlannedLeave,
      COALESCE(e.remainingUnplannedLeave, 0) AS remainingUnplannedLeave,
      COALESCE(e.remainingPlannedLeave, 0) AS remainingPlannedLeave
    FROM logincrd l
    LEFT JOIN employee_leaves e
      ON l.id = e.employee_id
    WHERE l.disableemp = 0
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching employees:", err);
      return res
        .status(500)
        .json({ error: "Database error while fetching employee list" });
    }

    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ error: "No active employees found or no data available." });
    }

    res.json(results);
  });
});

// 2) POST /api/employee-leaves
app.post("/api/employee-leaves", (req, res) => {
  const {
    allocatedUnplannedLeave,
    allocatedPlannedLeave,
    remainingUnplannedLeave,
    remainingPlannedLeave,
  } = req.body;

  // 1) Get all active employees from logincrd
  db.query("SELECT id, Name FROM logincrd WHERE disableemp = 0", (err, employees) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error fetching employees" });
    }

    if (!employees || employees.length === 0) {
      return res.status(400).json({ error: "No active employees found in logincrd table" });
    }

    // Removed duplicate res.json response here that was causing the headers error
    // We'll do a multi-row INSERT for employees not yet in employee_leaves
    const employeeIds = employees.map((emp) => emp.id);

    db.query(
      "SELECT employee_id FROM employee_leaves WHERE employee_id IN (?)",
      [employeeIds],
      (err, existingResults) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            error: "Database error checking existing employee_leaves",
          });
        }

        const existingIds = existingResults.map((row) => row.employee_id);
        const newEmployees = employees.filter((emp) => !existingIds.includes(emp.id));

        if (newEmployees.length === 0) {
          return res.json({
            message:
              "All employees already have leave records. No new rows added.",
          });
        }

        // Notice usedUnplannedLeave and usedPlannedLeave are set to 0
        const values = newEmployees.map((emp) => [
          emp.id,
          allocatedUnplannedLeave,
          allocatedPlannedLeave,
          0, // usedUnplannedLeave = 0
          0, // usedPlannedLeave = 0
          remainingUnplannedLeave,
          remainingPlannedLeave,
        ]);

        const insertSql = `
          INSERT INTO employee_leaves (
            employee_id,
            allocatedUnplannedLeave,
            allocatedPlannedLeave,
            usedUnplannedLeave,
            usedPlannedLeave,
            remainingUnplannedLeave,
            remainingPlannedLeave
          )
          VALUES ?
        `;
        db.query(insertSql, [values], (err, insertResult) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ error: "Error inserting new leave records" });
          }
          return res.json({
            message: `Added leave records for ${newEmployees.length} employees`,
            insertedCount: newEmployees.length,
          });
        });
      }
    );
  });
});

// 3) PUT /api/employee-leaves
app.put("/api/employee-leaves", (req, res) => {
  const {
    allocatedUnplannedLeave,
    allocatedPlannedLeave,
    remainingUnplannedLeave,
    remainingPlannedLeave,
  } = req.body;

  // usedUnplannedLeave = 0 and usedPlannedLeave = 0 for all employees
  const updateSql = `
    UPDATE employee_leaves
    SET
      allocatedUnplannedLeave = ?,
      allocatedPlannedLeave = ?,
      remainingUnplannedLeave = ?,
      remainingPlannedLeave = ?,
      usedUnplannedLeave = 0,
      usedPlannedLeave = 0
  `;

  db.query(
    updateSql,
    [
      allocatedUnplannedLeave,
      allocatedPlannedLeave,
      remainingUnplannedLeave,
      remainingPlannedLeave,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Database error updating leaves" });
      }
      res.json({
        message: "Leaves updated successfully for all employees",
        affectedRows: result.affectedRows,
      });
    }
  );
});

// POST /api/employee-leaves-midyear
app.post("/api/employee-leaves-midyear", (req, res) => {
  const {
    employeeId,
    joinDate,
    allocatedUnplannedLeave,
    allocatedPlannedLeave
  } = req.body;

  // 1. Basic validation
  if (
    !employeeId ||
    !joinDate ||
    allocatedUnplannedLeave == null ||
    allocatedPlannedLeave == null
  ) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const join = new Date(joinDate);
  if (isNaN(join)) {
    return res.status(400).json({ error: "Invalid join date." });
  }

  const annualUnplanned = Number(allocatedUnplannedLeave);
  const annualPlanned = Number(allocatedPlannedLeave);

  // 2. Validate non-negative numbers
  if (annualUnplanned < 0 || annualPlanned < 0) {
    return res.status(400).json({ error: "Allocated leaves must be non-negative numbers." });
  }

  // 3. Check if record already exists
  const checkSql = `SELECT * FROM employee_leaves WHERE employee_id = ?`;
  db.query(checkSql, [employeeId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Database check error");
      return res.status(500).json({ error: "Internal server error." });
    }

    if (checkResults.length > 0) {
      return res.status(409).json({
        error: `Leave record already exists for employee ${employeeId}.`
      });
    }

    // 4. Monthly allocations
    const monthlyUnplanned = annualUnplanned / 12;
    const monthlyPlanned = annualPlanned / 12;

    // 5. Join date calculations
    const joinMonthIndex = join.getMonth(); // 0 = Jan
    const joinDay = join.getDate(); // 1 - 31
    const fullMonthsAfter = 11 - joinMonthIndex;

    const plannedJoinFactor = joinDay <= 15 ? 1.0 : 0.5;
    const unplannedJoinFactor = 1.0;

    const monthsForPlanned = fullMonthsAfter + plannedJoinFactor;
    const monthsForUnplanned = fullMonthsAfter + unplannedJoinFactor;

    const proratedPlanned = Math.floor(monthlyPlanned * monthsForPlanned);
    const proratedUnplanned = Math.ceil(monthlyUnplanned * monthsForUnplanned);

    // 6. Insert into DB
    const insertSql = `
      INSERT INTO employee_leaves (
        employee_id,
        allocatedUnplannedLeave,
        allocatedPlannedLeave,
        usedUnplannedLeave,
        usedPlannedLeave,
        remainingUnplannedLeave,
        remainingPlannedLeave
      ) VALUES (?, ?, ?, 0, 0, ?, ?)
    `;

    db.query(
      insertSql,
      [
        employeeId,
        annualUnplanned,
        annualPlanned,
        proratedUnplanned,
        proratedPlanned
      ],
      (insertErr, result) => {
        if (insertErr) {
          console.error("Database insert error");
          return res.status(500).json({ error: "Database insert failed." });
        }

        // Success response
        res.json({
          message: `Leave record added for employee ${employeeId}.`,
          insertedId: result.insertId,
          details: {
            annualUnplanned,
            annualPlanned,
            monthlyUnplanned: monthlyUnplanned.toFixed(2),
            monthlyPlanned: monthlyPlanned.toFixed(2),
            fullMonthsAfter,
            plannedJoinFactor,
            unplannedJoinFactor,
            monthsForPlanned,
            monthsForUnplanned,
            proratedPlanned,
            proratedUnplanned
          }
        });
      }
    );
  });
});

// 4) PUT /api/employee-leaves/:id
app.put("/api/employee-leaves/:id", (req, res) => {
  const employeeId = req.params.id;
  const {
    usedUnplannedLeave,
    usedPlannedLeave,
    remainingUnplannedLeave,
    remainingPlannedLeave,
  } = req.body;

  const updateSql = `
    UPDATE employee_leaves
    SET
      usedUnplannedLeave = ?,
      usedPlannedLeave = ?,
      remainingUnplannedLeave = ?,
      remainingPlannedLeave = ?
    WHERE employee_id = ?
  `;

  const params = [
    usedUnplannedLeave,
    usedPlannedLeave,
    remainingUnplannedLeave,
    remainingPlannedLeave,
    employeeId,
  ];

  db.query(updateSql, params, (err, result) => {
    if (err) {
      console.error("Error updating employee leaves:", err);
      return res
        .status(500)
        .json({ error: "Database error updating employee leaves." });
    }
    if (result.affectedRows === 0) {
      // No record updated => no row found for this employee_id
      return res
        .status(404)
        .json({ error: "No leave record found for this employee." });
    }
    res.json({ message: "Employee leaves updated successfully." });
  });
});

// -----------------------------------------------------
// GET /api/employees-leaves/:id
//     (fetch used & remaining leaves for the given employee)
app.get("/api/employees-leaves/:id", (req, res) => {
  const employeeId = req.params.id;

  const sql = `
    SELECT
      usedUnplannedLeave AS usedUnplannedLeave,
      usedPlannedLeave AS usedPlannedLeave,
      remainingUnplannedLeave AS remainingUnplannedLeave,
      remainingPlannedLeave AS remainingPlannedLeave
    FROM employee_leaves
    WHERE employee_id = ?
    LIMIT 1
  `;
  db.query(sql, [employeeId], (err, results) => {
    if (err) {
      console.error("Error fetching employee leaves:", err);
      return res.status(500).json({ error: "Database error fetching leaves." });
    }
    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ error: "No leave record found for this employee." });
    }
    res.json(results[0]);
  });
});

// -----------------------------------------------------
// 5) NEW: PATCH /api/employee-leaves/:employeeId/use-leave
//    (record fractional usage, e.g. 0.5, 1.0, 1.5, etc.)

app.patch("/api/employee-leaves/:employeeId/use-leave", (req, res) => {
  const { employeeId } = req.params;
  const { leaveType, amount } = req.body;

  // Validate leaveType
  if (!["unplanned", "planned"].includes(leaveType)) {
    return res.status(400).json({ error: "leaveType must be 'unplanned' or 'planned'" });
  }
  // Validate amount
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number (e.g. 0.5)" });
  }

  // Decide which columns to update:
  const usedColumn   = leaveType === "unplanned" ? "usedUnplannedLeave"     : "usedPlannedLeave";
  const remainColumn = leaveType === "unplanned" ? "remainingUnplannedLeave": "remainingPlannedLeave";

  // 1) Check current remaining balance
  const checkSql = `
    SELECT ${remainColumn} AS currentRemaining
    FROM employee_leaves
    WHERE employee_id = ?
    LIMIT 1
  `;
  db.query(checkSql, [employeeId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB error fetching remaining balance" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No leave record found for this employee_id" });
    }

    const currentRemaining = parseFloat(rows[0].currentRemaining);
    if (currentRemaining < amount) {
      return res.status(400).json({
        error: `Insufficient remaining ${leaveType} leave (currently ${currentRemaining.toFixed(2)})`,
      });
    }

    // 2) Update both usedX += amount, remainingX -= amount
    const updateSql = `
      UPDATE employee_leaves
      SET
        ${usedColumn}   = ${usedColumn} + ?,
        ${remainColumn} = ${remainColumn} - ?
      WHERE employee_id = ?
    `;
    db.query(updateSql, [amount, amount, employeeId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error updating leave usage" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "No leave record found to update" });
      }
      return res.json({
        message: `Recorded ${amount.toFixed(2)} day(s) of ${leaveType} leave for employee ${employeeId}`,
        affectedRows: result.affectedRows
      });
    });
  });
});

  // Optionally, if you need a GET /api/employee_holidays route:

app.get("/api/employee_holidays", (req, res) => {
  const { location } = req.query;
  let sql = `
    SELECT
      id,
      holiday_name,
      holiday_date,
      location,
      approval_status
    FROM holidays
  `;
  const params = [];

  if (location) {
    sql += " WHERE location LIKE ?";
    params.push(`%${location}%`);
  }

  sql += " ORDER BY holiday_date";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching holidays:", err);
      return res.status(500).json({ error: "Database error fetching holidays." });
    }
    res.json(results);
  });
});



// 2) POST /api/employee-leaves-date
// Add a new leave date record for an employee, now including leave_day
app.post("/api/employee-leaves-date", (req, res) => {
  const { employeeId, leave_date, leave_type, leave_day } = req.body;
  if (!employeeId || !leave_date || !leave_type || !leave_day) {
    return res
      .status(400)
      .json({ error: "employeeId, leave_date, leave_type, and leave_day are required." });
  }
  const sql = `
    INSERT INTO employeeleavesdate (employee_id, leave_date, leave_type, leave_day)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [employeeId, leave_date, leave_type, leave_day], (err, result) => {
    if (err) {
      console.error("Error inserting leave date record:", err);
      return res
        .status(500)
        .json({ error: "Database error inserting leave date record." });
    }
    res.json({
      message: "Leave date record added successfully.",
      id: result.insertId,
    });
  });
});

// 3) PUT /api/employee-leaves-date/:id
// Update a leave date record by its ID, now including leave_day
app.put("/api/employee-leaves-date/:id", (req, res) => {
  const { id } = req.params;
  const { leave_date, leave_type, leave_day } = req.body;
  if (!leave_date || !leave_type || !leave_day) {
    return res
      .status(400)
      .json({ error: "leave_date, leave_type, and leave_day are required." });
  }
  const sql = `
    UPDATE EmployeeLeavesDate
    SET leave_date = ?, leave_type = ?, leave_day = ?
    WHERE id = ?
  `;
  db.query(sql, [leave_date, leave_type, leave_day, id], (err, result) => {
    if (err) {
      console.error("Error updating leave date record:", err);
      return res
        .status(500)
        .json({ error: "Database error updating leave date record." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Leave date record not found." });
    }
    res.json({ message: "Leave date record updated successfully." });
  });
});

// ─── 2) GET /api/logincrd 
//   GET /api/logincrd?office=Ratnagiri
app.get("/api/logincrd", (req, res) => {
  let sql    = `
    SELECT
      id           AS employee_id,
      Name,
      fname,
      lname,
      Nickname,
      Email,
      Location     AS offices
    FROM logincrd
    WHERE disableemp = 0
  `;
  const params = [];

  if (req.query.office) {
    sql += " AND LOWER(Location) = LOWER(?)";
    params.push(req.query.office);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching employees:", err);
      return res.status(500).json({ error: "Could not fetch employees" });
    }
    res.json(results);
  });
});

// ─── 3) GET /api/employeeleavesdate 
//   GET /api/employeeleavesdate?office=Delhi&employeeId=42
app.get("/api/employeeleavesdate", (req, res) => {
  let sql    = `
    SELECT
      ed.id,
      ed.employee_id,
      l.Name             AS employee_name,
      DATE_FORMAT(ed.leave_date, '%d-%m-%Y') AS leave_date,
      ed.leave_type
    FROM employeeleavesdate ed
    JOIN logincrd l ON ed.employee_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (req.query.office) {
    sql += " AND LOWER(l.Location) = LOWER(?)";
    params.push(req.query.office);
  }
  if (req.query.employeeId) {
    sql += " AND ed.employee_id = ?";
    params.push(req.query.employeeId);
  }

  sql += " ORDER BY ed.id ASC";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching leaves:", err);
      return res.status(500).json({ error: "Failed to fetch leaves" });
    }
    res.json(results);
  });
});


// NEW: Leave Application API Endpoint
// This endpoint saves the data from the leave application form to the database.
app.post("/api/leave/apply-leave", (req, res) => {
  const { employee_id, leave_type, to_email, cc_email, subject, body } = req.body;
  if (!employee_id || !leave_type || !to_email) {
    return res.status(400).json({ error: "employee_id, leave_type, and to_email are required." });
  }
  const sql = `
    INSERT INTO leave_applications (employee_id, leave_type, to_email, cc_email, subject, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [employee_id, leave_type, to_email, cc_email, subject, body], (err, result) => {
    if (err) {
      console.error("Error inserting leave application:", err);
      return res.status(500).json({ error: "Database error while submitting leave application." });
    }
    res.status(201).json({ message: "Leave application submitted successfully", id: result.insertId });
  });
});

//app.post('/api/leave/apply-leave', (req, res) => {
  // your logic here
  //res.json({ message: 'Leave applied successfully' });
//});


// ─── 1) GET /api/offices 
// Returns all offices (id + name) for populating your dropdown.
app.get("/api/offices", (req, res) => {
  const sql = "SELECT id, name FROM offices";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching offices:", err);
      return res.status(500).json({ error: "Could not fetch offices" });
    }
    res.json(results);
  });
});


/**
 * POST Office API - Add a new office
 */
app.post("/api/offices", (req, res) => {
  const { name } = req.body;
  db.query("INSERT INTO offices (name) VALUES (?)", [name], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to add office" });
    const insertedOffice = { id: result.insertId, name };
    res.json(insertedOffice);
  });
});

//Mail Function API's
// 3) Submit a leave-email → save to requests as “pending”
app.post("/api/send-leave-email", async (req, res) => {
  const {
    employee_id,
    from_email,
    from_name,
    leave_type,
    to_email,
    cc_email,
    subject,
    body,
  } = req.body;

  try {
    // send the actual mail
    await sendLeaveEmail({ from_email, from_name, to_email, cc_email, subject, body });

    // store in leave_mail_requests as pending
    const sql = `
      INSERT INTO leave_mail_requests
        (employee_id, from_email, from_name, leave_type, to_email, cc_email, subject, body)
      VALUES (?,?,?,?,?,?,?,?)
    `;
    const values = [employee_id, from_email, from_name, leave_type, to_email, cc_email, subject, body];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("DB insert error:", err);
        return res.status(500).send("Database error");
      }
      res.status(200).json({ requestId: result.insertId, status: 'pending' });
    });
  } catch (err) {
    console.error("Send mail error:", err);
    res.status(500).send("Failed to send email");
  }
});


// 4) Fetch all pending requests (Admin/TL)
app.get("/api/pending-requests", (req, res) => {
  const sql = `SELECT * FROM leave_mail_requests WHERE status='pending' ORDER BY created_at DESC`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("DB fetch error:", err);
      return res.status(500).send("Database error");
    }
    res.json(rows);
  });
});


// 5) Approve/Reject + remove from pending
app.post("/api/requests/:id/decision", (req, res) => {
  const requestId = req.params.id;
  const { decision } = req.body;   // 'approved' or 'rejected'
  const conn = db.promise();

  (async () => {
    try {
      await conn.beginTransaction();

      // copy into permanent table with status — now including request_id
      await conn.query(
        `INSERT INTO leave_mails
           (request_id, employee_id, from_name, to_email, subject, leave_type, status, created_at)
         SELECT
           request_id, employee_id, from_name, to_email, subject, leave_type, ?, NOW()
         FROM leave_mail_requests
         WHERE request_id = ?`,
        [decision, requestId]
      );

      // delete from pending
      await conn.query(
        `DELETE FROM leave_mail_requests
          WHERE request_id = ?`,
        [requestId]
      );

      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      console.error("Decision error:", err);
      res.status(500).json({ error: 'Decision update failed' });
    }
  })();
});


// POST → notify employee that their leave was approved/rejected
app.post("/api/send-decision-email", async (req, res) => {
  const { to_email, cc_email, subject, body } = req.body;

  try {
    await sendDecisionEmail({ to_email, cc_email, subject, body });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Decision email error:", err);
    res.status(500).json({ error: "Failed to send decision email" });
  }
});


// GET → fetch all approved leave‑mails
app.get("/api/approved-requests", (req, res) => {
  const sql = `
    SELECT 
      id AS request_id,
      employee_id,
      from_name,
      to_email,
      subject,
      leave_type,
      created_at
    FROM leave_mails
    WHERE status = 'approved'
    ORDER BY created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("DB fetch error:", err);
      return res.status(500).send("Database error");
    }
    res.json(rows);
  });
});
// GET → fetch all rejected leave-mails
app.get("/api/rejected-requests", (req, res) => {
  const sql = `
    SELECT 
      id        AS request_id,
      employee_id,
      from_name,
      to_email,
      subject,
      leave_type,
      created_at
    FROM leave_mails
    WHERE status = 'rejected'
    ORDER BY created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("DB fetch error:", err);
      return res.status(500).send("Database error");
    }
    res.json(rows);
  });
});

// GET → fetch all requests (pending, approved, rejected) for one employee
app.get("/api/my-requests", (req, res) => {
  const { employee_id } = req.query;
  if (!employee_id) return res.status(400).json({ error: "employee_id required" });

  // We'll UNION pending table with the permanent table
  const sql = `
  SELECT 
    request_id,
    employee_id,
    from_name,
    subject,
    leave_type,
    created_at,
    'pending' AS status
  FROM leave_mail_requests
  WHERE employee_id = ?
  UNION ALL
  SELECT
    request_id      AS request_id,
    employee_id,
    from_name,
    subject,
    leave_type,
    created_at,
    status
  FROM leave_mails
  WHERE employee_id = ?
  ORDER BY created_at DESC
`;
  db.query(sql, [employee_id, employee_id], (err, rows) => {
    if (err) {
      console.error("DB fetch my‑requests error:", err);
      return res.status(500).send("Database error");
    }
    res.json(rows);
  });
});


// ── Fetch subject templates from MySQL ──
app.get("/api/subject-templates", (req, res) => {
  const sql = "SELECT subject, body FROM subject_templates ORDER BY id";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching templates:", err);
      return res.status(500).json({ error: err.message });
    }
    // results is already an array of { subject, body }
    res.json(results);
  });
});

// ── GET subject-templates ──
app.get("/api/subject-templates", (req, res) => {
  const sql = "SELECT id, subject, body FROM subject_templates ORDER BY id";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching templates:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
// POST /api/subject-templates
app.post("/api/subject-templates", (req, res) => {
  const { subject, body } = req.body;
  if (typeof subject !== "string" || !subject.trim() ||
      typeof body    !== "string" || !body.trim()
  ) {
    return res.status(400).json({ error: "Subject and body are required" });
  }

  const sql = "INSERT INTO subject_templates (subject, body) VALUES (?, ?)";
  db.query(sql, [subject.trim(), body.trim()], (err, result) => {
    if (err) {
      console.error("Error inserting template:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: result.insertId, subject, body });
  });
});

// ── PUT update a single template body ──
app.put("/api/subject-templates/:id", (req, res) => {
  const { id } = req.params;
  const { body } = req.body;

  if (typeof body !== "string" || !body.trim()) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const sql = "UPDATE subject_templates SET body = ? WHERE id = ?";
  db.query(sql, [body, id], (err, result) => {
    if (err) {
      console.error("Error updating template:", err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ success: true });
  });
});

app.get("/api/attendancecalendar", (req, res) => {
  const { year, empName = "" } = req.query;
  const y = parseInt(year, 10);
  if (isNaN(y)) {
    return res.status(400).json({ error: "Invalid year parameter" });
  }

  // 1) Fetch raw attendance rows for that employee & year
  let sql = `
    SELECT
      DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
      a.in_time,
      a.out_time,
      a.work_hour,
      a.location,
      a.day
    FROM attendance a
    WHERE YEAR(a.date) = ?
  `;
  const params = [y];
  if (empName.trim()) {
    sql += " AND a.emp_name = ?";
    params.push(empName.trim());
  }
  sql += " ORDER BY a.date";

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("DB error fetching attendance:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // 2) Apply your display logic
    const mapped = rows.map(r => {
      let dayCode = r.day;
      const loc    = (r.location || "").toLowerCase();
      const isSV   = r.location && !loc.split(/\s+/).some(w => ["ro","mo","rso","do","wfh"].includes(w));
      const dateObj = new Date(r.date);

      // Late-mark logic
      if (
        r.in_time &&
        dayCode === "Full Day" &&
        !loc.includes("sv") &&
        dateObj.getDay() !== 0
      ) {
        const checkIn   = moment(r.in_time, "YYYY-MM-DD HH:mm:ss");
        const threshold = moment(r.date,       "YYYY-MM-DD").hour(10);
        if (checkIn.isAfter(threshold)) {
          dayCode = "Late Mark";
        }
      }

      // Site-visit logic
      if (isSV && dayCode !== "Holiday" && dayCode !== "Sunday") {
        dayCode = (!r.in_time || !r.out_time) ? "SV.I" : "SV.P";
      }

      // Incomplete attendance (<5h or missing in/out, non-SV)
      if (
        !isSV &&
        dayCode !== "Absent" &&
        dayCode !== "Holiday" &&
        dayCode !== "Sunday" &&
        (r.work_hour < 5 || !r.in_time || !r.out_time)
      ) {
        return { ...r, status: "Incomplete Attendance", color: "#ffffff" };
      }

      // Map final status → color
      let status, color;
      switch (dayCode) {
        case "Holiday":
          status = "Holiday";              color = "#ff0000"; break;
        case "Full Day":
          status = "Present";              color = "#90EE90"; break;
        case "Late Mark":
          status = "Late_mark";            color = "#90EE90"; break;
        case "Half Day":
          status = "Half_day";             color = "#B0E0E6"; break;
        case "SV.P":
          status = "Site_visit_present";   color = "#FFFF00"; break;
        case "SV.I":
          status = "Site_visit_incomplete";color = "#FFFF00"; break;
        case "Sunday":
          status = "Sunday";               color = "#ff9900"; break;
        case "Absent":
        default:
          status = "Absent";               color = "#FFC0CB"; break;
      }

      return {
        date:       r.date,
        in_time:    r.in_time,
        out_time:   r.out_time,
        work_hour:  r.work_hour,
        location:   r.location,
        status,
        color
      };
    });

    // 2.1) Dedupe: keep only the first record for each date
    const uniqueByDate = {};
    mapped.forEach(rec => {
      if (!uniqueByDate[rec.date]) {
        uniqueByDate[rec.date] = rec;
      }
    });
    const deduped = Object.values(uniqueByDate);

    // 2.2) Fetch holidays and MERGE with attendance
    const holSql = `
      SELECT
        DATE_FORMAT(h.holiday_date, '%Y-%m-%d') AS date,
        h.holiday_name
      FROM holidays h
      WHERE YEAR(h.holiday_date) = ?
    `;
    db.query(holSql, [y], (err2, holRows) => {
      if (err2) {
        console.error("DB error fetching holidays:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      // Build map from deduped attendance
      const finalMap = {};
      deduped.forEach(rec => {
        finalMap[rec.date] = { ...rec, isHoliday: false };
      });

      // Merge holiday info
      holRows.forEach(h => {
        const d = h.date;
        if (finalMap[d]) {
          // mark existing attendance as holiday too
          finalMap[d].isHoliday    = true;
          finalMap[d].holiday_name = h.holiday_name;
        } else {
          // pure-holiday record
          finalMap[d] = {
            date:         d,
            in_time:      null,
            out_time:     null,
            work_hour:    0,
            location:     null,
            status:       h.holiday_name,
            color:        "#ff0000",
            isHoliday:    true,
            holiday_name: h.holiday_name
          };
        }
      });

      // 3) Back-fill all Sundays of the year if missing
      for (let d = new Date(`${y}-01-01`); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) {
          const iso = d.toISOString().slice(0,10);
          if (!finalMap[iso]) {
            finalMap[iso] = {
              date:       iso,
              in_time:    null,
              out_time:   null,
              work_hour:  0,
              location:   null,
              status:     "Sunday",
              color:      "#ff9900",
              isHoliday:  false
            };
          }
        }
      }

      // 4) Sort and return
      const result = Object.values(finalMap)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      res.json(result);
    });
  });
});

app.get("/api/reports-by-id", async (req, res) => {
  const empId = req.query.empId;

  if (!empId) {
    return res.status(400).json({ error: "Missing empId" });
  }

  const sql = `
    SELECT id, Name AS name
    FROM logincrd
    WHERE FIND_IN_SET(?, REPLACE(Escalator, ' ', ''))
    UNION
    SELECT id, Name AS name
    FROM logincrd
    WHERE id = ?
    ORDER BY name
  `;

  db.query(sql, [empId, empId], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!Array.isArray(results)) {
      return res.status(500).json({ error: "Unexpected result format" });
    }

    res.json(results);
  });
});

// 1) Route definition
app.get("/api/escalated-employees", async (req, res) => {
  const empId = req.query.empId;
  if (!empId) {
    return res.status(400).json({ error: "Missing empId" });
  }

  // 2) SQL to find escalatable employees plus self
  const sql = `
    SELECT id, Name AS name
    FROM logincrd
    WHERE FIND_IN_SET(?, REPLACE(Escalator, ' ', ''))
    UNION
    SELECT id, Name AS name
    FROM logincrd
    WHERE id = ?
    ORDER BY name
  `;

  // 3) Execute query
  db.query(sql, [empId, empId], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// GET unsettled comp-offs summary
app.get('/api/comp-off-requests', (req, res) => {
  const sql = `
    SELECT 
      employee_id,
      from_name AS employeeName,
      SUM(CASE WHEN leave_type = 'Compensatory Off(Leave)' THEN 1 ELSE 0 END) AS leaveCount,
      SUM(CASE WHEN leave_type = 'Compensatory Off(Cash)' THEN 1 ELSE 0 END) AS cashCount
    FROM leave_mails
    WHERE status = 'approved'
      AND settled = 0
      AND leave_type IN ('Compensatory Off(Leave)', 'Compensatory Off(Cash)')
    GROUP BY employee_id, from_name
    ORDER BY from_name ASC;
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error running query:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});

// PATCH to partially settle comp-offs
app.patch('/api/comp-off-requests/settle', (req, res) => {
  const { employee_id, leave_type, count } = req.body;
  if (!employee_id || !leave_type || typeof count !== 'number' || count < 1) {
    return res.status(400).json({ error: 'employee_id, leave_type and a positive numeric count are required' });
  }

  const sql = `
    UPDATE leave_mails
    SET settled = 1
    WHERE employee_id = ?
      AND leave_type  = ?
      AND status      = 'approved'
      AND settled     = 0
    ORDER BY created_at ASC
    LIMIT ?
  `;
  db.query(sql, [employee_id, leave_type, count], (err, result) => {
    if (err) {
      console.error('Error settling comp-off:', err);
      return res.status(500).json({ error: 'Could not settle comp-off' });
    }
    res.json({ settledRows: result.affectedRows });
  });
});

//status

app.get('/api/status', (req, res) => {
  const sql = `
 SELECT emp_name, location, status
FROM (
  SELECT 
    emp_name,
    location,
    in_time,
    CASE 
      WHEN (in_time IS NOT NULL AND in_time <> '') AND (out_time IS NULL OR out_time = '') 
      THEN 'online'
      ELSE 'offline'
    END AS status,
    ROW_NUMBER() OVER (
      PARTITION BY emp_name 
      ORDER BY in_time DESC
    ) as rn
  FROM attendance 
  WHERE date = CURDATE()
) AS ranked
WHERE rn = 1
  AND emp_name NOT IN ('Admin', 'Mrunaal Mhaiskar', 'Chetan Paralikar','Makarand Mhaiskar')

UNION 

SELECT Name, Location, 'Absent' as status
FROM logincrd
WHERE disableemp = 0
  AND Name NOT IN (
    SELECT emp_name FROM attendance WHERE date = CURDATE()
  )
  AND Name NOT IN ('Admin', 'Mrunaal Mhaiskar', 'Chetan Paralikar','Makarand Mhaiskar')

UNION

SELECT NickName, location, 'Absent' as status
FROM employee_master
WHERE NickName NOT IN (
  SELECT emp_name FROM attendance WHERE date = CURDATE()
)
AND NickName IN (
  SELECT Name FROM logincrd WHERE disableemp = 0
);
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error('Error fetching status:', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

// === GET /api/users ===
// Returns a list of all active employees (disableemp = 0) with their id, Name, and Nickname.
// Frontend will call this to populate the Admin’s dropdown.
app.get("/api/users", (req, res) => {
  const sql = `
    SELECT id, Name, Nickname
      FROM logincrd
    WHERE disableemp = 0
    ORDER BY Name ASC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "DB error" });
    }
    // results = [ { id: 1, Name: "Alice", Nickname: "alice" }, { ... } ]
    res.json(results);
  });
});

// === GET profile (including office + designation) ===
app.get("/api/profile/:id", (req, res) => {
  const sql = `
    SELECT
      id,
      Name               AS Name,
      fname,
      lname,
      Nickname           AS nickname,
      Email              AS email,
      Location           AS location,
      attendance_role    AS role,
      Offices            AS office,
      designation        AS designation,
      image_filename
    FROM logincrd
    WHERE id = ?
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!results.length) return res.status(404).json({ error: "Not found" });
    res.json(results[0]);
  });
});

// === POST update profile text fields (now including office + designation) ===
app.post("/api/profile/:id", (req, res) => {
  const {
    Name,
    fname,
    lname,
    nickname,
    email,
    location,
    role,
    office,
    designation,
  } = req.body;

  const sql = `
    UPDATE logincrd
      SET
        Name            = ?,
        fname           = ?,
        lname           = ?,
        Nickname        = ?,
        Email           = ?,
        Location        = ?,
        attendance_role = ?,
        Offices         = ?,
        designation     = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      Name,
      fname,
      lname,
      nickname,
      email,
      location,
      role,
      office,
      designation,
      req.params.id,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json({ message: "Profile updated" });
    }
  );
});

// === POST image upload (only .jpg allowed) ===
app.post(
  "/api/profile/:id/image",
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      upload.single("image")(req, res, next);
    } else {
      return res.status(400).json({ error: "No image uploaded" });
    }
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // OPTIONAL: Delete old image from disk
    const getOldImageSQL = "SELECT image_filename FROM logincrd WHERE id = ?";
    db.query(getOldImageSQL, [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: "DB error" });

      const oldFile = results[0]?.image_filename;
      if (oldFile) {
        const oldPath = path.join(__dirname, "uploads", oldFile);
        fs.unlink(oldPath, (unlinkErr) => {
          // Ignore unlink errors silently
        });
      }

      // Save new image filename in DB
      db.query(
        "UPDATE logincrd SET image_filename = ? WHERE id = ?",
        [req.file.filename, req.params.id],
        (err) => {
          if (err) return res.status(500).json({ error: "DB error" });
          res.json({ filename: req.file.filename });
        }
      );
    });
  }
);
// Fetch employees who works in offices as well as site visit employees shows under site visit tab 
app.get("/api/nickoffices", (req, res) => {
  const sql = `
    SELECT DISTINCT Offices
    FROM logincrd
    WHERE Offices IS NOT NULL
      AND TRIM(Offices) <> ''
    ORDER BY Offices
  `;

  db.query(sql.trim(), (err, results) => {
    if (err) {
      console.error("Error fetching offices:", err);
      return res.status(500).json({ error: err.message });
    }
    // Map each row to its “Offices” field
    const offices = results.map((row) => row.Offices);
    res.json(offices);
  });
});


app.get("/api/office-status", (req, res) => {
  const office = req.query.office;
  if (!office) {
    return res
      .status(400)
      .json({ error: "Missing required query parameter: office" });
  }

  const sql = `
  
    SELECT
      ranked.emp_name        AS name,
      ranked.location        AS location,
      ranked.status          AS status,
      lc.image_filename      AS image_filename
    FROM (
      SELECT
        a.emp_name,
        a.location,
        a.in_time,
        a.out_time,
        CASE
          WHEN (a.in_time IS NOT NULL AND a.in_time <> '')
               AND (a.out_time IS NULL    OR a.out_time = '')
            THEN 'online'
          ELSE 'offline'
        END AS status,
        ROW_NUMBER() OVER (
          PARTITION BY a.emp_name
          ORDER BY a.in_time DESC
        ) AS rn
      FROM attendance AS a
      WHERE a.date = CURDATE()
    ) AS ranked
    JOIN logincrd AS lc
      ON lc.Name = ranked.emp_name
    WHERE
      ranked.rn = 1
      AND lc.Offices = ?
      AND ranked.emp_name NOT IN (
        'Admin', 'Mrunaal Mhaiskar', 'Chetan Paralikar', 'Makarand Mhaiskar'
      )

    UNION

    SELECT
      lc.Name              AS name,
      lc.Location          AS location,
      'Absent'             AS status,
      lc.image_filename    AS image_filename
    FROM logincrd AS lc
    WHERE
      lc.disableemp = 0
      AND lc.Offices = ?
      AND lc.Name NOT IN (
        SELECT a.emp_name
        FROM attendance AS a
        WHERE a.date = CURDATE()
      )
      AND lc.Name NOT IN (
        'Admin', 'Mrunaal Mhaiskar', 'Chetan Paralikar', 'Makarand Mhaiskar'
      )

    UNION

    SELECT
      em.NickName          AS name,
      lc2.Location         AS location,
      'Absent'             AS status,
      lc2.image_filename   AS image_filename
    FROM employee_master AS em
    JOIN logincrd AS lc2
      ON lc2.Name = em.NickName
    WHERE
      lc2.Offices = ?
      AND em.NickName NOT IN (
        SELECT a.emp_name
        FROM attendance AS a
        WHERE a.date = CURDATE()
      )
      AND em.NickName IN (
        SELECT Name
        FROM logincrd
        WHERE disableemp = 0
          AND Offices = ?
      );
  `;

  const params = [office, office, office, office];
  db.query(sql.trim(), params, (err, rows) => {
    if (err) {
      console.error("SQL error on /api/office-status:", err);
      return res.status(500).json({ error: err.message });
    }

    // Build the final “photo_url” dynamically from request host + /uploads/
    const host = `${req.protocol}://${req.get("host")}`;
    const withPhoto = rows.map((row) => ({
      name: row.name,
      location: row.location,
      status: row.status,
      // If image_filename is null/empty, return null
      photo_url: row.image_filename
        ? `${host}/uploads/${row.image_filename}`
        : null,
      image_filename: row.image_filename,
    }));

    res.json(withPhoto);
  });
});

/**
 * 3) GET /api/site-status
 *    → Employees whose latest attendance row (today):
 *         • location ≠ 'WFH'
 *         • location NOT IN (any Office name from logincrd)
 *         • If in_time is present & out_time empty → 'online', else 'offline'
 */
app.get("/api/site-status", (req, res) => {
  const sql = `
    SELECT
      ranked.name COLLATE utf8mb4_general_ci       AS name,
      ranked.location COLLATE utf8mb4_general_ci    AS location,
      ranked.status COLLATE utf8mb4_general_ci     AS status,
      lc.image_filename  AS image_filename
    FROM (
      -- Rank all attendance rows for today, per employee
      SELECT
        a.emp_name      AS name,
        a.location      AS location,
        a.in_time       AS in_time,
        a.out_time      AS out_time,
        CASE
          WHEN (a.in_time IS NOT NULL AND a.in_time <> '')
               AND (a.out_time IS NULL OR a.out_time = '')
            THEN 'online'
          ELSE 'offline'
        END AS status,
        ROW_NUMBER() OVER (
          PARTITION BY a.emp_name
          ORDER BY a.in_time DESC
        ) AS rn
      FROM attendance AS a
      WHERE a.date = CURDATE()
    ) AS ranked
    JOIN logincrd AS lc
      ON lc.Name = ranked.name
    WHERE
      ranked.rn = 1
      -- Must have a non-empty location
      AND ranked.location IS NOT NULL
      AND TRIM(ranked.location) <> ''
      -- Exclude 'WFH'
      AND ranked.location <> 'WFH'
      -- Exclude any location matching an Office name
      AND ranked.location NOT IN (
        SELECT DISTINCT Offices
        FROM logincrd
        WHERE Offices IS NOT NULL
          AND TRIM(Offices) <> ''
      )
      -- Exclude the hard-coded admin names
      AND ranked.name NOT IN (
        'Admin', 'Mrunaal Mhaiskar', 'Chetan Paralikar', 'Makarand Mhaiskar'
      );
  `;

  db.query(sql.trim(), (err, rows) => {
    if (err) {
      console.error("SQL error on /api/site-status:", err);
      return res.status(500).json({ error: err.message });
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const withPhoto = rows.map((row) => ({
      name: row.name,
      location: row.location,
      status: row.status,
      photo_url: row.image_filename
        ? `${host}/uploads/${row.image_filename}`
        : null,
      image_filename: row.image_filename,
    }));

    res.json(withPhoto);
  });
});

/**
 * 4) GET /api/wfh-status
 *    → Employees whose latest attendance row today has location = 'WFH'
 */
app.get("/api/wfh-status", (req, res) => {
  const sql = `
    SELECT
      ranked.name COLLATE utf8mb4_general_ci       AS name,
      ranked.location COLLATE utf8mb4_general_ci   AS location,
      ranked.status COLLATE utf8mb4_general_ci     AS status,
      lc.image_filename  AS image_filename
    FROM (
      /* Rank every attendance row for today per employee */
      SELECT
        a.emp_name      AS name,
        a.location      AS location,
        a.in_time       AS in_time,
        a.out_time      AS out_time,
        CASE
          WHEN (a.in_time IS NOT NULL AND a.in_time <> '')
               AND (a.out_time IS NULL OR a.out_time = '')
            THEN 'online'
          ELSE 'offline'
        END AS status,
        ROW_NUMBER() OVER (
          PARTITION BY a.emp_name
          ORDER BY a.in_time DESC
        ) AS rn
      FROM attendance AS a
      WHERE a.date = CURDATE()
    ) AS ranked
    JOIN logincrd AS lc
      ON lc.Name = ranked.name
    WHERE
      ranked.rn = 1
      AND ranked.location = 'WFH'
      AND ranked.location IS NOT NULL
      AND TRIM(ranked.location) <> ''
      AND ranked.name NOT IN (
        'Admin', 'Mrunaal Mhaiskar', 'Chetan Paralikar', 'Makarand Mhaiskar'
      );
  `;

  db.query(sql.trim(), (err, rows) => {
    if (err) {
      console.error("SQL error on /api/wfh-status:", err);
      return res.status(500).json({ error: err.message });
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const withPhoto = rows.map((row) => ({
      name: row.name,
      location: row.location,
      status: row.status,
      photo_url: row.image_filename
        ? `${host}/uploads/${row.image_filename}`
        : null,
      image_filename: row.image_filename,
    }));

    res.json(withPhoto);
  });
});
// ─── GET EMPLOYEE’S COMPOFF COUNTS ────────────────────────────────────────
// Endpoint: GET /api/employees-comoff/:employeeId
app.get("/api/employees-comoff/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!employeeId) {
    return res
      .status(400)
      .json({ error: "Invalid or missing employeeId parameter." });
  }

  try {
    // 1) Count pending compoff: status = 'approved' AND settled = 0
    const [pendingRows] = await db
      .promise()
      .query(
        `
        SELECT
          COUNT(*) AS pendingComoff
        FROM leave_mails
        WHERE employee_id = ?
          AND status = 'approved'
          AND settled = 0
        `,
        [employeeId]
      );

    // 2) Count completed compoff: status = 'approved' AND settled = 1
    const [completedRows] = await db
      .promise()
      .query(
        `
        SELECT
          COUNT(*) AS completedComoff
        FROM leave_mails
        WHERE employee_id = ?
          AND status = 'approved'
          AND settled = 1
        `,
        [employeeId]
      );

    const pendingComoff = pendingRows[0]?.pendingComoff || 0;
    const completedComoff = completedRows[0]?.completedComoff || 0;

    return res.json({ pendingComoff, completedComoff });
  } catch (err) {
    console.error("Error fetching compoff counts:", err.message);
    return res.status(500).json({
      error: "An unexpected error occurred while fetching compoff counts."
    });
  }
});

// Assuming Express app setup and MySQL connection exists
app.post("/api/register", async (req, res) => {
  const { name, email, department, nickname, esc, location } = req.body;

  if (!name || !email || !location) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO employee_master (Name, Email, Department, NickName, Esc, location)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, email, department, nickname, esc, location], (err, result) => {
    if (err) {
      console.error("Registration failed:", err);
      return res.status(500).json({ error: "Registration failed" });
    }
    return res.status(200).json({ message: "Account created successfully", id: result.insertId });
  });
});

