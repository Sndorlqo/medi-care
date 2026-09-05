export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isSlotDue(slot, alarmTimes, logs) {
  const already = logs.some(
    (l) => l.slot === slot && l.date === todayStr() && l.status !== 'pending',
  )
  if (already) return false
  return nowHHMM() >= alarmTimes[slot]
}
