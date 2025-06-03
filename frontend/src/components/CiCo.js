import React, { useState } from "react";
import axios from "axios";
import moment from "moment";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function CiCoEntry() {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const userName = storedUser.name || storedUser.empName || "Unknown";

  const [entryText, setEntryText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleGo = async () => {
    const [typeRaw, ...locationParts] = entryText.trim().split(" ");
    const type = typeRaw?.toUpperCase();
    const location = locationParts.join(" ");

    if (!["CI", "CO"].includes(type) || !location) {
      setMessage("Please enter in format: CI <siteName> or CO <siteName>");
      return;
    }

    setLoading(true);
    try {
      const timestamp = moment().format("YYYY-MM-DD h:mmA");
      const { data } = await axios.post(`${API_URL}/api/attendance/manual`, {
        empName: userName,
        timestamp,
        entryText: entryText.trim(),
      });
      setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || "Error processing entry");
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = {
    padding: "10px 24px",
    backgroundColor: isHovering ? "#0056b3" : "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    boxShadow: isHovering
      ? "0 4px 8px rgba(0, 0, 0, 0.2)"
      : "0 2px 4px rgba(0, 0, 0, 0.1)",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    fontSize: "16px",
    fontWeight: "500",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: "40px", // top padding to move content down a little
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <input
          type="text"
          placeholder='Type "CI <siteName>" or "CO <siteName>"'
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          style={{
            padding: "10px",
            width: "280px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleGo}
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {loading ? "Processing..." : "Go"}
        </button>

        {message && <p style={{ marginTop: "15px", color: "#333" }}>{message}</p>}
      </div>
    </div>
  );
}
