# ESMAP 알람 시스템

Google Sheets 출근 데이터에서 특정 일자에 0으로 표시된 인원을 찾아 JSON으로 반환하는 시스템입니다.

## 시트 구조

```
| 순번 | 본부 | 지점 | AM | FM | FSR | 사번 | 1 | 2 | 3 | ... | 31 | 계 |
|------|------|------|----|----|-----|------|---|---|---|-----|----|----|
|      |      |      |    |    |     |      | 목| 금| 토|     |    |    |
| 1    |강남1본부|알파&평택|김지훈| |강지호|32614| 0| 4| 0|     |    | 23|
| 2    |강남1본부|알파&평택|김지훈|윤연주|이수영|37593| 4| 3| 4|  |    | 64|
```

- **1행**: 헤더 (순번, 본부, 지점, AM, FM, FSR, 사번, 1~31일, 계)
- **2행**: 요일 (목, 금, 토, 일, ...)
- **3행~**: 실제 데이터

## 설치 방법

### 1. Google Apps Script 설정

1. Google Sheets 열기
2. **확장 프로그램** > **Apps Script** 클릭
3. `google-apps-script/Code.gs` 내용 전체 복사 후 붙여넣기
4. 시트 이름이 `Sheet1`이 아니면 `CONFIG.SHEET_NAME` 수정

### 2. 웹 앱으로 배포

1. Apps Script에서 **배포** > **새 배포** 클릭
2. 유형: **웹 앱** 선택
3. 설정:
   - 설명: "ESMAP 알람 API"
   - 실행 계정: **본인**
   - 액세스 권한: **모든 사용자**
4. **배포** 클릭 후 웹 앱 URL 복사

### 3. Make.com 시나리오 설정

1. **Google Sheets** > **Watch Changes** 모듈 추가 (트리거)
2. **HTTP** > **Make a request** 모듈 추가
   - URL: 배포된 웹 앱 URL
   - Method: GET
3. (선택) 특정 일자 조회: URL에 `?day=17` 파라미터 추가
4. 결과 처리 모듈 추가 (Slack, Email 등)

## API 사용법

### 오늘 날짜 기준 조회
```
GET https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec
```

### 특정 일자 조회
```
GET https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec?day=17
```

## API 응답 예시

1일 기준으로 0인 인원 조회 시:

```json
{
  "success": true,
  "date": "2025-01-01",
  "day": 1,
  "dayOfWeek": "목",
  "count": 3,
  "members": [
    {
      "순번": 1,
      "본부": "강남1본부",
      "지점": "알파&평택지점",
      "AM": "김지훈",
      "FM": "",
      "FSR": "강지호",
      "사번": 32614,
      "값": 0,
      "행번호": 3
    },
    {
      "순번": 8,
      "본부": "강남1본부",
      "지점": "알파&평택지점",
      "AM": "김지훈",
      "FM": "",
      "FSR": "두영민",
      "사번": 77080,
      "값": 0,
      "행번호": 10
    }
  ],
  "message": "1일(목) 기준 3명이 0으로 표시되어 있습니다."
}
```

## 설정 옵션

`Code.gs` 상단의 `CONFIG` 객체에서 수정:

```javascript
const CONFIG = {
  SHEET_NAME: 'Sheet1',      // 시트 이름
  COL_SEQUENCE: 1,           // 순번 열 (A)
  COL_BONBU: 2,              // 본부 열 (B)
  COL_JIJEM: 3,              // 지점 열 (C)
  COL_AM: 4,                 // AM 열 (D)
  COL_FM: 5,                 // FM 열 (E)
  COL_FSR: 6,                // FSR 열 (F)
  COL_SABUN: 7,              // 사번 열 (G)
  COL_DAY_START: 8,          // 일별 데이터 시작 열 (H = 1일)
  ROW_HEADER: 1,             // 헤더 행
  ROW_DAYOFWEEK: 2,          // 요일 행
  ROW_DATA_START: 3          // 데이터 시작 행
};
```

## 테스트

Apps Script 에디터에서 다음 함수를 실행하여 테스트:

- `testFindZeroForToday()` - 오늘 날짜 기준 테스트
- `test1st()` - 1일 기준 테스트
- `test17th()` - 17일 기준 테스트

## Make.com 시나리오 예시

```
[Google Sheets Watch Changes]
         ↓
[HTTP Request - GET 웹앱 URL]
         ↓
[Router]
   ├─ count > 0 → [Slack 메시지 발송]
   └─ count = 0 → (종료)
```

## 라이선스

MIT
