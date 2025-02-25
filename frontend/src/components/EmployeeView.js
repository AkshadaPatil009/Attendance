import React, { useState, useEffect } from "react";
import { Table, Container, Card, Row, Col } from "react-bootstrap";
import axios from "axios";

const EmployeeView = ({ userId }) => {
  const [usedLeaves, setUsedLeaves] = useState({ sickLeave: 0, plannedLeave: 0 });
  const [remainingLeaves, setRemainingLeaves] = useState({ sickLeave: 6, plannedLeave: 18 });

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/leaves/${userId}`);
        const leaveData = response.data;

        setUsedLeaves({
          sickLeave: leaveData.sick_leave_used,
          plannedLeave: leaveData.planned_leave_used,
        });

        setRemainingLeaves({
          sickLeave: leaveData.sick_leave_remaining,
          plannedLeave: leaveData.planned_leave_remaining,
        });
      } catch (error) {
        console.error("Error fetching leave data:", error);
      }
    };

    fetchLeaveData();
  }, [userId]);

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="shadow-lg p-4 border-0">
            <h4 className="fw-bold text-center text-primary">Leave Summary</h4>
            <hr />
            
            {/* Used Leaves */}
            <h5 className="fw-bold text-secondary">Used Leaves</h5>
            <Table bordered hover className="text-center">
              <tbody>
                <tr>
                  <td className="fw-semibold">Sick Leave</td>
                  <td className="text-danger">{usedLeaves.sickLeave}</td>
                </tr>
                <tr>
                  <td className="fw-semibold">Planned Leave</td>
                  <td className="text-danger">{usedLeaves.plannedLeave}</td>
                </tr>
              </tbody>
            </Table>

            {/* Remaining Leaves */}
            <h5 className="fw-bold text-secondary mt-4">Remaining Leaves</h5>
            <Table bordered hover className="text-center">
              <tbody>
                <tr>
                  <td className="fw-semibold">Sick Leave</td>
                  <td className="text-success">{remainingLeaves.sickLeave}</td>
                </tr>
                <tr>
                  <td className="fw-semibold">Planned Leave</td>
                  <td className="text-success">{remainingLeaves.plannedLeave}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeView;
