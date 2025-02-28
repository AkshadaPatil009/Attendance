import React, { useState } from "react";
import { Form, Card } from "react-bootstrap";

const EmployeeView = ({ role }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeLeaves, setEmployeeLeaves] = useState({
    sickLeave: "",
    plannedLeave: "",
    remainingSickLeave: "",
    remainingPlannedLeave: "",
  });

  const employees = [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Smith" },
    { id: 3, name: "Emily Johnson" },
  ];

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);

    // In a real scenario, fetch employee leave data from an API.
    // Here, we hardcode sample data.
    if (employeeId === "1") {
      setEmployeeLeaves({
        sickLeave: "3",
        plannedLeave: "5",
        remainingSickLeave: "7",
        remainingPlannedLeave: "3",
      });
    } else if (employeeId === "2") {
      setEmployeeLeaves({
        sickLeave: "2",
        plannedLeave: "4",
        remainingSickLeave: "8",
        remainingPlannedLeave: "6",
      });
    } else if (employeeId === "3") {
      setEmployeeLeaves({
        sickLeave: "5",
        plannedLeave: "2",
        remainingSickLeave: "4",
        remainingPlannedLeave: "6",
      });
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="text-center mt-4">
        {role === "admin" ? "Admin Employee View" : "Employee View"}
      </h3>

      {/* Employee Selection Dropdown */}
      {role === "admin" && (
        <div className="mb-4">
          <Form.Group controlId="employeeSelect">
            <Form.Label>Select Employee</Form.Label>
            <Form.Control
              as="select"
              onChange={handleEmployeeSelect}
              value={selectedEmployee}
            >
              <option value="">-- Select Employee --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </div>
      )}

      {/* Leave Section */}
      <Card className="p-3 shadow-sm mt-3" style={{ maxWidth: "400px", margin: "auto" }}>
        <h5>
          <b>Used Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.sickLeave}
            readOnly
          />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leaves</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.plannedLeave}
            readOnly
          />
        </div>

        <h5 className="mt-3">
          <b>Remaining Leaves</b>
        </h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingSickLeave}
            readOnly
          />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leaves</span>
          <input
            type="text"
            className="form-control w-50"
            value={employeeLeaves.remainingPlannedLeave}
            readOnly
          />
        </div>
      </Card>
    </div>
  );
};

export default EmployeeView;
