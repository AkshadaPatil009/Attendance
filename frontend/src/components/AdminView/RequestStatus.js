import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tabs, Tab, Table, Spinner, Alert } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function RequestStatus() {
  const [key, setKey] = useState("pending");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const statusMap = {
    pending: "PENDING",
    approved: "APPROVED",
    notApproved: "NOT_APPROVED",
  };

  useEffect(() => {
    const fetchLeaves = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API_URL}/api/leaves`, {
          params: { status: statusMap[key] },
          withCredentials: true,
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [key]);

  const renderTable = () => {
    if (loading) return <Spinner animation="border" />;
    if (error) return <Alert variant="danger">{error}</Alert>;
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
          {data.map(req => (
            <tr key={req.id}>
              <td>{req.emp_name}</td>
              <td>{req.start_date}</td>
              <td>{req.end_date}</td>
              <td>{req.days}</td>
              <td>{req.reason}</td>
              <td>{req.applied_on}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <div className="px-3 pt-2"> {/* less vertical padding */}
      <Tabs
        activeKey={key}
        onSelect={k => setKey(k)}
        className="mb-1"   /* less bottom margin */
      >
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
