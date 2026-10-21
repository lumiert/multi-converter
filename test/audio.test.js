'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isSupportedFormat, buildArgs } = require('../src/audio');

test('supported formats', () => {
  assert.ok(isSupportedFormat('MP3'));
  assert.ok(!isSupportedFormat('exe'));
});
test('buildArgs', () => {
  const a = buildArgs('in', 'out.flac', 'flac');
  assert.deepStrictEqual(a.slice(-3), ['-c:a', 'flac', 'out.flac']);
  assert.throws(() => buildArgs('in', 'out', 'xyz'));
});
