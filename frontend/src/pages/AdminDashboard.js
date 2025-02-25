import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminNavbar from "../components/Navbar";
import { Container, Form } from "react-bootstrap";

const AdminDashboard = () => {
  const [attendanceData, setAttendanceData] = useState("");

  return (
    <div>
      <Header role="admin" />
      <AdminNavbar />
      <Container>
        <h2 className="text-center mt-4">Paste Attendance Data</h2>
        <Form>
          <Form.Group controlId="attendanceTextarea">
            <Form.Control
              as="textarea"
              rows={15} // You can adjust this value
              placeholder="Paste your attendance data here..."
              value={attendanceData}
              onChange={(e) => setAttendanceData(e.target.value)}
              style={{
                width: "100%",        // Full-width
                minHeight: "400px",   // Increased height
                fontSize: "16px",     // Larger font for readability
                padding: "10px",      // More space inside
              }}
            />
          </Form.Group>
        </Form>
      </Container>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
