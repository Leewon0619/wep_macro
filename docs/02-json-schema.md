# 2) JSON 스키마 문서

실제 스키마 파일: `schemas/macro.schema.json`

핵심 엔터티:
- `Macro`
- `MacroStep`
- `RunRecord`
- `RunLog`

## Macro
- `id`: 문자열
- `name`: 문자열(<=256)
- `startKey`: number (VK + optional KEY_UP bit)
- `stopKey`: number (VK + optional KEY_UP bit)
- `repeatCnt`: number (`0`=무한)
- `items`: `MacroStep[]` (`items[0]=NONE` 권장)
- `options`: allowlist, speed limits, recorder config

## MacroStep
- 공통: `id`, `type`, `enabled`, `timeoutMs`, `retries`, `onFail`
- 타입별 payload:
  - CLICK: `selector`, `button`, `doubleClick`
  - TYPE: `selector`, `textTemplate`, `clearFirst`
  - WAIT: `ms`
  - SCROLL: `pixels` or `selector`
  - ASSERT_EXISTS: `selector`, `timeoutMs`
  - IF: `condition`, `trueLabel`, `falseLabel`
  - GOTO: `label`
  - LABEL: `label`
  - KEY: `keyCode`, `keyAction`(down/up/tap)
  - MOVE: `selector`, `offsetX`, `offsetY`

## RunRecord
- `runId`, `macroId`, `status`
- `startAt`, `endAt`
- `runCount`, `index`, `elapsedMs`

## RunLog
- `timestamp`
- `level` (info/warn/error)
- `stepId`
- `message`
- `durationMs`, `cumulativeMs`

