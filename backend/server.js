// server.js
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

// MySQL database connection using env variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


// Login Route (No Encryption - remember to hash passwords in production)
// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  console.log("Login request received:", { email, password });

  db.query("SELECT * FROM logincrd WHERE Email = ?", [email], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    console.log("Query result:", results);

    if (results.length === 0) {
      console.log("User not found:", email);
      return res.status(400).json({ error: "User not found" });
    }

    const user = results[0];
    console.log("User found:", user);

    if (password !== user.Password) {
      console.log("Invalid password for user:", email);
      return res.status(400).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.Name, type: user.Type, location: user.Location || "" },
      "secret",
      { expiresIn: "1h" }
    );
    res.json({ token, name: user.Name, role: user.Type, employeeId: user.id, location: user.Location || "" });
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
  const approved_date = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
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
            "SELECT Name FROM logincrd WHERE disableemp = 0 UNION SELECT Name FROM employee_master",
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

// ======================================================================
// 1) GET /api/employees-list
//    Return all employees with their leaves (used, remaining, allocated).
// ======================================================================
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

// ======================================================================
// 2) POST /api/employee-leaves
//    Adds new leave records for employees who don't have any in employee_leaves.
//    Used Unplanned/Planned Leaves will be set to 0 automatically.
// ======================================================================
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

// ======================================================================
// 3) PUT /api/employee-leaves
//    Update allocated & remaining leaves for ALL employees (bulk update).
//    Also sets usedUnplannedLeave and usedPlannedLeave to 0 for ALL employees.
// ======================================================================
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

// ======================================================================
// 4) PUT /api/employee-leaves/:id
//    Update used & remaining leaves for a single employee (if needed).
//    This route remains unchanged. You can still individually set used leaves.
// ======================================================================
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

/**
 * GET /api/employees-leaves/:id
 * Fetch used & remaining leaves for the given employee ID
 */
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

/*
  Optionally, if you need a GET /api/employee_holidays route:
*/
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
// ======================================================================
// (NEW) POST /api/employee-leaves/add  <-- Separate route for a single record
// Add a new leave record for ONE employee, or update if already exists
// ======================================================================
app.post("/api/employee-leaves/add", (req, res) => {
  const {
    employeeId,
    allocatedUnplannedLeave,
    allocatedPlannedLeave,
    usedUnplannedLeave,
    usedPlannedLeave,
    remainingUnplannedLeave,
    remainingPlannedLeave,
  } = req.body;

  if (!employeeId) {
    return res
      .status(400)
      .json({ error: "employeeId is required to add a leave record." });
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
          remainingUnplannedLeave || 0,
          remainingPlannedLeave || 0,
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
          remainingUnplannedLeave || 0,
          remainingPlannedLeave || 0,
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

// ======================================================================
// EmployeeLeavesDate API Endpoints
// These endpoints handle individual leave date records stored in the
// EmployeeLeavesDate table.
// ======================================================================

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

// ======================================================================
// NEW: GET /api/logincrd
// Fetch employees from logincrd table and optionally filter by office code.
// The office code is mapped as follows:
//   RO => "Ratnagiri"
//   DO => "Delhi"
//   MO => "Mumbai"
// Since there is no "office" column, we filter on the "Location" column.
app.get("/api/logincrd", (req, res) => {
  res.set("Cache-Control", "no-store");
  let sql = "SELECT * FROM logincrd WHERE disableemp = 0";
  const params = [];
  if (req.query.office) {
    const officeMap = {
      RO: "Ratnagiri",
      DO: "Delhi",
      MO: "Mumbai",
    };
    const locationFilter = officeMap[req.query.office] || req.query.office;
    sql += " AND Location = ?";
    params.push(locationFilter);
  }
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching employees by office:", err);
      return res.status(500).json({ error: "Database error while fetching employees by office." });
    }
    res.json(results);
  });
});

// GET /api/employeeleavesdate
// Fetch all records from EmployeeLeavesDate along with employee names in dd-mm-yyyy format.
// Optionally filter by employeeId and/or office.
app.get("/api/employeeleavesdate", (req, res) => {
  let sql = `
    SELECT ed.id, ed.employee_id, l.Name AS employee_name,
           DATE_FORMAT(ed.leave_date, '%d-%m-%Y') AS leave_date, ed.leave_type 
    FROM employeeleavesdate ed
    JOIN logincrd l ON ed.employee_id = l.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by employeeId if provided.
  if (req.query.employeeId) {
    sql += " AND ed.employee_id = ?";
    params.push(req.query.employeeId);
  }
  // Filter by office if provided.
  if (req.query.office) {
    const officeMap = {
      RO: "Ratnagiri",
      DO: "Delhi",
      MO: "Mumbai",
    };
    const locationFilter = officeMap[req.query.office] || req.query.office;
    sql += " AND LOWER(l.Location) = LOWER(?)";
    params.push(locationFilter);
  }

  sql += " ORDER BY ed.id ASC";
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching employee leaves data:", err);
      return res.status(500).json({ error: "Failed to fetch employee leaves data." });
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

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
// Start the server using the HTTP server with Socket.IO
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});