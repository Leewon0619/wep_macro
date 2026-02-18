# Web Macro Studio (Key Macro Web Rebuild)

원본 `key_macro1` 동작 규칙을 웹 환경에 맞게 재구현한 프로젝트입니다.

구성:
- `web/`: 매크로 편집/녹화/실행 웹앱(UI)
- `extension/`: 브라우저 확장 실행/녹화 엔진(MV3)
- `docs/`: 설계 산출물 7종
- `schemas/`: JSON 스키마
- `key_macro1/`: 업로드된 원본 C++ 소스(참조)

## 빠른 실행(웹앱)

정적 서버로 `web` 폴더를 열면 됩니다.

예:
```bash
cd web
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 확장 실행(MV3)

1. Chrome -> `chrome://extensions`
2. 개발자 모드 ON
3. `압축해제된 확장 프로그램 로드` 클릭
4. `extension/` 폴더 선택

## 구현 범위

- 원본 핵심 로직 반영:
  - `repeat_cnt=0` 무한 반복
  - `index=1`부터 실행(`item[0]=NONE` 더미)
  - 상태 머신 실행(`idle/running/paused/success/fail/stopped`)
  - 이벤트 지연 삽입/병합 옵션
  - 시작/정지 단축키의 up/down 분리 비트 규칙
- 웹 보안 가드:
  - 도메인 allowlist
  - 민감 입력 마스킹/저장 제한
  - 속도 제한
  - 무한 루프 안전장치
  - 최초 실행 승인

## 산출물 7종

1. `docs/01-feature-spec.md`
2. `docs/02-json-schema.md`
3. `docs/03-ui-design.md`
4. `docs/04-execution-engine.md`
5. `docs/05-recorder-engine.md`
6. `docs/06-guardrails.md`
7. `docs/07-roadmap.md`

