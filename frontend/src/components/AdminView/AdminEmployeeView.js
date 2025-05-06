// src/components/AdminEmployeeView.js
import React, { useState } from "react";
import { Tabs, Tab, Container } from "react-bootstrap";
import AnnualLeaves from "./AdminEmployeeView/AnnualLeaves";
import UpdateLeaves from "./AdminEmployeeView/UpdateLeaves";
import NewJoinerLeaves from "./AdminEmployeeView/NewJoinerLeaves";

const AdminEmployeeView = () => {
  const [activeTab, setActiveTab] = useState("annual");

  return (
    <Container fluid className="mt-4" style={{ minHeight: "600px" }}>
      <Tabs
        id="admin-leave-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
        variant="tabs"        /* classic left‑aligned tabs */
      >
        <Tab eventKey="annual" title="Annual Leaves">
          <AnnualLeaves />
        </Tab>
        <Tab eventKey="update" title="Update Leaves">
          <UpdateLeaves />
        </Tab>
        <Tab eventKey="newjoiner" title="New Joiner Leaves">
          <NewJoinerLeaves />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminEmployeeView;
