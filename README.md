# OTP Receiver Bot

A Telegram bot that receives OTPs from Premiumy.net and forwards them to a Telegram group.

## Features

- Automatically fetches OTPs from Premiumy.net numbers
- Forwards OTPs to a specified Telegram group
- Shows number status and information
- Real-time OTP monitoring

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the bot:
   - Open `config.js`
   - Replace `YOUR_PREMIUMY_API_KEY` with your actual Premiumy API key

3. Start the bot:
```bash
npm start
```

## Deployment Guide

### GitHub Deployment

1. Create a new repository on GitHub
2. Initialize git in your project:
```bash
git init
git add .
git commit -m "Initial commit"
```

3. Add your GitHub repository as remote:
```bash
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Render Deployment

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: otp-receiver-bot
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add Environment Variables:
   - TELEGRAM_BOT_TOKEN: Your Telegram bot token
   - TELEGRAM_GROUP_ID: Your Telegram group ID
   - PREMIUMY_API_KEY: Your Premiumy API key
6. Click "Create Web Service"

## Available Commands

- `/start` - Start the bot and get welcome message
- `/numbers` - List all your Premiumy numbers and their status

## Requirements

- Node.js 14 or higher
- Premiumy.net API key
- Telegram Bot Token
- Telegram Group ID

## How it Works

1. The bot checks for new messages every 30 seconds
2. When an OTP is received, it's automatically forwarded to the configured Telegram group
3. The message includes:
   - Phone number
   - Service name
   - OTP code
   - Timestamp

## Error Handling

The bot includes error handling for:
- API connection issues
- Invalid responses
- Telegram message sending failures

## Support

For any issues or questions, please contact the bot administrator. 