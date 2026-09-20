import { Link } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { getCareInstructions, getMedicationWarningSources } from '../data/interactions.js'

// ponytail: keyword heuristic instead of a real category field on care instructions —
// revisit if interactions.js ever needs to carry structured categories.
function categorize(instruction) {
  if (/자몽|그레이프|간격|음식|우유|유제품|카페인|알코올|술/.test(instruction)) return '주의할 음식'
  if (/함께|병용|동시|상충/.test(instruction)) return '함께 먹으면 안 돼요'
  return '복용 방법'
}

const SECTION_ICON = {
  '복용 방법': '💊',
  '함께 먹으면 안 돼요': '🚫',
  '주의할 음식': '🍽️',
}

export default function DrugListPage() {
  const { data, removeDrug } = useData()

  const confirmRemove = (drug) => {
    if (window.confirm(`${drug.name}을(를) 목록에서 삭제할까요?`)) removeDrug(drug.id)
  }

  return (
    <div className="page">
      <h1>내 약</h1>
      <p className="muted">
        1일 3회 복용 약은 아침·점심·저녁,
        <br />
        1일 2회 복용 약은 아침·저녁으로 자동 설정돼요.
      </p>
      {data.drugs.length === 0 && <p className="muted">아직 등록된 약이 없어요.</p>}
      <div className="stack">
        {data.drugs.map((drug) => {
          const instructions = [...new Set([
            ...(drug.careInstructions ?? []),
            ...getCareInstructions(drug),
          ])]
          const sources = getMedicationWarningSources(drug)
          const sections = instructions.reduce((acc, instruction) => {
            const key = categorize(instruction)
            acc[key] = acc[key] ? [...acc[key], instruction] : [instruction]
            return acc
          }, {})

          return (
            <div key={drug.id} className="card drug-card">
              <div className="row" style={{ alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <div className="row" style={{ alignItems: 'center', gap: 12 }}>
                  <span className="drug-icon">💊</span>
                  <div>
                    <h2 style={{ marginBottom: 2 }}>{drug.name}</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {drug.dose} · 1일 {drug.frequencyPerDay}회 · {drug.times.join(' · ')}
                    </p>
                  </div>
                </div>
                <button type="button" className="danger" onClick={() => confirmRemove(drug)}>
                  삭제
                </button>
              </div>

              {!drug.medicineInfo ? (
                <p className="muted source-link">의약품 정보를 확인하는 중입니다.</p>
              ) : (
                <p className="badge badge-done" style={{ marginTop: 12 }}>
                  🤖 AI가 복용 정보를 확인했어요
                </p>
              )}

              {Object.entries(sections).map(([title, items]) => (
                <div key={title} className="care-notice stack" style={{ marginTop: 12 }}>
                  <strong>{SECTION_ICON[title]} {title}</strong>
                  {items.map((item) => <p key={item}>{item}</p>)}
                </div>
              ))}

              {sources.map(({ source, sourceUrl }) => (
                <a key={sourceUrl} className="muted source-link" href={sourceUrl} target="_blank" rel="noreferrer">
                  공식 자료: {source}
                </a>
              ))}
            </div>
          )
        })}
      </div>

      <Link to="/scan" className="button fab" aria-label="약 등록하기">+</Link>
    </div>
  )
}
