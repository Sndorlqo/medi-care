import { useContext, useEffect, useState } from 'react'
import { emptyData } from './seed.js'
import { getCareInstructions, getMedicineApiInstructions } from './interactions.js'
import { DataContext } from './context.jsx'

const STORAGE_KEY = 'silverCareData'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyData(), ...JSON.parse(raw) } : emptyData()
  } catch {
    return emptyData()
  }
}

export function DataProvider({ children }) {
  const [data, setData] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    const drugsToEnrich = data.drugs.filter((drug) => !drug.medicineInfo)
    if (!drugsToEnrich.length) return undefined
    let cancelled = false

    Promise.all(drugsToEnrich.map(async (drug) => {
      try {
        const response = await fetch(`/api/medicine-info?name=${encodeURIComponent(drug.name)}`)
        if (!response.ok) return null
        const result = await response.json()
        if (!result.medicine) return null
        const medicineInfo = {
          ...result.medicine,
          source: result.source,
          sourceUrl: result.sourceUrl,
        }
        return {
          ...drug,
          medicineInfo,
          careInstructions: [...new Set([
            ...(drug.careInstructions ?? []),
            ...getCareInstructions(drug),
            ...getMedicineApiInstructions(medicineInfo),
          ])],
        }
      } catch {
        return null
      }
    })).then((enrichedDrugs) => {
      if (cancelled) return
      const updates = new Map(enrichedDrugs.filter(Boolean).map((drug) => [drug.id, drug]))
      if (!updates.size) return
      setData((current) => ({
        ...current,
        drugs: current.drugs.map((drug) => updates.get(drug.id) ?? drug),
      }))
    })

    return () => {
      cancelled = true
    }
  }, [data.drugs])

  const update = (patch) => setData((d) => ({ ...d, ...patch }))

  const addDrug = (drug) =>
    setData((d) => ({ ...d, drugs: [...d.drugs, drug] }))

  const removeDrug = (id) =>
    setData((d) => ({ ...d, drugs: d.drugs.filter((drug) => drug.id !== id) }))

  const setAlarmTime = (slot, time) =>
    setData((d) => ({ ...d, alarmTimes: { ...d.alarmTimes, [slot]: time } }))

  const logCheckIn = (entry) =>
    setData((d) => ({
      ...d,
      logs: [...d.logs.filter((l) => l.id !== entry.id), entry],
    }))

  const sendReminder = (slot, message) =>
    setData((d) => ({ ...d, reminder: { id: crypto.randomUUID(), slot, message } }))

  const clearReminder = () =>
    setData((d) => ({ ...d, reminder: null }))

  return (
    <DataContext.Provider value={{ data, update, addDrug, removeDrug, setAlarmTime, logCheckIn, sendReminder, clearReminder }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
