// src/components/EmployeeView/StatusView.js

import React, { useEffect, useState } from "react";
import {
  Container,
  Tabs,
  Tab,
  Spinner,
  Row,
  Col,
  Card,
  Pagination,
} from "react-bootstrap";
import axios from "axios";

// Make sure REACT_APP_API_URL points to your back-end origin (e.g. "http://localhost:5000")
// In production it could be "https://your-domain.com"
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Fallback avatar if nothing else is available
const DEFAULT_PROFILE_IMAGE =
  "https://cdn.jsdelivr.net/gh/twbs/icons@1.10.0/icons/person-circle.svg";

const ITEMS_PER_PAGE = 6;

export default function StatusView() {
  const [officeTabs, setOfficeTabs] = useState([]);
  const [activeOfficeTab, setActiveOfficeTab] = useState(null);
  const [officeEmployees, setOfficeEmployees] = useState([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officePage, setOfficePage] = useState(1);

  const [attendanceTab, setAttendanceTab] = useState("site");
  const [siteEmployees, setSiteEmployees] = useState([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const [sitePage, setSitePage] = useState(1);

  const [wfhEmployees, setWfhEmployees] = useState([]);
  const [wfhLoading, setWfhLoading] = useState(false);
  const [wfhPage, setWfhPage] = useState(1);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/nickoffices`)
      .then((res) => {
        setOfficeTabs(res.data || []);
        if (res.data && res.data.length) {
          setActiveOfficeTab(res.data[0]);
        }
      })
      .catch((err) => {
        console.error("Error fetching offices:", err);
        setOfficeTabs([]);
      });
  }, []);

  useEffect(() => {
    if (!activeOfficeTab) return;
    setOfficeLoading(true);
    setOfficePage(1); // Reset pagination on tab change

    axios
      .get(`${API_URL}/api/office-status`, {
        params: { office: activeOfficeTab },
      })
      .then((res) => {
        setOfficeEmployees(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching office status:", err);
        setOfficeEmployees([]);
      })
      .finally(() => setOfficeLoading(false));
  }, [activeOfficeTab]);

  useEffect(() => {
    if (attendanceTab !== "site") return;
    setSiteLoading(true);
    setSitePage(1);

    axios
      .get(`${API_URL}/api/site-status`)
      .then((res) => {
        setSiteEmployees(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching site status:", err);
        setSiteEmployees([]);
      })
      .finally(() => setSiteLoading(false));
  }, [attendanceTab]);

  useEffect(() => {
    if (attendanceTab !== "wfh") return;
    setWfhLoading(true);
    setWfhPage(1);

    axios
      .get(`${API_URL}/api/wfh-status`)
      .then((res) => {
        setWfhEmployees(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching WFH status:", err);
        setWfhEmployees([]);
      })
      .finally(() => setWfhLoading(false));
  }, [attendanceTab]);

  // Utility: derive a final <img> src for each employee
  const getProfileSrc = (emp) => {
    // 1) If the backend already returned a full URL in `photo_url`, use it:
    if (emp.photo_url && emp.photo_url.startsWith("http")) {
      return emp.photo_url;
    }
    // 2) Otherwise, if the backend gave only `image_filename`, build the URL yourself:
    if (emp.image_filename) {
      return `${API_URL}/uploads/${emp.image_filename}`;
    }
    // 3) Fallback to the default icon
    return DEFAULT_PROFILE_IMAGE;
  };

  const renderEmployeeGrid = (
    employees,
    loading,
    emptyMsg,
    currentPage,
    setPage
  ) => {
    if (loading) return <Spinner animation="border" />;

    if (!employees.length) return <div>{emptyMsg}</div>;

    const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
    const paginated = employees.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <>
        <Row xs={1} sm={2} md={3} className="g-4">
          {paginated.map((emp) => (
            <Col key={emp.name} className="d-flex justify-content-center">
              {/* Fixed-size 250×250px wrapper for each Card, with overflow hidden */}
              <div
                style={{
                  width: "250px",
                  height: "250px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Card style={{ height: "100%" }} className="d-flex flex-column">
                  <div
                    style={{
                      flex: 6,             // reduced from 7 to 6
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgb(255, 255, 255)",
                    }}
                  >
                    <img
                      src={getProfileSrc(emp)}
                      alt={emp.name}
                      style={{
                        width: "60%",
                        height: "auto",
                        aspectRatio: "1 / 1",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_PROFILE_IMAGE;
                      }}
                    />
                  </div>
                  <Card.Body
                    style={{
                      flex: 4,             // increased from 3 to 4
                      padding: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    <Card.Text
                      style={{
                        marginBottom: "0.25rem",
                        overflow: "hidden",
                      }}
                    >
                      <strong>Name:</strong> {emp.name}
                    </Card.Text>
                    <Card.Text
                      style={{
                        marginBottom: "0.25rem",
                        overflow: "hidden",
                      }}
                    >
                      <strong>Status:</strong> {emp.status}
                    </Card.Text>
                    <Card.Text style={{ marginBottom: 0, overflow: "hidden" }}>
                      <strong>Location:</strong> {emp.location}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          ))}
        </Row>

        {totalPages > 1 && (
          <Pagination className="mt-3 justify-content-center">
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item
                key={idx + 1}
                active={idx + 1 === currentPage}
                onClick={() => setPage(idx + 1)}
              >
                {idx + 1}
              </Pagination.Item>
            ))}
          </Pagination>
        )}
      </>
    );
  };

  return (
    <Container fluid className="p-0" style={{ height: "120vh" }}>
      <div className="d-flex gap-4 flex-wrap h-100">
        {/* Left: Offices */}
        <div style={{ flex: 1, minWidth: "300px", overflowY: "auto" }}>
          <h5 className="mb-3 text-center">Offices</h5>
          <Tabs
            activeKey={activeOfficeTab}
            onSelect={(k) => setActiveOfficeTab(k)}
            className="px-2"
            justify
          >
            {officeTabs.map((office) => (
              <Tab eventKey={office} title={office} key={office}>
                <div className="p-3">
                  {renderEmployeeGrid(
                    officeEmployees,
                    officeLoading,
                    `No employees in "${office}".`,
                    officePage,
                    setOfficePage
                  )}
                </div>
              </Tab>
            ))}
          </Tabs>
        </div>

        {/* Right: Attendance Type */}
        <div style={{ flex: 1, minWidth: "300px", overflowY: "auto" }}>
          <h5 className="mb-3 text-center">Attendance Type</h5>
          <Tabs
            activeKey={attendanceTab}
            onSelect={(k) => setAttendanceTab(k)}
            className="px-2"
            justify
          >
            <Tab eventKey="site" title="Site Visit">
              <div className="p-3">
                {renderEmployeeGrid(
                  siteEmployees,
                  siteLoading,
                  "No site-visit employees.",
                  sitePage,
                  setSitePage
                )}
              </div>
            </Tab>
            <Tab eventKey="wfh" title="WFH">
              <div className="p-3">
                {renderEmployeeGrid(
                  wfhEmployees,
                  wfhLoading,
                  "No WFH employees.",
                  wfhPage,
                  setWfhPage
                )}
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </Container>
  );
}
