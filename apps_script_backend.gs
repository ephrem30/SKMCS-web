// ============================================================
// 한국음악학회 홈페이지 — Google Apps Script 백엔드
// 이 파일을 Google Apps Script에 그대로 붙여넣으세요.
// ============================================================

const SHEET_NAMES = {
  users:      "회원목록",
  notices:    "공지사항",
  freeboard:  "자유게시판",
  submissions:"논문투고",
};

// ── CORS 헤더 포함 응답 생성 ──
function makeResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── 시트가 없으면 자동 생성 ──
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // 각 시트에 헤더 설정
    if (name === SHEET_NAMES.users) {
      sheet.appendRow([
        "email","name","password","role","affiliation","phone","birth",
        "position","career","address","home_phone","home_address",
        "work_phone","work_address","edu_university","edu_univ_major",
        "edu_graduate","edu_grad_major","edu_grad_course","registered_at"
      ]);
    } else if (name === SHEET_NAMES.notices || name === SHEET_NAMES.freeboard) {
      sheet.appendRow([
        "id","type","category","title","content","author","email",
        "date","views","file","created_at"
      ]);
    } else if (name === SHEET_NAMES.submissions) {
      sheet.appendRow([
        "id","journal","category","title_ko","title_en",
        "abstract_ko","abstract_en","keywords",
        "authors","file_manuscript","file_agreement",
        "date","status","author_email","reviewer_email","created_at"
      ]);
    }
  }
  return sheet;
}

// ── 시트 → JSON 배열 변환 ──
function sheetToJson(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];   // 헤더만 있으면 빈 배열
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ── GET 요청 처리 (데이터 읽기) ──
function doGet(e) {
  try {
    const action = e.parameter.action || "get";
    const sheetKey = e.parameter.sheet;

    if (action === "get") {
      const sheetName = SHEET_NAMES[sheetKey];
      if (!sheetName) return makeResponse({ ok: false, error: "unknown sheet: " + sheetKey });
      const sheet = getOrCreateSheet(sheetName);
      const data = sheetToJson(sheet);
      // 비밀번호는 GET 응답에서 제거 (users 조회 시 보안)
      if (sheetKey === "users") {
        data.forEach(u => { delete u.password; });
      }
      return makeResponse({ ok: true, data: data });
    }

    return makeResponse({ ok: false, error: "Unknown action" });
  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

// ── POST 요청 처리 (쓰기/수정/삭제) ──
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, sheet: sheetKey, data, key, value } = body;

    const sheetName = SHEET_NAMES[sheetKey];
    if (!sheetName) return makeResponse({ ok: false, error: "unknown sheet: " + sheetKey });

    const sheet = getOrCreateSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // ── 추가 ──
    if (action === "add") {
      // 중복 체크 (users: email 기준)
      if (sheetKey === "users") {
        const existing = sheetToJson(sheet);
        const dup = existing.find(u => u.email && u.email.toLowerCase() === (data.email || "").toLowerCase());
        if (dup) return makeResponse({ ok: false, error: "이미 등록된 이메일입니다." });
      }
      data.created_at = new Date().toISOString();
      const row = headers.map(h => {
        // authors 배열은 JSON 문자열로 저장
        if (h === "authors" && Array.isArray(data[h])) return JSON.stringify(data[h]);
        return data[h] !== undefined ? data[h] : "";
      });
      sheet.appendRow(row);
      return makeResponse({ ok: true, message: "저장 완료" });
    }

    // ── 수정 ──
    if (action === "update") {
      const keyCol = headers.indexOf(key) + 1;
      if (keyCol === 0) return makeResponse({ ok: false, error: "key 컬럼 없음: " + key });
      const colValues = sheet.getRange(2, keyCol, Math.max(sheet.getLastRow()-1,1), 1).getValues();
      const rowIdx = colValues.findIndex(r => String(r[0]).toLowerCase() === String(value).toLowerCase());
      if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 레코드를 찾을 수 없습니다." });
      const actualRow = rowIdx + 2;
      Object.keys(data).forEach(field => {
        const colIdx = headers.indexOf(field) + 1;
        if (colIdx > 0) {
          const v = Array.isArray(data[field]) ? JSON.stringify(data[field]) : data[field];
          sheet.getRange(actualRow, colIdx).setValue(v);
        }
      });
      return makeResponse({ ok: true, message: "수정 완료" });
    }

    // ── 삭제 ──
    if (action === "delete") {
      const keyCol = headers.indexOf(key) + 1;
      if (keyCol === 0) return makeResponse({ ok: false, error: "key 컬럼 없음: " + key });
      const colValues = sheet.getRange(2, keyCol, Math.max(sheet.getLastRow()-1,1), 1).getValues();
      const rowIdx = colValues.findIndex(r => String(r[0]).toLowerCase() === String(value).toLowerCase());
      if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 레코드를 찾을 수 없습니다." });
      sheet.deleteRow(rowIdx + 2);
      return makeResponse({ ok: true, message: "삭제 완료" });
    }

    // ── 로그인 인증 (비밀번호 포함 조회) ──
    if (action === "login") {
      const sheet2 = getOrCreateSheet(SHEET_NAMES.users);
      const users = sheetToJson(sheet2);
      const user = users.find(u =>
        u.email && u.email.toLowerCase() === (data.email || "").toLowerCase()
      );
      if (!user) return makeResponse({ ok: false, error: "등록된 회원이 아닙니다." });
      if (user.password !== data.password) return makeResponse({ ok: false, error: "비밀번호가 올바르지 않습니다." });
      // 비밀번호 제거 후 반환
      const safeUser = Object.assign({}, user);
      delete safeUser.password;
      return makeResponse({ ok: true, user: safeUser });
    }

    // ── 이메일 중복 확인 ──
    if (action === "checkEmail") {
      const sheet2 = getOrCreateSheet(SHEET_NAMES.users);
      const users = sheetToJson(sheet2);
      const exists = users.some(u =>
        u.email && u.email.toLowerCase() === (data.email || "").toLowerCase()
      );
      return makeResponse({ ok: true, exists: exists });
    }

    return makeResponse({ ok: false, error: "Unknown action: " + action });

  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}
