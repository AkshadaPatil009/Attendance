// server.js
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const moment = require("moment");
require("dotenv").config();
const { sendLeaveEmail } = require("./mailer");

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
                0,
              ];
            });

            const valuesAbsent = absentEmployees.map((empName) => [
              empName,
              "",
              "",
              "",
              commonDate,
              0,
              "Absent",
              1,
            ]);
            const allValues = valuesValid.concat(valuesAbsent);

            const insertQuery = `
          INSERT INTO attendance (emp_name, in_time, out_time, location, date, work_hour, day, is_absent)
          VALUES ?
        `;
            db.query(insertQuery, [allValues], (err, result) => {
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

    const newInTime =
      inTime && inTime.trim() !== "" ? inTime : existingRecord.in_time;
    const newOutTime =
      outTime && outTime.trim() !== "" ? outTime : existingRecord.out_time;

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

    const query = `
      UPDATE attendance
      SET in_time = ?, out_time = ?, location = ?, date = ?, approved_by = ?, reason = ?, work_hour = ?, day = ?, is_absent = ?
      WHERE id = ?
    `;
    db.query(
      query,
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
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Database error while updating attendance record" });
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

  const join = new Date(joinDate);
  if (isNaN(join)) {
    return res.status(400).json({ error: "Invalid join date" });
  }

  const year        = join.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear   = new Date(year, 11, 31);
  const msPerDay    = 1000 * 60 * 60 * 24;
  const totalDays   = Math.floor((endOfYear - startOfYear) / msPerDay) + 1;
  const remainingDays = Math.floor((endOfYear - join) / msPerDay) + 1;

  // prorate only the *remaining* balances
  const proratedPlanned   = Math.floor((allocatedPlannedLeave   * remainingDays) / totalDays);
  const proratedUnplanned = Math.floor((allocatedUnplannedLeave * remainingDays) / totalDays);

  const sql = `
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
  db.query(sql, [
    employeeId,
    allocatedUnplannedLeave,  
    allocatedPlannedLeave,   
    proratedUnplanned,        
    proratedPlanned           
  ], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error inserting leave record" });
    }
    res.json({
      message: `Leave record added for employee ${employeeId}.`,
      insertedId: result.insertId
    });
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

// GET /api/employees-leaves/:id
// Fetch used & remaining leaves for the given employee ID
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

// (NEW) POST /api/employee-leaves/add  <-- Separate route for a single record
// Add a new leave record for ONE employee, or update if already exists.
app.post("/api/employee-leaves/add", (req, res) => {
  const {
    employeeId,
    allocatedUnplannedLeave,
    allocatedPlannedLeave,
    usedUnplannedLeave,
    usedPlannedLeave,
    remainingUnplannedLeave,
    remainingPlannedLeave,
    joiningDate,
  } = req.body;

  if (!employeeId) {
    return res
      .status(400)
      .json({ error: "employeeId is required to add a leave record." });
  }

  let finalRemainingUnplanned = remainingUnplannedLeave;
  let finalRemainingPlanned = remainingPlannedLeave;

  // If joiningDate is provided, automatically compute remaining leaves for the year.
  if (joiningDate && allocatedUnplannedLeave && allocatedPlannedLeave) {
    const joinDate = new Date(joiningDate);
    const year = joinDate.getFullYear();
    const endOfYear = new Date(year, 11, 31);
    const totalDaysInYear = ((new Date(year, 11, 31) - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
    const remainingDays = Math.floor((endOfYear.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const fraction = remainingDays / totalDaysInYear;
    finalRemainingUnplanned = Math.floor(allocatedUnplannedLeave * fraction);
    finalRemainingPlanned = Math.floor(allocatedPlannedLeave * fraction);
  }

  // Check if there's already a record for this employee
  db.query(
    "SELECT * FROM employee_leaves WHERE employee_id = ?",
    [employeeId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error checking leaves" });
      }
      if (rows.length > 0) {
        // If a record already exists, let's update it instead (or you could return an error).
        const updateSql = `
          UPDATE employee_leaves
          SET
            allocatedUnplannedLeave = ?,
            allocatedPlannedLeave = ?,
            usedUnplannedLeave = ?,
            usedPlannedLeave = ?,
            remainingUnplannedLeave = ?,
            remainingPlannedLeave = ?
          WHERE employee_id = ?
        `;
        const updateParams = [
          allocatedUnplannedLeave || 0,
          allocatedPlannedLeave || 0,
          usedUnplannedLeave || 0,
          usedPlannedLeave || 0,
          finalRemainingUnplanned || 0,
          finalRemainingPlanned || 0,
          employeeId,
        ];
        db.query(updateSql, updateParams, (err2) => {
          if (err2) {
            console.error(err2);
            return res
              .status(500)
              .json({ error: "Error updating existing leave record" });
          }
          return res.json({
            message: "Employee leave record updated (existing).",
          });
        });
      } else {
        // No existing record => insert new
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
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const insertParams = [
          employeeId,
          allocatedUnplannedLeave || 0,
          allocatedPlannedLeave || 0,
          usedUnplannedLeave || 0,
          usedPlannedLeave || 0,
          finalRemainingUnplanned || 0,
          finalRemainingPlanned || 0,
        ];
        db.query(insertSql, insertParams, (err3) => {
          if (err3) {
            console.error(err3);
            return res
              .status(500)
              .json({ error: "Error inserting new leave record" });
          }
          return res.json({ message: "New employee leave record added." });
        });
      }
    }
  );
});


// POST /api/employee-leaves-date
// Add a new leave date record for an employee
app.post("/api/employee-leaves-date", (req, res) => {
  const { employeeId, leave_date, leave_type } = req.body;
  if (!employeeId || !leave_date || !leave_type) {
    return res
      .status(400)
      .json({ error: "employeeId, leave_date, and leave_type are required." });
  }
  const sql = `
    INSERT INTO employeeleavesdate (employee_id, leave_date, leave_type)
    VALUES (?, ?, ?)
  `;
  db.query(sql, [employeeId, leave_date, leave_type], (err, result) => {
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

// PUT /api/employee-leaves-date/:id
// Update a leave date record by its ID
app.put("/api/employee-leaves-date/:id", (req, res) => {
  const { id } = req.params;
  const { leave_date, leave_type } = req.body;
  if (!leave_date || !leave_type) {
    return res
      .status(400)
      .json({ error: "leave_date and leave_type are required." });
  }
  const sql = `
    UPDATE EmployeeLeavesDate 
    SET leave_date = ?, leave_type = ?
    WHERE id = ?
  `;
  db.query(sql, [leave_date, leave_type, id], (err, result) => {
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

app.post('/api/leave/apply-leave', (req, res) => {
  // your logic here
  res.json({ message: 'Leave applied successfully' });
});


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
    await sendLeaveEmail({
      from_email,
      from_name,
      to_email,
      cc_email,
      subject,
      body,
    });

    // Save to DB (without from_email, cc_email, or body as per your earlier instruction)
    const sql = `
      INSERT INTO leave_mails (employee_id, from_name, leave_type, to_email, subject)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [employee_id, from_name, leave_type, to_email, subject];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("DB insert error:", err);
        return res.status(500).send("Database error");
      }
      res.status(200).send("Email sent and saved");
    });
  } catch (err) {
    console.error("Send mail error:", err);
    res.status(500).send("Failed to send email");
  }
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
// NEW: Listen for socket connections.
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
// Start the server using the HTTP server with Socket.IO
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
