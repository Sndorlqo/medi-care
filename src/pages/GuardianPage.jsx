import { useState } from 'react'
import { useData } from '../data/store.jsx'
import { SLOTS } from '../data/seed.js'
import { getCareInstructions, getMedicationWarningSources } from '../data/interactions.js'
import { todayStr, formatAmPmTime } from '../lib/time.js'

const SLOT_LABEL = { 아침: '아침', 점심: '점심', 저녁: '저녁', 자기전: '자기 전' }
const STATUS_LABEL = { taken: '복용 완료', skipped: '복용 안 함', pending: '예정' }

export default function GuardianPage() {
  const { data, sendReminder } = useData()
  const [messages, setMessages] = useState({})
  const [sentSlot, setSentSlot] = useState(null)

  const statusFor = (slot) =>
    data.logs.find((l) => l.slot === slot && l.date === todayStr())?.status ?? 'pending'

  const activeSlots = SLOTS.filter((slot) => data.drugs.some((d) => d.times.includes(slot)))
  const takenCount = activeSlots.filter((slot) => statusFor(slot) === 'taken').length
  const progressPct = activeSlots.length ? Math.round((takenCount / activeSlots.length) * 100) : 0

  return (
    <div className="page">
      <h1>보호자 안심 화면</h1>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="avatar">{(data.patient.name || '어')[0]}</span>
        <div>
          <h2 style={{ marginBottom: 2 }}>{data.patient.name || '어르신'} 님</h2>
          <p className="muted" style={{ margin: 0 }}>연결됨 · {todayStr()}</p>
        </div>
      </div>

      <div className="progress-card">
        {activeSlots.length ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>오늘의 복약 현황</span>
              <strong>{takenCount}/{activeSlots.length}회 완료</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>등록된 약이 없어요.</p>
        )}
      </div>

      <p className="muted">
        1일 3회 복용 약은 아침·점심·저녁,
        <br />
        1일 2회 복용 약은 아침·저녁으로 자동 설정돼요.
      </p>

      <div className="stack">
        {SLOTS.map((slot) => {
          const drugs = data.drugs.filter((d) => d.times.includes(slot))
          const instructions = [...new Set(drugs.flatMap((drug) =>
            [...(drug.careInstructions ?? []), ...getCareInstructions(drug)]
          ))]
          const sources = [...new Map(drugs.flatMap((drug) =>
            getMedicationWarningSources(drug).map((source) => [source.sourceUrl, source])
          )).values()]
          const status = statusFor(slot)
          return (
            <div key={slot} className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ marginBottom: 2 }}>{SLOT_LABEL[slot]}</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {formatAmPmTime(data.alarmTimes[slot])} · {drugs.length ? drugs.map((d) => d.name).join(', ') : '등록된 약 없음'}
                  </p>
                </div>
                <span className={`badge${status === 'taken' ? ' badge-done' : status === 'skipped' ? ' badge-skipped' : ''}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              {instructions.length > 0 && (
                <div className="care-notice" aria-label={`${slot} 복용 주의사항`} style={{ marginTop: 12 }}>
                  <strong>복용 주의사항</strong>
                  {instructions.map((instruction) => <p key={instruction}>· {instruction}</p>)}
                  {sources.map(({ source, sourceUrl }) => (
                    <a key={sourceUrl} className="muted source-link" href={sourceUrl} target="_blank" rel="noreferrer">
                      공식 자료: {source}
                    </a>
                  ))}
                </div>
              )}
              {drugs.length > 0 && status !== 'taken' && (
                <div className="stack" style={{ marginTop: 12 }}>
                  <label htmlFor={`reminder-${slot}`}>하고 싶은 말을 적어주세요 (비우면 기본 안내가 나가요)</label>
                  <input
                    id={`reminder-${slot}`}
                    value={messages[slot] ?? ''}
                    placeholder={`예: 아버지, ${SLOT_LABEL[slot]} 약 꼭 챙겨 드세요`}
                    onChange={(e) => setMessages((m) => ({ ...m, [slot]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      sendReminder(slot, messages[slot] ?? '')
                      setSentSlot(slot)
                    }}
                  >
                    🔔 지금 알림 보내기
                  </button>
                  {sentSlot === slot && <p className="muted">어르신 화면으로 알림을 보냈어요.</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="muted">복용 시간이 30분 지나면 알려드려요.</p>
    </div>
  )
}
