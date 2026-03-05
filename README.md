# GERY — Vermögensübersicht

Personal investment tracker with live crypto prices, tax timer, and AI analysis.

## Deploy to Netlify

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/gery-tracker.git
git push -u origin main
```

### 2. Connect to Netlify
1. Go to [netlify.com](https://netlify.com) → New site from Git
2. Connect your GitHub repo
3. Build settings: leave empty (no build command needed)
4. Publish directory: `.` (root)
5. Click **Deploy site**

### 3. Set API Key (required for AI features)
1. In Netlify: **Site settings → Environment variables**
2. Add variable: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
3. Redeploy (Deploys → Trigger deploy)

## Features
- 📧 Email/text import (AI-powered)
- 📄 PDF import (AI-powered)
- 📊 CSV import
- 💹 Live crypto prices via CoinGecko (free, no key needed)
- ⏱ German tax timer (§23 EStG)
- 🔔 Price alerts
- 👫 Household sharing
- 🔒 SHA-256 password hashing
- 🌍 DE/EN language toggle
