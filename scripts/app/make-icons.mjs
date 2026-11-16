// 임시 아이콘 생성기: 파랑 바탕에 흰 "T". 외부 라이브러리 없이 PNG를 직접 만든다.
// 나중에 진짜 아이콘으로 바꿀 땐 public/icons/ 의 같은 이름 파일만 교체하면 된다.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x0f, 0x31, 0xb8];
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  // T 모양: 윗줄 가로막대 + 가운데 세로막대. 마스커블 안전영역을 위해 중앙 60% 안에 그린다.
  const u = size / 10;
  const inT = (x, y) =>
    (y >= 2.5 * u && y < 4 * u && x >= 2.5 * u && x < 7.5 * u) ||
    (y >= 4 * u && y < 7.5 * u && x >= 4.25 * u && x < 5.75 * u);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const [r, g, b] = inT(x, y) ? FG : BG;
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]]) {
  writeFileSync(`public/icons/${name}.png`, makePng(size));
}
console.log('아이콘 3개 생성 완료');
