const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "indiscpx_taskdb_2", // Updated database name
});

// Login Route (No Encryption)
// Note: In production, implement proper password hashing.
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM logincrd WHERE Email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = results[0];

    // Check plain-text password (ensure to hash passwords in production)
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

// GET Holidays API - Fetch all holidays
app.get("/api/holidays", (req, res) => {
  db.query("SELECT * FROM holidays", (err, results) => {
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

app.listen(5000, () => console.log("Server running on port 5000"));
