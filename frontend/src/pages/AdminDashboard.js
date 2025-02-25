import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminNavbar from "../components/Navbar";
import { Container } from "react-bootstrap";

const AdminDashboard = () => {
  return (
    <div>
      <Header role="admin" />
      <AdminNavbar />
      <Container>
        <h2 className="text-center mt-4">Admin Dashboard</h2>
      </Container>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
