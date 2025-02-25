import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const App = () => {
  const [user, setUser] = useState(null);

  // Load user data from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser)); // Parse stored user data
    }
  }, []);

  // Function to handle login and store user data
  const handleLogin = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData)); // Save user to localStorage
    setUser(userData);
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem("user"); // Remove user from localStorage
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={handleLogin} />} />
        <Route
          path="/dashboard"
          element={
            user ? <Dashboard role={user.role} onLogout={handleLogout} /> : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
