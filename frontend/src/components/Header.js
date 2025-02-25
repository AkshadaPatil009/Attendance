import React from "react";
import { Link } from "react-router-dom";

const Header = ({ role }) => {
  return (
    <header style={{ background: "#333", color: "#fff", padding: "5px 10px", fontSize: "16px" }}>
      <h3 style={{ margin: 0 }}>Attendance App</h3>
      {role && (
        <nav>
          <Link to="/" style={{ marginRight: "10px", color: "#fff", textDecoration: "none" }}>Home</Link>
          {role === "admin" && <Link to="/admin" style={{ color: "#fff", textDecoration: "none" }}>Admin Dashboard</Link>}
          {role === "employee" && <Link to="/employee" style={{ color: "#fff", textDecoration: "none" }}>Employee Dashboard</Link>}
        </nav>
      )}
    </header>
  );
};

export default Header;
