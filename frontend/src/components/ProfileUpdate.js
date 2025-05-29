// src/components/ProfileUpdate.js

import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Image,
  Spinner,
  Alert,
  Modal,
  InputGroup,
  Row,
  Col,
} from "react-bootstrap";
import {
  FaCamera,
  FaUserCircle,
  FaUser,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUserTag,
} from "react-icons/fa";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const ROLE_LABELS = {
  1: "Employee",
  2: "Team Leader",
  3: "HR",
  4: "Admin",
};

export default function ProfileUpdate({ user, onClose = () => {} }) {
  const [formData, setFormData] = useState({
    Name: "",
    fname: "",
    lname: "",
    nickname: "",
    email: "",
    location: "",
    role: 1,
    _file: null,
  });
  const [originalData, setOriginalData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user?.employeeId) {
      setError("No employeeId provided");
      setLoadingProfile(false);
      return;
    }
    axios
      .get(`${API_URL}/api/profile/${user.employeeId}`)
      .then((res) => {
        const d = res.data;
        const init = {
          Name: d.Name || "",
          fname: d.fname || "",
          lname: d.lname || "",
          nickname: d.nickname || "",
          email: d.email || "",
          location: d.location || "",
          role: d.role || 1,
        };
        setFormData({ ...init, _file: null });
        setOriginalData(init);
        setImagePreview(
          d.image_filename
            ? `${API_URL}/uploads/${d.image_filename}`
            : null
        );
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoadingProfile(false));
  }, [user]);

  const isDirty = React.useMemo(() => {
    if (!originalData) return false;
    for (let key of ["Name", "fname", "lname", "nickname", "email", "location", "role"]) {
      if (formData[key] !== originalData[key]) return true;
    }
    return formData._file != null;
  }, [formData, originalData]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file" && files[0]) {
      const file = files[0];
      setFormData((p) => ({ ...p, _file: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFormData((p) => ({
        ...p,
        [name]: name === "role" ? parseInt(value, 10) : value,
      }));
    }
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError("");
    try {
      await axios.post(`${API_URL}/api/profile/${user.employeeId}`, {
        Name: formData.Name,
        fname: formData.fname,
        lname: formData.lname,
        nickname: formData.nickname,
        email: formData.email,
        location: formData.location,
        role: formData.role,
      });
      if (formData._file) {
        const data = new FormData();
        data.append("image", formData._file);
        await axios.post(
          `${API_URL}/api/profile/${user.employeeId}/image`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }
      alert("Profile updated successfully");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isDirty) setShowConfirm(true);
  };

  if (loadingProfile) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="grow" variant="primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Alert variant="danger" className="w-75 text-center">{error}</Alert>
      </div>
    );
  }

  const isEmployee = user.role === 1;
  const canEditAll = user.role >= 2;

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card
        className="shadow-lg rounded-lg"
        style={{ width: '100%', maxWidth: 600, border: "none" }}
      >
        <div
          className="text-white text-center py-4"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderTopLeftRadius: "0.5rem",
            borderTopRightRadius: "0.5rem",
          }}
        >
          <h3 className="mb-0">Update Profile</h3>
        </div>
        <Card.Body>
          <div className="text-center mb-4">
            <div style={{ position: "relative", display: "inline-block" }}>
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  roundedCircle
                  style={{
                    width: 150,
                    height: 150,
                    objectFit: "cover",
                    border: "4px solid #fff",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                  }}
                />
              ) : (
                <FaUserCircle size={150} color="#ccc" />
              )}
              <label
                htmlFor="profileImage"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  background: "#fff",
                  borderRadius: "50%",
                  width: 42,
                  height: 42,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <FaCamera size={18} color="#764ba2" />
              </label>
              <input
                id="profileImage"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleChange}
              />
            </div>
          </div>

          <Form onSubmit={handleFormSubmit}>
            <Row className="g-3">
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaUser />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="First Name"
                    name="fname"
                    value={formData.fname}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Col>
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaUser />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Last Name"
                    name="lname"
                    value={formData.lname}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Col>
            </Row>

            <InputGroup className="mt-3">
              <InputGroup.Text>
                <FaUserTag />
              </InputGroup.Text>
              <Form.Control
                placeholder="Preferred Name"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
              />
            </InputGroup>

            <InputGroup className="mt-3">
              <InputGroup.Text>
                <FaEnvelope />
              </InputGroup.Text>
              <Form.Control
                type="email"
                placeholder="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isEmployee && !canEditAll}
              />
            </InputGroup>

            <InputGroup className="mt-3">
              <InputGroup.Text>
                <FaMapMarkerAlt />
              </InputGroup.Text>
              <Form.Control
                placeholder="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={isEmployee && !canEditAll}
              />
            </InputGroup>

            <InputGroup className="mt-3">
              <InputGroup.Text>
                <FaUserTag />
              </InputGroup.Text>
              <Form.Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                // Only Admin (role === 4) can edit this field
                disabled={user.role !== 4}
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Form.Select>
            </InputGroup>

            <div className="d-grid mt-4">
              <Button
                type="submit"
                disabled={saving || !isDirty}
                style={{
                  background: "linear-gradient(90deg, #764ba2, #667eea)",
                  border: "none",
                  padding: "0.75rem",
                  fontSize: "1rem",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.85)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" animation="border" /> Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to apply these changes?</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Discard
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
