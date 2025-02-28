import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const AttendanceForm = () => {
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [otherMessages, setOtherMessages] = useState("");
  const [tableData, setTableData] = useState([]);

  // Common style for textareas
  const textareaStyle = {
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

  // Handler to parse raw data and update tableData
  const handleFilter = () => {
    // Split raw data into trimmed, non-empty lines
    const lines = hangoutMessages
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
      
    if (lines.length === 0) {
      setTableData([]);
      return;
    }

    // The very first line is the common date for all records.
    const commonDate = lines[0];
    const records = [];
    let i = 1;

    // Helper function to detect a date header in case one is accidentally inserted later.
    const isDateHeader = (line) =>
      /^[A-Za-z]+\s\d{1,2},\d{4}$/i.test(line);

    while (i < lines.length) {
      // If a line looks like a date header (and it's not the first line), skip it.
      if (isDateHeader(lines[i])) {
        i++;
        continue;
      }

      const headerLine = lines[i];
      if (i + 1 >= lines.length) break; // Ensure there is a detail line.
      const detailLine = lines[i + 1];
      i += 2;

      // Parse header line: expected format "EmpName, Day Time"
      const headerParts = headerLine.split(",");
      const empName = headerParts[0].trim();
      let timeStr = "";
      if (headerParts.length > 1) {
        // Remove stray characters (like "?") and extract time
        const timeInfo = headerParts[1].trim().replace("?", "");
        const timeParts = timeInfo.split(" ");
        timeStr = timeParts.length > 1 ? timeParts[1] : timeInfo;
      }

      // Parse detail line: expected format "CI Location" or "CO Location"
      const detailParts = detailLine.split(" ").filter((p) => p !== "");
      const recordType = detailParts[0] || "";
      const location = detailParts[1] || "";

      if (recordType === "CI") {
        // For a check‑in, always add a new record.
        records.push({
          empName,
          inTime: timeStr,
          outTime: "",
          location,
          date: commonDate,
        });
      } else if (recordType === "CO") {
        // For a check‑out, update the latest record for this employee (on the common date) that lacks an outTime.
        let updated = false;
        for (let j = records.length - 1; j >= 0; j--) {
          if (
            records[j].empName === empName &&
            records[j].date === commonDate &&
            records[j].inTime &&
            !records[j].outTime
          ) {
            records[j].outTime = timeStr;
            // Optionally, update location with the CO location.
            records[j].location = location;
            updated = true;
            break;
          }
        }
        if (!updated) {
          // No matching record found, so add a new one.
          records.push({
            empName,
            inTime: "",
            outTime: timeStr,
            location,
            date: commonDate,
          });
        }
      }
    }
    setTableData(records);
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-3 text-center fw-bold">
        <Col>
          <h5>Hangout Messages (Raw Data)</h5>
        </Col>
        <Col>
          <h5>Attendance Messages (Parsed Table)</h5>
        </Col>
        <Col>
          <h5>Other Messages</h5>
        </Col>
      </Row>

      <Row>
        {/* Hangout Messages */}
        <Col>
          <Form.Control
            as="textarea"
            value={hangoutMessages}
            onChange={(e) => setHangoutMessages(e.target.value)}
            style={textareaStyle}
            placeholder={`Paste raw data here.`}
          />
        </Col>

        {/* Attendance Messages */}
        <Col>
          <div
            style={{
              height: "300px",
              overflowX: "scroll",
              overflowY: "scroll",
              border: "1px solid #ccc",
              whiteSpace: "nowrap",
              padding: "8px",
            }}
          >
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
                {tableData.map((record, index) => (
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

        {/* Other Messages */}
        <Col>
          <Form.Control
            as="textarea"
            value={otherMessages}
            onChange={(e) => setOtherMessages(e.target.value)}
            style={textareaStyle}
          />
        </Col>
      </Row>

      {/* Buttons Section */}
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
