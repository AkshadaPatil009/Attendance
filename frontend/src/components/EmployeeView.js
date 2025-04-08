import React, { useState, useEffect } from "react";
import { Card, Table, Tabs, Tab } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";


const EmployeeDashboard = () => {
  // Retrieve stored user info from localStorage (must contain employeeId and location from login)
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const employeeId = storedUser?.employeeId;
  // Employee's location from login response is assumed to be "Ratnagiri", "Mumbai", or "Delhi"
  const employeeLocation = storedUser?.location || "";

  // State for employee leaves
  const [employeeLeaves, setEmployeeLeaves] = useState({
    unplannedLeave: "",
    plannedLeave: "",
    remainingUnplannedLeave: "",
    remainingPlannedLeave: "",
  });

  // State for holidays (each holiday displayed separately)
  const [holidays, setHolidays] = useState([]);

  // Fetch the employee's leave details
  useEffect(() => {
    if (!employeeId) {
      console.error("No employeeId found in localStorage user data.");
      return;
    }

    fetch(`${API_URL}/api/employees-leaves/${employeeId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("No leave record found or server error.");
        }
        return response.json();
      })
      .then((data) => {
        // Data contains: usedUnplannedLeave, usedPlannedLeave, remainingUnplannedLeave, remainingPlannedLeave
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

  // Fetch holiday list on mount using the employee's location as a query parameter.
  // Then filter to show only holidays with an "Approved" status.
  useEffect(() => {
    let url = `${API_URL}/api/employee_holidays`;
    if (employeeLocation) {
      url += `?location=${employeeLocation}`;
    }
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching holidays");
        }
        return response.json();
      })
      .then((data) => {
        // Filter for approved holidays
        const approvedHolidays = data.filter(
          (holiday) => holiday.approval_status === "Approved"
        );
        setHolidays(approvedHolidays);
      })
      .catch((error) => console.error("Error fetching holidays:", error));
  }, [employeeLocation]);

  // Get today's date without time for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="container-fluid mt-4">
      <Tabs defaultActiveKey="leaves" id="employee-dashboard-tabs" className="mb-3">
        <Tab eventKey="leaves" title="Leaves">
          {/* Leave Details Card - compressed width and centered */}
          <Card className="p-3 shadow-sm mt-3 mx-auto" style={{ maxWidth: "400px" }}>
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
        </Tab>
        <Tab eventKey="holidays" title="Holidays">
          {/* Holiday List Table */}
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
                  holidays.map((holiday, index) => {
                    const holidayDate = new Date(holiday.holiday_date);
                    holidayDate.setHours(0, 0, 0, 0);
                    const isPast = holidayDate < today;
                    return (
                      <tr key={holiday.id} className={isPast ? "table-secondary" : ""}>
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
        </Tab>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
