let loadPromise

export function loadKakaoMaps(appKey) {
  if (window.kakao?.maps) return Promise.resolve(window.kakao.maps)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao.maps))
    script.onerror = () => reject(new Error('카카오 지도를 불러오지 못했어요.'))
    document.head.appendChild(script)
  })
  return loadPromise
}

export function pinImage(maps, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">`
    + `<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}"/>`
    + `<circle cx="14" cy="14" r="6" fill="#fff"/></svg>`
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  return new maps.MarkerImage(src, new maps.Size(28, 36), { offset: new maps.Point(14, 36) })
}
