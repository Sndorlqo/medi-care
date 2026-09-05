import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useData } from './data/store.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import HomePage from './pages/HomePage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import DrugListPage from './pages/DrugListPage.jsx'
import AlarmPage from './pages/AlarmPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import GuardianPage from './pages/GuardianPage.jsx'
import HospitalsPage from './pages/HospitalsPage.jsx'

function TopBar() {
  return (
    <div className="topbar">
      <Link to="/home">💊 실버 Care</Link>
      <Link to="/settings">⚙️ 설정</Link>
    </div>
  )
}

export default function App() {
  const { data } = useData()

  return (
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
              <Route path="alarm" element={<AlarmPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="guardian" element={<GuardianPage />} />
              <Route path="hospitals" element={<HospitalsPage />} />
              <Route
                path="*"
                element={<Navigate to={data.onboarded ? '/home' : '/login'} replace />}
              />
            </Routes>
          </>
        }
      />
      <Route path="/" element={<Navigate to={data.onboarded ? '/home' : '/login'} replace />} />
    </Routes>
  )
}
