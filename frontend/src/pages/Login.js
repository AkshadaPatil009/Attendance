// src/pages/Login.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = ({ setUser }) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Registration form fields
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    department: "",
    nickname: "",
    esc: "",
    location: "",
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const encodedPassword = btoa(password);

    try {
      const res = await axios.post(
        `${API_URL}/login`,
        { email, password: encodedPassword },
        { validateStatus: () => true }
      );

      if (res.status === 403 && res.data.error) {
        return setError(res.data.error);
      }
      if (res.status !== 200) {
        return setError(res.data.error || "Login failed.");
      }

      const userData = {
        role: res.data.role,
        roleName: res.data.roleName,
        name: res.data.name,
        token: res.data.token,
        employeeId: res.data.employeeId,
        email: res.data.email,
        location: res.data.location,
      };

      setUser(userData);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed.");
    }
  };

  const handleRegistration = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/register`, regData);
      alert("Account created successfully!");
      setModalOpen(false);
    } catch (err) {
      alert("Error creating account");
      console.error(err);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow-lg" style={{ width: "360px" }}>
        <h3 className="text-center mb-3">Employee Login</h3>
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
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        </form>
        <div className="text-center mt-3">
          <a
            href="https://prakalp2.mydashboard.site/register"
            target="_blank"
            rel="noreferrer"
          >
            Go to Registration Page
          </a>
          <br />
          <button
            className="btn btn-link mt-2"
            onClick={() => setModalOpen(true)}
          >
            Create an Account
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="modal show fade d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Account</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                {["name", "email", "department", "nickname", "esc", "location"].map(
                  field => (
                    <div className="mb-2" key={field}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={
                          field.charAt(0).toUpperCase() + field.slice(1)
                        }
                        value={regData[field]}
                        onChange={e =>
                          setRegData({ ...regData, [field]: e.target.value })
                        }
                      />
                    </div>
                  )
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleRegistration}
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
