'use strict';
require('dotenv').config();
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  ActionRowBuilder,
  AttachmentBuilder,
  Client,
  GatewayIntentBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const { FORMATS, MAX_BYTES, convert } = require('./audio');

const CHANNEL = process.env.AUDIO_CHANNEL || 'audio-converter';
const SELECTION_TTL = 15 * 60 * 1000;
const pendingSelections = new Map();

function removeExpiredSelections() {
  const now = Date.now();
  for (const [id, selection] of pendingSelections) {
    if (selection.expiresAt <= now) pendingSelections.delete(id);
  }
}

async function handle(msg) {
  if (msg.author.bot || msg.channel.name !== CHANNEL) return;
  const att = msg.attachments.first();
  if (!att) return msg.reply('Attach an audio file to choose its output format.');
  if (att.size > MAX_BYTES) return msg.reply('File too large (max 25 MB).');
  removeExpiredSelections();
  const customId = `convert:${randomUUID()}`;
  pendingSelections.set(customId, {
    attachment: { url: att.url, name: att.name },
    userId: msg.author.id,
    channelId: msg.channel.id,
    expiresAt: Date.now() + SELECTION_TTL,
  });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('Choose an output format')
    .addOptions(FORMATS.map((format) => ({ label: format.toUpperCase(), value: format })));
  return msg.reply({
    content: 'Choose the output format:',
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function handleFormatSelection(interaction) {
  if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('convert:')) return;
  removeExpiredSelections();
  const selection = pendingSelections.get(interaction.customId);
  if (!selection) {
    return interaction.reply({ content: 'This format menu has expired. Upload the file again.', ephemeral: true });
  }
  if (interaction.user.id !== selection.userId || interaction.channelId !== selection.channelId) {
    return interaction.reply({ content: 'Only the person who uploaded this file can choose its format.', ephemeral: true });
  }
  const fmt = interaction.values[0];
  if (!FORMATS.includes(fmt)) {
    return interaction.reply({ content: 'Unsupported output format.', ephemeral: true });
  }
  pendingSelections.delete(interaction.customId);
  await interaction.deferUpdate();
  await interaction.message.edit({ content: `Converting to ${fmt.toUpperCase()}...`, components: [] });

  const { attachment } = selection;
  let dir;
  try {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-'));
    const input = path.join(dir, 'input');
    const res = await fetch(attachment.url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    await fs.writeFile(input, Buffer.from(await res.arrayBuffer()));
    const base = path.parse(attachment.name || 'audio').name || 'audio';
    const output = path.join(dir, `${base}.${fmt}`);
    await convert(input, output, fmt);
    await interaction.followUp({ files: [new AttachmentBuilder(output)] });
  } catch (e) {
    await interaction.followUp({ content: `Conversion failed: ${String(e.message).slice(0, 500)}` });
  } finally {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
}

function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN não definido. Crie um arquivo .env na raiz do projeto com DISCORD_TOKEN=seu_token.');
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
  client.on('messageCreate', handle);
  client.on('interactionCreate', handleFormatSelection);
  client.login(token);
}

if (require.main === module) main();
