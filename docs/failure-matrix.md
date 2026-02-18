# 실패 유형 매트릭스

| 코드 | 의미 | 기본 처리 | 가이드 |
|---|---|---|---|
| E_DOMAIN_NOT_ALLOWED | 도메인 불일치 | RUN 거부 | allowlist 추가 |
| E_SELECTOR_NOT_FOUND | 요소 미발견 | retry 후 FAIL | 선택자 재캡처 |
| E_VERIFY_FAILED | 검증 실패 | FAIL/분기 | verify 수정 |
| E_TIMEOUT | 대기 초과 | retry 후 FAIL | timeout 증가 |
| E_NOT_INTERACTABLE | 상호작용 불가 | retry 후 FAIL | 스크롤/조건 보강 |
| E_NAVIGATION_CHANGED | 페이지 전환 | 상태 로그 | URL WAIT/ASSERT 추가 |
| E_POLICY_RATE_LIMIT | 속도 제한 | throttle/STOP | 속도 완화 |
| E_GUARD_MAX_DURATION | 최대시간 초과 | STOP | repeat/조건 수정 |
| E_GUARD_MAX_STEPS | 최대스텝 초과 | STOP | 분기 재설계 |
| E_USER_STOP | 사용자 중지 | STOP | - |

로그 필드:
- errorCode
- url
- stepSummary
- screenshotRef(optional)
