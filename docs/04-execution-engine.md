# 4) 실행 엔진 설계서

## 상태 머신
- `idle -> running <-> paused -> success|fail|stopped`

## 런타임 상태
- `index`: 현재 step 인덱스 (기본 1)
- `runCount`: 완료 루프 수
- `delayRemainMs`: WAIT 진행량
- `cumulativeMs`: 누적 실행 시간
- `heldInputs`: 유지형 입력 추적

## 공통 실행 규칙
1. step 실행 전 allowlist/속도제한/사용자승인 확인
2. `timeoutMs` 안에 대상 탐색
3. 실패 시 `retries` + backoff
4. 그래도 실패하면 `onFail` 처리
   - `stop`: fail 종료
   - `skip`: 다음 step
   - `goto`: label jump

## repeat 규칙
- `repeatCnt == 0`: 무한
- `repeatCnt > 0`: runCount < repeatCnt 동안 반복
- 종료 조건 만족 시 success

## 무한 반복 안전장치
- `maxRunMs` 초과 시 강제 stop
- `maxLoopCountWhenInfinite` 초과 시 강제 stop

## 종료 정리
- `cleanupHeldInputs()` 호출
- run lock 해제
- 상태 업데이트 + 로그 flush

