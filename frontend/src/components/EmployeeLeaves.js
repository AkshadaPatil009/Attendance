import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Table } from "react-bootstrap";

const EmployeeLeaves = () => {
  const [employeeLeaves, setEmployeeLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  // Fetch employees from your employees list API (ensure it returns id and name)
  const fetchEmployees = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/employees-list");
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Fetch employee leaves; if an employeeId is provided, filter by that ID.
  const fetchEmployeeLeaves = async (employeeId) => {
    setLoading(true);
    try {
      let url = "http://localhost:5000/api/employeeleavesdate";
      if (employeeId) {
        url += `?employeeId=${employeeId}`;
      }
      const response = await axios.get(url);
      setEmployeeLeaves(response.data);
    } catch (error) {
      console.error("Error fetching employee leaves data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    // Initially fetch all leaves
    fetchEmployeeLeaves("");
  }, []);

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmployee(empId);
    fetchEmployeeLeaves(empId);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h3>Employee Leaves</h3>
      <Form.Group controlId="employeeSelect" style={{ marginBottom: "16px" }}>
        <Form.Label>Select Employee</Form.Label>
        <Form.Control as="select" value={selectedEmployee} onChange={handleEmployeeChange}>
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </Form.Control>
      </Form.Group>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee Name</th>
              <th>Leave Date</th>
              <th>Leave Type</th>
            </tr>
          </thead>
          <tbody>
            {employeeLeaves.map((leave) => (
              <tr key={leave.id}>
                <td>{leave.id}</td>
                <td>{leave.employee_name}</td>
                <td>{leave.leave_date}</td>
                <td>{leave.leave_type}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default EmployeeLeaves;
