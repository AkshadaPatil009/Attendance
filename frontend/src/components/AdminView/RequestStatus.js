// src/components/RequestStatus/RequestStatus.js
import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";

// Importing each tab content component
import PendingLeaves from "./RequestStatus/PendingLeaves";
import ApprovedLeaves from "./RequestStatus/ApprovedLeaves";
import NotApprovedLeaves from "./RequestStatus/NotApprovedLeaves";

export default function RequestStatus() {
  const [key, setKey] = useState("pending");

  return (
    <div className="px-3 pt-2">
      <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-1">
        <Tab eventKey="pending" title="Pending Leaves">
          {/* Rendering the PendingLeaves component */}
          <PendingLeaves />
        </Tab>
        <Tab eventKey="approved" title="Approved Leaves">
          {/* Rendering the ApprovedLeaves component */}
          <ApprovedLeaves />
        </Tab>
        <Tab eventKey="notApproved" title="Not Approved Leaves">
          {/* Rendering the NotApprovedLeaves component */}
          <NotApprovedLeaves />
        </Tab>
      </Tabs>
    </div>
  );
}
