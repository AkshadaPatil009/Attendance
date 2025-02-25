import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeDashboard = () => {
  return (
    <div>
      <Header role="employee" />
      <div className="container mt-4">
        <div className="d-flex justify-content-end align-items-center gap-2">
          <button className="btn btn-primary">Employee View</button>
          <button className="btn btn-success">Report</button>
        </div>
        <h2 className="mt-3">Employee Dashboard</h2>
      </div>
      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
