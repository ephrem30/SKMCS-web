// ============================================================
// 한국음악학회 홈페이지 — Google Apps Script 백엔드
// 이 파일을 Google Apps Script에 그대로 붙여넣으세요.
// ============================================================

const SHEET_NAMES = {
  users:       "회원목록",
  notices:     "공지사항",
  freeboard:   "자유게시판",
  submissions: "논문투고",
};

// 구글 드라이브 폴더 이름 상수 (한 곳에서 관리)
const DRIVE_FOLDER = {
  members:     "한국음악학회_회원가입서류",
  submissions: "한국음악학회_논문투고파일",
};

// ── CORS 헤더 포함 응답 생성 ──
function makeResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 시트가 없으면 자동 생성 ──
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_NAMES.users) {
      sheet.appendRow([
        "email","name","password","role","affiliation","phone","birth",
        "position","career","address","home_phone","home_address",
        "work_phone","work_address","edu_university","edu_univ_major",
        "edu_graduate","edu_grad_major","edu_grad_course","registered_at",
        "document_url"
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
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ── POST 바디 파싱 헬퍼 ──
// _dbPostDirect 가 보내는 application/x-www-form-urlencoded 형식 지원:
//   body: "post_data=<URL인코딩된 JSON>"
// _dbPost 가 보내는 GET 파라미터 우회 방식도 동일하게 처리.
function parseBody(e) {
  // 1순위: GET 파라미터에 post_data가 있는 경우 (CORS 우회 GET 방식)
  if (e.parameter && e.parameter.post_data) {
    return JSON.parse(decodeURIComponent(e.parameter.post_data));
  }

  // 2순위: POST body에 데이터가 있는 경우
  if (e.postData && e.postData.contents) {
    const raw = e.postData.contents;

    // x-www-form-urlencoded: "post_data=<JSON>"
    if (raw.startsWith("post_data=")) {
      const jsonStr = decodeURIComponent(raw.slice("post_data=".length));
      return JSON.parse(jsonStr);
    }

    // 순수 JSON body (fallback)
    return JSON.parse(raw);
  }

  throw new Error("전송된 데이터가 없습니다.");
}

// ── GET 요청 처리 (데이터 읽기 + POST 우회) ──
function doGet(e) {
  try {
    // POST 데이터가 GET 파라미터로 전달된 경우 doPost로 위임
    if (e.parameter && e.parameter.post_data) {
      const body = parseBody(e);
      const fakeEvent = { postData: null, parameter: { post_data: JSON.stringify(body) } };
      // 재파싱 루프를 피하기 위해 직접 doPost에 body 전달
      return handleWrite(body);
    }

    const action = e.parameter.action || "get";
    const sheetKey = e.parameter.sheet;

    if (action === "get") {
      const sheetName = SHEET_NAMES[sheetKey];
      if (!sheetName) return makeResponse({ ok: false, error: "unknown sheet: " + sheetKey });
      const sheet = getOrCreateSheet(sheetName);
      const data = sheetToJson(sheet);
      if (sheetKey === "users") {
        data.forEach(u => { delete u.password; });
      }
      return makeResponse({ ok: true, data: data });
    }

    return makeResponse({ ok: false, error: "Unknown GET action" });
  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

// ── POST 요청 처리 ──
function doPost(e) {
  try {
    const body = parseBody(e);
    return handleWrite(body);
  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

// ── 실제 쓰기 로직 (doGet/doPost 공통 사용) ──
function handleWrite(body) {
  try {
    const { action, sheet: sheetKey, data, key, value } = body;

    const sheetName = SHEET_NAMES[sheetKey];
    if (!sheetName) return makeResponse({ ok: false, error: "unknown sheet: " + sheetKey });

    const sheet = getOrCreateSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // ── 추가 ──
    if (action === "add") {

      // [회원가입] 중복 이메일 체크 + 파일 업로드
      if (sheetKey === "users") {
        const existing = sheetToJson(sheet);
        const dup = existing.find(u =>
          u.email && u.email.toLowerCase() === (data.email || "").toLowerCase()
        );
        if (dup) return makeResponse({ ok: false, error: "이미 등록된 이메일입니다." });

        // 회원가입 첨부 서류 업로드 (파일이 있을 때만)
        if (data.fileData && data.fileData.base64) {
          try {
            data.document_url = uploadFileToDrive(data.fileData, data.name || "미상");
          } catch (uploadErr) {
            // 파일 업로드 실패해도 회원가입 자체는 계속 진행 (URL은 빈값으로 저장)
            Logger.log("회원가입 파일 업로드 실패(무시): " + uploadErr.message);
            data.document_url = "";
          }
          delete data.fileData;
        }

        // 구버전 스프레드시트에 document_url 컬럼이 없을 경우 자동 추가
        if (headers.indexOf("document_url") === -1) {
          headers.push("document_url");
          sheet.getRange(1, headers.length).setValue("document_url");
        }
      }

      // [논문 투고] 파일 업로드
      if (sheetKey === "submissions") {
        if (data.file_manuscript_data && data.file_manuscript_data.base64) {
          try {
            data.file_manuscript = uploadSubmissionFileToDrive(
              data.file_manuscript_data, data.title_ko || "논문", "원고"
            );
          } catch (uploadErr) {
            Logger.log("원고 파일 업로드 실패(무시): " + uploadErr.message);
            data.file_manuscript = "";
          }
          delete data.file_manuscript_data;
        }

        if (data.file_agreement_data && data.file_agreement_data.base64) {
          try {
            data.file_agreement = uploadSubmissionFileToDrive(
              data.file_agreement_data, data.title_ko || "논문", "저작권동의서"
            );
          } catch (uploadErr) {
            Logger.log("동의서 파일 업로드 실패(무시): " + uploadErr.message);
            data.file_agreement = "";
          }
          delete data.file_agreement_data;
        }
      }

      data.created_at = new Date().toISOString();

      // 헤더에 없는 필드가 있으면 자동으로 컬럼 추가 (스키마 자동 확장)
      Object.keys(data).forEach(field => {
        if (headers.indexOf(field) === -1) {
          headers.push(field);
          sheet.getRange(1, headers.length).setValue(field);
        }
      });

      // 전화번호 필드 목록 — 구글 시트가 숫자로 인식해 앞자리 0을 삭제하는 것을 방지하기 위해
      // 저장 전에 문자열 앞에 아포스트로피(')를 붙여 강제로 텍스트 셀로 저장합니다.
      const PHONE_FIELDS = ["phone", "home_phone", "work_phone"];
      const row = headers.map(h => {
        if (h === "authors" && Array.isArray(data[h])) return JSON.stringify(data[h]);
        const v = data[h] !== undefined ? data[h] : "";
        // 전화번호 필드이고 값이 있으면 앞에 ' 붙여 텍스트로 강제 저장
        if (PHONE_FIELDS.includes(h) && v !== "") return "'" + String(v);
        return v;
      });
      sheet.appendRow(row);
      return makeResponse({ ok: true, message: "저장 완료" });
    }

    // ── 수정 ──
    if (action === "update") {
      Object.keys(data).forEach(field => {
        if (headers.indexOf(field) === -1) {
          headers.push(field);
          sheet.getRange(1, headers.length).setValue(field);
        }
      });

      const keyCol = headers.indexOf(key) + 1;
      if (keyCol === 0) return makeResponse({ ok: false, error: "key 컬럼 없음: " + key });
      const colValues = sheet.getRange(2, keyCol, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
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
      const colValues = sheet.getRange(2, keyCol, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
      const rowIdx = colValues.findIndex(r => String(r[0]).toLowerCase() === String(value).toLowerCase());
      if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 레코드를 찾을 수 없습니다." });
      sheet.deleteRow(rowIdx + 2);
      return makeResponse({ ok: true, message: "삭제 완료" });
    }

    // ── 로그인 인증 ──
    if (action === "login") {
      const sheet2 = getOrCreateSheet(SHEET_NAMES.users);
      const users = sheetToJson(sheet2);
      const inputEmail = (data.email || "").toLowerCase().trim();
      const user = users.find(u => {
        if (!u.email) return false;
        const dbEmail = u.email.toLowerCase().trim();
        if (dbEmail === inputEmail) return true;
        if (!inputEmail.includes("@") && dbEmail.split("@")[0] === inputEmail) return true;
        return false;
      });
      if (!user) return makeResponse({ ok: false, error: "등록된 회원이 아닙니다." });
      if (user.password !== data.password) return makeResponse({ ok: false, error: "비밀번호가 올바르지 않습니다." });
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

    // ── 논문 파일 전용 업로드 (2단계 분리 전송) ──
    // 텍스트 데이터 저장 후 파일만 별도로 전송해 드라이브에 업로드하고 시트 URL 갱신
    if (action === "uploadSubmissionFiles") {
      const submissionId = body.id;
      const paperTitle   = body.title_ko || "논문";
      const msData       = body.file_manuscript_data;
      const agData       = body.file_agreement_data;

      if (!submissionId) return makeResponse({ ok: false, error: "투고 ID가 없습니다." });

      const subSheet  = getOrCreateSheet(SHEET_NAMES.submissions);
      const subHeaders = subSheet.getRange(1, 1, 1, subSheet.getLastColumn()).getValues()[0];
      const idCol     = subHeaders.indexOf("id") + 1;
      if (idCol === 0) return makeResponse({ ok: false, error: "id 컬럼 없음" });

      const colValues = subSheet.getRange(2, idCol, Math.max(subSheet.getLastRow() - 1, 1), 1).getValues();
      const rowIdx    = colValues.findIndex(r => String(r[0]) === String(submissionId));
      if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 투고 레코드를 찾을 수 없습니다: " + submissionId });
      const actualRow = rowIdx + 2;

      const updateFields = {};

      if (msData && msData.base64) {
        try {
          updateFields.file_manuscript = uploadSubmissionFileToDrive(msData, paperTitle, "원고");
        } catch (e) {
          Logger.log("원고 업로드 실패: " + e.message);
          updateFields.file_manuscript = "[업로드 실패] " + msData.name;
        }
      }
      if (agData && agData.base64) {
        try {
          updateFields.file_agreement = uploadSubmissionFileToDrive(agData, paperTitle, "저작권동의서");
        } catch (e) {
          Logger.log("동의서 업로드 실패: " + e.message);
          updateFields.file_agreement = "[업로드 실패] " + agData.name;
        }
      }

      // 시트 URL 갱신
      Object.keys(updateFields).forEach(field => {
        const colIdx = subHeaders.indexOf(field) + 1;
        if (colIdx > 0) subSheet.getRange(actualRow, colIdx).setValue(updateFields[field]);
      });

      return makeResponse({ ok: true, message: "파일 업로드 완료", urls: updateFields });
    }

    return makeResponse({ ok: false, error: "Unknown action: " + action });


  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

// ============================================================
// ── 구글 드라이브 업로드 헬퍼 ──
// ============================================================

// 지정된 이름의 폴더를 가져오거나 없으면 새로 생성
function getDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  const newFolder = DriveApp.createFolder(folderName);
  // 링크가 있는 누구나 뷰어로 접근 가능하도록 설정
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

// 파일 base64 → Blob → 드라이브 저장 → 공유 URL 반환
function saveFileToDrive(fileData, folder, fileName) {
  const decoded = Utilities.base64Decode(fileData.base64);
  const blob = Utilities.newBlob(decoded, fileData.mimeType || "application/octet-stream", fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// 회원가입 서류 업로드
// 저장 폴더: 한국음악학회_회원가입서류
// 파일명 형식: YYYYMMDD_이름_원본파일명
function uploadFileToDrive(fileData, userName) {
  const folder = getDriveFolder(DRIVE_FOLDER.members);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safeName = (userName || "미상").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  const fileName = dateStr + "_" + safeName + "_" + (fileData.name || "서류");
  return saveFileToDrive(fileData, folder, fileName);
}

// 논문 투고 파일 업로드
// 저장 폴더: 한국음악학회_논문투고파일
// 파일명 형식: YYYYMMDD_논문제목(15자)_구분(원고/저작권동의서)_원본파일명
function uploadSubmissionFileToDrive(fileData, paperTitle, fileType) {
  const folder = getDriveFolder(DRIVE_FOLDER.submissions);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const cleanTitle = (paperTitle || "논문").substring(0, 15).replace(/[\s\x00-\x1F\x7F<>:"/\\|?*]/g, "_");
  const label = fileType || "파일";
  const fileName = dateStr + "_" + cleanTitle + "_" + label + "_" + (fileData.name || "파일");
  return saveFileToDrive(fileData, folder, fileName);
}
