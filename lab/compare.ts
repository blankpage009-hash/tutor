import { openMicStream, type MicStream } from '../src/speech/micStream';
import { createCaptureContext } from '../src/speech/pcmCapture';
import { downsample, encodeWav, mergeChunks, WAV_RATE } from '../src/speech/wav';
import { countMatched, ENGINES, PRESETS, type Recording } from './engines';

// PC 시험 페이지 화면: 녹음 → 같은 녹음을 엔진마다 넣기 → 결과 표 쌓기 → 채팅에 붙일 글로 복사

type Row = { engine: string; text: string; ms: number; matched: number; total: number };
type Take = { sentence: string; seconds: number; rows: Row[] };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = (m: string) => { $('status').textContent = m; };
const takes: Take[] = [];
let live: { ctx: AudioContext; mic: MicStream; chunks: Float32Array[] } | null = null;
let last: Recording | null = null;

async function loadAll(): Promise<void> {
  const lines: string[] = [];
  for (const e of ENGINES) {
    status([...lines, `${e.name} 불러오는 중…`].join('\n'));
    const began = performance.now();
    try {
      await e.load();
      lines.push(`${e.name}: 준비됨 (${((performance.now() - began) / 1000).toFixed(1)}초)`);
    } catch (err) {
      lines.push(`${e.name}: 실패 — ${String(err)}`);
    }
  }
  status([...lines, '② 이제 녹음하세요.'].join('\n'));
}

async function startRec(): Promise<void> {
  // 사용자가 누른 순간(await 전)에 만들어야 소리가 들어온다 (앱과 같은 방식)
  const ctx = createCaptureContext();
  if (!ctx) return status('이 브라우저는 녹음을 못 해요.');
  const appMic = $<HTMLInputElement>('appMic').checked;
  const mic = await openMicStream(ctx, () => {}, appMic ? { processing: false, gain: 15 } : {});
  const chunks: Float32Array[] = [];
  mic.subscribe((d) => chunks.push(new Float32Array(d)));
  live = { ctx, mic, chunks };
  setRecording(true);
  status(`녹음 중… 말한 뒤 [멈춤]을 누르세요. (${mic.info()})`);
}

function setRecording(on: boolean): void {
  $<HTMLButtonElement>('rec').disabled = on;
  $<HTMLButtonElement>('stop').disabled = !on;
  $<HTMLButtonElement>('play').disabled = on || !last;
}

async function stopRec(): Promise<void> {
  if (!live) return;
  const { ctx, mic, chunks } = live;
  live = null;
  mic.close();
  last = { chunks, rate: ctx.sampleRate };
  void ctx.close();
  setRecording(false);
  await runAll(last);
}

async function runAll(rec: Recording): Promise<void> {
  const sentence = $<HTMLInputElement>('sentence').value.trim();
  const seconds = rec.chunks.reduce((n, c) => n + c.length, 0) / rec.rate;
  const take: Take = { sentence, seconds, rows: [] };
  takes.unshift(take);
  for (const e of ENGINES) {
    status(`${e.name} 듣는 중…`);
    const began = performance.now();
    let text: string;
    try {
      text = await e.run(rec, sentence);
    } catch (err) {
      text = `(오류: ${String(err)})`;
    }
    take.rows.push({ engine: e.name, text, ms: performance.now() - began, ...countMatched(sentence, text) });
    render();
  }
  status('끝. 다른 문장을 넣고 다시 녹음해 보세요.');
}

function render(): void {
  $('results').innerHTML = takes.map((t) => `
    <table><caption>${esc(t.sentence)} · 녹음 ${t.seconds.toFixed(1)}초</caption>
    <tr><th>엔진</th><th>적힌 글자</th><th>예시 단어</th><th>걸린 시간</th></tr>
    ${t.rows.map((r) => `<tr><td>${esc(r.engine)}</td><td>${esc(r.text)}</td>
      <td class="score ${scoreClass(r)}">${r.matched}/${r.total}</td><td>${(r.ms / 1000).toFixed(2)}초</td></tr>`).join('')}
    </table>`).join('');
}

const scoreClass = (r: Row) => (r.matched === r.total ? 'full' : r.matched < r.total / 2 ? 'low' : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function asText(): string {
  return takes.slice().reverse().map((t) => [
    `■ ${t.sentence} (녹음 ${t.seconds.toFixed(1)}초)`,
    ...t.rows.map((r) => `- ${r.engine}: "${r.text}" ${r.matched}/${r.total} · ${(r.ms / 1000).toFixed(2)}초`)
  ].join('\n')).join('\n\n');
}

function play(): void {
  if (!last) return;
  const wav = encodeWav(downsample(mergeChunks(last.chunks), last.rate, WAV_RATE), WAV_RATE);
  void new Audio(URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))).play();
}

function setup(): void {
  $('presets').innerHTML = PRESETS.map((p) => `<option value="${esc(p)}"></option>`).join('');
  $<HTMLInputElement>('sentence').value = PRESETS[0];
  $('load').onclick = () => void loadAll();
  $('rec').onclick = () => void startRec().catch((e) => { status(`녹음 실패: ${String(e)}`); setRecording(false); });
  $('stop').onclick = () => void stopRec();
  $('play').onclick = play;
  $('copy').onclick = () => void navigator.clipboard.writeText(asText()).then(() => status('결과를 복사했어요. 채팅에 붙여 주세요.'));
}

setup();
