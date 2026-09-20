import { useState } from 'react'
import { useData } from '../data/store.jsx'
import { SLOTS } from '../data/seed.js'
import { todayStr, isSlotDue, formatAmPmTime, formatKoreanDate } from '../lib/time.js'

const SLOT_ICON = { 아침: '☀️', 점심: '🍚', 저녁: '🌇', 자기전: '🌙' }
const SLOT_LABEL = { 아침: '아침', 점심: '점심', 저녁: '저녁', 자기전: '자기 전' }

const RING_RADIUS = 50
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ProgressRing({ percent, takenCount, total }) {
  const offset = RING_CIRCUMFERENCE * (1 - percent / 100)
  return (
    <div className="progress-ring-wrap">
      <svg className="progress-ring" viewBox="0 0 120 120" role="img" aria-label={`오늘 복약 ${percent}% 완료, ${takenCount}/${total}회`}>
        <circle className="progress-ring-track" cx="60" cy="60" r={RING_RADIUS} />
        <circle
          className="progress-ring-fill"
          cx="60" cy="60" r={RING_RADIUS}
          transform="rotate(-90 60 60)"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-center">
        <strong>{percent}%</strong>
        <span>{takenCount}/{total}회</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { data, logCheckIn } = useData()
  const [editingSlot, setEditingSlot] = useState(null)

  const statusFor = (slot) =>
    data.logs.find((l) => l.slot === slot && l.date === todayStr())?.status ?? 'pending'

  const checkIn = (slot, status) => {
    logCheckIn({
      id: `${todayStr()}-${slot}`,
      date: todayStr(),
      slot,
      drugId: data.drugs.filter((d) => d.times.includes(slot)).map((d) => d.id).join(','),
      status,
      timestamp: new Date().toISOString(),
    })
    setEditingSlot(null)
  }

  const activeSlots = SLOTS.filter((slot) => data.drugs.some((d) => d.times.includes(slot)))
  const takenCount = activeSlots.filter((slot) => statusFor(slot) === 'taken').length
  const nextSlot = activeSlots.find((slot) => statusFor(slot) === 'pending')
  const progressPct = activeSlots.length ? Math.round((takenCount / activeSlots.length) * 100) : 0

  return (
    <div className="page">
      <p className="muted">{formatKoreanDate()}</p>
      <h1>{data.patient.name || '어르신'}님, 오늘도 약 잊지 마세요</h1>

      <div className="progress-card">
        {activeSlots.length ? (
          <>
            <ProgressRing percent={progressPct} takenCount={takenCount} total={activeSlots.length} />
            {nextSlot && (
              <p className="progress-next">
                다음 약은 {formatAmPmTime(data.alarmTimes[nextSlot])}예요
              </p>
            )}
          </>
        ) : (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>등록된 약이 없어요.</p>
        )}
      </div>

      <div className="stack">
        {SLOTS.map((slot) => {
          const drugs = data.drugs.filter((d) => d.times.includes(slot))
          const status = statusFor(slot)
          const due = status === 'pending' && isSlotDue(slot, data.alarmTimes, data.logs)
          const drugSummary = drugs.length
            ? drugs.length > 1
              ? `${drugs[0].name} 외 ${drugs.length - 1}개`
              : drugs[0].name
            : '이 시간대에 등록된 약이 없어요.'

          return (
            <div key={slot} className={`card slot-card${due ? ' due' : ''}`}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                  <span className="slot-icon">{SLOT_ICON[slot]}</span>
                  <div>
                    <h2 style={{ marginBottom: 2 }}>{SLOT_LABEL[slot]}</h2>
                    <p className="muted" style={{ margin: 0, fontSize: 15 }}>{formatAmPmTime(data.alarmTimes[slot])}</p>
                  </div>
                </div>
                <span className={`badge${status === 'taken' ? ' badge-done' : due ? ' badge-due' : status === 'skipped' ? ' badge-skipped' : ''}`}>
                  {status === 'taken' ? '복용 완료' : status === 'skipped' ? '안먹음' : due ? '복용 시간' : '복용 전'}
                </span>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>{drugSummary}</p>

              {status !== 'pending' && editingSlot !== slot && (
                <button type="button" className="link-button" style={{ marginTop: 8 }} onClick={() => setEditingSlot(slot)}>
                  수정
                </button>
              )}

              {drugs.length > 0 && (status === 'pending' || editingSlot === slot) && (
                <div className="row" style={{ marginTop: 12 }}>
                  <button type="button" onClick={() => checkIn(slot, 'taken')}>
                    먹었어요
                  </button>
                  <button type="button" className="danger" onClick={() => checkIn(slot, 'skipped')}>
                    나중에 먹을래요
                  </button>
                  {editingSlot === slot && (
                    <button type="button" className="secondary" onClick={() => setEditingSlot(null)}>
                      취소
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
