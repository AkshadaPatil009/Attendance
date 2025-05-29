import React, { useState } from "react";
import { Form, Button, Card, Row, Col, Image } from "react-bootstrap";
import { FaCamera } from "react-icons/fa";

export default function ProfileUpdate({ user, onClose }) {
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    nickname: "",
    email: "",
    type: "",
    loginUsingGmail: 0,
  });

  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Updated profile data:", formData);
    alert("Profile Updated Successfully (simulated)");
    onClose();
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
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>First Name</Form.Label>
          <Form.Control
            type="text"
            name="fname"
            value={formData.fname}
            onChange={handleChange}
            placeholder="Enter first name"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Last Name</Form.Label>
          <Form.Control
            type="text"
            name="lname"
            value={formData.lname}
            onChange={handleChange}
            placeholder="Enter last name"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nickname</Form.Label>
          <Form.Control
            type="text"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            placeholder="Enter nickname"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Type</Form.Label>
          <Form.Select name="type" value={formData.type} onChange={handleChange}>
            <option value="">Select type...</option>
            <option>Employee</option>
            <option>Team Leader</option>
            <option>HR</option>
            <option>Admin</option>
          </Form.Select>
        </Form.Group>

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
