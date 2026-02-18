# 화면 녹화 및 ROI 설계

## v1 (필수)
- `getDisplayMedia`로 화면/창/탭 녹화
- `MediaRecorder`로 chunk 수집
- `SCREENREC_MARK_EVT`로 run step 마커 기록
- 저장 정책: 기본 `LOCAL_ONLY`, 선택적 업로드는 사용자 동의 필요

## v2 (선택)
- ROI 지정(드래그 박스)
- `SCREEN_CLICK` step(탭 내부 좌표 클릭)
- 제약 명시: OS 전역 클릭 불가

## v2~v3 (선택)
- OCR 기반 `SCREEN_ASSERT_TEXT`
- 템플릿 기반 `SCREEN_FIND_IMAGE`
- 자동 클릭 연계 시 승인 모드 기본 ON
