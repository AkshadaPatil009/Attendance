import React, { useEffect, useRef } from "react";
import { Tabs, Tab } from "react-bootstrap";
import io from "socket.io-client";
import EmployeeLeaveApplication from "./EmployeeLeaveApplication";
import EmployeeHolidays from "./EmployeeHolidays";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeDashboard = () => {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const socketRef = useRef(null);

  useEffect(() => {
    // initialize socket once, forcing polling transport only
    socketRef.current = io(API_URL, {
      transports: ["polling"]
    });

    // register/join on connect
    socketRef.current.emit("join", { userId: storedUser?.id });

    return () => {
      socketRef.current.disconnect();
    };
  }, [storedUser]);

  return (
    <div className="container-fluid mt-4">
      <Tabs defaultActiveKey="leaves" id="employee-dashboard-tabs" className="mb-3">
        <Tab eventKey="leaves" title="Leaves">
          <EmployeeLeaveApplication
            storedUser={storedUser}
            socket={socketRef.current}
          />
        </Tab>
        <Tab eventKey="holidays" title="Holidays">
          <EmployeeHolidays
            storedUser={storedUser}
            socket={socketRef.current}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
