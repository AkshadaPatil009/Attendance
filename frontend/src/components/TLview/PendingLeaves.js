import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Spinner, Alert } from "react-bootstrap";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PendingLeaves({ tlName }) {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!tlName) return;
    setLoading(true);
    axios
      .get(`${API_URL}/api/leaves/team`, {
        params: { status: "PENDING", tlName },
        withCredentials: true,
      })
      .then(res => setData(res.data))
      .catch(() => setError("Failed to load pending leaves"))
      .finally(() => setLoading(false));
  }, [tlName]);

  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">{error}</Alert>;
  if (data.length === 0)
    return <Alert variant="info">No pending requests.</Alert>;

  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>Employee</th><th>From</th><th>To</th>
          <th>Days</th><th>Reason</th><th>Applied On</th>
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
}
