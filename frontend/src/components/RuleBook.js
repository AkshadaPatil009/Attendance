// src/components/RuleBook.js
import React, { useState, useEffect } from "react";
import { Button, Form, ListGroup, Modal, Row, Col } from "react-bootstrap";

export default function RuleBook({ user }) {
  const [rules, setRules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [text, setText] = useState("");
  const [order, setOrder] = useState(1);

  // Load on mount
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("companyRules")) || [];
    setRules(stored);
  }, []);

  // Save helper
  const saveRules = (newRules) => {
    localStorage.setItem("companyRules", JSON.stringify(newRules));
    setRules(newRules);
  };

  const handleAdd = () => {
    setEditIndex(null);
    setText("");
    setOrder(rules.length + 1);
    setShowModal(true);
  };

  const handleEdit = (idx) => {
    setEditIndex(idx);
    setText(rules[idx]);
    setOrder(idx + 1);
    setShowModal(true);
  };

  const handleDelete = (idx) => {
    const updated = rules.filter((_, i) => i !== idx);
    saveRules(updated);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Build new array with insertion or replacement
    let updated;
    if (editIndex === null) {
      // Insert new rule at order-1
      updated = [
        ...rules.slice(0, order - 1),
        trimmed,
        ...rules.slice(order - 1),
      ];
    } else {
      // Remove original
      const without = rules.filter((_, i) => i !== editIndex);
      // Insert updated text at new position
      updated = [
        ...without.slice(0, order - 1),
        trimmed,
        ...without.slice(order - 1),
      ];
    }

    saveRules(updated);
    setShowModal(false);
  };

  const isAdmin = user.role === 4;

  return (
    <div className="p-4">
      <h3>Company Rule Book</h3>
      <p><strong>Total Rules:</strong> {rules.length}</p>

      {isAdmin && (
        <Button className="mb-3" onClick={handleAdd}>
          + Add New Rule
        </Button>
      )}

      <ListGroup className="mb-4">
        {rules.length === 0 && (
          <ListGroup.Item className="text-muted">
            No rules defined yet.
          </ListGroup.Item>
        )}
        {rules.map((rule, idx) => (
          <ListGroup.Item
            key={idx}
            className="d-flex justify-content-between align-items-start"
          >
            <div>
              <strong>{idx + 1}.</strong> {rule}
            </div>
            {isAdmin && (
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleEdit(idx)}
                >
                  Edit
                </Button>{" "}
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDelete(idx)}
                >
                  Delete
                </Button>
              </div>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editIndex === null ? "Add Rule" : "Edit Rule"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group controlId="ruleOrder">
                  <Form.Label>Rule #</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={editIndex === null ? rules.length + 1 : rules.length}
                    value={order}
                    onChange={(e) =>
                      setOrder(Math.max(1, Math.min(rules.length + 1, Number(e.target.value))))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group controlId="ruleText">
                  <Form.Label>Rule Text</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!text.trim()}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
