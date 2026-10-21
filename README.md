# multi-converter

Roadmap: Discord audio converter (ffmpeg) → FL Studio ⇄ Ableton → downloader. Web UI (Vercel) later.

## Audio converter bot (Discord)
Requires Node 18+ and `ffmpeg` on PATH.

```
npm install
DISCORD_TOKEN=<your bot token> npm start
```
In the `#audio-converter` channel (override with `AUDIO_CHANNEL`), upload an audio file with a message containing the target format (mp3, wav, flac, ogg, aac, m4a, opus). Enable the Message Content intent for the bot.

Never commit the bot token. The token shared in the original issue is public and must be reset in the Discord developer portal.
