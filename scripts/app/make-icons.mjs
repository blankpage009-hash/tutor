// 앱 아이콘 생성기: 앱의 진한 파란색(--accent #1a3fbf) 바탕 + 흰 음성 막대 5개 (막대 모양은 "Natter App Icon.html" 3C 시안).
// 외부 라이브러리 없이 PNG를 직접 만든다. 실행: node scripts/app/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// 바탕을 투명하게 두면 아이폰이 그 자리를 검게 채울 수 있어서 불투명한 꽉 찬 색으로 둔다
const BG = [0x1a, 0x3f, 0xbf];
const FG = [0xff, 0xff, 0xff];

// 시안 SVG(100x100 좌표)의 막대 값 그대로. 폭 7, 양끝은 반지름 3.5로 완전히 둥글다.
const BAR_W = 7;
const BARS = [
  { x: 22.5, y: 42, h: 16 },
  { x: 34.5, y: 33, h: 34 },
  { x: 46.5, y: 24, h: 52 },
  { x: 58.5, y: 33, h: 34 },
  { x: 70.5, y: 42, h: 16 }
];

// 막대(세로 캡슐) 안에 점이 있는지: 가운데 세로선까지의 거리가 반지름 이하인가
function inBar(px, py) {
  const r = BAR_W / 2;
  return BARS.some(({ x, y, h }) => {
    const cx = x + r;
    const cy = Math.min(Math.max(py, y + r), y + h - r);
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  });
}

// 가장자리가 계단처럼 보이지 않게 픽셀 하나를 4x4로 쪼개 흰색 비율만큼 섞는다
const SS = 4;
function coverage(x, y, size) {
  let hit = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const px = ((x + (sx + 0.5) / SS) / size) * 100;
      const py = ((y + (sy + 0.5) / SS) / size) * 100;
      if (inBar(px, py)) hit++;
    }
  }
  return hit / (SS * SS);
}

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

// 바탕은 꽉 찬 정사각형으로 둔다 — 아이폰이 모서리를 알아서 둥글게 깎기 때문
function makePng(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, size);
      for (let i = 0; i < 3; i++) row[1 + x * 3 + i] = Math.round(BG[i] * (1 - a) + FG[i] * a);
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
