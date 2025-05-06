import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";

export default function RequestStatus() {
  const [key, setKey] = useState("pending");

  return (
    <div className="px-3 pt-2">
      <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-1">
        <Tab eventKey="pending" title="Pending Leaves">
          {/* Content for Pending Leaves */}
        </Tab>
        <Tab eventKey="approved" title="Approved Leaves">
          {/* Content for Approved Leaves */}
        </Tab>
        <Tab eventKey="notApproved" title="Not Approved Leaves">
          {/* Content for Not Approved Leaves */}
        </Tab>
      </Tabs>
    </div>
  );
}
