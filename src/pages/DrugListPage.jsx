import { useData } from '../data/store.jsx'

export default function DrugListPage() {
  const { data } = useData()

  return (
    <div className="page">
      <h1>등록된 약 목록</h1>
      {data.drugs.length === 0 && <p className="muted">아직 등록된 약이 없어요.</p>}
      <div className="stack">
        {data.drugs.map((drug) => (
          <div key={drug.id} className="card">
            <h2>{drug.name}</h2>
            <p>
              {drug.dose} · 1일 {drug.frequencyPerDay}회 · 총 {drug.totalDays}일
            </p>
            <p className="badge">{drug.times.join(' · ')}</p>
            {drug.careInstructions.length > 0 && (
              <div className="stack" style={{ marginTop: 12 }}>
                {drug.careInstructions.map((c, i) => (
                  <p key={i} className="muted">
                    · {c}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
