import React, { useState, useEffect } from "react";
import { Form, Card, Table } from "react-bootstrap";

const EmployeeView = ({ role }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeLeaves, setEmployeeLeaves] = useState({
    sickLeave: "",
    plannedLeave: "",
    remainingSickLeave: "",
    remainingPlannedLeave: "",
  });
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Fetch employees list for admin view
  useEffect(() => {
    if (role === "admin") {
      fetch("http://localhost:5000/api/employees-list")
        .then((response) => response.json())
        .then((data) => setEmployees(data))
        .catch((error) => console.error("Error fetching employees:", error));
    }
  }, [role]);

  // Fetch holidays only for employees
  useEffect(() => {
    if (role === "employee") {
      fetch("http://localhost:5000/api/holidays")
        .then((response) => response.json())
        .then((data) => setHolidays(data))
        .catch((error) => console.error("Error fetching holidays:", error));
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
        {role === "admin" ? "Admin Employee View" : "Employee Dashboard"}
      </h3>

      {/* Employee Selection Dropdown (Only for Admin) */}
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
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))
              ) : (
                <option disabled>No employees found</option>
              )}
            </Form.Control>
          </Form.Group>
        </div>
      )}

      {/* Leave Section */}
      <Card className="p-3 shadow-sm mt-3" style={{ maxWidth: "400px", margin: "auto" }}>
        <h5><b>Used Leaves</b></h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.sickLeave} readOnly />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leave</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.plannedLeave} readOnly />
        </div>

        <h5 className="mt-3"><b>Remaining Leaves</b></h5>
        <div className="d-flex justify-content-between align-items-center">
          <span>Sick Leave</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.remainingSickLeave} readOnly />
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span>Planned Leave</span>
          <input type="text" className="form-control w-50" value={employeeLeaves.remainingPlannedLeave} readOnly />
        </div>
      </Card>

      {/* Holiday Table (Only for Employees) */}
      {role === "employee" && (
        <div className="mt-4">
          <h5 className="text-center"><b>Holiday List</b></h5>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Holiday Name</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
            {holidays.length > 0 ? (
  holidays.map((holiday, index) => (
    <tr key={holiday.id}>
      <td>{index + 1}</td>
      <td>{holiday.holiday_name}</td>
      <td>{new Date(holiday.holiday_date).toISOString().split("T")[0]}</td> {/* Formats as YYYY-MM-DD */}
    </tr>
  ))
) : (
  <tr>
    <td colSpan="3" className="text-center">No holidays available.</td>
  </tr>
)}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default EmployeeView;
