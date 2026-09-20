let loadPromise

export function loadKakaoAuth(appKey) {
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
    script.onload = () => {
      window.Kakao.init(appKey)
      resolve(window.Kakao)
    }
    script.onerror = () => reject(new Error('카카오 로그인을 불러오지 못했어요.'))
    document.head.appendChild(script)
  })
  return loadPromise
}

export function kakaoRedirectUri() {
  return `${window.location.origin}/login`
}

// The current Kakao JS SDK only supports the redirect-based OAuth flow
// (Auth.authorize) — the old popup-based Auth.login() no longer exists.
// This navigates the whole page away to Kakao's consent screen.
export async function startKakaoLogin(appKey) {
  const Kakao = await loadKakaoAuth(appKey)
  Kakao.Auth.authorize({ redirectUri: kakaoRedirectUri() })
}

export async function exchangeKakaoCode(code) {
  const url = `/api/kakao-profile?code=${encodeURIComponent(code)}&redirectUri=${encodeURIComponent(kakaoRedirectUri())}`
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '카카오 로그인에 실패했어요.')
  return data.nickname
}
