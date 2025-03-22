import React, { useState, useEffect } from "react";
import { Card, Table } from "react-bootstrap";

const EmployeeDashboard = () => {
  // Retrieve stored user info from localStorage
  // Must contain employeeId returned from the login
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const employeeId = storedUser?.employeeId;

  // State for employee leaves
  const [employeeLeaves, setEmployeeLeaves] = useState({
    unplannedLeave: "",
    plannedLeave: "",
    remainingUnplannedLeave: "",
    remainingPlannedLeave: "",
  });

  // State for holidays
  const [holidays, setHolidays] = useState([]);

  // Fetch the employee's leave details
  useEffect(() => {
    if (!employeeId) {
      console.error("No employeeId found in localStorage user data.");
      return;
    }

    fetch(`http://localhost:5000/api/employees-leaves/${employeeId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("No leave record found or server error.");
        }
        return response.json();
      })
      .then((data) => {
        // data => { usedUnplannedLeave, usedPlannedLeave, remainingUnplannedLeave, remainingPlannedLeave }
        setEmployeeLeaves({
          unplannedLeave: data.usedUnplannedLeave || 0,
          plannedLeave: data.usedPlannedLeave || 0,
          remainingUnplannedLeave: data.remainingUnplannedLeave || 0,
          remainingPlannedLeave: data.remainingPlannedLeave || 0,
        });
      })
      .catch((error) => {
        console.error("Error fetching employee leaves:", error);
      });
  }, [employeeId]);

  // Fetch holiday list on mount
  useEffect(() => {
    fetch("http://localhost:5000/api/employee_holidays")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching holidays");
        }
        return response.json();
      })
      .then((data) => {
        setHolidays(data);
      })
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
        <h5><b>Used Leaves</b></h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Unplanned Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.unplannedLeave}
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

        <h5 className="mt-3"><b>Remaining Leaves</b></h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Unplanned Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingUnplannedLeave}
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
        <h5 className="text-center"><b>Holiday List</b></h5>
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
                    {new Date(holiday.holiday_date).toISOString().split("T")[0]}
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
