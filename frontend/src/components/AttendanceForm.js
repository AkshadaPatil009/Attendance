import React, { useState } from "react";
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
  const [errorMessage, setErrorMessage] = useState(""); // To display error messages
  const [successMessage, setSuccessMessage] = useState(""); // To display success messages

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

  const handleFilter = () => {
    // Split input into non-empty lines
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

    // Convert the first line (date) into YYYY-MM-DD format using Moment.js.
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
    const allowedLocations = ["RO", "RSO", "MO", "DO", "WFH"];

    let i = 1;
    while (i < lines.length) {
      // Only process as an attendance block if the next line exists AND
      // the detail line starts exactly with "CI" or "CO"
      if (
        i < lines.length - 1 &&
        (lines[i + 1].startsWith("CI") || lines[i + 1].startsWith("CO"))
      ) {
        const headerLine = lines[i];
        const detailLine = lines[i + 1];
        i += 2;

        // Parse header for employee name and time
        const headerParts = headerLine.split(",");
        const empName = headerParts[0].trim();
        let timeStr = "";
        if (headerParts.length > 1) {
          const timeInfo = headerParts[1].trim().replace("?", "");
          const timeParts = timeInfo.split(" ");
          timeStr = timeParts.length > 1 ? timeParts[1] : timeInfo;
        }

        // Parse detail line for record type and location
        const detailParts = detailLine.split(" ").filter((p) => p !== "");
        const recordType = detailParts[0] || "";
        const location = detailParts[1] || "";

        // Process only if the location is allowed
        if (allowedLocations.includes(location)) {
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
            // Try to match with a previous record that has CI but no CO
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
          // If the detail line's location is not one of the allowed ones,
          // treat the block as an "other message"
          const senderInfoParts = headerLine.split(",");
          const senderName = senderInfoParts[0].trim();
          otherMessagesData.push({
            senderName,
            message: detailLine,
            messageTime: timeStr,
            messageDate: commonDate,
          });
        }
      } else {
        // For any block that doesn't have a proper two-line attendance format
        // (e.g. if the detail line starts with "C" but not "CI" or "CO"),
        // treat it as an other message.
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
          otherMessagesData.push({
            senderName,
            message,
            messageTime,
            messageDate: commonDate,
          });
          i += 2;
        } else {
          let senderName = "";
          let messageTime = "";
          if (lines[i].includes(",")) {
            const parts = lines[i].split(",");
            senderName = parts[0].trim();
            messageTime = parts[1] ? parts[1].trim().replace("?", "") : "";
          }
          otherMessagesData.push({
            senderName,
            message: "",
            messageTime,
            messageDate: commonDate,
          });
          i++;
        }
      }
    }

    // Update state with parsed data and also set the attendanceToSave
    setAttendanceTableData(attendanceRecords);
    setOtherMessagesTableData(otherMessagesData);
    setAttendanceToSave(attendanceRecords);
  };

  // When the Save button is clicked, send attendanceToSave data to the backend.
  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("http://localhost:5000/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendanceRecords: attendanceToSave }),
      });
      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Error saving attendance records");
        window.alert("Error: " + (data.error || "Error saving attendance records"));
      } else {
        const data = await response.json();
        setSuccessMessage(data.message || "Attendance records saved successfully");
        window.alert(data.message || "Attendance records saved successfully");
      }
    } catch (error) {
      setErrorMessage(error.message);
      window.alert("Error: " + error.message);
    }
  };

  return (
    <Container fluid className="p-3">
      {/* Tabs on top */}
      <Tabs defaultActiveKey="entry" id="main-tabs" className="mb-3">
        {/* 1) Attendance Entry Tab */}
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

          {/* Bottom row for buttons */}
          <Row className="mt-3 text-center">
            <Col>
              <Button variant="primary" className="me-3" onClick={handleFilter}>
                Filter
              </Button>
              <Button variant="success" onClick={handleSave}>
                Save
              </Button>
            </Col>
          </Row>
          {/* Display error or success messages */}
          {errorMessage && (
            <Row className="mt-2">
              <Col>
                <div style={{ color: "red" }}>{errorMessage}</div>
              </Col>
            </Row>
          )}
          {successMessage && (
            <Row className="mt-2">
              <Col>
                <div style={{ color: "green" }}>{successMessage}</div>
              </Col>
            </Row>
          )}
        </Tab>

        {/* 2) Update Attendance Tab */}
        <Tab eventKey="update" title="Update Attendance">
          <Container fluid>
            <Row>
              {/* Left Side: Update Form */}
              <Col md={4} style={{ border: "1px solid #ccc", padding: "10px" }}>
                <h5>Update Attendance</h5>
                <Form>
                  <Form.Group controlId="employeeName" className="mb-2">
                    <Form.Label>Employee Name:</Form.Label>
                    <Form.Select>
                      <option>-- Select Employee --</option>
                      <option>Vaibhav Patel</option>
                      <option>Shubham Shinde</option>
                      <option>Sumit Plankar</option>
                      {/* ...add more if needed */}
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

              {/* Right Side: Two Tables (Top and Bottom) */}
              <Col md={8}>
                {/* Top Table */}
                <Table bordered hover size="sm" className="mb-3">
                  <thead>
                    <tr>
                      <th>EmployeeName</th>
                      <th>ApprovedBy</th>
                      <th>Reason</th>
                      <th>inTime</th>
                      <th>outTime</th>
                      <th>location</th>
                      <th>A_Date</th>
                      <th>FullDay</th>
                      <th>Field1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Add rows as needed */}
                  </tbody>
                </Table>

                {/* Bottom Table */}
                <Table bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>senderName</th>
                      <th>ATTENDANCE_DATE</th>
                      <th>INTIME</th>
                      <th>OUTTIME</th>
                      <th>LOCATION</th>
                      <th>WorkHour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Add rows as needed */}
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Container>
        </Tab>

        {/* 3) View Attendance Tab (Placeholder) */}
        <Tab eventKey="view" title="View Attendance">
          <p>This tab is for viewing your saved attendance records. Add your view logic here.</p>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AttendanceForm;


