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
  FaUsers,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const ROLE_LABELS = {
  1: "Employee",
  2: "Team Leader",
  3: "HR",
  4: "Admin",
};

export default function ProfileUpdate({ user, onClose = () => {} }) {
  // ─── DROPDOWN STATE (Admin only) ───────────────────────────────────────────
  const [allUsers, setAllUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    user.employeeId || ""
  );
  // ─────────────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    Name: "",
    fname: "",
    lname: "",
    nickname: "",
    email: "",
    location: "",
    role: 1,
    office: "",
    designation: "",
    _file: null,
  });
  const [originalData, setOriginalData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── FETCH ALL USERS FOR ADMIN DROPDOWN ─────────────────────────────────────
  useEffect(() => {
    if (user.role === 4) {
      axios
        .get(`${API_URL}/api/users`)
        .then((res) => {
          setAllUsers(res.data); // expect [{ id, Name, Nickname }, …]
        })
        .catch(() => {
          toast.error("Failed to load user list");
        });
    }
  }, [user.role]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── LOAD PROFILE BASED ON selectedEmployeeId (or own ID) ───────────────────
  useEffect(() => {
    // If Admin has not picked anyone yet, skip
    if (user.role === 4 && !selectedEmployeeId) {
      setLoadingProfile(false);
      return;
    }

    const idToLoad = user.role === 4 ? selectedEmployeeId : user.employeeId;
    if (!idToLoad) {
      setError("No employeeId provided");
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    setError("");

    axios
      .get(`${API_URL}/api/profile/${idToLoad}`)
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
          office: d.office || "",
          designation: d.designation || "",
        };
        setFormData({ ...init, _file: null });
        setOriginalData(init);
        setImagePreview(
          d.image_filename ? `${API_URL}/uploads/${d.image_filename}` : null
        );
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoadingProfile(false));
  }, [user, selectedEmployeeId]);
  // ─────────────────────────────────────────────────────────────────────────────

  const isDirty = React.useMemo(() => {
    if (!originalData) return false;
    for (let key of [
      "Name",
      "fname",
      "lname",
      "nickname",
      "email",
      "location",
      "role",
      "office",
      "designation",
    ]) {
      if (formData[key] !== originalData[key]) return true;
    }
    return formData._file != null;
  }, [formData, originalData]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file" && files[0]) {
      const file = files[0];
      // only .jpg under 5MB
      if (file.type !== "image/jpeg") {
        toast.error("Only .jpg files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5 MB");
        return;
      }
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
      const idToPost = user.role === 4 ? selectedEmployeeId : user.employeeId;

      await axios.post(`${API_URL}/api/profile/${idToPost}`, {
        Name: formData.Name,
        fname: formData.fname,
        lname: formData.lname,
        nickname: formData.nickname,
        email: formData.email,
        location: formData.location,
        role: formData.role,
        office: formData.office,
        designation: formData.designation,
      });
      if (formData._file) {
        const data = new FormData();
        data.append("image", formData._file);
        await axios.post(
          `${API_URL}/api/profile/${idToPost}/image`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }
      toast.success("Profile updated successfully");
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || "Update failed";
      toast.error(msg);
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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <Spinner animation="grow" variant="primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <Alert variant="danger" className="w-75 text-center">
          {error}
        </Alert>
      </div>
    );
  }

  const isEmployee = user.role === 1;
  const canEditAll = user.role >= 2;

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "10vh" }}
    >
      <ToastContainer />

      <Card
        className="shadow-lg rounded-lg"
        style={{ width: "100%", maxWidth: 600, border: "none" }}
      >
        <div
          className="text-white text-center py-2"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderTopLeftRadius: "0.5rem",
            borderTopRightRadius: "0.5rem",
          }}
        >
          <h3 className="mb-0">Update Profile</h3>
        </div>

        {/* ─── INSIDE CARD: STYLED DROPDOWN FOR ADMIN ───────────────────────────── */}
        {user.role === 4 && (
          <Card.Body className="pt-3 pb-0">
            <Form.Group as={Row} className="align-items-center mb-3">
              <Form.Label column sm={4} className="text-end">
                <FaUsers style={{ marginRight: "0.5rem", color: "#764ba2" }} />
                Select Employee:
              </Form.Label>
              <Col sm={6}>
                <InputGroup>
                  <InputGroup.Text
                    style={{
                      background: "#764ba2",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    <FaUserTag />
                  </InputGroup.Text>
                  <Form.Select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    style={{
                      borderColor: "#764ba2",
                      borderLeft: "none",
                      background: "#f9f9f9",
                    }}
                  >
                    <option value="">— pick one —</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.Name} ({u.Nickname})
                      </option>
                    ))}
                  </Form.Select>
                </InputGroup>
              </Col>
            </Form.Group>
          </Card.Body>
        )}
        {/* ────────────────────────────────────────────────────────────────────────── */}

        <Card.Body className={user.role === 4 ? "pt-0" : ""}>
          <div className="text-center mb-4">
            <div style={{ position: "relative", display: "inline-block" }}>
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  roundedCircle
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    border: "4px solid #fff",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                  }}
                />
              ) : (
                <FaUserCircle size={100} color="#ccc" />
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <FaCamera size={18} color="#764ba2" />
              </label>
              <input
                id="profileImage"
                type="file"
                accept="image/jpeg"
                style={{ display: "none" }}
                onChange={handleChange}
              />
            </div>
            <p className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>
              Please choose a .jpg image under 5 MB.
            </p>
          </div>

          <Form onSubmit={handleFormSubmit}>
            {/* UPDATED ROW: Full Name full width */}
            <Row className="mb-1">
              <Col>
                <Form.Group>
                  <Form.Label>Full Name</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaUser />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Full Name"
                      name="Name"
                      value={formData.Name}
                      onChange={handleChange}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            {/* UPDATED ROW: Designation + Office Nick Name */}
            <Row className="mb-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Designation</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaUserTag />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      disabled={user.role !== 4}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Office Nick Name</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaMapMarkerAlt />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Office Nick Name"
                      name="office"
                      value={formData.office}
                      onChange={handleChange}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            {/* FIRST NAME + LAST NAME */}
            <Row className="mb-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>First Name</Form.Label>
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
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Last Name</Form.Label>
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
                </Form.Group>
              </Col>
            </Row>

            {/* PREFERRED NAME + EMAIL */}
            <Row className="mb-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Preferred Name</Form.Label>
                  <InputGroup>
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
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
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
                </Form.Group>
              </Col>
            </Row>

            {/* LOCATION + ROLE */}
            <Row className="mb-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  <InputGroup>
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
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Role</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaUserTag />
                    </InputGroup.Text>
                    <Form.Select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={user.role !== 4}
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Form.Select>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

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
