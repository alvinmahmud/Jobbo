const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const compiled = ts.transpileModule(readFileSync(path.join(__dirname, "../utils/profile.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helpers = {};
new Function("exports", compiled)(helpers);
const { extractResumeFirstName, getWelcomeMessage } = helpers;

test("greeting defaults safely for new and existing profiles", () => {
  assert.equal(getWelcomeMessage(), "Welcome!");
  assert.equal(getWelcomeMessage("  "), "Welcome!");
  assert.equal(getWelcomeMessage(" Jane "), "Welcome, Jane!");
  assert.equal(getWelcomeMessage("Jane Doe"), "Welcome, Jane!");
});

test("recognizes plausible resume name headers and explicit name labels", () => {
  assert.equal(extractResumeFirstName("Jane Doe\njane@example.com\nSoftware Engineer"), "Jane");
  assert.equal(extractResumeFirstName("\nALVIN MAHMUD\nReact developer"), "Alvin");
  assert.equal(extractResumeFirstName("Résumé\nName: José García\nSkills"), "José");
  assert.equal(extractResumeFirstName("First Name: Anne-Marie\nExperience"), "Anne-Marie");
  assert.equal(extractResumeFirstName("Full name: Mary O’Connor"), "Mary");
});

test("uncertain names and job headings leave the greeting anonymous", () => {
  for (const resume of ["", "Software Engineer\nReact", "Senior Developer", "Professional Summary", "Contact Details", "jane@example.com\nJane Doe", "5 years of experience", "Jane Doe | Engineer", "Name:", "unknown", "this is my resume"]) {
    assert.equal(extractResumeFirstName(resume), "", resume);
  }
});
