const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "attendance_db",
});

// Login Route (No Encryption)
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(400).json({ error: "User not found" });

    const user = results[0];

    // Check plain-text password
    if (password !== user.password) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, "secret", { expiresIn: "1h" });

    res.json({ token, role: user.role, name: user.name });
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
