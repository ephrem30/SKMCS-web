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
        })()
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

console.log("[db.js] 데이터베이스 클라이언트 로드 완료 →", DB_URL.substring(0, 60) + "...");
