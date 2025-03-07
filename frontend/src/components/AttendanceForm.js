import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { Container, Tabs, Tab } from "react-bootstrap";

// Import your custom components
import AttendanceEntry from "./AttendanceEntry";
import UpdateAttendance from "./UpdateAttendance";
import ViewAttendance from "./ViewAttendance";

const AttendanceForm = () => {
  // -----------------------
  // 1) Attendance Entry
  // -----------------------
  const [hangoutMessages, setHangoutMessages] = useState("");
  const [attendanceTableData, setAttendanceTableData] = useState([]);
  const [otherMessagesTableData, setOtherMessagesTableData] = useState([]);
  const [attendanceToSave, setAttendanceToSave] = useState([]);
  const [loading, setLoading] = useState(false);

  // -----------------------
  // 2) Update Attendance
  // -----------------------
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");

  // -----------------------
  // 3) View Attendance
  // -----------------------
  const [viewMode, setViewMode] = useState("monthwise"); 
  // or "datewise" if you want that as the default

  // For styling textareas/tables in the Entry tab
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

  const tableContainerStyle = {
    height: "300px",
    overflowX: "scroll",
    overflowY: "scroll",
    border: "1px solid #ccc",
    whiteSpace: "nowrap",
    padding: "8px",
  };

  // -----------------------
  // Fetch employees on mount
  // -----------------------
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

  // -----------------------
  // 2) Attendance Entry Logic
  // -----------------------
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

        // Append date to time
        const dateTime = `${commonDate} ${timeStr}`;

        const detailParts = detailLine.split(" ").filter((p) => p !== "");
        const recordType = detailParts[0] || "";
        const loc = detailParts[1] || "";

        if (recordType === "CI") {
          attendanceRecords.push({
            empName,
            inTime: dateTime,
            outTime: "",
            location: loc,
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
              attendanceRecords[j].outTime = dateTime;
              attendanceRecords[j].location = loc;
              updated = true;
              break;
            }
          }
          if (!updated) {
            attendanceRecords.push({
              empName,
              inTime: "",
              outTime: dateTime,
              location: loc,
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

  // -----------------------
  // 3) Update Attendance Logic
  // -----------------------
  useEffect(() => {
    if (!selectedEmployee) {
      setEmployeeAttendance([]);
      return;
    }
    fetchEmployeeAttendance(selectedEmployee);
  }, [selectedEmployee]);

  const fetchEmployeeAttendance = async (empName) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/attendance?empName=${encodeURIComponent(empName)}`
      );
      setEmployeeAttendance(response.data);
    } catch (error) {
      console.error("Error fetching employee attendance:", error);
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setApprovedBy(record.approved_by || "");
    setReason(record.reason || "");
    setLocation(record.location || "");
    setClockIn(record.in_time || "");
    setClockOut(record.out_time || "");
  };

  const handleUpdate = async () => {
    if (!selectedRecord) {
      alert("No record selected for update!");
      return;
    }
    try {
      // Send only the necessary fields; work_hour and day will be calculated on the server.
      const requestBody = {
        inTime: clockIn,
        outTime: clockOut,
        location,
        date: selectedRecord.date,
        approved_by: approvedBy,
        reason,
      };

      await axios.put(
        `http://localhost:5000/api/attendance/${selectedRecord.id}`,
        requestBody
      );
      alert("Attendance updated successfully!");

      // Refresh table
      fetchEmployeeAttendance(selectedEmployee);
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance record.");
    }
  };

  // -----------------------
  // Render
  // -----------------------
  return (
    <Container fluid className="p-3">
      <Tabs defaultActiveKey="entry" id="main-tabs" className="mb-3">
        {/* 1) Attendance Entry Tab */}
        <Tab eventKey="entry" title="Attendance Entry">
          <AttendanceEntry
            hangoutMessages={hangoutMessages}
            setHangoutMessages={setHangoutMessages}
            attendanceTableData={attendanceTableData}
            otherMessagesTableData={otherMessagesTableData}
            attendanceToSave={attendanceToSave}
            loading={loading}
            handleFilter={handleFilter}
            handleSave={handleSave}
            hangoutTextareaStyle={hangoutTextareaStyle}
            tableContainerStyle={tableContainerStyle}
          />
        </Tab>

        {/* 2) Update Attendance Tab */}
        <Tab eventKey="update" title="Update Attendance">
          <UpdateAttendance
            employees={employees}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
            employeeAttendance={employeeAttendance}
            handleRowClick={handleRowClick}
            handleUpdate={handleUpdate}
            approvedBy={approvedBy}
            setApprovedBy={setApprovedBy}
            reason={reason}
            setReason={setReason}
            location={location}
            setLocation={setLocation}
            clockIn={clockIn}
            setClockIn={setClockIn}
            clockOut={clockOut}
            setClockOut={setClockOut}
          />
        </Tab>

        {/* 3) View Attendance Tab */}
        <Tab eventKey="view" title="View Attendance">
          <ViewAttendance viewMode={viewMode} setViewMode={setViewMode} />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AttendanceForm;
