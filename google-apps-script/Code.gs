/**
 * ESMAP 알람 시스템 - Google Apps Script
 *
 * 사용법:
 * 1. Google Sheets에서 확장 프로그램 > Apps Script 열기
 * 2. 이 코드를 붙여넣기
 * 3. 웹 앱으로 배포 (배포 > 새 배포 > 웹 앱)
 * 4. Make.com에서 HTTP 모듈로 이 URL 호출
 *
 * 시트 구조 예시:
 * | 이름   | 2025-01-17 | 2025-01-18 | 2025-01-19 |
 * |--------|------------|------------|------------|
 * | 홍길동 |     1      |     0      |     1      |
 * | 김철수 |     0      |     1      |     1      |
 */

// 설정
const CONFIG = {
  SHEET_NAME: 'Sheet1',  // 시트 이름 (필요시 변경)
  NAME_COLUMN: 1,        // 이름이 있는 열 (A=1)
  DATA_START_ROW: 2,     // 데이터 시작 행 (헤더 제외)
  DATE_START_COLUMN: 2   // 날짜 데이터 시작 열 (B=2)
};

/**
 * 웹 앱 엔드포인트 (GET 요청)
 * Make.com에서 이 URL을 호출하면 JSON 응답 반환
 */
function doGet(e) {
  try {
    const result = findZeroForToday();
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
 * 오늘 날짜에 0인 인원 찾기
 * @returns {Object} { success: boolean, date: string, count: number, members: Array }
 */
function findZeroForToday() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(`시트 '${CONFIG.SHEET_NAME}'을 찾을 수 없습니다.`);
  }

  const today = getTodayString();
  const todayColumn = findDateColumn(sheet, today);

  if (!todayColumn) {
    return {
      success: true,
      date: today,
      count: 0,
      members: [],
      message: `오늘(${today}) 날짜 열을 찾을 수 없습니다.`
    };
  }

  const members = findMembersWithZero(sheet, todayColumn);

  return {
    success: true,
    date: today,
    count: members.length,
    members: members,
    message: members.length > 0
      ? `${members.length}명이 오늘 0으로 표시되어 있습니다.`
      : '오늘 0으로 표시된 인원이 없습니다.'
  };
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 헤더에서 오늘 날짜에 해당하는 열 찾기
 * @param {Sheet} sheet - 시트 객체
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {number|null} - 열 번호 또는 null
 */
function findDateColumn(sheet, todayStr) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, CONFIG.DATE_START_COLUMN, 1, lastColumn - CONFIG.DATE_START_COLUMN + 1).getValues()[0];

  for (let i = 0; i < headers.length; i++) {
    const headerValue = headers[i];

    // 날짜 객체인 경우
    if (headerValue instanceof Date) {
      const headerDate = formatDate(headerValue);
      if (headerDate === todayStr) {
        return CONFIG.DATE_START_COLUMN + i;
      }
    }
    // 문자열인 경우
    else if (typeof headerValue === 'string') {
      // 다양한 날짜 형식 처리
      const normalized = normalizeDate(headerValue);
      if (normalized === todayStr) {
        return CONFIG.DATE_START_COLUMN + i;
      }
    }
  }

  return null;
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 다양한 날짜 형식을 YYYY-MM-DD로 정규화
 */
function normalizeDate(dateStr) {
  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // MM/DD/YYYY 형식
  const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    return `${match1[3]}-${match1[1].padStart(2, '0')}-${match1[2].padStart(2, '0')}`;
  }

  // YYYY/MM/DD 형식
  const match2 = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match2) {
    return `${match2[1]}-${match2[2].padStart(2, '0')}-${match2[3].padStart(2, '0')}`;
  }

  return dateStr;
}

/**
 * 특정 열에서 값이 0인 인원 목록 반환
 * @param {Sheet} sheet - 시트 객체
 * @param {number} column - 확인할 열 번호
 * @returns {Array} - 0인 인원 목록
 */
function findMembersWithZero(sheet, column) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) {
    return [];
  }

  const numRows = lastRow - CONFIG.DATA_START_ROW + 1;
  const names = sheet.getRange(CONFIG.DATA_START_ROW, CONFIG.NAME_COLUMN, numRows, 1).getValues();
  const values = sheet.getRange(CONFIG.DATA_START_ROW, column, numRows, 1).getValues();

  const members = [];
  for (let i = 0; i < numRows; i++) {
    const value = values[i][0];
    // 0 또는 "0" 또는 빈값을 0으로 처리할지 선택
    if (value === 0 || value === '0') {
      members.push({
        name: names[i][0],
        row: CONFIG.DATA_START_ROW + i,
        value: value
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
 * 특정 날짜로 테스트 (오늘이 아닌 날짜 테스트용)
 * @param {string} dateStr - 테스트할 날짜 (YYYY-MM-DD)
 */
function testWithSpecificDate(dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const column = findDateColumn(sheet, dateStr);

  if (!column) {
    Logger.log(`날짜 ${dateStr}에 해당하는 열을 찾을 수 없습니다.`);
    return;
  }

  const members = findMembersWithZero(sheet, column);
  Logger.log(`날짜: ${dateStr}`);
  Logger.log(`0인 인원: ${JSON.stringify(members, null, 2)}`);
}

/**
 * 시트 변경 시 자동 트리거 (선택사항)
 * 트리거 설정: 편집 > 현재 프로젝트의 트리거 > 트리거 추가
 */
function onEdit(e) {
  // 필요시 여기에 자동 알림 로직 추가
  // 예: 특정 셀이 0으로 변경되면 이메일 발송 등
}
