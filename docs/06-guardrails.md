# 6) 가드레일 설계서

## 1. 도메인 Allowlist
- 매크로별 `allowlist[]`
- 현재 탭 hostname이 목록에 없으면 실행 차단

## 2. 민감정보 보호
- 감지 키워드: `password`, `otp`, `2fa`, `card`, `cvv`, `pin`
- recorder:
  - value 저장 금지 또는 `***` 마스킹
- log:
  - step message 마스킹

## 3. 속도 제한
- `minActionIntervalMs` 기본 80ms
- 초당 액션 한도 초과 시 throttle

## 4. 무한 루프 방지
- `repeatCnt=0`일 때:
  - `maxRunMs` 기본 10분
  - `maxLoopCountWhenInfinite` 기본 1000

## 5. 사용자 승인 UX
- 새 도메인 최초 실행/녹화 시 confirm
- 승인 이력은 로컬 저장

## 6. 충돌 방지 락
- 탭 단위 mutex
- 매크로 단위 mutex
- lock 획득 실패 시 대기 또는 실패 처리

