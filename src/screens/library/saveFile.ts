// 내보낸 글을 파일로 넘기는 방법. 아이폰 홈화면 앱은 링크로 내려받기가 잘 안 되는 경우가 있어서
// 공유 시트(파일 앱·에어드롭·메일로 보내기)를 먼저 쓰고, 안 되는 기기에서만 내려받기로 넘어간다.
export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

export async function saveTextFile(name: string, text: string, mime: string): Promise<SaveResult> {
  const file = new File([text], name, { type: mime });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      // 사용자가 공유 창을 닫은 것은 오류가 아니다. 그 밖의 실패는 내려받기로 이어 간다
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
