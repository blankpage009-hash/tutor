import { FORM_LABEL, meaningForSave, naverUrl, phraseLabel, type FormKey, type LookupHit, type Pair, type Sense } from '../../content/dictionary';
import { posLabel } from '../../posLabels';
import { WordAudioButton } from './WordAudioButton';
import styles from './WordSheet.module.css';

export type DictInfo = { hit: LookupHit | null; contextIndex: number | null; phrase: Pair | null };

type Props = {
  word: string;
  info: DictInfo;
  // 뜻 줄을 누르면 아래 뜻 칸에 채운다. 없으면(이미 저장된 단어) 줄은 글자로만 보인다
  picked?: Sense | null;
  onPick?: (sense: Sense) => void;
};

// 저장 창 안의 사전 내용: 발음기호·변화형 안내, 이 문장에서의 뜻, 품사별 뜻, 변화형, 예문, 표현, 네이버 바로가기
export function DictEntryView({ word, info, picked, onPick }: Props) {
  const { hit } = info;
  return (
    <div className={styles.dict}>
      {hit && <HeadLine word={word} hit={hit} />}
      {hit && <ContextBox info={info} hit={hit} />}
      {hit && <SenseList senses={hit.entry.senses} picked={picked} onPick={onPick} />}
      {hit?.entry.forms && <FormsLine forms={hit.entry.forms} />}
      {hit?.entry.examples?.length ? <PairList title="예문" items={hit.entry.examples} /> : null}
      {hit?.entry.phrases?.length ? <PairList title="자주 쓰는 표현" items={hit.entry.phrases.map((p) => ({ ...p, en: phraseLabel(p.en) }))} /> : null}
      {/* 앱 사전에 없거나 더 자세히 보고 싶을 때. 홈화면 앱에서는 사파리(또는 앱 위 창)로 열린다 */}
      <a className={styles.naver} href={naverUrl(word)} target="_blank" rel="noopener noreferrer" lang="ko">
        네이버 사전에서 보기 ↗
      </a>
    </div>
  );
}

function formNote(word: string, hit: LookupHit): string {
  if (hit.formOf?.length) return `${hit.head}의 ${hit.formOf.map((k) => FORM_LABEL[k]).join('·')}형`;
  if (hit.head !== word) return `기본형 ${hit.head}`;
  if (hit.alsoFormOf) return `${hit.alsoFormOf}의 변화형이기도 해요`;
  return '';
}

function HeadLine({ word, hit }: { word: string; hit: LookupHit }) {
  const note = formNote(word, hit);
  const { ipa, audio } = hit.entry;
  if (!ipa && !note && !audio) return null;
  return (
    <p className={styles.headLine}>
      {/* 발음기호·소리는 표제어 것이라(has를 눌러도 have) 표제어가 다르면 이름을 붙여 헷갈리지 않게 한다 */}
      {ipa && <span className={styles.ipa} lang="en">{hit.head !== word ? `${hit.head} ` : ''}/{ipa}/</span>}
      {audio && <WordAudioButton audio={audio} head={hit.head} />}
      {note && <span className={styles.formNote} lang="ko">{note}</span>}
    </p>
  );
}

// 이 문장에 맞는 뜻(레슨 원고에 적어 둔 것)과, 문장에 들어 있는 표현(went out → go out)
function ContextBox({ info, hit }: { info: DictInfo; hit: LookupHit }) {
  const sense = info.contextIndex === null ? null : hit.entry.senses[info.contextIndex];
  if (!sense && !info.phrase) return null;
  return (
    <div className={styles.context}>
      <p className={styles.contextTitle} lang="ko">이 문장에서</p>
      {sense && <p className={styles.contextText} lang="ko"><b>{posLabel(sense.pos)}</b> {sense.ko}</p>}
      {info.phrase && (
        <p className={styles.contextText}><b lang="en">{phraseLabel(info.phrase.en)}</b> <span lang="ko">{info.phrase.ko}</span></p>
      )}
    </div>
  );
}

type SenseProps = { senses: Sense[]; picked?: Sense | null; onPick?: (sense: Sense) => void };

// 품사별로 묶되 원고 순서(자주 쓰는 뜻이 먼저)는 그대로 둔다
function groupByPos(senses: Sense[]): [string, Sense[]][] {
  const groups = new Map<string, Sense[]>();
  for (const s of senses) groups.set(s.pos, [...(groups.get(s.pos) ?? []), s]);
  return [...groups];
}

function SenseList({ senses, picked, onPick }: SenseProps) {
  return (
    <div className={styles.senses}>
      {groupByPos(senses).map(([pos, list]) => (
        <div key={pos} className={styles.senseGroup}>
          <p className={styles.senseLabel} lang="ko">{posLabel(pos)}</p>
          {/* 번호를 브라우저 목록 기호(::marker)에 맡기면 아이폰에서 뜻 칸의 파란 테두리가 번호 위로 겹쳐 그려져서 직접 그린다 */}
          <ol className={styles.senseList}>
            {list.map((s, i) => (
              <li key={s.ko} className={styles.senseItem}>
                <span className={styles.senseNum} aria-hidden="true">{i + 1}.</span>
                {onPick ? (
                  <button type="button" lang="ko" onClick={() => onPick(s)}
                    className={picked?.ko === meaningForSave(s.ko) && picked.pos === s.pos ? `${styles.sense} ${styles.sensePicked}` : styles.sense}>
                    {s.ko}
                  </button>
                ) : <span className={styles.sense} lang="ko">{s.ko}</span>}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

const FORM_ORDER: FormKey[] = ['3s', 'past', 'pp', 'ing', 'pl', 'er', 'est'];

function FormsLine({ forms }: { forms: Partial<Record<FormKey, string>> }) {
  const items = FORM_ORDER.filter((k) => forms[k]);
  if (!items.length) return null;
  return (
    <p className={styles.forms}>
      {items.map((k) => (
        <span key={k} className={styles.formItem}>
          <span lang="ko">{FORM_LABEL[k]}</span> <b lang="en">{forms[k]}</b>
        </span>
      ))}
    </p>
  );
}

function PairList({ title, items }: { title: string; items: Pair[] }) {
  return (
    <div className={styles.pairs}>
      <p className={styles.senseLabel} lang="ko">{title}</p>
      {items.map((p) => (
        <p key={p.en} className={styles.pair}>
          <span className={styles.pairEn} lang="en">{p.en}</span>
          <span className={styles.pairKo} lang="ko">{p.ko}</span>
        </p>
      ))}
    </div>
  );
}
