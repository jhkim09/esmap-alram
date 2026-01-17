/**
 * ESMAP 알람 시스템 - Google Apps Script
 *
 * 사용법:
 * 1. Google Sheets에서 확장 프로그램 > Apps Script 열기
 * 2. 이 코드를 붙여넣기
 * 3. 웹 앱으로 배포 (배포 > 새 배포 > 웹 앱)
 * 4. Make.com에서 HTTP 모듈로 이 URL 호출
 *
 * 시트 구조:
 * | 순번 | 본부 | 지점 | AM | FM | FSR | 사번 | 1 | 2 | 3 | ... | 31 | 계 |
 * |------|------|------|----|----|-----|------|---|---|---|-----|----|----|
 * |      |      |      |    |    |     |      | 목| 금| 토|     |    |    |
 * | 1    | 강남1| 알파 | 김 | 윤 | 강  | 32614| 0 | 4 | 0 |     |    | 23 |
 */

// 설정 - 시트 구조에 맞게 수정됨
const CONFIG = {
  SHEET_NAME: 'Sheet1',      // 시트 이름 (필요시 변경)

  // 열 위치 (A=1, B=2, ...)
  COL_SEQUENCE: 1,           // 순번
  COL_BONBU: 2,              // 본부
  COL_JIJEM: 3,              // 지점
  COL_AM: 4,                 // AM
  COL_FM: 5,                 // FM
  COL_FSR: 6,                // FSR (이름)
  COL_SABUN: 7,              // 사번
  COL_DAY_START: 8,          // 일별 데이터 시작 (1일 = H열 = 8)

  // 행 위치
  ROW_HEADER: 1,             // 헤더 행 (순번, 본부, 지점, ...)
  ROW_DAYOFWEEK: 2,          // 요일 행 (목, 금, 토, ...)
  ROW_DATA_START: 3          // 데이터 시작 행
};

/**
 * 웹 앱 엔드포인트 (GET 요청)
 * Make.com에서 이 URL을 호출하면 JSON 응답 반환
 *
 * 옵션 파라미터:
 * - day: 특정 일자 조회 (예: ?day=17)
 */
function doGet(e) {
  try {
    // URL 파라미터에서 day 값 가져오기 (없으면 오늘 날짜)
    const dayParam = e && e.parameter && e.parameter.day;
    const day = dayParam ? parseInt(dayParam, 10) : new Date().getDate();

    const result = findZeroForDay(day);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 웹 앱 엔드포인트 (POST 요청)
 * Make.com Webhook에서 POST로 호출 시 사용
 */
function doPost(e) {
  return doGet(e);
}

/**
 * 특정 일자에 0인 인원 찾기
 * @param {number} day - 일자 (1-31)
 * @returns {Object} - 결과 객체
 */
function findZeroForDay(day) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(`시트 '${CONFIG.SHEET_NAME}'을 찾을 수 없습니다.`);
  }

  // 유효한 일자 확인
  if (day < 1 || day > 31) {
    throw new Error(`유효하지 않은 일자입니다: ${day}`);
  }

  // 해당 일자의 열 계산 (1일 = 8열, 2일 = 9열, ...)
  const dayColumn = CONFIG.COL_DAY_START + (day - 1);

  // 요일 가져오기 (2행에서)
  const dayOfWeek = sheet.getRange(CONFIG.ROW_DAYOFWEEK, dayColumn).getValue();

  const members = findMembersWithZero(sheet, dayColumn);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    success: true,
    date: dateStr,
    day: day,
    dayOfWeek: dayOfWeek || '',
    count: members.length,
    members: members,
    message: members.length > 0
      ? `${day}일(${dayOfWeek}) 기준 ${members.length}명이 0으로 표시되어 있습니다.`
      : `${day}일(${dayOfWeek}) 기준 0으로 표시된 인원이 없습니다.`
  };
}

/**
 * 오늘 날짜에 0인 인원 찾기 (편의 함수)
 * @returns {Object} - 결과 객체
 */
function findZeroForToday() {
  const today = new Date();
  return findZeroForDay(today.getDate());
}

/**
 * 특정 열에서 값이 0인 인원 목록 반환
 * @param {Sheet} sheet - 시트 객체
 * @param {number} dayColumn - 확인할 열 번호
 * @returns {Array} - 0인 인원 목록
 */
function findMembersWithZero(sheet, dayColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.ROW_DATA_START) {
    return [];
  }

  const numRows = lastRow - CONFIG.ROW_DATA_START + 1;

  // 필요한 데이터 범위 한번에 가져오기 (성능 최적화)
  const dataRange = sheet.getRange(CONFIG.ROW_DATA_START, 1, numRows, dayColumn);
  const data = dataRange.getValues();

  const members = [];
  for (let i = 0; i < numRows; i++) {
    const row = data[i];
    const value = row[dayColumn - 1]; // 해당 일자의 값

    // 0인 경우만 추가 (숫자 0 또는 문자열 "0")
    if (value === 0 || value === '0') {
      members.push({
        순번: row[CONFIG.COL_SEQUENCE - 1],
        본부: row[CONFIG.COL_BONBU - 1],
        지점: row[CONFIG.COL_JIJEM - 1],
        AM: row[CONFIG.COL_AM - 1],
        FM: row[CONFIG.COL_FM - 1],
        FSR: row[CONFIG.COL_FSR - 1],
        사번: row[CONFIG.COL_SABUN - 1],
        값: value,
        행번호: CONFIG.ROW_DATA_START + i
      });
    }
  }

  return members;
}

/**
 * 테스트 함수 - 스크립트 에디터에서 실행하여 결과 확인
 */
function testFindZeroForToday() {
  const result = findZeroForToday();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * 특정 일자로 테스트
 * @param {number} day - 테스트할 일자 (1-31)
 */
function testWithSpecificDay(day) {
  const result = findZeroForDay(day || 17); // 기본값 17일
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * 17일 테스트 (예시 데이터 기준)
 * 모든 인원이 17일에 0을 가지고 있으므로 전체 명단이 반환됨
 */
function test17th() {
  return testWithSpecificDay(17);
}

/**
 * 1일 테스트
 * 1일에 0인 인원만 반환 (강지호, 두영민, 문희광 등)
 */
function test1st() {
  return testWithSpecificDay(1);
}
