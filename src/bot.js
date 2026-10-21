'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { FORMATS, MAX_BYTES, isSupportedFormat, convert } = require('./audio');

const CHANNEL = process.env.AUDIO_CHANNEL || 'audio-converter';

async function handle(msg) {
  if (msg.author.bot || msg.channel.name !== CHANNEL) return;
  const att = msg.attachments.first();
  const fmt = msg.content.trim().toLowerCase().replace(/^\./, '');
  if (!att || !isSupportedFormat(fmt)) {
    return msg.reply(`Attach an audio file and write the target format: ${FORMATS.join(', ')}`);
  }
  if (att.size > MAX_BYTES) return msg.reply('File too large (max 25 MB).');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-'));
  try {
    const input = path.join(dir, 'input');
    const res = await fetch(att.url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    await fs.writeFile(input, Buffer.from(await res.arrayBuffer()));
    const base = path.parse(att.name || 'audio').name || 'audio';
    const output = path.join(dir, `${base}.${fmt}`);
    await convert(input, output, fmt);
    await msg.reply({ files: [new AttachmentBuilder(output)] });
  } catch (e) {
    await msg.reply(`Conversion failed: ${String(e.message).slice(0, 500)}`);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error('Set DISCORD_TOKEN in the environment.');
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
  client.on('messageCreate', handle);
  client.login(token);
}

if (require.main === module) main();
