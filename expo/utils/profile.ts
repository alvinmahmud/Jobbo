// Conservative header-only heuristic, not a general-purpose name parser.
// Parsed names remain editable before the profile is saved.
export function extractResumeFirstName(resume: string): string {
  const lines = resume.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
  const labeled = lines.find((line) => /^(?:full\s+name|first\s+name|name)\s*:/i.test(line));
  const candidate = (labeled ? labeled.replace(/^[^:]+:\s*/, "") : lines[0] ?? "").trim();
  const words = candidate.split(/\s+/);
  if (!labeled && (words.length < 2 || words.length > 4)) return "";
  if (!words.every((word) => /^[\p{L}][\p{L}\p{M}'’\-]*$/u.test(word))) return "";
  if (!labeled && !words.every((word) => /^\p{Lu}/u.test(word))) return "";
  if (/\b(resume|résumé|curriculum|vitae|summary|profile|experience|education|skills|engineer|engineering|developer|designer|manager|senior|junior|software|frontend|backend|full|stack|data|product|contact|details|unknown)\b/i.test(candidate)) return "";
  const firstName = words[0];
  return firstName === firstName.toUpperCase()
    ? firstName.charAt(0) + firstName.slice(1).toLowerCase()
    : firstName;
}

export function getWelcomeMessage(firstName?: string): string {
  const name = firstName?.trim().split(/\s+/)[0];
  return name ? `Welcome, ${name}!` : "Welcome!";
}
