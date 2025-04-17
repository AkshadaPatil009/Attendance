// EmployeeHolidays.js
import React, { useEffect, useState, useCallback } from "react";
import { Table } from "react-bootstrap";
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
// initialize socket connection
const socket = io(API_URL);

const EmployeeHolidays = ({ storedUser }) => {
  const [holidays, setHolidays] = useState([]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employeeLocation = storedUser?.location || "";

  // fetch / re-fetch holidays
  const fetchHolidays = useCallback(() => {
    let url = `${API_URL}/api/employee_holidays`;
    if (employeeLocation) {
      url += `?location=${employeeLocation}`;
    }
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Error fetching holidays");
        return response.json();
      })
      .then((data) => {
        const approvedHolidays = data.filter(
          (holiday) => holiday.approval_status === "Approved"
        );
        setHolidays(approvedHolidays);
      })
      .catch((error) => console.error("Error fetching holidays:", error));
  }, [employeeLocation]);

  useEffect(() => {
    // initial fetch
    fetchHolidays();

    // listen for server-side holiday updates
    socket.on("holidaysUpdated", fetchHolidays);

    return () => {
      socket.off("holidaysUpdated", fetchHolidays);
    };
  }, [fetchHolidays]);

  return (
    <div className="mt-4">
      <h5 className="text-center">
        <b>Holiday List</b>
      </h5>
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
            holidays.map((holiday, index) => {
              const holidayDate = new Date(holiday.holiday_date);
              holidayDate.setHours(0, 0, 0, 0);
              const isPast = holidayDate < today;
              return (
                <tr
                  key={holiday.id}
                  className={isPast ? "table-secondary" : ""}
                >
                  <td>{index + 1}</td>
                  <td>{holiday.holiday_name}</td>
                  <td>{holidayDate.toISOString().split("T")[0]}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="3" className="text-center">
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
