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
const { YOUTUBE_FORMATS, isYouTubeUrl, downloadYouTube } = require('./youtube');

const CHANNEL = process.env.AUDIO_CHANNEL || 'audio-converter';
const SELECTION_TTL = 15 * 60 * 1000;
const pendingSelections = new Map();

function removeExpiredSelections() {
  const now = Date.now();
  for (const [id, selection] of pendingSelections) {
    if (selection.expiresAt <= now) pendingSelections.delete(id);
  }
}

function extractYouTubeUrl(content) {
  const candidate = String(content || '').match(/https?:\/\/[^\s<>]+/i)?.[0]?.replace(/[),.!?]+$/, '');
  return candidate && isYouTubeUrl(candidate) ? candidate : null;
}

async function handle(msg) {
  if (msg.author.bot || msg.channel.name !== CHANNEL) return;

  const youtubeUrl = extractYouTubeUrl(msg.content);
  if (youtubeUrl) {
    removeExpiredSelections();
    const customId = `youtube:${randomUUID()}`;
    pendingSelections.set(customId, {
      kind: 'youtube',
      url: youtubeUrl,
      userId: msg.author.id,
      channelId: msg.channel.id,
      expiresAt: Date.now() + SELECTION_TTL,
    });
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Escolha o formato de saída')
      .addOptions(Object.entries(YOUTUBE_FORMATS).map(([value, format]) => ({
        label: format.label,
        value,
      })));
    return msg.reply({
      content: 'Link do YouTube detectado. Como você quer converter?',
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  }

  const att = msg.attachments.first();
  if (!att) return;
  if (att.size > MAX_BYTES) return msg.reply('Arquivo muito grande (máximo de 25 MB).');
  removeExpiredSelections();
  const customId = `convert:${randomUUID()}`;
  pendingSelections.set(customId, {
    kind: 'audio',
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
  if (!interaction.isStringSelectMenu()
    || (!interaction.customId.startsWith('convert:') && !interaction.customId.startsWith('youtube:'))) return;

  removeExpiredSelections();
  const selection = pendingSelections.get(interaction.customId);
  if (!selection) {
    return interaction.reply({ content: 'Este menu expirou. Envie o link/arquivo novamente.', ephemeral: true });
  }
  if (interaction.user.id !== selection.userId || interaction.channelId !== selection.channelId) {
    return interaction.reply({ content: 'Somente quem enviou o link/arquivo pode escolher o formato.', ephemeral: true });
  }

  const chosen = interaction.values[0];
  if (selection.kind === 'youtube' && !Object.hasOwn(YOUTUBE_FORMATS, chosen)) {
    return interaction.reply({ content: 'Formato de YouTube não suportado.', ephemeral: true });
  }
  if (selection.kind !== 'youtube' && !FORMATS.includes(chosen)) {
    return interaction.reply({ content: 'Formato de saída não suportado.', ephemeral: true });
  }

  pendingSelections.delete(interaction.customId);
  await interaction.deferUpdate();
  const label = selection.kind === 'youtube' ? YOUTUBE_FORMATS[chosen].label : chosen.toUpperCase();
  await interaction.message.edit({ content: `Processando: ${label}…`, components: [] });

  let dir;
  try {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-'));
    let output;
    if (selection.kind === 'youtube') {
      output = await downloadYouTube(selection.url, chosen, dir);
    } else {
      const input = path.join(dir, 'input');
      const res = await fetch(selection.attachment.url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      await fs.writeFile(input, Buffer.from(await res.arrayBuffer()));
      const base = path.parse(selection.attachment.name || 'audio').name || 'audio';
      output = path.join(dir, `${base}.${chosen}`);
      await convert(input, output, chosen);
    }

    const stat = await fs.stat(output);
    if (stat.size > MAX_BYTES) {
      throw new Error('O arquivo convertido ultrapassa 25 MB, limite configurado para envio pelo bot no Discord.');
    }
    await interaction.followUp({ files: [new AttachmentBuilder(output)] });
    await interaction.message.edit({ content: `Concluído: ${label}`, components: [] });
  } catch (e) {
    await interaction.followUp({ content: `Falha na conversão: ${String(e.message).slice(0, 1200)}` });
    await interaction.message.edit({ content: `Falha: ${label}`, components: [] }).catch(() => {});
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
