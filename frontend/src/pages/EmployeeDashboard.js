import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("February");
  const [selectedYear, setSelectedYear] = useState("2025");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div>
      <Header role="employee" />
      <div className="container mt-4">
        {/* Top Right Buttons */}
        <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
          <button className="btn btn-primary">Employee View</button>
          <button className="btn btn-success">Report</button>
        </div>

        {/* Monthwise & Datewise Options */}
        <div className="p-3">
          {/* Monthwise Selection */}
          <div className="mb-2">
            <input type="radio" id="monthwise" name="filter" defaultChecked />
            <label htmlFor="monthwise" className="ms-2 fw-bold">Monthwise</label>
            <select
              className="ms-2 p-1"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              className="ms-2 p-1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {[2025, 2024, 2023, 2022].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Datewise Selection */}
          <div>
            <input type="radio" id="datewise" name="filter" />
            <label htmlFor="datewise" className="ms-2 fw-bold">Datewise</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="yyyy-MM-dd"
              className="ms-2 p-1"
              placeholderText="Select Date"
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
