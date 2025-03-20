import React from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Header = ({ role }) => {
  return (
    <nav className="navbar navbar-dark bg-dark py-2">
      <div className="container-fluid">
        <span className="navbar-brand mb-0 h4">Attendance App</span>
        {role && (
          <div>
            <Link className="btn btn-outline-light btn-sm me-2" to="/">Home</Link>
            {role === "Admin" && <Link className="btn btn-outline-light btn-sm me-2" to="/Admin">Admin Dashboard</Link>}
            {role === "employee" && <Link className="btn btn-outline-light btn-sm" to="/employee">Employee Dashboard</Link>}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;
