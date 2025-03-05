// ViewAttendance.js
import React from "react";
import { Container, Row, Col, Form, Table } from "react-bootstrap";

const ViewAttendance = ({ viewMode, setViewMode }) => {
  return (
    <Container fluid>
      <Row
        style={{
          backgroundColor: "#20B2AA",
          padding: "10px",
          color: "#fff",
          borderRadius: "4px",
        }}
        className="g-3"
      >
        <Col md={3}>
          <Form.Label className="fw-bold me-2">View By :</Form.Label>
          <div>
            <Form.Check
              type="radio"
              label="Employee Name"
              name="viewBy"
              value="employee"
              checked={viewMode === "employee"}
              onChange={(e) => setViewMode(e.target.value)}
            />
            <Form.Check
              type="radio"
              label="Monthwise"
              name="viewBy"
              value="monthwise"
              checked={viewMode === "monthwise"}
              onChange={(e) => setViewMode(e.target.value)}
            />
            <Form.Check
              type="radio"
              label="Datewise"
              name="viewBy"
              value="datewise"
              checked={viewMode === "datewise"}
              onChange={(e) => setViewMode(e.target.value)}
            />
          </div>
        </Col>

        <Col md={4}>
          <Row>
            <Col md={12}>
              <Form.Label>Employee Name</Form.Label>
              <Form.Select className="mb-2">
                <option>All Employees</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Month</Form.Label>
              <Form.Select className="mb-2">
                <option>January</option>
                <option>February</option>
                <option>March</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Year</Form.Label>
              <Form.Select className="mb-2">
                <option>2025</option>
                <option>2026</option>
              </Form.Select>
            </Col>
            <Col md={12}>
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" className="mb-2" />
            </Col>
          </Row>
        </Col>

        <Col md={5}>
          <Form.Label className="fw-bold d-block mb-2">Legend:</Form.Label>
          <div className="d-flex flex-wrap align-items-center">
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#B0E0E6",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Half day</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#90EE90",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Full Day (8.5 Hrs)</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#FFC0CB",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Absent</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#ff9900",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Sunday</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#FFD700",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Late Mark</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#FFFF00",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Site Visit</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#ff0000",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Holiday</span>
            </div>
            <div className="legend-item d-flex align-items-center me-3 mb-2">
              <div
                style={{
                  backgroundColor: "#FF69B4",
                  width: "20px",
                  height: "20px",
                  marginRight: "5px",
                }}
              ></div>
              <span>Working &lt; 5 Hrs</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* If user selected "employee" */}
      {viewMode === "employee" && (
        <Row className="mt-3">
          <Col>
            <h5>Employee-Wise Attendance</h5>
            <p>Replace this placeholder with your Employee-wise data/table.</p>
          </Col>
        </Row>
      )}

      {/* If user selected "datewise" */}
      {viewMode === "datewise" && (
        <Row className="mt-3">
          <Col>
            <h5>Datewise Attendance</h5>
            <div style={{ overflowX: "auto" }}>
              <Table bordered hover size="sm">
                {/* Your datewise table data */}
              </Table>
            </div>
          </Col>
        </Row>
      )}

      {/* If user selected "monthwise" */}
      {viewMode === "monthwise" && (
        <Row className="mt-3">
          <Col>
            <h5>Monthwise Attendance</h5>
            <div style={{ overflowX: "auto" }}>
              <Table bordered hover size="sm">
                {/* Your monthwise table data */}
              </Table>
            </div>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default ViewAttendance;
