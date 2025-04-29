import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tabs, Tab } from "react-bootstrap";

import PendingLeaves      from "./PendingLeaves";
import ApprovedLeaves     from "./ApprovedLeaves";
import NotApprovedLeaves  from "./NotApprovedLeaves";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function RequestStatusEmp() {
  const [key, setKey]     = useState("pending");
  const [tlName, setTlName] = useState("");

  // fetch logged-in TL name once
  useEffect(() => {
    axios
      .get(`${API_URL}/api/logincrd/current`, { withCredentials: true })
      .then(res => setTlName(res.data.emp_name || res.data.Name))
      .catch(console.error);
  }, []);

  return (
    <div className="px-3 pt-2">
      <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-1">
        <Tab eventKey="pending" title="Pending Leaves">
          <PendingLeaves tlName={tlName} />
        </Tab>
        <Tab eventKey="approved" title="Approved Leaves">
          <ApprovedLeaves tlName={tlName} />
        </Tab>
        <Tab eventKey="notApproved" title="Not Approved Leaves">
          <NotApprovedLeaves tlName={tlName} />
        </Tab>
      </Tabs>
    </div>
  );
}
