# 시스템 구성과 책임 분리

## Web App
- 매크로 목록/검색/정렬
- 매크로 편집(스텝/정책/변수)
- 녹화 제어 / 실행 제어
- 로그/실패 지점 편집
- getDisplayMedia 화면 녹화 제어

## Extension (Background)
- 권한/도메인 allowlist enforcement
- 탭 mutex(EXCLUSIVE)
- REC/RUN 명령 라우팅
- 상태 이벤트 전달

## Content Script
- DOM selector 탐색/검증
- CLICK/TYPE/WAIT/SCROLL/ASSERT/SET_VAR/IF/LABEL/GOTO 수행
- recorder 이벤트 수집 -> step 변환
- RUN_LOG_EVT / RUN_STATUS_EVT / RUN_END_EVT 송신

## 메시지 경로
- WEBAPP -> CS(window.postMessage)
- CS -> BG(chrome.runtime.sendMessage)
- BG -> CS(chrome.tabs.sendMessage)
- CS -> WEBAPP(window.postMessage EVT)
