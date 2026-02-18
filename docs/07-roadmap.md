# 7) 단계별 구현 로드맵

## MVP (2~3주)
- 매크로 CRUD
- step 타입: CLICK/TYPE/WAIT/SCROLL/ASSERT_EXISTS
- recorder: click/input/scroll + EVENT_DELAY
- runner: repeat/retry/on_fail stop-skip
- allowlist + 기본 민감정보 마스킹
- local storage 저장

## v1
- IF/GOTO/LABEL 분기
- KEY/MOVE step 옵션
- MERGE_UP_DOWN 고급 모드
- 누적 수행 시간/상세 로그
- 확장 popup + background lock 강화

## v2
- 팀 공유/동기화 backend
- 실행 이력 서버 저장
- 템플릿 함수 확장(RAND/UUID)
- 고급 정책(도메인 그룹/role 기반 권한)
- 시각 회귀 테스트 + 매크로 신뢰도 점수

