import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { SLOTS } from '../data/seed.js'
import { getCareInstructions, summarizeCareInstruction } from '../data/interactions.js'
import { speak } from '../lib/tts.js'
import { todayStr, isSlotDue } from '../lib/time.js'

function buildMessage(name, slot, drugs) {
  const careLines = [...new Set(drugs.flatMap((drug) =>
    [...(drug.careInstructions ?? []), ...getCareInstructions(drug)]
  ))].map(summarizeCareInstruction).filter(Boolean).slice(0, 3)
  const base = `${name || '어르신'}, ${slot} 약 복용하실 시간입니다.`
  return careLines.length
    ? `${base} 복용 주의사항입니다. ${careLines.join('. ')}`
    : base
}

function playAlarmSound() {
  if (!window.AudioContext && !window.webkitAudioContext) return

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.45)
  oscillator.addEventListener('ended', () => context.close())
}

export default function AlarmWatcher() {
  const { data, logCheckIn, clearReminder } = useData()
  const navigate = useNavigate()
  const announced = useRef(new Set())
  const announcedReminderId = useRef(null)
  const [activeAlarm, setActiveAlarm] = useState(null)

  useEffect(() => {
    const checkAlarms = () => {
      for (const slot of SLOTS) {
        const drugs = data.drugs.filter((drug) => drug.times.includes(slot))
        const key = `${todayStr()}-${slot}`
        if (!drugs.length || announced.current.has(key)) continue
        if (data.suppressedAlarms?.includes(key)) continue
        if (!isSlotDue(slot, data.alarmTimes, data.logs)) continue

        announced.current.add(key)
        playAlarmSound()
        speak(buildMessage(data.patient.name, slot, drugs))
        setActiveAlarm({ slot, drugs })
        navigate('/home')
        break
      }
    }

    checkAlarms()
    const timer = window.setInterval(checkAlarms, 1000)
    return () => window.clearInterval(timer)
  }, [data, navigate])

  // A reminder the guardian sent from their tab — plays immediately, independent
  // of the scheduled per-slot alarm timing above.
  useEffect(() => {
    const reminder = data.reminder
    if (!reminder || announcedReminderId.current === reminder.id) return
    announcedReminderId.current = reminder.id

    const drugs = data.drugs.filter((drug) => drug.times.includes(reminder.slot))
    const message = reminder.message?.trim() || buildMessage(data.patient.name, reminder.slot, drugs)
    playAlarmSound()
    speak(message)
    setActiveAlarm({ slot: reminder.slot, drugs, message: reminder.message?.trim(), fromGuardian: true })
    navigate('/home')
    clearReminder()
  }, [data.reminder, data.drugs, data.alarmTimes, data.logs, navigate, clearReminder])

  if (!activeAlarm) return null

  const finishAlarm = (status) => {
    logCheckIn({
      id: `${todayStr()}-${activeAlarm.slot}`,
      date: todayStr(),
      slot: activeAlarm.slot,
      drugId: activeAlarm.drugs.map((drug) => drug.id).join(','),
      status,
      timestamp: new Date().toISOString(),
    })
    setActiveAlarm(null)
  }

  return (
    <div className="alarm-modal-backdrop" role="presentation">
      <section className="alarm-modal" role="dialog" aria-modal="true" aria-labelledby="alarm-modal-title">
        <p className="alarm-modal-kicker">{activeAlarm.fromGuardian ? '보호자님의 메시지' : '복약 알람'}</p>
        <h2 id="alarm-modal-title">{activeAlarm.message || `${activeAlarm.slot} 약 드실 시간이에요`}</h2>
        {activeAlarm.drugs.length > 0 && (
          <p className="alarm-modal-drugs">
            {activeAlarm.drugs.map((drug) => drug.name).join(', ')}
          </p>
        )}
        <div className="alarm-modal-actions">
          <button type="button" onClick={() => finishAlarm('taken')}>
            약 먹었음
          </button>
          <button type="button" className="danger" onClick={() => finishAlarm('skipped')}>
            안먹었음
          </button>
        </div>
      </section>
    </div>
  )
}
