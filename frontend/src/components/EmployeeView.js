import React, { useState, useEffect } from "react";
import { Card, Table } from "react-bootstrap";

const EmployeeDashboard = () => {
  const [employeeLeaves, setEmployeeLeaves] = useState({
    sickLeave: "",
    plannedLeave: "",
    remainingSickLeave: "",
    remainingPlannedLeave: "",
  });
  const [holidays, setHolidays] = useState([]);

  // Optionally, you could add logic here to fetch the logged-in employee's leave details.
  // For example:
  // useEffect(() => {
  //   const employeeId = ... // get employee ID from context or props
  //   fetch(`http://localhost:5000/api/employee-leaves/${employeeId}`)
  //     .then((response) => response.json())
  //     .then((data) => setEmployeeLeaves(data))
  //     .catch((error) => console.error("Error fetching employee leaves:", error));
  // }, []);

  // Fetch holidays for employee view on mount
  useEffect(() => {
    fetch("http://localhost:5000/api/holidays")
      .then((response) => response.json())
      .then((data) => setHolidays(data))
      .catch((error) => console.error("Error fetching holidays:", error));
  }, []);

  return (
    <div className="container mt-4">
      <h3 className="text-center mt-4">Employee Dashboard</h3>

      {/* Leave Details Card */}
      <Card
        className="p-3 shadow-sm mt-3"
        style={{ maxWidth: "400px", margin: "auto" }}
      >
        <h5>
          <b>Used Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.sickLeave}
            readOnly
          />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.plannedLeave}
            readOnly
          />
        </div>

        <h5 className="mt-3">
          <b>Remaining Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingSickLeave}
            readOnly
          />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingPlannedLeave}
            readOnly
          />
        </div>
      </Card>

      {/* Holiday List Table */}
      <div className="mt-4">
        <h5 className="text-center">
          <b>Holiday List</b>
        </h5>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Holiday Name</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length > 0 ? (
              holidays.map((holiday, index) => (
                <tr key={holiday.id}>
                  <td>{index + 1}</td>
                  <td>{holiday.holiday_name}</td>
                  <td>
                    {new Date(holiday.holiday_date)
                      .toISOString()
                      .split("T")[0]}
                  </td>
                </tr>
              ))
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
    </div>
  );
};

export default EmployeeDashboard;
