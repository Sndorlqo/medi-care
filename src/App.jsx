import { useEffect } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useData } from './data/store.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import HomePage from './pages/HomePage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import DrugListPage from './pages/DrugListPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import GuardianPage from './pages/GuardianPage.jsx'
import HospitalsPage from './pages/HospitalsPage.jsx'
import AlarmWatcher from './components/AlarmWatcher.jsx'
import BottomNav from './components/BottomNav.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function TopBar() {
  return (
    <div className="topbar">
      <Link to="/home" className="topbar-brand">
        <span className="topbar-logo">♥</span>
        실버케어
      </Link>
      <Link to="/settings">⚙️</Link>
    </div>
  )
}

export default function App() {
  const { data } = useData()

  return (
    <>
      <ScrollToTop />
      <AlarmWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/*"
          element={
            <>
              <TopBar />
              <Routes>
                <Route path="home" element={<HomePage />} />
                <Route path="scan" element={<ScanPage />} />
                <Route path="drugs" element={<DrugListPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="guardian" element={<GuardianPage />} />
                <Route path="hospitals" element={<HospitalsPage />} />
                <Route
                  path="*"
                  element={<Navigate to={data.onboarded ? '/home' : '/login'} replace />}
                />
              </Routes>
              <BottomNav />
            </>
          }
        />
        <Route path="/" element={<Navigate to={data.onboarded ? '/home' : '/login'} replace />} />
      </Routes>
    </>
  )
}
