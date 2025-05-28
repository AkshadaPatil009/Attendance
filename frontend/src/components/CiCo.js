import React, { useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";

export default function CiCoEntry() {
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");

  const handleGo = () => {
    // decide which one was filled
    const payload = ci ? { type: "in", value: ci } : { type: "out", value: co };
    console.log("Submit:", payload);
    // TODO: POST to your API...
    setCi("");
    setCo("");
  };

  return (
    <Container className="mt-4" style={{ maxWidth: "400px" }}>
      <Row>
        <Col>
          <Form.Group controlId="ciInput">
            <Form.Label>CI</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter check‐in"
              value={ci}
              onChange={e => setCi(e.target.value)}
              disabled={!!co}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group controlId="coInput">
            <Form.Label>CO</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter check‐out"
              value={co}
              onChange={e => setCo(e.target.value)}
              disabled={!!ci}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col className="text-center">
          <Button variant="primary" onClick={handleGo}>
            Go
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
