import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Button, Card, Image } from "react-bootstrap";
import { FaCamera } from "react-icons/fa";

export default function ProfileUpdate({ userId, onClose }) {
  const [formData, setFormData] = useState({
    Name: "",
    fname: "",
    lname: "",
    Nickname: "",
    Email: "",
    Password: "",
    Type: "",
    Location: "",
    loginUsingGmail: 0,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // 1️⃣ Fetch existing user data
  useEffect(() => {
    axios
      .get(`/api/users/${userId}`)
      .then((res) => {
        const data = res.data;
        setFormData({
          Name: data.Name || "",
          fname: data.fname || "",
          lname: data.lname || "",
          Nickname: data.Nickname || "",
          Email: data.Email || "",
          Password: "",                // leave blank; user can enter new one
          Type: data.Type || "",
          Location: data.Location || "",
          loginUsingGmail: data.loginUsingGmail,
        });
        if (data.profileImageUrl) {
          setImagePreview(data.profileImageUrl);
        }
      })
      .catch((err) => console.error("Failed to load profile", err));
  }, [userId]);

  // 2️⃣ Handle text / checkbox changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
            ? 1
            : 0
          : value,
    }));
  };

  // 3️⃣ Handle image selection + preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // 4️⃣ Submit updates
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // build multipart form
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => payload.append(k, v));
      if (imageFile) payload.append("profileImage", imageFile);

      await axios.put(`/api/users/${userId}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Profile updated successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("There was an error updating your profile.");
    }
  };

  return (
    <Card className="m-3 p-4 shadow-sm" style={{ maxWidth: 500, margin: "auto" }}>
      <div className="text-center mb-3">
        <div style={{ position: "relative", display: "inline-block" }}>
          <Image
            src={imagePreview || "https://via.placeholder.com/100"}
            roundedCircle
            style={{ width: 100, height: 100, objectFit: "cover" }}
          />
          <label
            htmlFor="profileImage"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: "#007bff",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <FaCamera size={16} />
          </label>
          <input
            id="profileImage"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageChange}
          />
        </div>
      </div>
      <h5 className="text-center mb-3">Update Profile</h5>
      <Form onSubmit={handleSubmit} encType="multipart/form-data">
        {/* Name */}
        <Form.Group className="mb-3">
          <Form.Label>Full Name</Form.Label>
          <Form.Control
            type="text"
            name="Name"
            value={formData.Name}
            onChange={handleChange}
            placeholder="Enter full name"
          />
        </Form.Group>

        {/* First + Last */}
        <Form.Group className="mb-3" controlId="formRowNames">
          <div className="d-flex">
            <Form.Control
              className="me-2"
              type="text"
              name="fname"
              value={formData.fname}
              onChange={handleChange}
              placeholder="First name"
            />
            <Form.Control
              type="text"
              name="lname"
              value={formData.lname}
              onChange={handleChange}
              placeholder="Last name"
            />
          </div>
        </Form.Group>

        {/* Nickname */}
        <Form.Group className="mb-3">
          <Form.Label>Nickname</Form.Label>
          <Form.Control
            type="text"
            name="Nickname"
            value={formData.Nickname}
            onChange={handleChange}
            placeholder="Enter nickname"
          />
        </Form.Group>

        {/* Email */}
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            name="Email"
            value={formData.Email}
            onChange={handleChange}
            placeholder="Enter email"
          />
        </Form.Group>

        {/* Password */}
        <Form.Group className="mb-3">
          <Form.Label>New Password</Form.Label>
          <Form.Control
            type="password"
            name="Password"
            value={formData.Password}
            onChange={handleChange}
            placeholder="Enter new password (leave blank to keep old)"
          />
        </Form.Group>

        {/* Type */}
        <Form.Group className="mb-3">
          <Form.Label>Type</Form.Label>
          <Form.Select name="Type" value={formData.Type} onChange={handleChange}>
            <option value="">Select type…</option>
            <option>Employee</option>
            <option>Team Leader</option>
            <option>HR</option>
            <option>Admin</option>
          </Form.Select>
        </Form.Group>

        {/* Location */}
        <Form.Group className="mb-3">
          <Form.Label>Location</Form.Label>
          <Form.Control
            type="text"
            name="Location"
            value={formData.Location}
            onChange={handleChange}
            placeholder="Enter location"
          />
        </Form.Group>

        {/* Gmail */}
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            label="Login via Gmail?"
            name="loginUsingGmail"
            checked={!!formData.loginUsingGmail}
            onChange={handleChange}
          />
        </Form.Group>

        <div className="d-grid">
          <Button variant="primary" type="submit">
            Save Changes
          </Button>
        </div>
      </Form>
    </Card>
  );
}
