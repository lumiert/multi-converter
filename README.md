# multi-converter

Roadmap: Discord audio converter (ffmpeg) → FL Studio ⇄ Ableton → downloader. Web UI (Vercel) later.

## Audio converter bot (Discord)
Requires Node 18+ and `ffmpeg` on PATH.

Create a `.env` file in the project root (it is git-ignored):

```
DISCORD_TOKEN=your_bot_token
```

Then install and run, no extra parameters needed:

```
npm install
npm start
```
If `DISCORD_TOKEN` is missing, the bot exits with an error message.

In the `#audio-converter` channel (override with `AUDIO_CHANNEL`), upload an audio file and choose the output format from the menu (mp3, wav, flac, ogg, aac, m4a, opus). Enable the Message Content intent for the bot.

Never commit the bot token. The token shared in the original issue is public and must be reset in the Discord developer portal.
