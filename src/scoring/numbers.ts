// 음성 인식은 "three"를 "3"으로, "three thirty"를 "3:30"으로 돌려줄 때가 있다.
// 콘텐츠 문장은 숫자를 글자로 쓰므로(schema.md 4절), 들린 숫자를 글자로 바꿔 비교한다.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n: number): string[] {
  const out: string[] = [];
  if (n >= 100) {
    out.push(ONES[Math.floor(n / 100)], 'hundred');
    n %= 100;
  }
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)]);
    if (n % 10) out.push(ONES[n % 10]);
  } else if (n > 0) {
    out.push(ONES[n]);
  }
  return out;
}

export function numberToWords(n: number): string[] {
  if (!Number.isInteger(n) || n < 0 || n >= 1_000_000) return [String(n)];
  if (n === 0) return ['zero'];
  const out: string[] = [];
  if (n >= 1000) out.push(...under1000(Math.floor(n / 1000)), 'thousand');
  out.push(...under1000(n % 1000));
  return out;
}

const ORDINAL_SPECIAL: Record<string, string> = {
  one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth'
};

function toOrdinal(words: string[]): string[] {
  const last = words[words.length - 1];
  const ord = ORDINAL_SPECIAL[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return [...words.slice(0, -1), ord];
}

// "3" "1,000" "3:30" "$5" "5%" "1st" 같은 숫자 토큰을 단어 목록으로. 숫자가 아니면 null
export function digitsToWords(token: string): string[] | null {
  const t = token.replace(/,/g, '');
  let m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const min = Number(m[2]);
    const minWords = min === 0 ? [] : min < 10 ? ['oh', ...numberToWords(min)] : numberToWords(min);
    return [...numberToWords(Number(m[1])), ...minWords];
  }
  m = t.match(/^\$(\d+)$/);
  if (m) return [...numberToWords(Number(m[1])), Number(m[1]) === 1 ? 'dollar' : 'dollars'];
  m = t.match(/^(\d+)%$/);
  if (m) return [...numberToWords(Number(m[1])), 'percent'];
  m = t.match(/^(\d+)(st|nd|rd|th)$/);
  if (m) return toOrdinal(numberToWords(Number(m[1])));
  if (/^\d+$/.test(t)) return numberToWords(Number(t));
  return null;
}
