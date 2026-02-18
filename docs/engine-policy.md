# 실행/재시도/분기/무한반복 가드 정책

## 표준 실행 절차
1. `RUN_LOG_EVT START`
2. selector 후보 순차 resolve
3. verify rule 검사
4. step action 수행
5. `SUCCESS` 또는 `FAIL`

## 재시도
- step retry 우선, 없으면 macro default
- `RETRY` 로그 emit
- backoff 동안 pause/stop 즉시 반영

## onFail
- `STOP`: run fail
- `SKIP`: 다음 step
- `GOTO`: label jump

## 반복
- `repeatCount=0`은 무한 반복
- 강제 가드:
  - `maxDurationMs`
  - `maxTotalSteps`
  - `maxRepeatsHardLimit`

## 동시 실행
- 탭 단위 EXCLUSIVE lock
- lock 보유 중 `RUN_START_REQ`는 `TAB_LOCKED`

## rate limit
- CLICK/TYPE/SCROLL를 action으로 카운트
- 초당 상한 초과 시 throttle 또는 정책 실패
