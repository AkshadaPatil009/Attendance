import React, { useEffect, useState, useRef } from "react";
import $ from "jquery";
import "datatables.net-dt/css/dataTables.dataTables.css";
import "datatables.net";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function StatusSection() {
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setStatusData(data);
        } else {
          setStatusData([]);
        }
      } catch (error) {
        console.error("Error fetching status data:", error);
        setStatusData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  useEffect(() => {
    if (!loading && statusData.length > 0) {
      const table = $(tableRef.current).DataTable({
        destroy: true,
        pageLength: 10,
      });

      return () => {
        table.destroy();
      };
    }
  }, [loading, statusData]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return <span className="badge bg-success">Online</span>;
      case "offline":
        return <span className="badge bg-danger">Offline</span>;
      case "absent":
        return (
          <span
            className="badge text-dark"
            style={{ backgroundColor: "#f8d7da" }}
          >
            Absent
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary">
            {status || "Unknown"}
          </span>
        );
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4" style={{ color: "#000" }}>
        Employee Status
      </h2>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="table-responsive">
          <table
            ref={tableRef}
            className="table table-bordered"
            style={{ width: "100%", backgroundColor: "#fff", borderColor: "#000" }}
          >
            <thead className="table-dark">
              <tr>
                <th>Employee Name</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {statusData.map((item, index) => (
                <tr key={index}>
                  <td>{item.emp_name || item.Name || item.NickName || "N/A"}</td>
                  <td>{item.location || "N/A"}</td>
                  <td>{getStatusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
