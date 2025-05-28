// components/AdminView/EmployeeTabs.js
import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import EmployeeAttendance from "../EmployeeView/EmployeeAttendance";
import LeavesEmployee from "../EmployeeView/LeavesEmployee";
import StatusSection from "../StatusSection";

export default function EmployeeTabs() {
  const [key, setKey] = useState("attendance");

  return (
    <Tabs
      id="employee-tabs"
      activeKey={key}
      onSelect={(k) => setKey(k)}
      className="mb-3"
    >
      <Tab eventKey="attendance" title="Attendance">
        <EmployeeAttendance />
      </Tab>
      <Tab eventKey="leaves" title="Leaves">
        <LeavesEmployee />
      </Tab>
      <Tab eventKey="status" title="Status">
        <StatusSection />
      </Tab>
    </Tabs>
  );
}
