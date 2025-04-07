import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Table, Row, Col } from "react-bootstrap";

const EmployeeLeaves = () => {
  const [employeeLeaves, setEmployeeLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  // 1) Fetch all employees (for the dropdown) - not filtered by office
  const fetchEmployeesList = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/employees-list");
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // 2) Fetch employees filtered by office (for the dropdown)
  const fetchOfficeEmployees = async (office) => {
    try {
      const url = `http://localhost:5000/api/logincrd?office=${office}`;
      const response = await axios.get(url);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching office employees:", error);
    }
  };

  /**
   * 3) Fetch leave records from /api/employeeleavesdate
   *    - If `office` is provided, we filter by that office.
   *    - If `employeeId` is provided, we filter by that employee.
   *    - You can combine both filters if you like.
   */
  const fetchEmployeeLeaves = async (office = "", employeeId = "") => {
    setLoading(true);
    try {
      let url = "http://localhost:5000/api/employeeleavesdate";
      const params = [];
      if (office) {
        params.push(`office=${office}`);
      }
      if (employeeId) {
        params.push(`employeeId=${employeeId}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      const response = await axios.get(url);
      setEmployeeLeaves(response.data);
    } catch (error) {
      console.error("Error fetching employee leaves:", error);
    }
    setLoading(false);
  };

  // On initial load, fetch all employees (unfiltered) and all leaves (unfiltered)
  useEffect(() => {
    fetchEmployeesList();
    fetchEmployeeLeaves();
  }, []);

  // When the user selects an office
  const handleOfficeChange = async (e) => {
    const officeValue = e.target.value;
    setSelectedOffice(officeValue);
    setSelectedEmployee(""); // reset selected employee

    // If no office, show all employees in the dropdown
    if (!officeValue) {
      await fetchEmployeesList();
      // Also fetch ALL leaves (no filter)
      fetchEmployeeLeaves("", "");
    } else {
      // If we do have an office, fetch employees from that office only
      await fetchOfficeEmployees(officeValue);
      // Also filter leaves by that office
      fetchEmployeeLeaves(officeValue, "");
    }
  };

  // When the user selects an employee
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmployee(empId);
    // Filter leaves by both the current office and the selected employee
    fetchEmployeeLeaves(selectedOffice, empId);
  };

  return (
    <div style={{ padding: "16px", width: "600px", margin: "auto" }}>
      <h3 style={{ marginBottom: "16px", textAlign: "center" }}>Employee Leaves</h3>

      <Row>
        {/* Office Selection */}
        <Col md={6}>
          <Form.Group controlId="officeSelect" style={{ marginBottom: "16px" }}>
            <Form.Label>Choose Office</Form.Label>
            <Form.Control
              as="select"
              value={selectedOffice}
              onChange={handleOfficeChange}
            >
              <option value="">All Offices</option>
              <option value="DO">DO</option>
              <option value="MO">MO</option>
              <option value="RO">RO</option>
            </Form.Control>
          </Form.Group>
        </Col>

        {/* Employee Selection */}
        <Col md={6}>
          <Form.Group controlId="employeeSelect" style={{ marginBottom: "16px" }}>
            <Form.Label>Select Employee</Form.Label>
            <Form.Control
              as="select"
              value={selectedEmployee}
              onChange={handleEmployeeChange}
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || emp.Name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
      </Row>

      {/* Leave Records Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table striped bordered hover responsive style={{ marginTop: "16px" }}>
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
