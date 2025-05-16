import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = ({ setUser }) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const navigate                = useNavigate();

  // Your backend URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Base64-encode the plain-text password
    const encodedPassword = btoa(password);

    try {
      const res = await axios.post(
        `${API_URL}/login`,
        { email, password: encodedPassword },
        { validateStatus: () => true } // allow manual status handling
      );

      // 403 = disabled account
      if (res.status === 403 && res.data.error) {
        setError(res.data.error);
        return;
      }

      // Any other non-200 error
      if (res.status !== 200) {
        setError(res.data.error || "Login failed. Please try again.");
        return;
      }

      // Successful login: extract payload
      const userData = {
        role:       res.data.role,
        roleName:   res.data.roleName,
        name:       res.data.name,
        token:      res.data.token,
        employeeId: res.data.employeeId,
        email:      res.data.email,
        location:   res.data.location,
      };

      // Persist user session
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow-lg" style={{ width: "350px" }}>
        <h3 className="text-center mb-3">Login</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
