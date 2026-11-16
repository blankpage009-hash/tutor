// iOS 27 대응 "준비 말": 음성 인식을 시작하기 직전에 음성 합성으로 짧게 한마디 한다.
// 이유: iOS 27부터 앱을 켠 뒤 첫 인식만 되고, 그 뒤 인식은 start·audiostart는 오는데 말소리를
// 전혀 못 듣는다(WebKit 버그 321436, 앱을 완전히 껐다 켜야 풀림). 그 버그 보고에서 확인된 우회가
// "인식 직전에 음성 합성 한마디 → 끝나자마자 인식 시작 + 인식을 중간에 끊지 않기"다.
// iOS가 고쳐지면 이 파일과 부르는 곳을 지운다.

const PRIMER_TEXT = 'OK, go ahead.';
// 끝 신호가 안 오는 경우가 있다. 그대로 두면 인식이 영영 시작되지 않으므로 이 시간 뒤엔 그냥 진행한다
const PRIMER_TIMEOUT_MS = 4000;

// Safari는 말하는 중인 문장 객체가 정리(GC)되면 끝 신호를 안 보내서, 끝날 때까지 붙잡아 둔다
let current: SpeechSynthesisUtterance | null = null;

export function isPrimerSupported(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

// 반드시 탭 처리 함수 안에서 await 없이 부른다 (iOS는 탭한 순간에만 말하기를 허락한다).
// 말이 끝나면(또는 실패·시간 초과면) 끝나는 약속을 돌려준다
export function speakPrimer(log: (m: string) => void = () => {}): Promise<void> {
  if (!isPrimerSupported()) {
    log('준비 말: 음성 합성 없음');
    return Promise.resolve();
  }
  const began = performance.now();
  return new Promise<void>((resolve) => {
    let timer = 0;
    let done = false;
    const u = new SpeechSynthesisUtterance(PRIMER_TEXT);
    const finish = (how: string) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (current === u) current = null;
      log(`준비 말 ${how} (${Math.round(performance.now() - began)}ms)`);
      resolve();
    };
    u.lang = 'en-US';
    u.onstart = () => log('준비 말 시작');
    u.onend = () => finish('끝');
    u.onerror = (e) => finish(`오류 ${e.error}`);
    current = u;
    timer = window.setTimeout(() => {
      speechSynthesis.cancel();
      finish('끝 신호 없음');
    }, PRIMER_TIMEOUT_MS);
    // 앞에 밀린 말이 있으면 새 말이 시작되지 않는다
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}
