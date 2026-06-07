# Discord Welcome Bot

A simple Discord bot built with Node.js and discord.js that welcomes new members to your server.

## Features

- 🎉 Welcome message when members join
- 📝 Welcome command
- 🏓 Ping command
- ❓ Help command
- 🎨 Embed messages

## Setup

### Prerequisites
- Node.js 16+
- Discord Bot Token
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nooblu988-byte/welcome.git
cd welcome
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file and add your bot token:
```
TOKEN=your_discord_bot_token_here
PREFIX=!
```

4. Run the bot:
```bash
npm start
```

### For Development
```bash
npm run dev
```

## Commands

- `!welcome` - Shows welcome message
- `!ping` - Shows bot latency
- `!help` - Shows all commands

## How to Get Your Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" section and click "Add Bot"
4. Copy the token and paste it in `.env`
5. Enable the following intents:
   - GUILD_MEMBERS
   - MESSAGE_CONTENT
   - GUILDS

## Inviting the Bot

Use this URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot
```

Replace `YOUR_CLIENT_ID` with your bot's client ID from the Developer Portal.

## License

MIT
