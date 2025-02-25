import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeDashboard = () => {
  return (
    <div>
      <Header role="employee" />
      <div className="container mt-4">
        {/* Top Right Buttons (Employee View & Report) */}
        <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
          <button className="btn btn-primary">Employee View</button>
          <button className="btn btn-success">Report</button>
        </div>

        {/* Bottom Left Buttons (Datewise & Monthwise) */}
        <div className="d-flex justify-content-start align-items-center gap-2">
          <button className="btn btn-info">Datewise</button>
          <button className="btn btn-warning">Monthwise</button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
