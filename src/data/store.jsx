import { createContext, useContext, useEffect, useState } from 'react'
import { emptyData } from './seed.js'

const STORAGE_KEY = 'silverCareData'
const DataContext = createContext(null)

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

  const update = (patch) => setData((d) => ({ ...d, ...patch }))

  const addDrug = (drug) =>
    setData((d) => ({ ...d, drugs: [...d.drugs, drug] }))

  const setAlarmTime = (slot, time) =>
    setData((d) => ({ ...d, alarmTimes: { ...d.alarmTimes, [slot]: time } }))

  const logCheckIn = (entry) =>
    setData((d) => ({
      ...d,
      logs: [...d.logs.filter((l) => l.id !== entry.id), entry],
    }))

  return (
    <DataContext.Provider value={{ data, update, addDrug, setAlarmTime, logCheckIn }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
