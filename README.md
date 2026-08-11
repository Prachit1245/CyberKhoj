# CyberKhoj 🔍

### Nepal's First Free AI-Powered Bug Bounty Tool

> "Search. Find. Exploit Responsibly."

![CyberKhoj](https://img.shields.io/badge/CyberKhoj-Bug%20Bounty%20Tool-39ff14?style=for-the-badge)
![Free](https://img.shields.io/badge/Cost-100%25%20Free-39ff14?style=for-the-badge)
![Nepal](https://img.shields.io/badge/Made%20in-Nepal%20%F0%9F%87%B3%F0%9F%87%B5-red?style=for-the-badge)
![Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff6b6b?style=for-the-badge&logo=heart)

## What Is CyberKhoj?

CyberKhoj is a free open source bug bounty assistant that thinks like a hacker. Paste any URL or domain and instantly get AI-powered vulnerability attack paths, recon checklists, visual mind maps, and 100 hacker test ideas — completely free forever.

Built for the bug bounty community.  
By a developer from Nepal 🇳🇵

## Features

- 🔍 **URL Analyzer** — Paste any URL, get instant attack paths
- ⚔️ **Attack Mode** — Generate 100 hacker test ideas for any domain
- 🧠 **Mind Map** — Visual attack surface mapper
- 📋 **Payload Library** — 200+ ready-to-use payloads
- 🛰️ **Recon Dashboard** — Full recon toolkit in one place
- 🔎 **Google Dork Generator** — 30 targeted dorks per domain
- 🕵️ **JS Recon Analyzer** — Find secrets in JavaScript files
- 📚 **Cheat Sheets** — OWASP, SQLi, XSS, JWT and more
- 🐛 **Findings Tracker** — Log and track your bug bounty finds
- 🔒 **100% Private** — Your data never leaves your browser

## Live Demo

Visit: [cyberkhoj.prachitregmi.com.np](https://cyberkhoj.prachitregmi.com.np)

## Cost

**Completely free forever.**

- No subscription
- No credit card
- No server costs
- Uses your own free Groq API key (1,000 requests/day)
- Get your free key at: [console.groq.com](https://console.groq.com)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| AI | Groq API (Llama 3 70B) — free tier |
| Storage | localStorage only, no backend needed |
| Builder | [Lovable](https://lovable.dev) |
| Fonts | Syne + Share Tech Mono |

## Getting Started

### Use Online (Recommended)

1. Visit [cyberkhoj.prachitregmi.com.np](https://cyberkhoj.prachitregmi.com.np)
2. Get your free Groq API key at [console.groq.com](https://console.groq.com)
3. Paste your key and start hunting bugs

### Run Locally

```bash
git clone https://github.com/Prachit1245/CyberKhoj.git
cd cyberkhoj
npm install
npm run dev
```

## Security & Privacy

- ✅ API key encrypted before storing in localStorage
- ✅ Sensitive parameters auto-redacted before sending to AI
- ✅ No servers, no database, no tracking
- ✅ No data collection of any kind
- ✅ Full client-side application — everything runs in your browser

## ⚠️ Ethical Use Warning

CyberKhoj is built for **authorized security testing only**.

- Only test systems you own or have **explicit written permission** to test
- Follow responsible disclosure guidelines
- Use on bug bounty platforms: [HackerOne](https://hackerone.com), [Bugcrowd](https://bugcrowd.com)
- **Never** use on systems without permission
- The developer is not responsible for misuse

## Contributing

Contributions are welcome! This is an open source project built for the global bug bounty community.

1. Fork the repo
2. Create your feature branch
   ```bash
   git checkout -b feature/NewFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add NewFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/NewFeature
   ```
5. Open a Pull Request

### Ways To Contribute

- 🐛 Report bugs by opening an Issue
- 💡 Suggest new features via Issues
- 📋 Add new payloads to the payload library
- 📚 Add new cheat sheet content
- 📝 Improve documentation
- 📣 Share the tool with the bug bounty community

### Adding Payloads

Edit: `src/lib/payloads.ts` — follow the existing format exactly.

### Adding Cheat Sheets

Edit: `src/lib/cheatsheets.ts` — follow the existing format exactly.

## License

MIT License — free to use, modify, and distribute.  
See [LICENSE](LICENSE) for full details.

## Credits

- Built with [Lovable](https://lovable.dev) — the AI-powered full-stack app builder
- AI powered by [Groq](https://groq.com) — free and blazing-fast inference
- Inspired by the global bug bounty community
- Made with pride from Nepal 🇳🇵

---

⭐ **Star this repo if CyberKhoj helped you find your first bug!**
