# WEP Macro Program

명세 기반 구성:
- `web/`: 편집/저장/실행/로그/화면녹화 UI
- `extension/`: 녹화 엔진 + 실행 엔진 + 탭 동시실행 제어
- `schemas/`: Macro JSON 스키마
- `docs/`: 정책/프로토콜/엔진 설계 문서

## 실행

웹앱:
```bash
cd web
python3 -m http.server 8080
```
접속: `http://localhost:8080`

확장:
1. `chrome://extensions`
2. 개발자 모드 ON
3. `압축해제된 확장 프로그램 로드`
4. `extension/` 선택

## 핵심 준수 항목
- Envelope 기반 메시지 프로토콜(`*_REQ/*_RES/*_EVT`)
- Macro/Step JSON 스키마 고정
- 실패/재시도/분기/onFail 정책
- repeatCount=0 무한 반복 + 안전 가드
- 도메인 allowlist 강제
- 민감 입력 차단/마스킹
- getDisplayMedia 화면 녹화 + run step 마커 동기화
