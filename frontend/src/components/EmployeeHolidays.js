import React, { useEffect, useState, useCallback, useRef } from "react";
import { Table } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeHolidays = ({ storedUser, socket }) => {
  const [holidays, setHolidays] = useState([]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // hold onto the parent’s socket
  const socketRef = useRef(socket);

  const employeeLocation = storedUser?.location || "";

  const fetchHolidays = useCallback(() => {
    let url = `${API_URL}/api/employee_holidays`;
    if (employeeLocation) url += `?location=${employeeLocation}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Error fetching holidays");
        return res.json();
      })
      .then(data => {
        setHolidays(data.filter(h => h.approval_status === "Approved"));
      })
      .catch(err => console.error(err));
  }, [employeeLocation]);

  useEffect(() => {
    fetchHolidays();
    const sock = socketRef.current;
    if (sock) {
      sock.on("holidaysUpdated", fetchHolidays);
      return () => {
        sock.off("holidaysUpdated", fetchHolidays);
      };
    }
  }, [fetchHolidays]);

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
          {holidays.length > 0
            ? holidays.map((holiday, idx) => {
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
            : (
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
