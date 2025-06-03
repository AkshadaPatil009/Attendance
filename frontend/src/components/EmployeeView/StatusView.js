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

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const DEFAULT_PROFILE_IMAGE =
  "https://cdn.jsdelivr.net/gh/twbs/icons@1.10.0/icons/person-circle.svg";
const ITEMS_PER_PAGE = 6;

export default function StatusView() {
  const [officeTabs, setOfficeTabs] = useState([]);               // e.g. ["RO", "MO", "RSO", …]
  const [activeOfficeTab, setActiveOfficeTab] = useState(null);  // which office is currently selected

  // When you select an office tab, this holds ALL employees for that office
  const [officeEmployees, setOfficeEmployees] = useState([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officePage, setOfficePage] = useState(1);

  // We'll store { present, total } for each office in state:
  //    { "RO": { present: 10, total: 25 }, "MO": { present:  8, total: 20 }, … }
  const [officeCounts, setOfficeCounts] = useState({});

  // ----------------------------------------------------------------
  // These next pieces are unchanged: “site” vs. “wfh” attendance tabs
  // ----------------------------------------------------------------
  const [attendanceTab, setAttendanceTab] = useState("site");
  const [siteEmployees, setSiteEmployees] = useState([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const [sitePage, setSitePage] = useState(1);

  const [wfhEmployees, setWfhEmployees] = useState([]);
  const [wfhLoading, setWfhLoading] = useState(false);
  const [wfhPage, setWfhPage] = useState(1);

  // -----------------------------------------------------------------------------
  // 1) On initial mount, fetch list of office names (“nickoffices”), then immediately
  //    fetch `/api/office-status?office=<officeName>` for each office to compute counts.
  // -----------------------------------------------------------------------------
  useEffect(() => {
    axios
      .get(`${API_URL}/api/nickoffices`)
      .then((res) => {
        const offices = res.data || [];
        setOfficeTabs(offices);

        if (offices.length) {
          setActiveOfficeTab(offices[0]);
        }

        // For each office name, call `/api/office-status?office=<office>`
        // to grab ALL employees in that office, then compute present/total.
        offices.forEach((office) => {
          axios
            .get(`${API_URL}/api/office-status`, { params: { office } })
            .then((countRes) => {
              const allEmps = countRes.data || [];
              const presentCount = allEmps.filter(
                (e) => e.status.toLowerCase() === "online"
              ).length;
              const totalCount = allEmps.length;

              setOfficeCounts((prev) => ({
                ...prev,
                [office]: { present: presentCount, total: totalCount },
              }));
            })
            .catch((err) => {
              console.error(`Error fetching /office-status for "${office}":`, err);
              // If there’s an error, default to 0/0
              setOfficeCounts((prev) => ({
                ...prev,
                [office]: { present: 0, total: 0 },
              }));
            });
        });
      })
      .catch((err) => {
        console.error("Error fetching nickoffices:", err);
        setOfficeTabs([]);
      });
  }, []);

  // -----------------------------------------------------------------------------
  // 2) Whenever `activeOfficeTab` changes, re‐fetch `/api/office-status` to render cards
  //    and also update that office’s “present/total” in state (in case someone clocked
  //    in or out since initial load).
  // -----------------------------------------------------------------------------
  useEffect(() => {
    if (!activeOfficeTab) return;

    setOfficeLoading(true);
    setOfficePage(1);

    axios
      .get(`${API_URL}/api/office-status`, {
        params: { office: activeOfficeTab },
      })
      .then((res) => {
        const allEmps = res.data || [];
        setOfficeEmployees(allEmps);

        // Re‐compute present/total based on this fresh payload:
        const presentCount = allEmps.filter(
          (e) => e.status.toLowerCase() === "online"
        ).length;
        const totalCount = allEmps.length;

        setOfficeCounts((prev) => ({
          ...prev,
          [activeOfficeTab]: { present: presentCount, total: totalCount },
        }));
      })
      .catch((err) => {
        console.error(
          `Error fetching office-status for "${activeOfficeTab}":`,
          err
        );
        setOfficeEmployees([]);
      })
      .finally(() => {
        setOfficeLoading(false);
      });
  }, [activeOfficeTab]);

  // -----------------------------------------------------------------------------
  // 3) Fetch “site” attendance when that tab is selected (unchanged)
  // -----------------------------------------------------------------------------
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
        console.error("Error fetching site-status:", err);
        setSiteEmployees([]);
      })
      .finally(() => {
        setSiteLoading(false);
      });
  }, [attendanceTab]);

  // -----------------------------------------------------------------------------
  // 4) Fetch “wfh” attendance when that tab is selected (unchanged)
  // -----------------------------------------------------------------------------
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
        console.error("Error fetching wfh-status:", err);
        setWfhEmployees([]);
      })
      .finally(() => {
        setWfhLoading(false);
      });
  }, [attendanceTab]);

  // --------------------------------------------------------------------
  // Utility: decide which <img> src to use for each employee
  // --------------------------------------------------------------------
  const getProfileSrc = (emp) => {
    if (emp.photo_url && emp.photo_url.startsWith("http")) {
      return emp.photo_url;
    }
    if (emp.image_filename) {
      return `${API_URL}/uploads/${emp.image_filename}`;
    }
    return DEFAULT_PROFILE_IMAGE;
  };

  // --------------------------------------------------------------------
  // Unchanged: render a paginated grid of employee cards
  // --------------------------------------------------------------------
  const renderEmployeeGrid = (
    employees,
    loading,
    emptyMsg,
    currentPage,
    setPage
  ) => {
    if (loading) return <Spinner animation="border" />;

    if (!employees.length) {
      return <div>{emptyMsg}</div>;
    }

    const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
    const paginated = employees.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <>
        <Row xs={1} sm={2} md={3} className="g-4">
          {paginated.map((emp) => {
            const statusLower = emp.status.toLowerCase();
            let bgColor = "white";
            if (statusLower === "offline") {
              bgColor = "#fa6349";
            } else if (statusLower === "absent") {
              bgColor = "pink";
            } else if (statusLower === "online") {
              if (emp.location !== "Office" && emp.location !== "WFH") {
                bgColor = "yellow";
              } else {
                bgColor = "lightgreen";
              }
            }

            return (
              <Col key={emp.name} className="d-flex justify-content-center">
                <div
                  style={{
                    width: "270px",
                    height: "270px",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <Card style={{ height: "100%" }} className="d-flex flex-column">
                    <div
                      style={{
                        flex: 6,
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
                        flex: 4,
                        padding: "0.5rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        overflow: "hidden",
                        wordBreak: "break-word",
                        backgroundColor: bgColor,
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
            );
          })}
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

  // --------------------------------------------------------------------
  // Render everything: “Offices” tabs on the left, “Attendance Type” on right
  // --------------------------------------------------------------------
  return (
    <Container fluid className="p-0" style={{ height: "120vh" }}>
      <div className="d-flex gap-4 flex-wrap h-100">
        {/* ============== Left: Offices ============== */}
        <div style={{ flex: 1, minWidth: "300px", overflowY: "auto" }}>
          <h5 className="mb-3 text-center">Offices</h5>
          <Tabs
            activeKey={activeOfficeTab}
            onSelect={(k) => setActiveOfficeTab(k)}
            className="px-2"
            justify
          >
            {officeTabs.map((office) => {
              // If we don’t yet have counts for this office, show “(0/0)”
              const counts = officeCounts[office] || { present: 0, total: 0 };
              const titleText = `${office} (${counts.present}/${counts.total})`;

              return (
                <Tab eventKey={office} title={titleText} key={office}>
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
              );
            })}
          </Tabs>
        </div>

        {/* ============== Right: Attendance Type ============== */}
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
