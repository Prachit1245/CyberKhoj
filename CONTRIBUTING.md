# Contributing to CyberKhoj

Thank you for helping make CyberKhoj better for the bug bounty community! 🙏

## How To Contribute

- 🐛 Report bugs by opening a GitHub Issue
- 💡 Suggest features via GitHub Issues
- 🔧 Submit Pull Requests with improvements
- 📋 Add new payloads to the payload library
- 📚 Add new cheat sheet content
- 📝 Improve the documentation
- 📣 Share CyberKhoj with other bug bounty hunters

## Code Style Guidelines

- TypeScript strictly typed — no `any` types
- Tailwind CSS only for all styling
- Keep components small and focused
- Add comments for any complex logic
- All async functions must have error handling
- No hardcoded API keys anywhere in code

## About This Project

This project was built using [Lovable](https://lovable.dev), an AI-powered app builder.
We are proud of this and do not hide it. AI tools are a normal part of modern software development.

## Pull Request Process

1. Make sure the app builds with no errors (`npm run build`)
2. Test all features you touched manually
3. Update README if you add new features
4. Keep pull requests focused and small
5. Describe what you changed and why in the PR description

## Setting Up Locally

```bash
git clone https://github.com/yourusername/cyberkhoj.git
cd cyberkhoj
npm install
npm run dev
```

You'll need a free Groq API key from [console.groq.com](https://console.groq.com) to test AI features.

## ⚠️ Ethical Reminder

All contributions must be for **defensive and authorized security testing** purposes only.
