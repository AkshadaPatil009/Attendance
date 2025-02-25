import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminNavbar from "../components/Navbar";
import { Container, Form, Button } from "react-bootstrap";

const AdminDashboard = () => {
  const [attendanceData, setAttendanceData] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Attendance Data:", attendanceData);
    // You can send this data to your backend here
  };

  return (
    <div>
      <Header role="admin" />
      <AdminNavbar />
      <Container>
        <h2 className="text-center mt-4">Paste Attendance Data</h2>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="attendanceTextarea">
            <Form.Control
              as="textarea"
              rows={15} // Adjustable height
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
          {/* Submit Button Aligned to the Right */}
          <div className="d-flex justify-content-end mt-3">
            <Button type="submit" variant="primary">Submit</Button>
          </div>
        </Form>
      </Container>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
