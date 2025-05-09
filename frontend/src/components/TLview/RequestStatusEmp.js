import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";

import PendingLeaves      from "./PendingLeaves";
import ApprovedLeaves     from "./ApprovedLeaves";
import NotApprovedLeaves  from "./NotApprovedLeaves";

//const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function RequestStatusEmp() {
  const [key, setKey]     = useState("pending");
  
  return (
    <div className="px-3 pt-2">
      <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-1">
        <Tab eventKey="pending" title="Pending Leaves">
          <PendingLeaves />
        </Tab>
        <Tab eventKey="approved" title="Approved Leaves">
          <ApprovedLeaves  />
        </Tab>
        <Tab eventKey="notApproved" title="Not Approved Leaves">
          <NotApprovedLeaves  />
        </Tab>
      </Tabs>
    </div>
  );
}
