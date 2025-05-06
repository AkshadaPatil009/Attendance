// src/components/EmployeeHolidays.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Table } from "react-bootstrap";
import io from "socket.io-client";
import "./EmployeeHolidays.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeHolidays = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const employeeLocation = storedUser.location || "";
  const socketRef = useRef(null);

  const [holidays, setHolidays] = useState([]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchHolidays = useCallback(() => {
    let url = `${API_URL}/api/employee_holidays`;
    if (employeeLocation) url += `?location=${employeeLocation}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Error fetching holidays");
        return res.json();
      })
      .then((data) =>
        setHolidays(data.filter((h) => h.approval_status === "Approved"))
      )
      .catch((err) => console.error(err));
  }, [employeeLocation]);

  useEffect(() => {
    socketRef.current = io(API_URL, { transports: ["polling"] });
    socketRef.current.emit("join", { userId: storedUser.id });
    socketRef.current.on("holidaysUpdated", fetchHolidays);
    fetchHolidays();
    return () => {
      socketRef.current.off("holidaysUpdated", fetchHolidays);
      socketRef.current.disconnect();
    };
  }, [fetchHolidays, storedUser.id]);

  return (
    <div className="holiday-container">
      <h5 className="holiday-title">Holiday List</h5>
      <Table className="holiday-table" bordered hover responsive>
        <thead className="holiday-head">
          <tr>
            <th>Sr.No</th>
            <th>Holiday Name</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {holidays.length > 0 ? (
            holidays.map((holiday, idx) => {
              const d = new Date(holiday.holiday_date);
              d.setHours(0, 0, 0, 0);
              const isPast = d < today;

              return (
                <tr key={holiday.id} className={isPast ? "past-row" : ""}>
                  <td>{idx + 1}</td>
                  <td>{holiday.holiday_name}</td>
                  <td>{d.toLocaleDateString("en-CA")}</td> {/* YYYY-MM-DD */}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="3" className="text-center no-data">
                No holidays available.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default EmployeeHolidays;
