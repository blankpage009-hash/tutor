import type { SavedSentence } from '../db/types';
import { drillSaveId } from '../drillPlan';
import { loadNewLesson } from './curriculumLoader';

export type SavedText = Required<Pick<SavedSentence, 'en' | 'ko' | 'audio'>>;

// 글자 없이 저장된 예전 문장의 글자를 콘텐츠에서 찾는다. 못 찾으면 null (콘텐츠가 바뀌었거나 인터넷이 없을 때)
export async function resolveSavedText(row: SavedSentence): Promise<SavedText | null> {
  try {
    if (/-d\d+$/.test(row.id)) {
      // 새 커리큘럼 드릴 문장: id가 INT1-U01-L01-d1 모양
      const lesson = await loadNewLesson(row.lessonId);
      const d = lesson.drills.find((x) => drillSaveId(lesson.lessonId, x.id) === row.id);
      return d ? { en: d.en, ko: d.ko, audio: d.audio.normal } : null;
    }
    // 옛 10코스 문장은 코스와 함께 삭제됨 → 글자가 없는 옛 저장 문장은 되찾을 수 없다
    return null;
  } catch {
    return null;
  }
}
