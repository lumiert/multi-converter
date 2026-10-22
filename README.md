# multi-converter

Discord bot for converting uploaded audio files and YouTube links.

## Requirements

- Node.js 18+
- FFmpeg available on `PATH`
- yt-dlp available on `PATH` (for YouTube links only)

On Ubuntu/Debian, install FFmpeg and yt-dlp. The yt-dlp version from the OS repository may be outdated; use the official yt-dlp installation instructions if YouTube changes break downloads.

```bash
sudo apt update
sudo apt install -y ffmpeg
python3 -m pip install --user -U yt-dlp
```

Ensure the user running Node can execute `yt-dlp --version` and `ffmpeg -version`. If `pip` reports an externally-managed-environment error, use the official yt-dlp standalone binary or pipx instead of forcing a system-wide pip install.

## Setup

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token
# Optional; defaults to downloader
AUDIO_CHANNEL=audio-converter
```

Then install and run:

```bash
npm install
npm start
```

Enable the **Message Content Intent** in Discord Developer Portal → your application → Bot.

## Usage

In the configured channel:

- Upload an audio file to choose an output format (MP3, WAV, FLAC, OGG, AAC, M4A, or OPUS).
- Send a YouTube video link to choose one of:
  - MP3 — 320 kbps
  - MP4 — 480p
  - MP4 — 720p
  - MP4 — 1080p

Only the person who sent the link/file can use its selection menu. Menus expire after 15 minutes. The bot is configured to send files up to 25 MiB; outputs larger than that are rejected with a message.

Use the bot only for content you own or are authorized to download, and comply with YouTube's terms and applicable copyright law.

Never commit the bot token. If a token has been exposed, reset it in the Discord Developer Portal.
