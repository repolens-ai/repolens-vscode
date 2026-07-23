import * as assert from "assert";

suite("executable", () => {
  test("getUnsupportedPlatform returns null when REPOLENSY_EXECUTABLE is set", () => {
    const original = process.env.REPOLENSY_EXECUTABLE;
    process.env.REPOLENSY_EXECUTABLE = "/custom/path";
    const { getUnsupportedPlatform } = require("./executable");
    const result = getUnsupportedPlatform();
    assert.strictEqual(result, null);
    if (original === undefined) {
      delete process.env.REPOLENSY_EXECUTABLE;
    } else {
      process.env.REPOLENSY_EXECUTABLE = original;
    }
  });

  test("getExecutablePath returns REPOLENSY_EXECUTABLE when set", () => {
    const original = process.env.REPOLENSY_EXECUTABLE;
    process.env.REPOLENSY_EXECUTABLE = "/custom/repolens";
    const { getExecutablePath } = require("./executable");
    const result = getExecutablePath();
    assert.strictEqual(result, "/custom/repolens");
    if (original === undefined) {
      delete process.env.REPOLENSY_EXECUTABLE;
    } else {
      process.env.REPOLENSY_EXECUTABLE = original;
    }
  });
});
