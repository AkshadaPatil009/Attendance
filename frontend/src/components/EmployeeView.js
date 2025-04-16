// EmployeeDashboard.js
import React from "react";
import { Tabs, Tab } from "react-bootstrap";
import EmployeeLeaveApplication from "./EmployeeLeaveApplication";
import EmployeeHolidays from "./EmployeeHolidays";

const EmployeeDashboard = () => {
  // Retrieve the logged-in user info from localStorage.
  const storedUser = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="container-fluid mt-4">
      <Tabs defaultActiveKey="leaves" id="employee-dashboard-tabs" className="mb-3">
        <Tab eventKey="leaves" title="Leaves">
          <EmployeeLeaveApplication storedUser={storedUser} />
        </Tab>
        <Tab eventKey="holidays" title="Holidays">
          <EmployeeHolidays storedUser={storedUser} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
