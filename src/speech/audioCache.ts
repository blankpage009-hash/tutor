// 튜터 음성 파일을 처음 들을 때 받아서 기기에 보관한다 (PLAN: 음성은 설치 때 한꺼번에 받지 않음).
// 서비스 워커 대신 앱 코드가 직접 하는 이유: iOS <audio>는 파일을 조각(Range)으로 요청해서
// 조각 응답은 보관할 수 없다. 여기서는 fetch로 파일 전체를 받아 보관하고, blob 주소로 재생한다.
// 파일 이름에 글자 지문(해시)이 있어서(schema.md 5절) 문장이 바뀌면 이름도 바뀌므로 한 번 보관하면 계속 써도 된다.

const CACHE_NAME = 'tutor-audio-v1';
const objectUrls = new Map<string, Promise<string>>();

async function fetchBlob(url: string): Promise<Blob> {
  // caches는 https나 localhost에서만 있다. 없으면 보관 없이 그냥 받는다
  const cache = typeof caches !== 'undefined' ? await caches.open(CACHE_NAME).catch(() => null) : null;
  const hit = cache ? await cache.match(url) : undefined;
  if (hit) return withType(await hit.blob());
  const res = await fetch(url);
  if (!res.ok) throw new Error(`음성 파일을 못 받았어요 (${res.status})`);
  if (cache) await cache.put(url, res.clone()).catch(() => undefined);
  return withType(await res.blob());
}

// 서버가 파일 종류를 안 알려주면 blob 종류가 비어 iOS가 재생을 못 할 수 있어 m4a 종류를 붙인다
function withType(b: Blob): Blob {
  return b.type ? b : new Blob([b], { type: 'audio/mp4' });
}

// 기기에 보관된 음성 파일 수 (진단 표시용)
export async function countCachedAudio(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const cache = await caches.open(CACHE_NAME);
  return (await cache.keys()).length;
}

// 같은 파일의 blob 주소를 한 번만 만든다. 실패하면 다음에 다시 시도할 수 있게 기억에서 지운다
export function getAudioObjectUrl(url: string): Promise<string> {
  let p = objectUrls.get(url);
  if (!p) {
    p = fetchBlob(url).then((b) => URL.createObjectURL(b));
    p.catch(() => objectUrls.delete(url));
    objectUrls.set(url, p);
  }
  return p;
}
