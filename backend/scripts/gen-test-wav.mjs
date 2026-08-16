// Generates a 3-second 440Hz sine wave WAV for endpoint testing.
import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 8000;
const seconds = 3;
const n = sampleRate * seconds;
const dataSize = n * 2;
const buf = Buffer.alloc(44 + dataSize);

buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(sampleRate, 24);
buf.writeUInt32LE(sampleRate * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);

for (let i = 0; i < n; i++) {
  const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 10000);
  buf.writeInt16LE(sample, 44 + i * 2);
}

const out = process.argv[2] || path.resolve(process.env.TEMP || '.', 'sonora-test.wav');
fs.writeFileSync(out, buf);
console.log(`wrote ${out} (${buf.length} bytes)`);