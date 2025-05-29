// src/components/ProfileUpdate.js

import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Image,
  Spinner,
  Alert,
  Modal
} from "react-bootstrap";
import { FaCamera, FaUserCircle } from "react-icons/fa";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const ROLE_LABELS = {
  1: "Employee",
  2: "Team Leader",
  3: "HR",
  4: "Admin",
};

export default function ProfileUpdate({
  user,
  onClose = () => {},
}) {
  const [formData, setFormData] = useState({
    Name:     "",
    fname:    "",
    lname:    "",
    nickname: "",
    email:    "",
    location: "",
    role:     1,
    _file:    null,
  });
  const [originalData, setOriginalData]   = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [showConfirm, setShowConfirm]     = useState(false);

  // Load profile
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
          Name:     d.Name      || "",
          fname:    d.fname     || "",
          lname:    d.lname     || "",
          nickname: d.nickname  || "",
          email:    d.email     || "",
          location: d.location  || "",
          role:     d.role      || 1,
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

  // Determine if any field changed
  const isDirty = React.useMemo(() => {
    if (!originalData) return false;
    // check each field
    for (let key of ["Name","fname","lname","nickname","email","location","role"]) {
      if (formData[key] !== originalData[key]) return true;
    }
    // check if a new file selected
    if (formData._file) return true;
    return false;
  }, [formData, originalData]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "file" && files.length) {
      const file = files[0];
      setFormData((p) => ({ ...p, _file: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFormData((p) => ({
        ...p,
        [name]:
          type === "checkbox"
            ? (checked ? 1 : 0)
            : (name === "role" ? parseInt(value, 10) : value),
      }));
    }
  };

  // Actual submit
  const handleSubmit = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError("");

    try {
      await axios.post(
        `${API_URL}/api/profile/${user.employeeId}`,
        {
          Name:     formData.Name,
          fname:    formData.fname,
          lname:    formData.lname,
          nickname: formData.nickname,
          email:    formData.email,
          location: formData.location,
          role:     formData.role,
        }
      );
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
      console.error(err);
      setError(err.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // Intercept form submit to show confirm
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isDirty) {
      setShowConfirm(true);
    }
  };

  if (loadingProfile) {
    return <div className="text-center my-5"><Spinner animation="border" /></div>;
  }
  if (error) {
    return <Alert variant="danger" className="m-3">{error}</Alert>;
  }

  const isEmployee = user.role === 1;
  const canEditAll = user.role >= 2;

  return (
    <>
      <Card className="m-3 p-4 shadow-sm" style={{ maxWidth: 600, margin: "auto" }}>
        {/* ... image/avatar code unchanged ... */}
        <div className="text-center mb-3">
          <div style={{ position: "relative", display: "inline-block" }}>
            {imagePreview ? (
              <Image
                src={imagePreview}
                roundedCircle
                style={{ width: 120, height: 120, objectFit: "cover" }}
              />
            ) : (
              <FaUserCircle size={120} color="#bbb" />
            )}
            <label
              htmlFor="profileImage"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: "#007bff",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <FaCamera size={18} />
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

        <h5 className="text-center mb-3">Update Profile</h5>
        <Form onSubmit={handleFormSubmit}>
          {[
            { name: "Name",     label: "Name"       },
            { name: "fname",    label: "First Name" },
            { name: "lname",    label: "Last Name"  },
            { name: "nickname", label: "Nickname"   },
          ].map(({ name, label }) => (
            <Form.Group className="mb-3" key={name}>
              <Form.Label>{label}</Form.Label>
              <Form.Control
                type="text"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                disabled={false}
              />
            </Form.Group>
          ))}

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isEmployee && !canEditAll}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            <Form.Control
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              disabled={isEmployee && !canEditAll}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isEmployee && !canEditAll}
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="d-grid">
            <Button
              variant="primary"
              type="submit"
              disabled={saving || !isDirty}
            >
              {saving 
                ? <><Spinner size="sm" animation="border" /> Saving…</>
                : "Save Changes"}
            </Button>
          </div>
        </Form>
      </Card>

      {/* Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save these changes?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Discard
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
