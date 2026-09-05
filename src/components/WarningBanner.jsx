export default function WarningBanner({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div
      className="card"
      style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}
    >
      <h2 style={{ color: 'var(--danger)' }}>⚠️ 약물 상충 주의</h2>
      <div className="stack">
        {warnings.map((w, i) => (
          <p key={i}>
            <strong>{w.withDrugName}</strong>과(와) 병용 시: {w.message}
          </p>
        ))}
      </div>
    </div>
  )
}
