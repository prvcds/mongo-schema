const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("./server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("accepts valid project feedback and returns a request ID", async () => {
  const response = await fetch(`${baseUrl}/api/projects/portfolio-site/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ author: "Ari", message: "Looks great", rating: 5 })
  });

  assert.equal(response.status, 201);
  assert.ok(response.headers.get("x-request-id"));
  assert.deepEqual(await response.json(), {
    projectId: "portfolio-site",
    feedback: { author: "Ari", message: "Looks great", rating: 5 }
  });
});

test("rejects an out-of-range rating with centralized error details", async () => {
  const response = await fetch(`${baseUrl}/api/projects/portfolio-site/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ author: "Ari", message: "Nice", rating: 6 })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, "Feedback validation failed");
  assert.match(body.error.details.join(" "), /rating must be an integer from 1 to 5/);
  assert.equal(body.error.requestId, response.headers.get("x-request-id"));
});

test("rejects whitespace-only feedback after trimming", async () => {
  const response = await fetch(`${baseUrl}/api/projects/portfolio-site/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ author: "Ari", message: "   ", rating: 4 })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error.details.join(" "), /message must be a non-empty string/);
});

test("returns a consistent error for malformed JSON", async () => {
  const response = await fetch(`${baseUrl}/api/projects/portfolio-site/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{"
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, "Request body must be valid JSON");
  assert.equal(body.error.requestId, response.headers.get("x-request-id"));
});
