import { useEffect, useRef } from 'react'
import { useData } from '../data/store.jsx'
import { SLOTS } from '../data/seed.js'
import { speak } from '../lib/tts.js'
import { todayStr, isSlotDue } from '../lib/time.js'

function buildMessage(slot, drugs) {
  const careLines = drugs.flatMap((d) => d.careInstructions)
  const base = `어르신, ${slot} 약 복용하실 시간입니다.`
  return careLines.length ? `${base} ${careLines.join('. ')}` : base
}

export default function AlarmPage() {
  const { data, logCheckIn } = useData()
  const announced = useRef(new Set())

  useEffect(() => {
    const timer = setInterval(() => {
      for (const slot of SLOTS) {
        const drugs = data.drugs.filter((d) => d.times.includes(slot))
        if (drugs.length === 0) continue
        const key = `${todayStr()}-${slot}`
        if (announced.current.has(key)) continue
        if (isSlotDue(slot, data.alarmTimes, data.logs)) {
          speak(buildMessage(slot, drugs))
          announced.current.add(key)
        }
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [data])

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
  }

  return (
    <div className="page">
      <h1>오늘의 복약 알람</h1>
      <div className="stack">
        {SLOTS.map((slot) => {
          const drugs = data.drugs.filter((d) => d.times.includes(slot))
          const status = statusFor(slot)
          return (
            <div key={slot} className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{slot}</h2>
                <span className="badge">
                  {status === 'taken' ? '먹었어요 ✅' : status === 'skipped' ? '안먹음 ⏰' : '대기중'}
                </span>
              </div>
              {drugs.length === 0 ? (
                <p className="muted">이 시간대에 등록된 약이 없어요.</p>
              ) : (
                <p className="muted">{drugs.map((d) => d.name).join(', ')}</p>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => speak(buildMessage(slot, drugs))}
                  disabled={drugs.length === 0}
                >
                  🔊 지금 테스트
                </button>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => checkIn(slot, 'taken')} disabled={drugs.length === 0}>
                  먹었어요
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => checkIn(slot, 'skipped')}
                  disabled={drugs.length === 0}
                >
                  나중에 먹을래요
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
