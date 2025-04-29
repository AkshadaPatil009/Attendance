import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tabs, Tab, Table, Spinner, Alert } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function RequestStatusEmp() {
  const [key, setKey] = useState("pending");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empName, setEmpName] = useState("");

  const statusMap = {
    pending: "PENDING",
    approved: "APPROVED",
    notApproved: "NOT_APPROVED",
  };

  // fetch logged-in TL name
  useEffect(() => {
    axios
      .get(`${API_URL}/api/logincrd/current`, { withCredentials: true })
      .then(res => setEmpName(res.data.emp_name || res.data.Name))
      .catch(console.error);
  }, []);

  // fetch this TL’s team requests
  useEffect(() => {
    if (!empName) return;
    setLoading(true);
    setError("");
    axios
      .get(`${API_URL}/api/leaves/team`, {
        params: { status: statusMap[key], tlName: empName },
        withCredentials: true,
      })
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        setError("Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [key, empName]);

  const renderTable = () => {
    if (loading) return <Spinner animation="border" />;
    if (error)   return <Alert variant="danger">{error}</Alert>;
    if (data.length === 0)
      return <Alert variant="info">No {key.replace(/([A-Z])/g, " $1").toLowerCase()} requests.</Alert>;

    return (
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Employee</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Applied On</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id}>
              <td>{r.emp_name}</td>
              <td>{r.start_date}</td>
              <td>{r.end_date}</td>
              <td>{r.days}</td>
              <td>{r.reason}</td>
              <td>{r.applied_on}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <div className="px-3 pt-2">
      <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-1">
        <Tab eventKey="pending" title="Pending Leaves">
          {renderTable()}
        </Tab>
        <Tab eventKey="approved" title="Approved Leaves">
          {renderTable()}
        </Tab>
        <Tab eventKey="notApproved" title="Not Approved Leaves">
          {renderTable()}
        </Tab>
      </Tabs>
    </div>
  );
}
