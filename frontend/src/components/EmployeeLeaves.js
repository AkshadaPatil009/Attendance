import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Form,
  Table,
  Row,
  Col,
  Dropdown,
  Button,
  Spinner,
} from "react-bootstrap";
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
// initialize socket connection
const socket = io(API_URL);

/**
 * A dropdown that lets you:
 *  - search
 *  - toggle “All”
 *  - pick individual employees
 */
const EmployeeDropdownFilter = ({
  employees,
  selectedIds,
  setSelectedIds,
  onApply, // callback when user clicks Apply
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // filter list by search
  const filtered = employees.filter((emp) =>
    (emp.name || emp.Name).toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = selectedIds.length === employees.length;

  // toggle the “All” checkbox
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(employees.map((e) => e.id));
  };

  // toggle one employee
  const toggleOne = (id) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((i) => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  return (
    <Dropdown
      show={open}
      onToggle={() => setOpen(!open)}
      autoClose="outside"
      className="w-100"
    >
      <Dropdown.Toggle
        id="employee-filter-dropdown"
        className="w-100 text-left"
        variant="outline-secondary"
      >
        {selectedIds.length === 0
          ? "All Employees"
          : `${selectedIds.length} selected`}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: "100%", padding: "12px" }}>
        {/* Search box */}
        <Form.Control
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />

        {/* “All” checkbox */}
        <Form.Check
          type="checkbox"
          label={`All (${employees.length})`}
          checked={allSelected}
          onChange={toggleAll}
        />

        {/* List of filtered employees */}
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            marginTop: 8,
            paddingRight: 4,
          }}
        >
          {filtered.map((emp) => (
            <Form.Check
              key={emp.id}
              type="checkbox"
              label={emp.name || emp.Name}
              checked={selectedIds.includes(emp.id)}
              onChange={() => toggleOne(emp.id)}
            />
          ))}
        </div>

        {/* Apply button */}
        <div className="d-flex justify-content-end mt-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setOpen(false);
              setSearch("");
              onApply && onApply();
            }}
          >
            Apply
          </Button>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

const EmployeeLeaves = () => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  // New state for dynamic offices
  const [offices, setOffices] = useState([]);

  const [selectedOffice, setSelectedOffice] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);

  // Helper: sort employees by name A -> Z
  const sortByNameAscending = useCallback((data) => {
    return data.sort((a, b) => {
      const nameA = (a.name || a.Name || "").toLowerCase();
      const nameB = (b.name || b.Name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, []);

  // 1) fetch all employees
  const fetchEmployeesList = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/employees-list`);
      const sorted = sortByNameAscending(data);
      setEmployees(sorted);
    } catch (e) {
      console.error(e);
    }
  }, [sortByNameAscending]);

  // 2) fetch employees by office
  const fetchOfficeEmployees = useCallback(async (office) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/api/logincrd?office=${office}`
      );
      const employeesWithId = data.map((e) => ({
        ...e,
        id: e.employee_id,
      }));
      const sorted = sortByNameAscending(employeesWithId);
      setEmployees(sorted);
    } catch (e) {
      console.error(e);
    }
  }, [sortByNameAscending]);

  // 3) fetch leaves (server‑side filter by office)
  const fetchLeaves = useCallback(async (office = "") => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/employeeleavesdate`;
      if (office) url += `?office=${office}`;
      const { data } = await axios.get(url);
      setLeaves(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  // New: fetch the list of offices
  const fetchOffices = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/offices`);
      setOffices(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // initial load + socket listeners
  useEffect(() => {
    fetchOffices();
    fetchEmployeesList();
    fetchLeaves();

    socket.on("officesUpdated", fetchOffices);
    socket.on("employeesListUpdated", () => {
      if (selectedOffice) fetchOfficeEmployees(selectedOffice);
      else fetchEmployeesList();
    });
    socket.on("leavesUpdated", () => fetchLeaves(selectedOffice));

    return () => {
      socket.off("officesUpdated", fetchOffices);
      socket.off("employeesListUpdated");
      socket.off("leavesUpdated");
      socket.disconnect();
    };
  }, [
    fetchOffices,
    fetchEmployeesList,
    fetchOfficeEmployees,
    fetchLeaves,
    selectedOffice,
  ]);

  // when office changes
  const handleOfficeChange = async (e) => {
    const office = e.target.value;
    setSelectedOffice(office);
    setSelectedEmployeeIds([]);
    setSelectedLeaveTypes([]);

    if (office) {
      await fetchOfficeEmployees(office);
      await fetchLeaves(office);
    } else {
      await fetchEmployeesList();
      await fetchLeaves();
    }
  };

  // leave‑type toggle
  const toggleLeaveType = (type) => {
    setSelectedLeaveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // build selected names for client‑side filter
  const selectedNames = employees
    .filter((e) => selectedEmployeeIds.includes(e.id))
    .map((e) => e.name || e.Name);

  const filteredLeaves = leaves.filter((l) => {
    const byEmp =
      selectedEmployeeIds.length === 0 ||
      selectedNames.includes(l.employee_name);
    const byType =
      selectedLeaveTypes.length === 0 ||
      selectedLeaveTypes.includes(l.leave_type);
    return byEmp && byType;
  });

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "auto" }}>
      <h3 className="text-center mb-4">Employee Leaves</h3>

      {/* Filters */}
      <Form className="mb-4">
        <Row className="align-items-end">
          {/* Office */}
          <Col xs={12} md={4}>
            <Form.Group controlId="officeSelect">
              <Form.Label>Office</Form.Label>
              <Form.Control
                as="select"
                value={selectedOffice}
                onChange={handleOfficeChange}
              >
                <option value="">All Offices</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.code}>
                    {office.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>

          {/* Employee */}
          <Col xs={12} md={4}>
            <Form.Group controlId="employeeFilter">
              <Form.Label>Employee</Form.Label>
              <EmployeeDropdownFilter
                employees={employees}
                selectedIds={selectedEmployeeIds}
                setSelectedIds={setSelectedEmployeeIds}
                onApply={() => {}}
              />
            </Form.Group>
          </Col>

          {/* Leave Type */}
          <Col xs={12} md={4}>
            <Form.Group controlId="leaveTypeFilter">
              <Form.Label>Leave Type</Form.Label>
              <div>
                {["Planned", "Unplanned"].map((type) => (
                  <Form.Check
                    inline
                    key={type}
                    type="checkbox"
                    id={`leave-type-${type}`}
                    label={type}
                    checked={selectedLeaveTypes.includes(type)}
                    onChange={() => toggleLeaveType(type)}
                  />
                ))}
              </div>
            </Form.Group>
          </Col>
        </Row>
      </Form>

      {/* Table */}
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Employee Id</th>
              <th>Employee Name</th>
              <th>Leave Date</th>
              <th>Leave Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map((l, index) => (
              <tr key={l.id}>
                <td>{index + 1}</td>
                <td>{l.employee_id}</td>
                <td>{l.employee_name}</td>
                <td>{l.leave_date}</td>
                <td>{l.leave_type}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default EmployeeLeaves;
