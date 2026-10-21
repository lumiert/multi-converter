'use strict';
const { spawn } = require('node:child_process');

const FORMATS = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'opus'];
const MAX_BYTES = 25 * 1024 * 1024;

const CODECS = {
  mp3: ['-c:a', 'libmp3lame', '-q:a', '2'],
  wav: ['-c:a', 'pcm_s16le'],
  flac: ['-c:a', 'flac'],
  ogg: ['-c:a', 'libvorbis', '-q:a', '5'],
  aac: ['-c:a', 'aac', '-b:a', '192k'],
  m4a: ['-c:a', 'aac', '-b:a', '192k'],
  opus: ['-c:a', 'libopus', '-b:a', '128k'],
};

function isSupportedFormat(fmt) {
  return FORMATS.includes(String(fmt).toLowerCase());
}

function buildArgs(input, output, fmt) {
  const f = String(fmt).toLowerCase();
  if (!isSupportedFormat(f)) throw new Error(`Unsupported format: ${fmt}`);
  return ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn', ...CODECS[f], output];
}

function convert(input, output, fmt) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', buildArgs(input, output, fmt), { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(output) : reject(new Error(err.trim() || `ffmpeg exited ${code}`))));
  });
}

module.exports = { FORMATS, MAX_BYTES, isSupportedFormat, buildArgs, convert };
