"use strict";
const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const { streamTranslation } = require("./translate.cjs");
const UNAUTHORIZED_ERROR = /401/;
const EMPTY_RESPONSE_ERROR = /未返回/;

async function serverFixture(t, handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    model: "fixture",
    apiKey: "fixture-key",
    sourceLanguage: "auto",
    targetLanguage: "Chinese",
  };
}

async function collect(config, signal = new AbortController().signal) {
  let output = "";
  for await (const delta of streamTranslation("Hello", signal, config)) {
    output += delta;
  }
  return output;
}

test("uses GUI configuration for authenticated streamed translation", async (t) => {
  let received;
  const config = await serverFixture(t, async (request, response) => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }
    received = {
      url: request.url,
      authorization: request.headers.authorization,
      body: JSON.parse(body),
    };
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write('data: {"choices":[{"delta":{"content":"你"}}]}\r\n\r\n');
    response.end(
      'data: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n'
    );
  });
  assert.equal(await collect(config), "你好");
  assert.equal(received.url, "/v1/chat/completions");
  assert.equal(received.authorization, "Bearer fixture-key");
  assert.equal(received.body.model, "fixture");
  assert.equal(
    JSON.parse(received.body.messages[1].content).selectedText,
    "Hello"
  );
});

test("reports authentication errors without leaking the key", async (t) => {
  const config = await serverFixture(t, (_request, response) => {
    response.writeHead(401);
    response.end("Unauthorized");
  });
  await assert.rejects(collect(config), UNAUTHORIZED_ERROR);
});

test("rejects an empty stream instead of reporting a successful connection", async (t) => {
  const config = await serverFixture(t, (_request, response) => {
    response.writeHead(200);
    response.end("data: [DONE]\n\n");
  });
  await assert.rejects(collect(config), EMPTY_RESPONSE_ERROR);
});

test("aborts a superseded translation", async (t) => {
  const config = await serverFixture(t, () => {
    // Leave the request pending until cancellation.
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(collect(config, controller.signal), {
    name: "AbortError",
  });
});
