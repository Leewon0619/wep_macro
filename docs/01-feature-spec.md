# 1) 기능 명세서: 원본 ↔ 웹 매핑

## 1. 원본 구조 매핑

| 원본 항목 | 웹 항목 | 상태 | 비고 |
|---|---|---|---|
| `sMacro.name[256]` | `Macro.name` | 지원 | 문자열 길이 제한 256 |
| `start_key`, `stop_key` | `Macro.shortcut.startKey`, `stopKey` | 지원 | up/down 비트 규칙 유지 |
| `repeat_cnt` | `Macro.repeatCnt` | 지원 | `0=무한` 동일 |
| `_item[0]=MI_NONE` | `items[0].type="NONE"` | 지원 | 실행 시작 index=1 |
| `index`, `delay`, `run_count` | `run.runtime.index/delayRemain/runCount` | 지원 | 상태 머신 동일 |
| `vk_pressed[256]` | `run.runtime.heldInputs` | 대체 | 웹은 OS 레벨 전부 제어 불가 |

## 2. 스텝 타입 매핑

| 원본 | 웹 타입 | 상태 | 비고 |
|---|---|---|---|
| `MI_NONE` | `NONE` | 지원 | 더미 |
| `MI_KEY` | `KEY` | 부분 지원 | 확장에서만 제한 지원 |
| `MI_MOUSE` | `CLICK`, `SCROLL`, `MOVE` | 대체 | DOM 기반 실행 |
| `MI_DELAY` | `WAIT` | 지원 | ms 단위 동일 |
| - | `TYPE` | 추가 | 웹 폼 입력 |
| - | `ASSERT_EXISTS` | 추가 | 안정성 강화 |
| - | `IF/GOTO/LABEL` | 추가 | 분기/반복 제어 |

## 3. 실행 규칙 매핑

| 원본 규칙 | 웹 구현 |
|---|---|
| `AllMacroStep(dt)` 주기 실행 | async 루프 + step timeout/retry |
| `0 < index < _item.size()`만 실행 | 동일 |
| KEY/MOUSE 즉시 `index++` | CLICK/TYPE/SCROLL/ASSERT 성공 시 `index++` |
| DELAY는 카운트 감소 후 진행 | WAIT step 처리 |
| 끝 도달 시 run_count++, repeat 판단 | 동일 |
| `repeat_cnt=0` 무한 | 동일 + 안전 시간 제한 |
| 종료 시 `ReleaseAllKeys` | 유지형 입력 해제(cleanupHeldInputs) |

## 4. 녹화 규칙 매핑

| 원본 옵션 | 웹 옵션 | 상태 |
|---|---|---|
| `KEYBOARD_KEY_REC` | keyboardRecord | 부분 지원(확장) |
| `MOUSE_BUTTON_REC` | mouseButtonRecord | 지원 |
| `MOUSE_POSITION_REC` | mouseMoveRecord | 지원(기본 off) |
| `MOUSE_WHEEL_REC` | mouseWheelRecord | 지원 |
| `EVENT_DELAY` | eventDelay | 지원 |
| `MERGE_UP_DOWN` | mergeDownUp | 지원 |
| `recMouseDistance` | rec.mouseDistancePx | 지원 |
| `recEventTimeInterval` | rec.eventDelayThresholdMs | 지원 |

## 5. 저장 포맷

- 원본: 바이너리 dump
- 웹: JSON 스키마(`schemas/macro.schema.json`) 채택
- 필수 필드(name/start/stop/repeat/items/runtime snapshot) 보존

## 6. 추가 구현 예정 기능 매핑

| 원본 README 예정 | 웹 설계 |
|---|---|
| 상대 이동(dx,dy) | `MOVE` step with element-relative offsets |
| 랜덤 문자 | 템플릿 함수 `{{RAND_INT}}`, `{{RAND_STR}}`, `{{UUID}}` |
| 단축키 포지션 캡처 | picker toggle shortcut |
| 누적 수행시간 | run log에 step/누적 시간 컬럼 |
| 종료 시 up 처리 | cleanupHeldInputs |
| 동시 실행 중복 배제 | tab/macro mutex lock |

