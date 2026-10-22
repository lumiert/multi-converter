'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const YOUTUBE_FORMATS = {
  mp3_320: {
    label: 'MP3 — 320 kbps',
    extension: 'mp3',
    args: ['--extract-audio', '--audio-format', 'mp3', '--audio-quality', '320K', '--format', 'bestaudio/best'],
  },
  mp4_480: {
    label: 'MP4 — 480p',
    extension: 'mp4',
    args: ['--format', 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b[height<=480]', '--merge-output-format', 'mp4'],
  },
  mp4_720: {
    label: 'MP4 — 720p',
    extension: 'mp4',
    args: ['--format', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]', '--merge-output-format', 'mp4'],
  },
  mp4_1080: {
    label: 'MP4 — 1080p',
    extension: 'mp4',
    args: ['--format', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b[height<=1080]', '--merge-output-format', 'mp4'],
  },
};

function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)
      && ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('yt-dlp não encontrado. Instale o yt-dlp no servidor e tente novamente.'));
      } else {
        reject(error);
      }
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().slice(-1500) || `yt-dlp terminou com código ${code}`));
    });
  });
}

async function downloadYouTube(url, formatKey, directory) {
  if (!isYouTubeUrl(url)) throw new Error('Envie um link válido do YouTube.');
  const format = YOUTUBE_FORMATS[formatKey];
  if (!format) throw new Error('Formato de YouTube não suportado.');

  await fs.mkdir(directory, { recursive: true });
  const outputTemplate = path.join(directory, '%(id)s.%(ext)s');
  await runYtDlp([
    '--no-playlist',
    '--no-warnings',
    '--restrict-filenames',
    '--output', outputTemplate,
    ...format.args,
    url,
  ]);

  const files = await fs.readdir(directory);
  const outputName = files.find((name) => path.extname(name).toLowerCase() === `.${format.extension}`);
  if (!outputName) throw new Error('O yt-dlp terminou, mas não encontrei o arquivo convertido.');
  return path.join(directory, outputName);
}

module.exports = { YOUTUBE_FORMATS, isYouTubeUrl, downloadYouTube };
