import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps, pinImage } from '../lib/kakaoMaps.js'
import { estimateBusinessStatus, formatDistance } from '../lib/businessHours.js'

const DEFAULT_CENTER = { lat: 37.5245, lng: 126.8754 }
const PLACE_TYPES = ['병원', '약국']
const TABS = ['전체', ...PLACE_TYPES]
const PIN_COLOR = { current: '#e53935', 병원: '#1976d2', 약국: '#8e44ad' }
const STATUS_BADGE_CLASS = { open: 'badge-done', break: 'badge-skipped', closed: 'badge-due' }

export default function HospitalsPage() {
  const mapRef = useRef(null)
  const kakaoMapRef = useRef(null)
  const kakaoRef = useRef(null)
  const markers = useRef([])
  const [coords, setCoords] = useState(null)
  const [places, setPlaces] = useState([])
  const [activeType, setActiveType] = useState('전체')
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [locating, setLocating] = useState(false)
  const [placesLoading, setPlacesLoading] = useState(true)
  const center = coords ? { lat: coords.latitude, lng: coords.longitude } : DEFAULT_CENTER
  const visiblePlaces = places
    .filter((place) => activeType === '전체' || place.type === activeType)
    .filter((place) => place.name.includes(query.trim()))
    .sort((a, b) => a.distance - b.distance)

  useEffect(() => {
    let cancelled = false
    loadKakaoMaps(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY).then((maps) => {
      if (cancelled || !mapRef.current) return
      kakaoRef.current = maps
      kakaoMapRef.current = new maps.Map(mapRef.current, {
        center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: 5,
      })
    }).catch(() => setError('카카오 지도를 불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const maps = kakaoRef.current
    const map = kakaoMapRef.current
    if (!maps || !map) return

    markers.current.forEach((marker) => marker.setMap(null))
    markers.current = []

    const currentMarker = new maps.Marker({
      map,
      position: new maps.LatLng(center.lat, center.lng),
      image: pinImage(maps, PIN_COLOR.current),
    })
    markers.current.push(currentMarker)

    visiblePlaces.forEach((place) => {
      const marker = new maps.Marker({
        map,
        position: new maps.LatLng(place.lat, place.lng),
        image: pinImage(maps, PIN_COLOR[place.type]),
      })
      markers.current.push(marker)
    })

    map.setCenter(new maps.LatLng(center.lat, center.lng))
    map.setLevel(coords ? 4 : 5)
  }, [coords, center.lat, center.lng, visiblePlaces])

  const findMe = () => {
    const searchNear = async (lat, lng) => {
      try {
        const response = await fetch(`/api/nearby-places?lat=${lat}&lng=${lng}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setPlaces(Array.isArray(data.places) ? data.places : [])
      } catch {
        setError((current) => current ?? '주변 장소를 불러오지 못했어요.')
      } finally {
        setLocating(false)
        setPlacesLoading(false)
      }
    }

    if (!navigator.geolocation) {
      setError('이 기기에서는 위치 확인을 지원하지 않아요. 서울 시청 기준으로 보여드릴게요.')
      searchNear(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition((position) => {
      setCoords(position.coords)
      searchNear(position.coords.latitude, position.coords.longitude)
    }, (positionError) => {
      setError(
        positionError.code === 1
          ? '브라우저 위치 권한을 허용해주세요. 우선 서울 시청 기준으로 보여드릴게요.'
          : '현재 위치를 확인하지 못했어요. 우선 서울 시청 기준으로 보여드릴게요.'
      )
      searchNear(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  useEffect(() => {
    const timer = window.setTimeout(findMe, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="page">
      <h1>가까운 병원·약국</h1>
      <input
        type="search"
        placeholder="병원 또는 약국 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="병원 또는 약국 검색"
      />
      <div className="nearby-tabs" role="tablist" aria-label="인근 장소 종류">
        {TABS.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={activeType === type}
            className={activeType === type ? '' : 'secondary'}
            onClick={() => setActiveType(type)}
          >
            {type}
          </button>
        ))}
      </div>
      <button type="button" className="secondary" onClick={findMe} disabled={locating}>
        {locating ? '📍 위치 확인 중...' : '📍 내 위치로 지도 이동'}
      </button>
      <div className="map-legend row">
        <span><i className="legend-dot current" /> 내 위치</span>
        <span><i className="legend-dot hospital" /> 병원</span>
        <span><i className="legend-dot pharmacy" /> 약국</span>
      </div>
      <div ref={mapRef} className="nearby-map" aria-label="현재 위치와 인근 병원 약국 지도" />
      {error && <p className="muted">{error}</p>}
      <div className="stack">
        {placesLoading && <p className="muted">주변 {activeType === '전체' ? '병원·약국을' : activeType === '병원' ? '병원을' : '약국을'} 검색 중입니다.</p>}
        {visiblePlaces.map((place) => {
          const status = estimateBusinessStatus(place.type)
          return (
            <div key={`${place.name}-${place.lat}`} className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{place.type} · {place.name}</h2>
                <span className={`badge ${STATUS_BADGE_CLASS[status.tone]}`}>{status.label}</span>
              </div>
              <p className="muted">{formatDistance(place.distance)} · {place.address || '주소 정보 없음'}</p>
              <p className="muted">{place.phone || '전화번호 정보 없음'}</p>
              {place.url && <a className="button secondary" href={place.url} target="_blank" rel="noreferrer">길찾기</a>}
            </div>
          )
        })}
        {!placesLoading && !visiblePlaces.length && (
          <p className="muted">주변에 등록된 {activeType === '전체' ? '병원·약국' : activeType} 정보가 없어요.</p>
        )}
      </div>
    </div>
  )
}
