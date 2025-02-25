import React from "react";
import { Link } from "react-router-dom";

const Header = ({ role }) => {
  return (
    <header style={{ background: "#333", color: "#fff", padding: "10px" }}>
      <h2>Attendance App</h2>
      {role && (
        <nav>
          <Link to="/">Home</Link>
          {role === "admin" && <Link to="/admin">Admin Dashboard</Link>}
          {role === "employee" && <Link to="/employee">Employee Dashboard</Link>}
        </nav>
      )}
    </header>
  );
};

export default Header;
