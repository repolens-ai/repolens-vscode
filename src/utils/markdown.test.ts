import * as assert from "assert";

suite("markdown", () => {
  test("renderMarkdownMessage converts markdown to sanitized HTML", () => {
    const { renderMarkdownMessage } = require("./markdown");
    const result = renderMarkdownMessage("Hello **world**");
    assert.ok(result.includes("<strong>world</strong>"));
  });

  test("renderMarkdownMessage strips dangerous HTML", () => {
    const { renderMarkdownMessage } = require("./markdown");
    const result = renderMarkdownMessage('<script>alert("xss")</script>');
    assert.ok(!result.includes("<script>"));
  });
});
