// src/components/AdminEmployeeView.js
import React, { useState } from "react";
import { Tabs, Tab, Container } from "react-bootstrap";
import AnnualLeaves from "./AdminEmployeeView/AnnualLeaves";
import UpdateLeaves from "./AdminEmployeeView/UpdateLeaves";
import NewJoinerLeaves from "./AdminEmployeeView/NewJoinerLeaves";
import CompOffRequests from "./AdminEmployeeView/CompOffRequests";
import AddHoliday from "./AdminEmployeeView/Holiday";

const AdminEmployeeView = () => {
  const [activeTab, setActiveTab] = useState("holiday");

  return (
    <Container fluid className="mt-4" style={{ minHeight: "600px" }}>
      <Tabs
        id="admin-leave-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
        variant="tabs"        /* classic left‑aligned tabs */
      >
        <Tab eventKey="holiday" title="Add Holiday">
          <AddHoliday/>
        </Tab>
        <Tab eventKey="annual" title="Annual Leaves">
          <AnnualLeaves />
        </Tab>
        <Tab eventKey="update" title="Update Leaves">
          <UpdateLeaves />
        </Tab>
        <Tab eventKey="newjoiner" title="New Joiner Leaves">
          <NewJoinerLeaves />
        </Tab>
        <Tab eventKey="compoff" title="Comp Off Requests">
          <CompOffRequests />
        </Tab>
        
      </Tabs>
    </Container>
  );
};

export default AdminEmployeeView;
