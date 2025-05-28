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

  const handleGo = async () => {
    const [typeRaw, ...locationParts] = entryText.trim().split(" ");
    const type = typeRaw?.toUpperCase();
    const location = locationParts.join(" ");

    if (!["CI", "CO"].includes(type) || !location) {
      setMessage("Please enter in format: CI or CO ");
      return;
    }

    setLoading(true);
    try {
      const timestamp = moment().format("YYYY-MM-DD h:mmA");
      const { data } = await axios.post(`${API_URL}/api/attendance/manual`, {
        empName: userName,
        timestamp,
        entryText: entryText.trim()
      });      
      setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || "Error processing entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      

      <input
        type="text"
        placeholder='Type "CI " or "CO "'
        value={entryText}
        onChange={(e) => setEntryText(e.target.value)}
        style={{ padding: "8px", width: "250px", marginBottom: "10px" }}
      />
      <br />
      <button
        onClick={handleGo}
        disabled={loading}
        style={{ padding: "10px 20px" }}
      >
        {loading ? "Processing..." : "Go"}
      </button>

      {message && <p style={{ marginTop: "15px" }}>{message}</p>}
    </div>
  );
}
