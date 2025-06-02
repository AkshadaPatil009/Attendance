import React, { useEffect, useState } from "react";
import { Tabs, Tab, Container, Spinner } from "react-bootstrap";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function DynamicTabsLayout() {
  // ─────────────────────────────────────────────────────────────────────────────
  // Office Tabs (left column)
  // ─────────────────────────────────────────────────────────────────────────────
  const [officeTabs, setOfficeTabs]         = useState([]);
  const [activeOfficeTab, setActiveOfficeTab] = useState(null);
  const [officeEmployees, setOfficeEmployees] = useState([]);
  const [officeLoading, setOfficeLoading]   = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Attendance Type Tabs (right column)
  // ─────────────────────────────────────────────────────────────────────────────
  const [attendanceTab, setAttendanceTab]   = useState("site");
  const [siteEmployees, setSiteEmployees]   = useState([]);
  const [siteLoading, setSiteLoading]       = useState(false);
  const [wfhEmployees, setWfhEmployees]     = useState([]);
  const [wfhLoading, setWfhLoading]         = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1) On mount: fetch list of distinct offices
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_URL}/api/nickoffices`)
      .then((res) => {
        setOfficeTabs(res.data);
        if (res.data.length > 0) {
          setActiveOfficeTab(res.data[0]);
        }
      })
      .catch((err) => {
        console.error("Error fetching offices:", err);
      });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) Whenever activeOfficeTab or attendanceTab changes:
  //    • Fetch /api/office-status?office=…   (always, if activeOfficeTab set)
  //    • If attendanceTab = "site", fetch /api/site-status
  //    • If attendanceTab = "wfh", fetch /api/wfh-status
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // (a) Fetch office-specific "home/absent" data
    if (activeOfficeTab) {
      setOfficeLoading(true);
      axios
        .get(`${API_URL}/api/office-status`, {
          params: { office: activeOfficeTab },
        })
        .then((res) => {
          setOfficeEmployees(res.data);
        })
        .catch((err) => {
          console.error("Error fetching office status:", err);
          setOfficeEmployees([]);
        })
        .finally(() => {
          setOfficeLoading(false);
        });
    }

    // (b) AttendanceTab = "site" → fetch all site‐visit employees
    if (attendanceTab === "site") {
      setSiteLoading(true);
      axios
        .get(`${API_URL}/api/site-status`)
        .then((res) => {
          setSiteEmployees(res.data);
        })
        .catch((err) => {
          console.error("Error fetching site status:", err);
          setSiteEmployees([]);
        })
        .finally(() => {
          setSiteLoading(false);
        });
    }

    // (c) AttendanceTab = "wfh" → fetch WFH employees
    if (attendanceTab === "wfh") {
      setWfhLoading(true);
      axios
        .get(`${API_URL}/api/wfh-status`)
        .then((res) => {
          setWfhEmployees(res.data);
        })
        .catch((err) => {
          console.error("Error fetching WFH status:", err);
          setWfhEmployees([]);
        })
        .finally(() => {
          setWfhLoading(false);
        });
    }
  }, [activeOfficeTab, attendanceTab]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Container className="mt-4">
      <div className="d-flex gap-4 flex-wrap">
        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Left Column: Dynamic Office Tabs                             */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h5 className="mb-3">Offices</h5>
          <Tabs
            activeKey={activeOfficeTab}
            onSelect={(k) => setActiveOfficeTab(k)}
            className="mb-3"
            justify
          >
            {officeTabs.map((office) => (
              <Tab eventKey={office} title={office} key={office}>
                <div className="p-3">
                  {officeLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : officeEmployees.length > 0 ? (
                    officeEmployees.map((emp) => (
                      <div
                        key={emp.name}
                        className="d-flex align-items-center mb-3"
                      >
                        <img
                          src={emp.photo_url}
                          alt={emp.name}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div className="ms-2">
                          <div>
                            <strong>{emp.name}</strong> ({emp.location})
                          </div>
                          <div>Status: {emp.status}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>No employees found for "{office}".</div>
                  )}
                </div>
              </Tab>
            ))}
          </Tabs>
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Right Column: Attendance Type Tabs                            */}
        {/*   - "Site Visit": all site‐visit employees                     */}
        {/*   - "WFH": all WFH employees                                   */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h5 className="mb-3">Attendance Type</h5>
          <Tabs
            activeKey={attendanceTab}
            onSelect={(k) => setAttendanceTab(k)}
            className="mb-3"
            justify
          >
            <Tab eventKey="site" title="Site Visit">
              <div className="p-3">
                {siteLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : siteEmployees.length > 0 ? (
                  siteEmployees.map((emp) => (
                    <div
                      key={emp.name}
                      className="d-flex align-items-center mb-3"
                    >
                      <img
                        src={emp.photo_url}
                        alt={emp.name}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div className="ms-2">
                        <div>
                          <strong>{emp.name}</strong> ({emp.location})
                        </div>
                        <div>Status: {emp.status}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>No site-visit employees found.</div>
                )}
              </div>
            </Tab>

            <Tab eventKey="wfh" title="WFH">
              <div className="p-3">
                {wfhLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : wfhEmployees.length > 0 ? (
                  wfhEmployees.map((emp) => (
                    <div
                      key={emp.name}
                      className="d-flex align-items-center mb-3"
                    >
                      <img
                        src={emp.photo_url}
                        alt={emp.name}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div className="ms-2">
                        <div>
                          <strong>{emp.name}</strong> ({emp.location})
                        </div>
                        <div>Status: {emp.status}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>No WFH employees found.</div>
                )}
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </Container>
  );
}
