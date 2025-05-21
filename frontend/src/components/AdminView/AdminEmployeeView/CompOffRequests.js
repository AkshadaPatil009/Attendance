// src/components/AdminEmployeeView/CompOffRequests.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CompOffRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
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

  // Prompt for how many to settle, then call API
  const settle = async (employee_id, leaveType, maxCount) => {
    // prompt user
    const input = window.prompt(
      `Enter number of "${leaveType.includes('Leave') ? 'Leave' : 'Cash'}" comp-offs to settle (1–${maxCount}):`,
      '1'
    );
    if (input === null) return; // user cancelled

    const count = parseInt(input, 10);
    if (isNaN(count) || count < 1 || count > maxCount) {
      return alert(`Please enter a whole number between 1 and ${maxCount}.`);
    }

    // confirm
    if (!window.confirm(`Settle ${count} of ${maxCount} comp-offs for this employee?`)) {
      return;
    }

    // call backend
    try {
      const resp = await axios.patch(`${API_URL}/api/comp-off-requests/settle`, {
        employee_id,
        leave_type: leaveType,
        count
      });
      alert(`Successfully settled ${resp.data.settledRows} comp-off(s).`);
      fetchRequests();
    } catch (err) {
      console.error('Settle error', err);
      alert('Could not mark as settled.');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) return <p>Loading data…</p>;
  if (error)   return <p className="text-red-600">{error}</p>;

  const leaveReqs = requests.filter(r => r.leaveCount > 0);
  const cashReqs  = requests.filter(r => r.cashCount  > 0);

  // Reusable table section
  const Table = ({ title, rows, countKey, leaveType }) => (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p>No records.</p>
      ) : (
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Employee ID</th>
              <th className="px-4 py-2 border">Employee Name</th>
              <th className="px-4 py-2 border">{title.split('(')[1].replace(')', '')} Count</th>
              <th className="px-4 py-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${leaveType}-${r.employee_id}`}>
                <td className="px-4 py-2 border text-center">{r.employee_id}</td>
                <td className="px-4 py-2 border">{r.employeeName}</td>
                <td className="px-4 py-2 border text-center">{r[countKey]}</td>
                <td className="px-4 py-2 border text-center">
                  <button
                    onClick={() => settle(r.employee_id, leaveType, r[countKey])}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Settle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  return (
    <div className="p-4">
      <Table
        title="Comp Off (Leave) Summary"
        rows={leaveReqs}
        countKey="leaveCount"
        leaveType="Compensatory Off(Leave)"
      />
      <Table
        title="Comp Off (Cash) Summary"
        rows={cashReqs}
        countKey="cashCount"
        leaveType="Compensatory Off(Cash)"
      />
    </div>
  );
};

export default CompOffRequests;
