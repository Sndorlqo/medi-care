import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/home', icon: '🏠', label: '홈' },
  { to: '/drugs', icon: '💊', label: '내 약' },
  { to: '/guardian', icon: '👪', label: '보호자' },
  { to: '/hospitals', icon: '🗺️', label: '지도' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
