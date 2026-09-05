import { Link } from 'react-router-dom'

export default function BigButton({ to, icon, label, onClick, variant }) {
  const className = variant ? variant : undefined
  const content = (
    <>
      <span style={{ fontSize: 28 }}>{icon}</span>
      {label}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`button ${className ?? ''}`}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  )
}
