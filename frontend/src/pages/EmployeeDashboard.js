import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("monthwise");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate years dynamically (current year ± 10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);

  return (
    <div>
      <Header role="employee" />
      <div className="container mt-4">

        {/* Navigation Bar with Monthwise, Datewise, Employee View & Report */}
        <div className="d-flex align-items-center gap-3 p-3 border rounded bg-light">

          {/* Monthwise Selection */}
          <div>
            <input
              type="radio"
              id="monthwise"
              name="filter"
              value="monthwise"
              checked={activeFilter === "monthwise"}
              onChange={() => setActiveFilter("monthwise")}
            />
            <label htmlFor="monthwise" className="ms-2 fw-bold">Monthwise</label>
          </div>

          {/* Month & Year Dropdowns (Only visible when Monthwise is selected) */}
          {activeFilter === "monthwise" && (
            <div className="d-flex gap-2">
              <select
                className="p-1"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>

              <select
                className="p-1"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {/* Datewise Selection */}
          <div>
            <input
              type="radio"
              id="datewise"
              name="filter"
              value="datewise"
              checked={activeFilter === "datewise"}
              onChange={() => setActiveFilter("datewise")}
            />
            <label htmlFor="datewise" className="ms-2 fw-bold">Datewise</label>
          </div>

          {/* Calendar Input (Only visible when Datewise is selected) */}
          {activeFilter === "datewise" && (
            <input
              type="date"
              className="p-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {/* Employee View & Report Buttons */}
          <div className="ms-auto">
            <button className="btn btn-primary me-2">Employee View</button>
            <button className="btn btn-success">Report</button>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
