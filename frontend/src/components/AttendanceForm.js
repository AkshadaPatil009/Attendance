import React, { useState } from "react";
import moment from "moment";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const AttendanceForm = () => {
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [attendanceTableData, setAttendanceTableData] = useState([]);
  const [otherMessagesTableData, setOtherMessagesTableData] = useState([]);
  const [attendanceToSave, setAttendanceToSave] = useState([]); // For attendance records

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
    // Define the possible formats that the input date might be in.
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
      // If next line exists and starts with CI or CO, treat these two lines as an attendance record
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
        // Process as an "other message"
        // Check if we can pair the current line with the next line:
        // If the current line contains a comma (assumed sender info)
        // and the next line does NOT start with CI/CO, we treat the next line as the message text.
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
          // If there is no pairing, try to extract what you can from the single line.
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

    // Update state with parsed data
    setAttendanceTableData(attendanceRecords);
    setOtherMessagesTableData(otherMessagesData);
    setAttendanceToSave(attendanceRecords);
  };

  return (
    <Container fluid className="p-3">
      {/* Header row */}
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

      {/* Main content row */}
      <Row>
        {/* Left Column: Hangout Messages (input) */}
        <Col md={3}>
          <Form.Control
            as="textarea"
            value={hangoutMessages}
            onChange={(e) => setHangoutMessages(e.target.value)}
            style={hangoutTextareaStyle}
            placeholder={`Paste your data here.`}
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
          <Button variant="success">Save</Button>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceForm;
