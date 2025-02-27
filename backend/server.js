const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Updated Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "indiscpx_taskdb_2", // Updated database name
});

// Login Route (No Encryption)
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  // Adjusted query to use the new table and columns
  db.query("SELECT * FROM logincrd WHERE Email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(400).json({ error: "User not found" });

    const user = results[0];

    // Check plain-text password (Make sure password encryption is implemented in production)
    if (password !== user.Password) {  // Adjusted password column
      return res.status(400).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, name: user.Name, type: user.Type }, "secret", { expiresIn: "1h" });

    // Sending response with token and other user info
    res.json({ token, name: user.Name, role: user.Type });
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
