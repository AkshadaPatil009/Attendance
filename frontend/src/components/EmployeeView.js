import React, { useState, useEffect } from "react";
import { Form, Card } from "react-bootstrap";

const EmployeeView = ({ role }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeLeaves, setEmployeeLeaves] = useState({
    sickLeave: "",
    plannedLeave: "",
    remainingSickLeave: "",
    remainingPlannedLeave: "",
  });
  const [employees, setEmployees] = useState([]);

  // Fetch the employees list for admin view
  useEffect(() => {
    if (role === "admin") {
      fetch("http://localhost:5000/api/employees-list")
        .then((response) => response.json())
        .then((data) => setEmployees(data))
        .catch((error) => console.error("Error fetching employees:", error));
    }
  }, [role]);

  // Fetch employee leaves when an employee is selected
  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);
    if (employeeId !== "") {
      fetch(`http://localhost:5000/api/employee-leaves/${employeeId}`)
        .then((response) => response.json())
        .then((data) => setEmployeeLeaves(data))
        .catch((error) =>
          console.error("Error fetching employee leaves:", error)
        );
    } else {
      setEmployeeLeaves({
        sickLeave: "",
        plannedLeave: "",
        remainingSickLeave: "",
        remainingPlannedLeave: "",
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
      <Card
        className="p-3 shadow-sm mt-3"
        style={{ maxWidth: "400px", margin: "auto" }}
      >
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
