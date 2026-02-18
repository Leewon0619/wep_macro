# 3) UI 설계 (와이어프레임 수준)

## 화면 1: 매크로 목록 + 실행
- 좌측: 매크로 목록
  - 추가/복제/삭제
  - 현재 상태 배지(idle/running/paused)
- 상단 퀵 액션:
  - 시작/일시정지/재개/중지
  - 레코더 시작/중지

## 화면 2: 빌더/에디터
- 스텝 리스트(정렬 가능)
- 스텝 추가 버튼(CLICK/TYPE/WAIT/SCROLL/ASSERT/IF/GOTO/LABEL)
- 우측 설정 패널
  - selector, timeout, retries, onFail
  - 타입별 파라미터

## 화면 3: 레코더
- 옵션:
  - KEYBOARD_KEY_REC
  - MOUSE_BUTTON_REC
  - MOUSE_POSITION_REC
  - MOUSE_WHEEL_REC
  - EVENT_DELAY
  - MERGE_UP_DOWN
- 파라미터:
  - mouseDistancePx
  - eventDelayThresholdMs

## 화면 4: 실행 로그
- 행 기준:
  - 시간, step, 결과, 소요(ms), 누적(ms), 메시지
- 필터:
  - error only
  - 현재 run only

## 간결성 원칙
- 기본 탭: "실행" 중심
- 고급 옵션: 접힘(details)
- 최소 클릭: 녹화→저장→실행 3단계

