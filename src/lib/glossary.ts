export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  IDOR: {
    term: "IDOR",
    definition:
      "Insecure Direct Object Reference — when an app lets you access someone else's data just by changing an ID in the URL. Like changing ?id=1 to ?id=2 to see another user's profile.",
  },
  SSRF: {
    term: "SSRF",
    definition:
      "Server-Side Request Forgery — tricking a server into making requests to internal systems it shouldn't access. Like making a website fetch data from its own private network.",
  },
  SQLi: {
    term: "SQLi",
    definition:
      "SQL Injection — inserting malicious database commands into input fields. Like typing a special string into a search box that makes the database leak all its data.",
  },
  XSS: {
    term: "XSS",
    definition:
      "Cross-Site Scripting — injecting malicious scripts into web pages that other users see. Like putting JavaScript code in a comment that steals cookies when someone reads it.",
  },
  CSRF: {
    term: "CSRF",
    definition:
      "Cross-Site Request Forgery — tricking a logged-in user into performing actions they didn't intend. Like a hidden form that transfers money when you visit a malicious page.",
  },
  JWT: {
    term: "JWT",
    definition:
      "JSON Web Token — a compact token used for authentication. Attacks target weak signing, missing expiration, or algorithm confusion to forge valid tokens.",
  },
  RCE: {
    term: "RCE",
    definition:
      "Remote Code Execution — the ability to run arbitrary commands on a server remotely. One of the most critical vulnerabilities — it gives an attacker full control.",
  },
  LFI: {
    term: "LFI",
    definition:
      "Local File Inclusion — tricking a server into reading files it shouldn't expose. Like changing a filename parameter to read /etc/passwd or configuration files.",
  },
  SSTI: {
    term: "SSTI",
    definition:
      "Server-Side Template Injection — injecting code into server-side templates. Can lead to remote code execution by exploiting how the server renders dynamic content.",
  },
  CORS: {
    term: "CORS",
    definition:
      "Cross-Origin Resource Sharing — a browser security feature. Misconfigured CORS can let malicious websites read data from your app's API on behalf of logged-in users.",
  },
};

/** All glossary terms sorted longest-first for greedy regex matching */
export const GLOSSARY_TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

/** Regex that matches any glossary term as a whole word */
export const GLOSSARY_REGEX = new RegExp(`\\b(${GLOSSARY_TERMS.join("|")})\\b`, "g");
