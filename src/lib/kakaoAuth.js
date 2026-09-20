export function kakaoRedirectUri() {
  return `${window.location.origin}/login`
}

// Plain REST-API-key OAuth redirect — no JS SDK involved. Kakao's docs call
// for the REST API key (not the JavaScript key) as client_id at both this
// step and the server-side token exchange; mixing key types across the two
// steps is what was causing KOE101.
export function startKakaoLogin(restApiKey) {
  const params = new URLSearchParams({
    client_id: restApiKey,
    redirect_uri: kakaoRedirectUri(),
    response_type: 'code',
  })
  window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
}

export async function exchangeKakaoCode(code) {
  const url = `/api/kakao-profile?code=${encodeURIComponent(code)}&redirectUri=${encodeURIComponent(kakaoRedirectUri())}`
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '카카오 로그인에 실패했어요.')
  return data.nickname
}
