// src/components/AdminEmployeeView/CompOffRequests.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button, Form, Spinner, Toast, ToastContainer } from 'react-bootstrap';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CompOffRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modalProps, setModalProps] = useState({ employee_id: null, leaveType: '', maxCount: 0 });
  const [inputCount, setInputCount] = useState(1);
  const [processing, setProcessing] = useState(false);
  

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const showToast = (message, variant = 'success') => {
    setToast({ show: true, message, variant });
    setTimeout(() => {
      setToast({ show: false, message: '', variant: 'success' });
    }, 3000);
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/api/comp-off-requests`);
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openModal = (employee_id, leaveType, maxCount) => {
    setModalProps({ employee_id, leaveType, maxCount });
    setInputCount(1);
    setShowModal(true);
  };

  const handleSettle = async () => {
    const { employee_id, leaveType, maxCount } = modalProps;
    if (inputCount < 1 || inputCount > maxCount) {
      return;
    }
    if (!window.confirm(`Settle ${inputCount} of ${maxCount} comp-offs?`)) {
      return;
    }

    setProcessing(true);
    try {
      const resp = await axios.patch(`${API_URL}/api/comp-off-requests/settle`, {
        employee_id,
        leave_type: leaveType,
        count: inputCount
      });
      showToast(`Successfully settled ${resp.data.settledRows} comp-off(s).`, 'success');
      fetchRequests();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      showToast('Could not mark as settled.', 'danger');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center vh-100 d-flex align-items-center justify-content-center">
        {error}
      </div>
    );
  }

  const leaveReqs = requests.filter(r => r.leaveCount > 0);
  const cashReqs = requests.filter(r => r.cashCount > 0);

  return (
    <div className="container-fluid p-3" style={{ height: '100vh' }}>
      <div className="row h-100 gx-3">

        {/* Leave Comp-Offs Card */}
        <div className="col-md-6 d-flex flex-column">
          <div className="card flex-fill">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Comp Off in Leave</h5>
            </div>
            <div className="card-body p-0 d-flex flex-column">
              <div className="table-responsive flex-fill" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className="table table-hover mb-0">
                  <thead className="table-primary text-white position-sticky top-0">
                    <tr>
                      <th>Employee Name</th>
                      <th className="text-center">Leave Count</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveReqs.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4">
                          No comp-off leave requests.
                        </td>
                      </tr>
                    ) : leaveReqs.map(r => (
                      <tr key={r.employee_id}>
                        <td className="align-middle">{r.employeeName}</td>
                        <td className="text-center align-middle">{r.leaveCount}</td>
                        <td className="text-center align-middle">
                          <button
                            onClick={() => openModal(r.employee_id, 'Compensatory Off(Leave)', r.leaveCount)}
                            className="btn btn-success btn-sm"
                          >
                            Settle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Comp-Offs Card */}
        <div className="col-md-6 d-flex flex-column">
          <div className="card flex-fill">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Comp Off in Cash</h5>
            </div>
            <div className="card-body p-0 d-flex flex-column">
              <div className="table-responsive flex-fill" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className="table table-hover mb-0">
                  <thead className="table-success text-white position-sticky top-0">
                    <tr>
                      <th>Employee Name</th>
                      <th className="text-center">Cash Count</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashReqs.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4">
                          No comp-off cash requests.
                        </td>
                      </tr>
                    ) : cashReqs.map(r => (
                      <tr key={r.employee_id}>
                        <td className="align-middle">{r.employeeName}</td>
                        <td className="text-center align-middle">{r.cashCount}</td>
                        <td className="text-center align-middle">
                          <button
                            onClick={() => openModal(r.employee_id, 'Compensatory Off(Cash)', r.cashCount)}
                            className="btn btn-success btn-sm"
                          >
                            Settle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Popup */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Settle {modalProps.leaveType}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="settleCount">
            <Form.Label>Enter number (1–{modalProps.maxCount})</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={modalProps.maxCount}
              value={inputCount}
              onChange={e => setInputCount(Number(e.target.value))}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSettle} disabled={processing}>
            {processing ? <Spinner as="span" animation="border" size="sm" /> : 'Settle'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <ToastContainer position="top-start" className="p-3">
        <Toast show={toast.show} bg={toast.variant} onClose={() => setToast({ ...toast, show: false })}>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default CompOffRequests;
