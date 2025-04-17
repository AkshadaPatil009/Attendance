// EmployeeDashboard.js
import React, { useEffect, useRef } from "react";
import { Tabs, Tab } from "react-bootstrap";
import io from "socket.io-client";
import EmployeeLeaveApplication from "./EmployeeLeaveApplication";
import EmployeeHolidays from "./EmployeeHolidays";

const EmployeeDashboard = () => {
  // Retrieve the logged-in user info from localStorage.
  const storedUser = JSON.parse(localStorage.getItem("user"));

  // Use ref to persist the socket connection
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io("http://localhost:5000"); // Replace with your backend URL

    // Emit an event to join a specific room or register user
    socketRef.current.emit("join", { userId: storedUser?.id });

    // Clean up the socket connection on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [storedUser]);

  return (
    <div className="container-fluid mt-4">
      <Tabs defaultActiveKey="leaves" id="employee-dashboard-tabs" className="mb-3">
        <Tab eventKey="leaves" title="Leaves">
          <EmployeeLeaveApplication storedUser={storedUser} socket={socketRef.current} />
        </Tab>
        <Tab eventKey="holidays" title="Holidays">
          <EmployeeHolidays storedUser={storedUser} socket={socketRef.current} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
