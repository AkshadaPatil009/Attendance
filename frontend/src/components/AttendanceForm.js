import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const AttendanceForm = () => {
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [attendanceTableData, setAttendanceTableData] = useState([]);
  const [otherMessagesText, setOtherMessagesText] = useState("");
  const [attendanceToSave, setAttendanceToSave] = useState(""); // New state for attendance to save

  // Fixed-size textarea style
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
    const lines = hangoutMessages
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    if (lines.length === 0) {
      setAttendanceTableData([]);
      setOtherMessagesText("");
      setAttendanceToSave(""); // Clear the attendance to save
      return;
    }

    const commonDate = lines[0];
    const attendanceRecords = [];
    const otherMessagesArr = [];
    const attendanceToSaveArr = []; // For storing attendance data to save

    let i = 1; 
    while (i < lines.length) {
      if (i < lines.length - 1 && (lines[i + 1].startsWith("CI") || lines[i + 1].startsWith("CO"))) {
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
        const line = lines[i];
        i++;
        otherMessagesArr.push(line);
      }
    }

    // Update attendanceTableData and otherMessagesText
    setAttendanceTableData(attendanceRecords);
    setOtherMessagesText(otherMessagesArr.join("\n"));

    // Generate the string for attendance to save in the database
    const attendanceToSaveText = attendanceRecords.map((record) => {
      return `${record.empName}, ${record.inTime}, ${record.outTime}, ${record.location}, ${record.date}`;
    }).join("\n");

    setAttendanceToSave(attendanceToSaveText); // Update the new textarea with formatted attendance data
  };

  return (
    <Container fluid className="p-3">
      {/* Header row */}
      <Row className="mb-2 text-center fw-bold">
        <Col md={3}><h5>Hangout Messages</h5></Col>
        <Col md={3}><h5>Attendance Messages</h5></Col>
        <Col md={3}><h5>Other Messages</h5></Col>
        <Col md={3}><h5>Attendance to Save</h5></Col>
      </Row>

      {/* Main content row */}
      <Row>
        {/* Left Column: Hangout Messages (input) */}
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={hangoutMessages}
            onChange={(e) => setHangoutMessages(e.target.value)}
            style={hangoutTextareaStyle}
            placeholder={`Paste your data here.\n\nFirst line => Common date\nPairs => Attendance\nSingle line => Other message`}
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

        {/* Right Column: Other Messages (textarea) */}
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={otherMessagesText}
            readOnly
            style={hangoutTextareaStyle}
            placeholder="All non-attendance lines appear here"
          />
        </Col>

        {/* Right Column: Attendance to Save (textarea) */}
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={attendanceToSave}
            readOnly
            style={hangoutTextareaStyle}
            placeholder="Formatted attendance data to save in database"
          />
        </Col>
      </Row>

      {/* Bottom row for buttons */}
      <Row className="mt-3 text-center">
        <Col>
          <Button variant="primary" className="me-3" onClick={handleFilter}>
            Filter
          </Button>
          <Button variant="success">Save</Button>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceForm;
