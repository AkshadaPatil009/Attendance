import React, { useEffect, useState, useRef, useCallback } from "react";
import { Table } from "react-bootstrap";
import io from "socket.io-client";

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
    <div className="mt-4">
      <h5 className="text-center"><b>Holiday List</b></h5>
      <Table striped bordered hover responsive>
        <thead>
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
                <tr key={holiday.id} className={isPast ? "table-secondary" : ""}>
                  <td>{idx + 1}</td>
                  <td>{holiday.holiday_name}</td>
                  <td>{d.toISOString().split("T")[0]}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="3" className="text-center">No holidays available.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default EmployeeHolidays;
