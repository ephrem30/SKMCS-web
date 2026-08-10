// ============================================================
// db.js — 한국음악학회 홈페이지 중앙 데이터베이스 클라이언트
// Google Apps Script 백엔드와 통신하는 모든 함수가 여기에 있습니다.
// ============================================================

const DB_URL = "https://script.google.com/macros/s/AKfycbxyxapoRrtVW3fIsoiW5Tlr5OIlSSH3BL_ArZHq9MWYkJs93YBZAQ-tRrtvB4BapeBtFA/exec";

// ── 내부: GET 요청 ──
async function _dbGet(sheet) {
    const res = await fetch(`${DB_URL}?action=get&sheet=${sheet}`);
    if (!res.ok) throw new Error("네트워크 오류: " + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "DB 읽기 실패");
    return json.data || [];
}

// ── 내부: POST 요청 (GET 파라미터 방식으로 CORS 우회) ──
async function _dbPost(body) {
    const encoded = encodeURIComponent(JSON.stringify(body));
    const res = await fetch(`${DB_URL}?post_data=${encoded}`);
    if (!res.ok) throw new Error("네트워크 오류: " + res.status);
    const json = await res.json();
    return json; // { ok, message/error }
}

// ── 내부: POST 요청 (대용량 전송 - GET 방식의 길이 제한 회피용 직접 POST 호출) ──
async function _dbPostDirect(body) {
    const res = await fetch(DB_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "post_data=" + encodeURIComponent(JSON.stringify(body))
    });
    if (!res.ok) throw new Error("네트워크 오류: " + res.status);
    const json = await res.json();
    return json; // { ok, message/error }
}


// ============================================================
// 1. 회원 (users)
// ============================================================

/** 전체 회원 목록 조회 (비밀번호 제외) */
window.DB_getUsers = async function() {
    return await _dbGet("users");
};

/** 이메일 중복 확인 */
window.DB_checkEmail = async function(email) {
    const res = await _dbPost({ action: "checkEmail", sheet: "users", data: { email } });
    return res.exists; // true면 이미 존재
};

/** 회원가입 */
window.DB_addUser = async function(userData) {
    return await _dbPostDirect({ action: "add", sheet: "users", data: userData });
};

/** 로그인 인증 */
window.DB_login = async function(email, password) {
    const res = await _dbPost({ action: "login", sheet: "users", data: { email, password } });
    return res; // { ok, user } or { ok:false, error }
};

/** 회원 권한 수정 */
window.DB_updateUserRole = async function(email, newRole) {
    return await _dbPost({
        action: "update", sheet: "users",
        key: "email", value: email,
        data: { role: newRole }
    });
};

/** 회원 삭제 */
window.DB_deleteUser = async function(email) {
    return await _dbPost({
        action: "delete", sheet: "users",
        key: "email", value: email
    });
};

/** 회원 프로필 수정 (이름·연락처·소속 등) */
window.DB_updateUserProfile = async function(email, updates) {
    return await _dbPost({
        action: "update", sheet: "users",
        key: "email", value: email,
        data: updates
    });
};

/** 단일 필드 업데이트 (is_regular 토글 등) */
window.DB_updateUserField = async function(email, field, value) {
    return await _dbPost({
        action: "update", sheet: "users",
        key: "email", value: email,
        data: { [field]: String(value) }
    });
};

/** 비밀번호 변경 — 현재 비밀번호 검증 후 새 비밀번호로 교체 */
window.DB_changePassword = async function(email, currentPw, newPw) {
    // 1단계: 현재 비번 검증
    const loginRes = await _dbPost({ action: "login", sheet: "users", data: { email, password: currentPw } });
    if (!loginRes.ok) return { ok: false, error: "현재 비밀번호가 일치하지 않습니다." };
    // 2단계: 새 비번으로 업데이트
    return await _dbPost({
        action: "update", sheet: "users",
        key: "email", value: email,
        data: { password: newPw }
    });
};

/** 입회신청서 업로드 — 파일을 Drive에 저장 후 document_url 업데이트 */
window.DB_uploadMemberDocument = async function(email, userName, fileData) {
    // fileData: { base64, name, mimeType }
    return await _dbPostDirect({
        action: "uploadMemberDocument",
        email: email,
        userName: userName,
        fileData: fileData
    });
};

// ============================================================
// 2. 공지사항 (notices)
// ============================================================

window.DB_getNotices = async function() {
    const posts = await _dbGet("notices");
    // id를 숫자로 변환, views도 숫자로
    return posts.map(p => ({
        ...p,
        id: Number(p.id) || 0,
        views: Number(p.views) || 0,
        type: "notice"
    }));
};

window.DB_addNotice = async function(postData) {
    return await _dbPost({ action: "add", sheet: "notices", data: { ...postData, type: "notice" } });
};

window.DB_updateNotice = async function(id, data) {
    return await _dbPost({
        action: "update", sheet: "notices",
        key: "id", value: String(id), data
    });
};

window.DB_deleteNotice = async function(id) {
    return await _dbPost({
        action: "delete", sheet: "notices",
        key: "id", value: String(id)
    });
};

// ============================================================
// 3. 자유게시판 (freeboard)
// ============================================================

window.DB_getFreeboard = async function() {
    const posts = await _dbGet("freeboard");
    return posts.map(p => ({
        ...p,
        id: Number(p.id) || 0,
        views: Number(p.views) || 0,
        type: "freeboard"
    }));
};

window.DB_addFreePost = async function(postData) {
    return await _dbPost({ action: "add", sheet: "freeboard", data: { ...postData, type: "freeboard" } });
};

window.DB_updateFreePost = async function(id, data) {
    return await _dbPost({
        action: "update", sheet: "freeboard",
        key: "id", value: String(id), data
    });
};

window.DB_deleteFreePost = async function(id) {
    return await _dbPost({
        action: "delete", sheet: "freeboard",
        key: "id", value: String(id)
    });
};

// ============================================================
// 4. 논문 투고 (submissions)
// ============================================================

window.DB_getSubmissions = async function() {
    const subs = await _dbGet("submissions");
    return subs.map(s => ({
        ...s,
        // authors가 JSON 문자열이면 파싱
        authors: (() => {
            try {
                return typeof s.authors === "string" ? JSON.parse(s.authors) : (s.authors || []);
            } catch(e) { return []; }
        })(),
        // deleted 값을 항상 boolean으로 정규화
        // Sheets에서 true(bool), "TRUE", "true", "false", ""(빈 문자열) 등 다양하게 올 수 있음
        deleted: s.deleted === true || s.deleted === "true" || s.deleted === "TRUE"
    }));
};

window.DB_addSubmission = async function(subData) {
    return await _dbPostDirect({ action: "add", sheet: "submissions", data: subData });
};

/** 논문 투고 파일만 별도로 드라이브에 업로드하고 시트 URL을 갱신 */
window.DB_uploadSubmissionFiles = async function(payload) {
    return await _dbPostDirect(payload);
};


window.DB_updateSubmission = async function(id, data) {
    return await _dbPost({
        action: "update", sheet: "submissions",
        key: "id", value: id, data
    });
};

/**
 * 수정논문 파일 업로드
 * payload: { action:"uploadRevisedFiles", id, title_ko, memo,
 *            file_revised_data:{base64,name,mimeType},
 *            file_response_data:{base64,name,mimeType} (optional) }
 */
window.DB_uploadRevisedFiles = async function(payload) {
    return await _dbPostDirect(payload);
};

window.DB_deleteSubmission = async function(id) {
    return await _dbPost({
        action: "delete", sheet: "submissions",
        key: "id", value: id
    });
};

// ============================================================
// 5. 로컬 세션 관리 (로그인 상태는 localStorage로 유지)
// ============================================================

window.SESSION_get = function() {
    try {
        const s = localStorage.getItem("logged_in_user");
        return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
};

window.SESSION_set = function(user) {
    localStorage.setItem("logged_in_user", JSON.stringify(user));
};

window.SESSION_clear = function() {
    localStorage.removeItem("logged_in_user");
};

// ============================================================
// 6. 양식파일 (forms)
// ============================================================

/** 양식 목록 조회 (구글 시트에서 불러오기) */
window.DB_getForms = async function() {
    return await _dbGet("forms");
};

/** 양식 파일 업로드 → 구글 드라이브 저장 후 시트에 URL 등록 */
window.DB_addFormFile = async function(payload) {
    // payload: { action:"addFormFile", name, category, fileData:{base64,name,mimeType} }
    return await _dbPostDirect(payload);
};

/** 양식 삭제 (시트에서 행 제거, 드라이브 파일은 유지) */
window.DB_deleteForm = async function(id) {
    return await _dbPost({
        action: "delete", sheet: "forms",
        key: "id", value: id, data: {}
    });
};

/** 양식 이름/구분 수정 (시트 해당 행 업데이트) */
window.DB_updateForm = async function(id, updates) {
    return await _dbPost({
        action: "update", sheet: "forms",
        key: "id", value: id,
        data: updates
    });
};


// ============================================================
// 6. 학회지 (journals)
// ============================================================

/** 전체 학회지 목록 조회 (최신호 우선 정렬) */
window.DB_getJournals = async function() {
    const rows = await _dbGet("journals");
    return rows.map(j => {
        if (typeof j.articles === 'string' && j.articles) {
            try { j.articles = JSON.parse(j.articles); } catch(e) { j.articles = []; }
        }
        if (!Array.isArray(j.articles)) j.articles = [];
        return j;
    }).sort((a, b) => parseInt(b.tonggwon || 0) - parseInt(a.tonggwon || 0));
};

/** 학회지 추가 — 아티클 PDF URL 등 데이터가 크므로 직접 POST 사용 */
window.DB_addJournal = async function(issueData) {
    return await _dbPostDirect({ action: "add", sheet: "journals", data: issueData });
};

/** 학회지 수정 */
window.DB_updateJournal = async function(id, updates) {
    return await _dbPostDirect({ action: "update", sheet: "journals", key: "id", value: id, data: updates });
};

/** 학회지 삭제 */
window.DB_deleteJournal = async function(id) {
    return await _dbPost({ action: "delete", sheet: "journals", key: "id", value: id });
};

/**
 * 학회지 전체 PDF를 Google Drive에 업로드합니다.
 * @param {string} ho - 호 번호 (예: "8")
 * @param {string} title - 발행호 제목 (예: "한국음악문화 제8호")
 * @param {{base64, name, mimeType}} pdfFile - PDF 파일 데이터
 * @returns {{ ok:boolean, pdfUrl?:string, error?:string }}
 */
window.DB_uploadJournalPdf = async function(ho, title, pdfFile) {
    return await _dbPostDirect({
        action: "uploadJournalPdf",
        ho: ho,
        title: title,
        pdfFile: pdfFile
    });
};

// ============================================================
// 7. 세미나 아카이브 파일 업로드 (Google Drive)
// ============================================================

/**
 * 세미나 사진/PDF를 구글 드라이브에 업로드합니다.
 * @param {object} opts
 * @param {string} opts.seminarTitle - 세미나 제목 (폴더명/파일명에 사용)
 * @param {Array<{base64,name,mimeType}>} opts.photoFiles - 현장 사진 파일 배열
 * @param {{base64,name,mimeType}|null} opts.pdfFile - 자료집 PDF (선택)
 * @returns {{ ok:boolean, photoUrls?:string[], pdfUrl?:string, error?:string }}
 */
window.DB_uploadSeminarFiles = async function(opts) {
    const payload = {
        action: "uploadSeminarFiles",
        seminarTitle: opts.seminarTitle || "세미나",
        photoFiles: opts.photoFiles || [],
        pdfFile: opts.pdfFile || null,
    };
    // 파일 크기가 클 수 있으므로 직접 POST 사용
    return await _dbPostDirect(payload);
};


// ============================================================
// 8. 세미나 소식 (seminar_news)
// ============================================================

window.DB_getSeminarNews = async function() {
    const posts = await _dbGet("seminar_news");
    return posts.map(p => ({
        ...p,
        id: Number(p.id) || 0,
    }));
};

window.DB_addSeminarNews = async function(postData) {
    return await _dbPost({ action: "add", sheet: "seminar_news", data: postData });
};

window.DB_updateSeminarNews = async function(id, data) {
    return await _dbPost({
        action: "update", sheet: "seminar_news",
        key: "id", value: String(id), data
    });
};

window.DB_deleteSeminarNews = async function(id) {
    return await _dbPost({
        action: "delete", sheet: "seminar_news",
        key: "id", value: String(id)
    });
};

// ============================================================
// 9. 연구모임/세미나 (seminars)
// ============================================================

window.DB_getSeminars = async function() {
    return await _dbGet("seminars");
};
window.DB_addSeminar = async function(data) {
    return await _dbPost({ action: "add", sheet: "seminars", data });
};
window.DB_updateSeminar = async function(id, data) {
    return await _dbPost({ action: "update", sheet: "seminars", key: "id", value: String(id), data });
};
window.DB_deleteSeminar = async function(id) {
    return await _dbPost({ action: "delete", sheet: "seminars", key: "id", value: String(id) });
};

// ============================================================
// 10. 학술대회 (conferences)
// ============================================================

window.DB_getConferences = async function() {
    return await _dbGet("conferences");
};
window.DB_addConference = async function(data) {
    return await _dbPost({ action: "add", sheet: "conferences", data });
};
window.DB_updateConference = async function(id, data) {
    return await _dbPost({ action: "update", sheet: "conferences", key: "id", value: String(id), data });
};
window.DB_deleteConference = async function(id) {
    return await _dbPost({ action: "delete", sheet: "conferences", key: "id", value: String(id) });
};

// ============================================================
// 11. 지난 세미나 (past_seminars)
// ============================================================

window.DB_getPastSeminars = async function() {
    return await _dbGet("past_seminars");
};
window.DB_addPastSeminar = async function(data) {
    return await _dbPost({ action: "add", sheet: "past_seminars", data });
};
window.DB_updatePastSeminar = async function(id, data) {
    return await _dbPost({ action: "update", sheet: "past_seminars", key: "id", value: String(id), data });
};
window.DB_deletePastSeminar = async function(id) {
    return await _dbPost({ action: "delete", sheet: "past_seminars", key: "id", value: String(id) });
};

// ============================================================
// 12. 세미나 아카이브 (seminar_archive)
// ============================================================

window.DB_getSeminarArchive = async function() {
    const rows = await _dbGet("seminar_archive");
    // photos 필드가 JSON 문자열로 저장된 경우 파싱
    return rows.map(r => {
        if (typeof r.photos === "string") {
            try { r.photos = JSON.parse(r.photos); } catch(e) { r.photos = []; }
        }
        if (!Array.isArray(r.photos)) r.photos = [];
        return r;
    });
};
window.DB_addSeminarArchive = async function(data) {
    const d = { ...data };
    if (Array.isArray(d.photos)) d.photos = JSON.stringify(d.photos);
    return await _dbPost({ action: "add", sheet: "seminar_archive", data: d });
};
window.DB_updateSeminarArchive = async function(id, data) {
    const d = { ...data };
    if (Array.isArray(d.photos)) d.photos = JSON.stringify(d.photos);
    return await _dbPost({ action: "update", sheet: "seminar_archive", key: "id", value: String(id), data: d });
};
window.DB_deleteSeminarArchive = async function(id) {
    return await _dbPost({ action: "delete", sheet: "seminar_archive", key: "id", value: String(id) });
};

console.log("[db.js] 데이터베이스 클라이언트 로드 완료 →", DB_URL.substring(0, 60) + "...");



window.DB_seedAdminAccounts = async function() {
    const existing = await window.DB_getUsers();
    const adminEmails = existing.map(u => (u.email || "").toLowerCase());

    const defaultAccounts = [
        { email: "admin@gmail.com", password: "admin123", name: "최고관리자", role: "admin", affiliation: "한국음악학회", phone: "010-1234-5678", birth: "1980-01-01", registered_at: new Date().toISOString() },
        { email: "secretary@gmail.com", password: "sec123", name: "학회간사", role: "secretary", affiliation: "한국음악학회", phone: "010-2345-6789", birth: "1985-05-15", registered_at: new Date().toISOString() },
        { email: "editor@gmail.com", password: "edi123", name: "편집위원장", role: "editor", affiliation: "한국음악학회", phone: "010-4567-8901", birth: "1972-11-30", registered_at: new Date().toISOString() },
        { email: "president@gmail.com", password: "pre123", name: "학회회장", role: "president", affiliation: "한국음악학회", phone: "010-5678-9012", birth: "1965-03-25", registered_at: new Date().toISOString() }
    ];

    for (const acc of defaultAccounts) {
        if (!adminEmails.includes(acc.email.toLowerCase())) {
            await window.DB_addUser(acc);
        }
    }
    console.log("[DB] 관리자 초기 계정 시드 완료");
};

/** 공지사항 초기 데이터 시딩 (GAS 시트가 비어있을 때 한 번만 실행) */
window.DB_seedDefaultNotices = async function() {
    const existing = await window.DB_getNotices();
    if (existing.length > 0) {
        console.log("[DB] 공지사항 데이터가 이미 있습니다. 시딩 건너뜀.");
        return;
    }

    const defaultNotices = [
        { id: Date.now() + 1, type: "notice", category: "시스템", title: "[공지] 한국음악학회 공식 홈페이지 오픈 안내", file: false, date: "2026. 05. 29", views: 0, content: "안녕하십니까, 한국음악학회입니다.\n\n2026년 5월 29일부로 한국음악학회 공식 홈페이지가 새롭게 오픈하였습니다.\n\n■ 주요 서비스 안내\n\n1. 논문 온라인 투고 시스템\n   - 회원 로그인 후 논문 파일 및 연구윤리서약서를 온라인으로 간편하게 접수하실 수 있습니다.\n   - 투고 후 심사 진행 상황을 실시간으로 확인하실 수 있습니다.\n\n2. 학회지 원문 서비스\n   - 역대 학회지(한국음악문화)의 논문 원문을 홈페이지에서 열람 및 다운로드하실 수 있습니다.\n\n3. 학술활동 안내\n   - 학술대회, 연구모임, 세미나 일정을 실시간으로 확인하실 수 있습니다.\n\n4. 회원 서비스\n   - 온라인 입회 신청, 회원 정보 조회 등 다양한 회원 서비스를 제공합니다.\n\n■ 문의사항\n홈페이지 이용 중 불편사항이나 오류가 발견되실 경우, 학회 사무국으로 연락 주시기 바랍니다.\n- E-mail: skmcs@dgu.ac.kr\n- 주소: (04620) 서울특별시 중구 필동로 1길 30 동국대학교 문화관\n\n회원 여러분의 많은 관심과 이용을 부탁드립니다.\n\n한국음악학회 사무국 드림", author: "관리인", email: "admin@gugak.go.kr" },
        { id: Date.now() + 2, type: "notice", category: "안내", title: "2026년 춘계 학술대회 일정 및 논문 발표 신청 안내", file: false, date: "2026. 03. 11", views: 0, content: "2026년 춘계 학술대회 일정 및 논문 발표 신청 안내입니다.", author: "관리인", email: "admin@gugak.go.kr" },
        { id: Date.now() + 3, type: "notice", category: "시스템", title: "학회 홈페이지 리뉴얼 및 온라인 투고 시스템 오픈 안내", file: false, date: "2026. 02. 20", views: 0, content: "학회 홈페이지 리뉴얼 및 온라인 투고 시스템 오픈 안내입니다.", author: "관리인", email: "admin@gugak.go.kr" },
        { id: Date.now() + 4, type: "notice", category: "안내", title: "학회 연회비 납부 계좌 변경 안내", file: false, date: "2026. 05. 29", views: 0, content: "학회 연회비 납부 계좌가 다음과 같이 변경되었습니다.\n\n- 은행: 신한은행\n- 계좌번호: 140-015-967840\n- 예금주: 한국음악학회 박범훈\n\n회원 여러분께서는 연회비 송금 시 착오 없으시길 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" },
    ];

    for (const notice of defaultNotices) {
        await window.DB_addNotice(notice);
        await new Promise(r => setTimeout(r, 300)); // GAS 과부하 방지
    }
    console.log("[DB] 공지사항 초기 데이터 시딩 완료");
    alert("✅ 공지사항 초기 데이터가 등록되었습니다.");
};

console.log("[db.js] 데이터베이스 클라이언트 로드 완료 →", DB_URL.substring(0, 60) + "...");
