# 5) 녹화 엔진 설계서

## 입력 이벤트
- click/contextmenu/dblclick
- input/change
- scroll
- (옵션) keydown/keyup
- (옵션) mousemove

## 변환 규칙
- click -> CLICK
- input/change -> TYPE
- scroll -> SCROLL
- keydown/keyup -> KEY (옵션)
- mousemove -> MOVE/HOVER (옵션)

## 지연 삽입(AddTimeDelayIf)
- `EVENT_DELAY` 활성 시
- 현재 이벤트 시각 - 마지막 이벤트 시각 >= threshold
- `WAIT(ms=delta)` step 삽입

## 병합(MERGE_UP_DOWN)
- keyup 수신 시 직전이 같은 keydown이면 KEY(tap)로 병합
- mouseup 수신 시 직전이 같은 button down + 동일 좌표면 CLICK으로 병합

## 마우스 이동 기록
- `MOUSE_POSITION_REC` 켠 경우만
- 마지막 기록 지점과 거리 >= `mouseDistancePx` 일 때만 기록

## 민감 정보 처리
- password/otp/card/cvv 필드 감지 시
  - value 미저장
  - 로그 마스킹

