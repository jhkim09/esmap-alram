# ESMAP 알람 시스템

Google Sheets 데이터에서 오늘 날짜에 0으로 표시된 인원을 찾아 JSON으로 반환하는 시스템입니다.

## 시트 구조

```
| 이름   | 2025-01-17 | 2025-01-18 | 2025-01-19 |
|--------|------------|------------|------------|
| 홍길동 |     1      |     0      |     1      |
| 김철수 |     0      |     1      |     1      |
| 이영희 |     1      |     1      |     0      |
```

## 설치 방법

### 1. Google Apps Script 설정

1. Google Sheets 열기
2. **확장 프로그램** > **Apps Script** 클릭
3. `google-apps-script/Code.gs` 내용을 붙여넣기
4. 시트 이름이 다르면 `CONFIG.SHEET_NAME` 수정

### 2. 웹 앱으로 배포

1. Apps Script에서 **배포** > **새 배포** 클릭
2. 유형: **웹 앱** 선택
3. 설정:
   - 실행 계정: **본인**
   - 액세스 권한: **모든 사용자** (Make.com에서 접근 가능하도록)
4. **배포** 클릭 후 URL 복사

### 3. Make.com 시나리오 설정

1. **Google Sheets** > **Watch Changes** 모듈 추가 (트리거)
2. **HTTP** > **Make a request** 모듈 추가
   - URL: 위에서 복사한 웹 앱 URL
   - Method: GET
3. 필요에 따라 결과 처리 모듈 추가 (Slack, Email 등)

## API 응답 예시

```json
{
  "success": true,
  "date": "2025-01-17",
  "count": 2,
  "members": [
    {
      "name": "홍길동",
      "row": 2,
      "value": 0
    },
    {
      "name": "김철수",
      "row": 3,
      "value": 0
    }
  ],
  "message": "2명이 오늘 0으로 표시되어 있습니다."
}
```

## 설정 옵션

`Code.gs` 상단의 `CONFIG` 객체에서 수정:

```javascript
const CONFIG = {
  SHEET_NAME: 'Sheet1',  // 시트 이름
  NAME_COLUMN: 1,        // 이름 열 (A=1, B=2, ...)
  DATA_START_ROW: 2,     // 데이터 시작 행
  DATE_START_COLUMN: 2   // 날짜 시작 열
};
```

## 테스트

Apps Script 에디터에서 `testFindZeroForToday` 함수를 실행하여 결과를 확인할 수 있습니다.

## 라이선스

MIT
