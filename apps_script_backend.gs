// ============================================================
// 한국음악학회 홈페이지 — Google Apps Script 백엔드
// 이 파일을 Google Apps Script에 그대로 붙여넣으세요.
// ============================================================

const SHEET_NAMES = {
  users:            "회원목록",
  notices:          "공지사항",
  freeboard:        "자유게시판",
  seminar_news:     "세미나소식",
  seminars:         "연구모임세미나",
  conferences:      "학술대회",
  past_seminars:    "지난세미나",
  seminar_archive:  "세미나아카이브",
  submissions:      "논문투고",
  forms:            "양식파일",
  journals:         "학회지",
};

const DRIVE_FOLDER = {
  members:     "한국음악학회_회원가입서류",
  submissions: "한국음악학회_논문투고파일",
  forms:       "한국음악학회_양식파일",
  revised:     "한국음악학회_수정논문파일",
  seminars:    "한국음악학회_세미나아카이브",
  journals:    "한국음악학회_학회지PDF",
};

function makeResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_NAMES.users) {
      sheet.appendRow(["email","name","password","role","affiliation","phone","birth","position","career","address","home_phone","home_address","work_phone","work_address","edu_university","edu_univ_major","edu_graduate","edu_grad_major","edu_grad_course","registered_at","document_url"]);
    } else if (name === SHEET_NAMES.notices || name === SHEET_NAMES.freeboard) {
      sheet.appendRow(["id","type","category","title","content","author","email","date","views","file","created_at"]);
    } else if (name === SHEET_NAMES.submissions) {
      sheet.appendRow(["id","journal","category","title_ko","title_en","abstract_ko","abstract_en","keywords","authors","file_manuscript","file_agreement","date","status","author_email","reviewer_email","created_at"]);
    } else if (name === SHEET_NAMES.forms) {
      sheet.appendRow(["id","name","category","date","view_url","download_url","file_ext","created_at"]);
    } else if (name === SHEET_NAMES.journals) {
      sheet.appendRow(["id","volume","number","tonggwon","title","fullTitle","label","bannerInfo","date","cover","pdf","desc","articles","created_at"]);
    } else if (name === SHEET_NAMES.seminar_news) {
      sheet.appendRow(["id","category","title","seminarDate","location","content","link","thumbnail","createdAt","created_at"]);
    } else if (name === SHEET_NAMES.seminars) {
      sheet.appendRow(["id","title","badge","purpose","schedule","organizer","created_at"]);
    } else if (name === SHEET_NAMES.conferences) {
      sheet.appendRow(["id","title","badge","theme","date","place","program","progLink","formLink","created_at"]);
    } else if (name === SHEET_NAMES.past_seminars) {
      sheet.appendRow(["id","title","date","category","place","presenter","theme","notes","created_at"]);
    } else if (name === SHEET_NAMES.seminar_archive) {
      sheet.appendRow(["id","title","seminar_type","date","year","location","presenter","moderator","summary","attachment_file","photos","created_at"]);
    }
  }
  return sheet;
}

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

function parseBody(e) {
  if (e.parameter && e.parameter.post_data) {
    return JSON.parse(decodeURIComponent(e.parameter.post_data));
  }
  if (e.postData && e.postData.contents) {
    const raw = e.postData.contents;
    if (raw.startsWith("post_data=")) {
      return JSON.parse(decodeURIComponent(raw.slice("post_data=".length)));
    }
    return JSON.parse(raw);
  }
  throw new Error("전송된 데이터가 없습니다.");
}

function doGet(e) {
  try {
    if (e.parameter && e.parameter.post_data) {
      return handleWrite(parseBody(e));
    }
    const action = e.parameter.action || "get";
    const sheetKey = e.parameter.sheet;

    // ── 논문 파일 다운로드 URL 조회 ──
    // 요청: ?action=getDownloadUrl&id=FILE_ID
    // 응답: { ok: true, downloadUrl: "https://...", fileName: "..." }
    if (action === "getDownloadUrl") {
      const fileId = e.parameter.id;
      if (!fileId) return makeResponse({ ok: false, error: "파일 ID가 없습니다." });
      try {
        const file = DriveApp.getFileById(fileId);
        // 링크 공유 권한 확인 및 설정
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        // drive.usercontent.google.com 형식: Safari/Chrome/Firefox 모두에서 다운로드 가능
        const downloadUrl = "https://drive.usercontent.google.com/download?id=" + fileId + "&export=download&confirm=t";
        return makeResponse({ ok: true, downloadUrl: downloadUrl, fileName: file.getName() });
      } catch(err) {
        return makeResponse({ ok: false, error: "파일 접근 실패: " + err.message });
      }
    }

    if (action === "get") {
      const sheetName = SHEET_NAMES[sheetKey];
      if (!sheetName) return makeResponse({ ok: false, error: "unknown sheet: " + sheetKey });
      const sheet = getOrCreateSheet(sheetName);
      const data = sheetToJson(sheet);
      if (sheetKey === "users") data.forEach(u => { delete u.password; });
      return makeResponse({ ok: true, data: data });
    }
    return makeResponse({ ok: false, error: "Unknown GET action" });
  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    return handleWrite(parseBody(e));
  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

function handleWrite(body) {
  try {
    const { action, sheet: sheetKey, data, key, value } = body;

    // 파일 업로드 전용 액션 (sheet 키 없음)
    if (action === "uploadSubmissionFiles") return handleFileUpload(body);
    if (action === "addFormFile")           return handleFormFileUpload(body);
    if (action === "uploadMemberDocument")  return handleMemberDocumentUpload(body);
    if (action === "uploadRevisedFiles")    return handleRevisedFileUpload(body);
    if (action === "uploadSeminarFiles")    return handleSeminarFileUpload(body);
    if (action === "uploadJournalPdf")      return handleJournalPdfUpload(body);

    const sheetName = SHEET_NAMES[sheetKey];
    if (!sheetName) return makeResponse({ ok: false, error: "unknown sheet: " + sheetKey });
    const sheet = getOrCreateSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // ── 추가 ──
    if (action === "add") {
      if (sheetKey === "users") {
        const existing = sheetToJson(sheet);
        const dup = existing.find(u => u.email && u.email.toLowerCase() === (data.email || "").toLowerCase());
        if (dup) return makeResponse({ ok: false, error: "이미 등록된 이메일입니다." });
        if (data.fileData && data.fileData.base64) {
          try { data.document_url = uploadFileToDrive(data.fileData, data.name || "미상"); }
          catch (e) { Logger.log("회원가입 파일 업로드 실패: " + e.message); data.document_url = ""; }
          delete data.fileData;
        }
        if (headers.indexOf("document_url") === -1) {
          headers.push("document_url");
          sheet.getRange(1, headers.length).setValue("document_url");
        }
      }

      // ── journals upsert: id가 이미 존재하면 append 대신 update ──
      if (sheetKey === "journals" && data.id) {
        const idColIdx = headers.indexOf("id") + 1;
        if (idColIdx > 0) {
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            const idValues = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
            const existingRowIdx = idValues.findIndex(r => String(r[0]) === String(data.id));
            if (existingRowIdx !== -1) {
              // 이미 존재 → update
              const actualRow = existingRowIdx + 2;
              Object.keys(data).forEach(field => {
                let colIdx = headers.indexOf(field) + 1;
                if (colIdx === 0) {
                  headers.push(field);
                  colIdx = headers.length;
                  sheet.getRange(1, colIdx).setValue(field);
                }
                let val = Array.isArray(data[field]) ? JSON.stringify(data[field]) : data[field];
                sheet.getRange(actualRow, colIdx).setValue(val !== undefined ? val : "");
              });
              return makeResponse({ ok: true, message: "학회지 업데이트 완료 (upsert)" });
            }
          }
        }
      }

      data.created_at = new Date().toISOString();
      Object.keys(data).forEach(field => {
        if (headers.indexOf(field) === -1) {
          headers.push(field);
          sheet.getRange(1, headers.length).setValue(field);
        }
      });

      const PHONE_FIELDS = ["phone", "home_phone", "work_phone"];
      const row = headers.map(h => {
        if (h === "authors"  && Array.isArray(data[h])) return JSON.stringify(data[h]);
        if (h === "articles" && Array.isArray(data[h])) return JSON.stringify(data[h]);
        const v = data[h] !== undefined ? data[h] : "";
        if (PHONE_FIELDS.includes(h) && v !== "") return "'" + String(v);
        return v;
      });
      sheet.appendRow(row);
      return makeResponse({ ok: true, message: "저장 완료" });
    }

    // ── 수정 ──
    if (action === "update") {
      Object.keys(data).forEach(field => {
        if (headers.indexOf(field) === -1) { headers.push(field); sheet.getRange(1, headers.length).setValue(field); }
      });
      const keyCol = headers.indexOf(key) + 1;
      if (keyCol === 0) return makeResponse({ ok: false, error: "key 컬럼 없음: " + key });
      const colValues = sheet.getRange(2, keyCol, Math.max(sheet.getLastRow()-1,1), 1).getValues();
      const rowIdx = colValues.findIndex(r => String(r[0]).toLowerCase() === String(value).toLowerCase());
      if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 레코드를 찾을 수 없습니다." });
      const actualRow = rowIdx + 2;
      const PHONE_FIELDS_UPDATE = ["phone", "home_phone", "work_phone"];
      const BOOLEAN_FIELDS = ["deleted"];
      Object.keys(data).forEach(field => {
        const colIdx = headers.indexOf(field) + 1;
        if (colIdx > 0) {
          let val = Array.isArray(data[field]) ? JSON.stringify(data[field]) : data[field];
          // 전화번호 필드는 앞자리 0 보존을 위해 텍스트 prefix 처리
          if (PHONE_FIELDS_UPDATE.includes(field) && val !== "" && val !== null && val !== undefined) {
            val = "'" + String(val).replace(/^'+/, "");
          }
          // boolean 필드는 실제 boolean으로 저장 (문자열 "true"/"false" 방지)
          if (BOOLEAN_FIELDS.includes(field)) {
            val = (val === true || val === "true" || val === "TRUE");
          }
          sheet.getRange(actualRow, colIdx).setValue(val);
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

    // ── 로그인 인증 ──
    if (action === "login") {
      const users = sheetToJson(getOrCreateSheet(SHEET_NAMES.users));
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
      const users = sheetToJson(getOrCreateSheet(SHEET_NAMES.users));
      const exists = users.some(u => u.email && u.email.toLowerCase() === (data.email || "").toLowerCase());
      return makeResponse({ ok: true, exists: exists });
    }

    return makeResponse({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return makeResponse({ ok: false, error: err.message });
  }
}

// ── 논문 파일 전용 업로드 (2단계 분리 전송) ──
function handleFileUpload(body) {
  const submissionId = body.id;
  const paperTitle   = body.title_ko || "논문";
  const msData       = body.file_manuscript_data;
  const agData       = body.file_agreement_data;

  if (!submissionId) return makeResponse({ ok: false, error: "투고 ID가 없습니다." });

  const subSheet   = getOrCreateSheet(SHEET_NAMES.submissions);
  const subHeaders = subSheet.getRange(1, 1, 1, subSheet.getLastColumn()).getValues()[0];
  const idCol      = subHeaders.indexOf("id") + 1;
  if (idCol === 0) return makeResponse({ ok: false, error: "id 컬럼 없음" });

  const colValues = subSheet.getRange(2, idCol, Math.max(subSheet.getLastRow()-1,1), 1).getValues();
  const rowIdx    = colValues.findIndex(r => String(r[0]) === String(submissionId));
  if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 투고 레코드 없음: " + submissionId });
  const actualRow = rowIdx + 2;

  const updateFields = {};
  if (msData && msData.base64) {
    try { updateFields.file_manuscript = uploadSubmissionFileToDrive(msData, paperTitle, "원고"); }
    catch (e) { Logger.log("원고 업로드 실패: " + e.message); updateFields.file_manuscript = "[업로드실패] " + (msData.name || "파일"); }
  }
  if (agData && agData.base64) {
    try { updateFields.file_agreement = uploadSubmissionFileToDrive(agData, paperTitle, "저작권동의서"); }
    catch (e) { Logger.log("동의서 업로드 실패: " + e.message); updateFields.file_agreement = "[업로드실패] " + (agData.name || "파일"); }
  }

  Object.keys(updateFields).forEach(field => {
    const colIdx = subHeaders.indexOf(field) + 1;
    if (colIdx > 0) subSheet.getRange(actualRow, colIdx).setValue(updateFields[field]);
  });

  return makeResponse({ ok: true, message: "파일 업로드 완료", urls: updateFields });
}

// ── 회원 입회신청서 재업로드 (마이페이지에서 추가 제출) ──
function handleMemberDocumentUpload(body) {
  const email    = body.email;
  const userName = body.userName || "미상";
  const fileData = body.fileData;

  if (!email)                         return makeResponse({ ok: false, error: "이메일이 없습니다." });
  if (!fileData || !fileData.base64)  return makeResponse({ ok: false, error: "파일 데이터가 없습니다." });

  // 1) Drive에 파일 업로드 (회원가입과 동일한 폴더·함수 사용)
  let fileUrl = "";
  try {
    fileUrl = uploadFileToDrive(fileData, userName);
  } catch (e) {
    return makeResponse({ ok: false, error: "드라이브 업로드 실패: " + e.message });
  }

  // 2) 회원 시트의 document_url 업데이트
  const sheet   = getOrCreateSheet(SHEET_NAMES.users);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyCol  = headers.indexOf("email") + 1;
  const urlCol  = headers.indexOf("document_url") + 1;
  if (keyCol === 0) return makeResponse({ ok: false, error: "email 컬럼 없음" });
  if (urlCol === 0) return makeResponse({ ok: false, error: "document_url 컬럼 없음" });

  const colValues = sheet.getRange(2, keyCol, Math.max(sheet.getLastRow()-1,1), 1).getValues();
  const rowIdx    = colValues.findIndex(r => String(r[0]).toLowerCase() === email.toLowerCase());
  if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 회원을 찾을 수 없습니다." });

  sheet.getRange(rowIdx + 2, urlCol).setValue(fileUrl);
  return makeResponse({ ok: true, message: "입회신청서 업로드 완료", document_url: fileUrl });
}

// ── 양식파일 드라이브 업로드 ──
// 관리자가 양식모음 페이지에서 업로드한 파일을 드라이브에 저장하고 시트에 URL 등록
function handleFormFileUpload(body) {
  const formName = body.name || "양식";
  const category = body.category || "기타";
  const fileData = body.fileData;

  if (!fileData || !fileData.base64) return makeResponse({ ok: false, error: "파일 데이터가 없습니다." });

  const folder  = getDriveFolder(DRIVE_FOLDER.forms);
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const safeName = (formName).replace(/[<>:"\/\\|?*\x00-\x1F]/g,"_");
  const fileName = dateStr + "_" + safeName + "_" + (fileData.name || "파일");

  let downloadUrl = "";
  try {
    // saveFileToDrive는 이제 download URL을 직접 반환함
    downloadUrl = saveFileToDrive(fileData, folder, fileName);
  } catch(e) {
    return makeResponse({ ok: false, error: "파일 업로드 실패: " + e.message });
  }

  const newId    = "F-" + Date.now();
  const today    = new Date().toISOString().slice(0,10);
  const fileExt  = (fileData.name || "").split(".").pop().toUpperCase();
  const formsSheet = getOrCreateSheet(SHEET_NAMES.forms);
  formsSheet.appendRow([newId, formName, category, today, downloadUrl, downloadUrl, fileExt, new Date().toISOString()]);

  return makeResponse({ ok: true, message: "양식 등록 완료", id: newId, viewUrl: downloadUrl, downloadUrl: downloadUrl });
}

// ── 드라이브 헬퍼 ──
function getDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  const f = DriveApp.createFolder(folderName);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f;
}

function saveFileToDrive(fileData, folder, fileName) {
  const decoded = Utilities.base64Decode(fileData.base64);
  const blob = Utilities.newBlob(decoded, fileData.mimeType || "application/octet-stream", fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // drive.usercontent.google.com 형식: Safari/Chrome/Firefox 모두에서 올바른 다운로드 헤더를 반환
  const fileId = file.getId();
  return "https://drive.usercontent.google.com/download?id=" + fileId + "&export=download&confirm=t";
}

// ── 세미나 아카이브 파일 업로드 핸들러 ──
// body: { seminarTitle, pdfFile: {base64,name,mimeType}, photoFiles: [{base64,name,mimeType}] }
function handleSeminarFileUpload(body) {
  try {
    const folder  = getDriveFolder(DRIVE_FOLDER.seminars);
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const safeTitle = ((body.seminarTitle||"세미나")).substring(0,20).replace(/[\s<>:"\/\\|?*\x00-\x1F]/g,"_");
    const result = {};

    // 1) 자료집 PDF 업로드
    if (body.pdfFile && body.pdfFile.base64) {
      const pdfName = dateStr + "_" + safeTitle + "_자료집_" + (body.pdfFile.name || "자료집.pdf");
      result.pdfUrl = saveFileToDrive(body.pdfFile, folder, pdfName);
    }

    // 2) 현장사진 업로드 (여러 장)
    const photoFiles = body.photoFiles || [];
    if (photoFiles.length > 0) {
      result.photoUrls = [];
      photoFiles.forEach(function(photo, idx) {
        const photoName = dateStr + "_" + safeTitle + "_사진" + (idx+1) + "_" + (photo.name || ("photo_"+(idx+1)+".jpg"));
        const url = saveFileToDrive(photo, folder, photoName);
        result.photoUrls.push(url);
      });
    }

    return makeResponse({ ok: true, ...result });
  } catch(e) {
    return makeResponse({ ok: false, error: "세미나 파일 업로드 실패: " + e.message });
  }
}

function uploadFileToDrive(fileData, userName) {
  const folder = getDriveFolder(DRIVE_FOLDER.members);
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const safeName = (userName||"미상").replace(/[<>:"\/\\|?*\x00-\x1F]/g,"_");
  return saveFileToDrive(fileData, folder, dateStr+"_"+safeName+"_"+(fileData.name||"서류"));
}

function uploadSubmissionFileToDrive(fileData, paperTitle, fileType) {
  const folder = getDriveFolder(DRIVE_FOLDER.submissions);
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const cleanTitle = (paperTitle||"논문").substring(0,15).replace(/[\s\x00-\x1F\x7F<>:"\/\\|?*]/g,"_");
  return saveFileToDrive(fileData, folder, dateStr+"_"+cleanTitle+"_"+(fileType||"파일")+"_"+(fileData.name||"파일"));
}

// ── 수정논문 파일 업로드 핸들러 ──
function handleRevisedFileUpload(body) {
  const submissionId  = body.id;
  const paperTitle    = body.title_ko || "논문";
  const revisedData   = body.file_revised_data;      // 수정본 원고 (필수)
  const responseData  = body.file_response_data;     // 심사의견 답변서 (선택)
  const memo          = body.memo || "";

  if (!submissionId) return makeResponse({ ok: false, error: "투고 ID가 없습니다." });
  if (!revisedData || !revisedData.base64) return makeResponse({ ok: false, error: "수정본 파일 데이터가 없습니다." });

  const subSheet   = getOrCreateSheet(SHEET_NAMES.submissions);
  const subHeaders = subSheet.getRange(1, 1, 1, subSheet.getLastColumn()).getValues()[0];
  const idCol      = subHeaders.indexOf("id") + 1;
  if (idCol === 0) return makeResponse({ ok: false, error: "id 컬럼 없음" });

  const colValues = subSheet.getRange(2, idCol, Math.max(subSheet.getLastRow()-1,1), 1).getValues();
  const rowIdx    = colValues.findIndex(r => String(r[0]) === String(submissionId));
  if (rowIdx === -1) return makeResponse({ ok: false, error: "해당 투고 레코드 없음: " + submissionId });
  const actualRow = rowIdx + 2;

  const folder  = getDriveFolder(DRIVE_FOLDER.revised);
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const cleanTitle = (paperTitle).substring(0,15).replace(/[\s\x00-\x1F\x7F<>:"\/\\|?*]/g,"_");

  const updateFields = {};
  try {
    updateFields.file_revised = saveFileToDrive(
      revisedData, folder,
      dateStr + "_" + cleanTitle + "_수정본_" + (revisedData.name || "파일")
    );
  } catch(e) {
    return makeResponse({ ok: false, error: "수정본 업로드 실패: " + e.message });
  }

  if (responseData && responseData.base64) {
    try {
      updateFields.file_revised_response = saveFileToDrive(
        responseData, folder,
        dateStr + "_" + cleanTitle + "_답변서_" + (responseData.name || "파일")
      );
    } catch(e) {
      Logger.log("답변서 업로드 실패: " + e.message);
      updateFields.file_revised_response = "[업로드실패]";
    }
  }

  updateFields.revised_date = new Date().toISOString().slice(0,10);
  updateFields.revised_memo = memo;

  // 컬럼이 없으면 자동으로 추가
  Object.keys(updateFields).forEach(field => {
    let colIdx = subHeaders.indexOf(field) + 1;
    if (colIdx === 0) {
      subHeaders.push(field);
      colIdx = subHeaders.length;
      subSheet.getRange(1, colIdx).setValue(field);
    }
    subSheet.getRange(actualRow, colIdx).setValue(updateFields[field]);
  });

  return makeResponse({ ok: true, message: "수정논문 업로드 완료", urls: updateFields });
}

// ── 학회지 PDF 업로드 핸들러 ──
// body: { ho, title, pdfFile: {base64, name, mimeType} }
function handleJournalPdfUpload(body) {
  try {
    const pdfData = body.pdfFile;
    if (!pdfData || !pdfData.base64) return makeResponse({ ok: false, error: "PDF 파일 데이터가 없습니다." });
    const folder  = getDriveFolder(DRIVE_FOLDER.journals);
    const safeTitle = (body.title || "학회지").replace(/[\s<>:"\/\\|?*\x00-\x1F]/g, "_");
    const fileName = safeTitle + "_" + (pdfData.name || "전체.pdf");
    const url = saveFileToDrive(pdfData, folder, fileName);
    return makeResponse({ ok: true, pdfUrl: url, message: "학회지 PDF 업로드 완료" });
  } catch(e) {
    return makeResponse({ ok: false, error: "학회지 PDF 업로드 실패: " + e.message });
  }
}

// ── 드라이브 권한 테스트 (한 번만 실행 → 권한 승인) ──
function testDriveAuth() {
  DriveApp.createFolder("한국음악학회_드라이브권한테스트_삭제가능");
  Logger.log("드라이브 권한 승인 완료!");
}
