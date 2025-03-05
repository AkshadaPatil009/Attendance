import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Table,
  Tabs,
  Tab,
} from "react-bootstrap";

const AttendanceForm = () => {
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [attendanceTableData, setAttendanceTableData] = useState([]);
  const [otherMessagesTableData, setOtherMessagesTableData] = useState([]);
  const [attendanceToSave, setAttendanceToSave] = useState([]); // For attendance records
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Tracks which view is selected in "View Attendance" tab
  const [viewMode, setViewMode] = useState("employee"); // "employee" | "monthwise" | "datewise"

  // Fixed-size textarea style for the input
  const hangoutTextareaStyle = {
    height: "300px",
    width: "100%",
    overflowX: "scroll",
    overflowY: "scroll",
    border: "1px solid #ccc",
    padding: "8px",
    resize: "none",
    whiteSpace: "pre",
    wordWrap: "normal",
  };

  // Fixed-size table container style
  const tableContainerStyle = {
    height: "300px",
    overflowX: "scroll",
    overflowY: "scroll",
    border: "1px solid #ccc",
    whiteSpace: "nowrap",
    padding: "8px",
  };

  // Fetch distinct employee names from the backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/employees");
        setEmployees(response.data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  // Parse the Hangout messages into attendance data
  const handleFilter = () => {
    const lines = hangoutMessages
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    if (lines.length === 0) {
      setAttendanceTableData([]);
      setOtherMessagesTableData([]);
      setAttendanceToSave([]);
      return;
    }

    const formats = [
      "D MMM, YYYY",
      "MMM D,YYYY",
      "D MMM YYYY",
      "MMM D YYYY",
      "MMMM D, YYYY",
      "D MMMM, YYYY",
      "YYYY-MM-DD",
    ];
    const rawDate = lines[0].trim();
    const mDate = moment(rawDate, formats, true);
    const commonDate = mDate.isValid() ? mDate.format("YYYY-MM-DD") : rawDate;

    const attendanceRecords = [];
    const otherMessagesData = [];

    let i = 1;
    while (i < lines.length) {
      if (
        i < lines.length - 1 &&
        (lines[i + 1].startsWith("CI") || lines[i + 1].startsWith("CO"))
      ) {
        const headerLine = lines[i];
        const detailLine = lines[i + 1];
        i += 2;

        const headerParts = headerLine.split(",");
        const empName = headerParts[0].trim();
        let timeStr = "";
        if (headerParts.length > 1) {
          const timeInfo = headerParts[1].trim().replace("?", "");
          const timeParts = timeInfo.split(" ");
          timeStr = timeParts.length > 1 ? timeParts[1] : timeInfo;
        }

        const detailParts = detailLine.split(" ").filter((p) => p !== "");
        const recordType = detailParts[0] || "";
        const location = detailParts[1] || "";

        if (recordType === "CI") {
          attendanceRecords.push({
            empName,
            inTime: timeStr,
            outTime: "",
            location,
            date: commonDate,
          });
        } else if (recordType === "CO") {
          let updated = false;
          for (let j = attendanceRecords.length - 1; j >= 0; j--) {
            if (
              attendanceRecords[j].empName === empName &&
              attendanceRecords[j].date === commonDate &&
              attendanceRecords[j].inTime &&
              !attendanceRecords[j].outTime
            ) {
              attendanceRecords[j].outTime = timeStr;
              attendanceRecords[j].location = location;
              updated = true;
              break;
            }
          }
          if (!updated) {
            attendanceRecords.push({
              empName,
              inTime: "",
              outTime: timeStr,
              location,
              date: commonDate,
            });
          }
        }
      } else {
        if (
          i < lines.length - 1 &&
          lines[i].includes(",") &&
          !lines[i + 1].startsWith("CI") &&
          !lines[i + 1].startsWith("CO")
        ) {
          const senderInfoParts = lines[i].split(",");
          const senderName = senderInfoParts[0].trim();
          const messageTime =
            senderInfoParts.length > 1
              ? senderInfoParts[1].trim().replace("?", "")
              : "";
          const message = lines[i + 1];
          if (message.includes("C")) {
            otherMessagesData.push({
              senderName,
              message,
              messageTime,
              messageDate: commonDate,
            });
          }
          i += 2;
        } else {
          let senderName = "";
          let messageTime = "";
          if (lines[i].includes(",")) {
            const parts = lines[i].split(",");
            senderName = parts[0].trim();
            messageTime = parts[1] ? parts[1].trim().replace("?", "") : "";
          }
          const message = lines[i];
          if (message.includes("C")) {
            otherMessagesData.push({
              senderName,
              message,
              messageTime,
              messageDate: commonDate,
            });
          }
          i++;
        }
      }
    }

    setAttendanceTableData(attendanceRecords);
    setOtherMessagesTableData(otherMessagesData);
    setAttendanceToSave(attendanceRecords);
  };

  // Save attendance records to the backend API
  const handleSave = async () => {
    if (attendanceToSave.length === 0) {
      alert("No attendance records to save. Please filter your data first.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/attendance", {
        attendanceRecords: attendanceToSave,
      });
      alert(response.data.message);
    } catch (error) {
      console.error("Error saving records:", error);
      alert("Failed to save attendance records.");
    }
    setLoading(false);
  };

  return (
    <Container fluid className="p-3">
      <Tabs defaultActiveKey="entry" id="main-tabs" className="mb-3">
        {/* 1) Attendance Entry tab */}
        <Tab eventKey="entry" title="Attendance Entry">
          <Row className="mb-2 text-center fw-bold">
            <Col md={3}>
              <h5>Hangout Messages</h5>
            </Col>
            <Col md={3}>
              <h5>Attendance Messages</h5>
            </Col>
            <Col md={3}>
              <h5>Other Messages</h5>
            </Col>
            <Col md={3}>
              <h5>Attendance to Save</h5>
            </Col>
          </Row>

          <Row>
            {/* Left Column: Hangout Messages */}
            <Col md={3}>
              <Form.Control
                as="textarea"
                value={hangoutMessages}
                onChange={(e) => setHangoutMessages(e.target.value)}
                style={hangoutTextareaStyle}
                placeholder="Paste your data here."
              />
            </Col>

            {/* Middle Column: Attendance Table */}
            <Col md={3}>
              <div style={tableContainerStyle}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>EmpName</th>
                      <th>InTime</th>
                      <th>OutTime</th>
                      <th>Location</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceTableData.map((record, index) => (
                      <tr key={index}>
                        <td>{record.empName}</td>
                        <td>{record.inTime}</td>
                        <td>{record.outTime}</td>
                        <td>{record.location}</td>
                        <td>{record.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Col>

            {/* Next Column: Other Messages Table */}
            <Col md={3}>
              <div style={tableContainerStyle}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>SenderName</th>
                      <th>Message</th>
                      <th>MessageTime</th>
                      <th>MessageDate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherMessagesTableData.map((msg, index) => (
                      <tr key={index}>
                        <td>{msg.senderName}</td>
                        <td>{msg.message}</td>
                        <td>{msg.messageTime}</td>
                        <td>{msg.messageDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Col>

            {/* Last Column: Attendance to Save */}
            <Col md={3}>
              <div style={tableContainerStyle}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>EmpName</th>
                      <th>InTime</th>
                      <th>OutTime</th>
                      <th>Location</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceToSave.map((record, index) => (
                      <tr key={index}>
                        <td>{record.empName}</td>
                        <td>{record.inTime}</td>
                        <td>{record.outTime}</td>
                        <td>{record.location}</td>
                        <td>{record.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Col>
          </Row>

          <Row className="mt-3 text-center">
            <Col>
              <Button variant="primary" className="me-3" onClick={handleFilter}>
                Filter
              </Button>
              <Button variant="success" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </Col>
          </Row>
        </Tab>

        {/* 2) Update Attendance tab */}
        <Tab eventKey="update" title="Update Attendance">
          <Container fluid>
            <Row>
              <Col md={4} style={{ border: "1px solid #ccc", padding: "10px" }}>
                <h5>Update Attendance</h5>
                <Form>
                  <Form.Group controlId="employeeName" className="mb-2">
                    <Form.Label>Employee Name:</Form.Label>
                    {/* Dynamic employee dropdown */}
                    <Form.Select>
                      <option value="">-- Select Employee --</option>
                      {employees.map((emp, index) => (
                        <option key={index} value={emp.emp_name}>
                          {emp.emp_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group controlId="approvedBy" className="mb-2">
                    <Form.Label>Approved by:</Form.Label>
                    <Form.Control type="text" placeholder="Enter name" />
                  </Form.Group>

                  <Form.Group controlId="reason" className="mb-2">
                    <Form.Label>Reason:</Form.Label>
                    <Form.Control as="textarea" rows={2} placeholder="Enter reason" />
                  </Form.Group>

                  <Form.Group controlId="location" className="mb-2">
                    <Form.Label>Location:</Form.Label>
                    <Form.Control type="text" placeholder="Location" />
                  </Form.Group>

                  <Form.Group controlId="clockIn" className="mb-2">
                    <Form.Check type="checkbox" label="Clock In" />
                    <Form.Control type="datetime-local" />
                  </Form.Group>

                  <Form.Group controlId="clockOut" className="mb-2">
                    <Form.Check type="checkbox" label="Clock Out" />
                    <Form.Control type="datetime-local" />
                  </Form.Group>

                  <Form.Group controlId="fullDay" className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Display Full day in Monthly Attendance"
                    />
                  </Form.Group>

                  <Button variant="warning">Update</Button>
                </Form>
              </Col>

              <Col md={8}>
                <Table bordered hover size="sm" className="mb-3">
                  <thead>
                    <tr>
                      <th>EmployeeName</th>
                      <th>ApprovedBy</th>
                      <th>Reason</th>
                      <th>InTime</th>
                      <th>OutTime</th>
                      <th>Location</th>
                      <th>Date</th>
                      <th>Work Hour</th>
                      <th>Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Rows for updated attendance records */}
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Container>
        </Tab>

        {/* 3) View Attendance tab */}
        <Tab eventKey="view" title="View Attendance">
          <Container fluid>
            <Row
              style={{
                backgroundColor: "#20B2AA",
                padding: "10px",
                color: "#fff",
                borderRadius: "4px",
              }}
              className="g-3"
            >
              <Col md={3}>
                <Form.Label className="fw-bold me-2">View By :</Form.Label>
                <div>
                  <Form.Check
                    type="radio"
                    label="Employee Name"
                    name="viewBy"
                    value="employee"
                    checked={viewMode === "employee"}
                    onChange={(e) => setViewMode(e.target.value)}
                  />
                  <Form.Check
                    type="radio"
                    label="Monthwise"
                    name="viewBy"
                    value="monthwise"
                    checked={viewMode === "monthwise"}
                    onChange={(e) => setViewMode(e.target.value)}
                  />
                  <Form.Check
                    type="radio"
                    label="Datewise"
                    name="viewBy"
                    value="datewise"
                    checked={viewMode === "datewise"}
                    onChange={(e) => setViewMode(e.target.value)}
                  />
                </div>
              </Col>

              <Col md={4}>
                <Row>
                  <Col md={12}>
                    <Form.Label>Employee Name</Form.Label>
                    <Form.Select className="mb-2">
                      <option>All Employees</option>
                    </Form.Select>
                  </Col>
                  <Col md={6}>
                    <Form.Label>Month</Form.Label>
                    <Form.Select className="mb-2">
                      <option>January</option>
                      <option>February</option>
                      <option>March</option>
                    </Form.Select>
                  </Col>
                  <Col md={6}>
                    <Form.Label>Year</Form.Label>
                    <Form.Select className="mb-2">
                      <option>2025</option>
                      <option>2026</option>
                    </Form.Select>
                  </Col>
                  <Col md={12}>
                    <Form.Label>Date</Form.Label>
                    <Form.Control type="date" className="mb-2" />
                  </Col>
                </Row>
              </Col>

              <Col md={5}>
                <Form.Label className="fw-bold d-block mb-2">Legend:</Form.Label>
                <div className="d-flex flex-wrap align-items-center">
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#B0E0E6",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Half day</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#90EE90",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Full Day (8.5 Hrs)</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#FFC0CB",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Absent</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#ff9900",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Sunday</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#FFD700",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Late Mark</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#FFFF00",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Site Visit</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#ff0000",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Holiday</span>
                  </div>
                  <div className="legend-item d-flex align-items-center me-3 mb-2">
                    <div
                      style={{
                        backgroundColor: "#FF69B4",
                        width: "20px",
                        height: "20px",
                        marginRight: "5px",
                      }}
                    ></div>
                    <span>Working &lt; 5 Hrs</span>
                  </div>
                </div>
              </Col>
            </Row>

            {viewMode === "employee" && (
              <Row className="mt-3">
                <Col>
                  <h5>Employee-Wise Attendance</h5>
                  <p>Replace this placeholder with your Employee-wise data/table.</p>
                </Col>
              </Row>
            )}

            {viewMode === "datewise" && (
              <Row className="mt-3">
                <Col>
                  <h5>Datewise Attendance</h5>
                  <div style={{ overflowX: "auto" }}>
                    <Table bordered hover size="sm">
                      {/* Your datewise table data */}
                    </Table>
                  </div>
                </Col>
              </Row>
            )}

            {viewMode === "monthwise" && (
              <Row className="mt-3">
                <Col>
                  <h5>Monthwise Attendance</h5>
                  <div style={{ overflowX: "auto" }}>
                    <Table bordered hover size="sm">
                      {/* Your monthwise table data */}
                    </Table>
                  </div>
                </Col>
              </Row>
            )}
          </Container>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AttendanceForm;
