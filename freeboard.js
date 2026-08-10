// freeboard.js - Functional Free Board & Notice Board CRUD with User Roles

// ============================================================
// 구버전 localStorage 데이터 정리 (GAS 전환 마이그레이션)
// 어떤 브라우저에서 접속해도 한 번만 실행됨
// ============================================================
(function() {
    const MIGRATION_KEY = 'skmcs_gas_migration_v3';
    if (localStorage.getItem(MIGRATION_KEY)) return;
    // GAS 전환 전 테스트 데이터가 저장된 localStorage 키 전당 삭제
    [
        'notice_posts', 'notice_posts_idx', 'notice_posts_version',
        'freeboard_posts', 'freeboard_posts_idx',
        'seminar_news_posts', 'seminar_news_idx',
    ].forEach(k => localStorage.removeItem(k));
    localStorage.setItem(MIGRATION_KEY, '1');
    console.log('[Migration v3] 게시판 localStorage 데이터 정리 완료');
})();

// Force administrator session for full page access and verification - DISABLED FOR PRODUCTION ROLE-BASED ACCESS
/*
(function() {
    const AUTHORIZED_ROLES = ["admin", "secretary", "reviewer", "editor", "president"];
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    let needsMockAdmin = true;
    if (loggedInUserStr) {
        try {
            const user = JSON.parse(loggedInUserStr);
            if (AUTHORIZED_ROLES.includes(user.role)) {
                needsMockAdmin = false;
            }
        } catch (e) {
            needsMockAdmin = true;
        }
    }
    if (needsMockAdmin) {
        const mockAdmin = {
            name: "임시 관리인",
            email: "admin@gugak.go.kr",
            role: "admin"
        };
        localStorage.setItem("logged_in_user", JSON.stringify(mockAdmin));
    }
})();
*/

document.addEventListener("DOMContentLoaded", () => {
    // Initialize State & Storage
    initStorage();

    // Tab Router & UI Initialization
    initRouter();

    // Check & Render based on active tab
    renderActiveTab();

    // Set up Global Button Listeners
    initButtonListeners();

    // Auto-open post if ID parameter is provided (e.g., from search results)
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get("id");
    if (idParam) {
        const postId = parseInt(idParam, 10);
        if (!isNaN(postId)) {
            setTimeout(() => {
                window.openDetailModal(postId, currentTab);
            }, 50);
        }
    }
});

// ==========================================
// 1. Data Initialization & Storage Helpers
// ==========================================
// ★ 구버전 샘플 데이터 완전 제거 — GAS에서 관리자가 직접 등록 ★
// 어떤 기기에서도 localStorage 샘플이 보이지 않도록 매번 삭제
localStorage.removeItem('notice_posts');
localStorage.removeItem('freeboard_posts');
localStorage.removeItem('seminar_news_posts');
localStorage.removeItem('seminar_news_idx');

const ADMIN_ROLES = ["admin", "secretary", "editor", "president"];

let currentTab = "notice"; // 'notice' | 'freeboard' | 'seminar_news'
let noticePage = 1;
let freeboardPage = 1;
let seminarNewsPage = 1;
const ITEMS_PER_PAGE = 5;
const SN_ITEMS_PER_PAGE = 6;

let noticeSearchQuery = "";
let noticeSearchType = "all";
let freeboardSearchQuery = "";
let freeboardSearchType = "all";

function getLoggedInUser() {
    const userStr = localStorage.getItem("logged_in_user");
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

// ==========================================
// 2. Tab Routing & Breadcrumbs Navigation
// ==========================================
function initRouter() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");

    if (tabParam === "freeboard") {
        currentTab = "freeboard";
    } else if (tabParam === "seminar_news") {
        currentTab = "seminar_news";
    } else {
        currentTab = "notice";
    }

    updateTabsUI();

    const tabNoticeBtn    = document.getElementById("tab-notice");
    const tabFreeboardBtn = document.getElementById("tab-freeboard");
    const tabSnBtn        = document.getElementById("tab-seminar-news");

    if (tabNoticeBtn)    tabNoticeBtn.addEventListener("click",    e => { e.preventDefault(); switchTab("notice"); });
    if (tabFreeboardBtn) tabFreeboardBtn.addEventListener("click", e => { e.preventDefault(); switchTab("freeboard"); });
    if (tabSnBtn)        tabSnBtn.addEventListener("click",        e => { e.preventDefault(); switchTab("seminar_news"); });
}

function switchTab(tabName) {
    if (currentTab === tabName) return;
    currentTab = tabName;

    const url = new URL(window.location);
    url.searchParams.set("tab", tabName);
    window.history.pushState({}, "", url);

    updateTabsUI();
    renderActiveTab();
}

function updateTabsUI() {
    const tabNoticeBtn     = document.getElementById("tab-notice");
    const tabFreeboardBtn  = document.getElementById("tab-freeboard");
    const tabSnBtn         = document.getElementById("tab-seminar-news");
    const sectionNotice    = document.getElementById("section-notice");
    const sectionFreeboard = document.getElementById("section-freeboard");
    const sectionSn        = document.getElementById("section-seminar-news");
    const breadcrumbCurrent = document.getElementById("breadcrumb-current");

    [tabNoticeBtn, tabFreeboardBtn, tabSnBtn].forEach(btn => btn && btn.classList.remove("active"));
    [sectionNotice, sectionFreeboard, sectionSn].forEach(s => s && (s.style.display = "none"));

    if (currentTab === "notice") {
        if (tabNoticeBtn)    tabNoticeBtn.classList.add("active");
        if (sectionNotice)   sectionNotice.style.display = "block";
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = "공지사항";
    } else if (currentTab === "freeboard") {
        if (tabFreeboardBtn) tabFreeboardBtn.classList.add("active");
        if (sectionFreeboard) sectionFreeboard.style.display = "block";
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = "자유게시판";
    } else if (currentTab === "seminar_news") {
        if (tabSnBtn)        tabSnBtn.classList.add("active");
        if (sectionSn)       sectionSn.style.display = "block";
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = "세미나 소식";
    }
}

function renderActiveTab() {
    const user    = getLoggedInUser();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    if (currentTab === "notice") {
        const btnWriteNotice = document.getElementById("btn-write-notice");
        if (btnWriteNotice) btnWriteNotice.style.display = isAdmin ? "inline-block" : "none";
        const btnDeleteSelectedNotice = document.getElementById("btn-delete-selected-notice");
        if (btnDeleteSelectedNotice) btnDeleteSelectedNotice.style.display = isAdmin ? "inline-block" : "none";
        renderNoticeBoard();
    } else if (currentTab === "freeboard") {
        const btnDeleteSelectedFreeboard = document.getElementById("btn-delete-selected-freeboard");
        if (btnDeleteSelectedFreeboard) btnDeleteSelectedFreeboard.style.display = isAdmin ? "inline-block" : "none";
        renderFreeBoard();
    } else if (currentTab === "seminar_news") {
        const btnWriteSn = document.getElementById("btn-write-seminar-news");
        if (btnWriteSn) btnWriteSn.style.display = isAdmin ? "inline-flex" : "none";
        renderSeminarNews();
    }
}

// ==========================================
// 3. Board Rendering & Filtering
// ==========================================
// ── 로딩 스피너 헬퍼 ──
function showBoardLoading(tbodyId, colSpan) {
    const tbody = document.getElementById(tbodyId);
    if (tbody) tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> 불러오는 중...</td></tr>`;
}

async function renderNoticeBoard() {
    const user = getLoggedInUser();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    // 테이블 헤더 먼저 렌더
    const table = document.querySelector("#section-notice .board-table");
    if (table) {
        const thead = table.querySelector("thead");
        if (thead) {
            if (isAdmin) {
                thead.innerHTML = `<tr><th class="col-select" style="width: 40px; text-align: center;"><input type="checkbox" id="notice-select-all"></th><th class="col-num">번호</th><th class="col-cat">구분</th><th class="col-title">제목</th><th class="col-file">첨부</th><th class="col-year">등록일</th><th class="col-view">조회수</th></tr>`;
            } else {
                thead.innerHTML = `<tr><th class="col-num">번호</th><th class="col-cat">구분</th><th class="col-title">제목</th><th class="col-file">첨부</th><th class="col-year">등록일</th><th class="col-view">조회수</th></tr>`;
            }
        }
    }

    showBoardLoading("notice-list-tbody", isAdmin ? 7 : 6);

    let notices = [];
    try {
        notices = await DB_getNotices();
    } catch (e) {
        const tbody = document.getElementById("notice-list-tbody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="text-align:center;padding:30px;color:#cb3c31;"><i class="fa-solid fa-triangle-exclamation"></i> 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</td></tr>`;
        return;
    }

    // 나머지 renderNoticeBoard 로직 (필터/정렬/페이지네이션)
    _renderNoticeBoardData(notices, user, isAdmin);
}

function _renderNoticeBoardData(notices, user, isAdmin) {

    // Toggle thead checkboxes
    const table = document.querySelector("#section-notice .board-table");
    if (table) {
        const thead = table.querySelector("thead");
        if (thead) {
            if (isAdmin) {
                thead.innerHTML = `
                    <tr>
                        <th class="col-select" style="width: 40px; text-align: center;"><input type="checkbox" id="notice-select-all"></th>
                        <th class="col-num">번호</th>
                        <th class="col-cat">구분</th>
                        <th class="col-title">제목</th>
                        <th class="col-file">첨부</th>
                        <th class="col-year">등록일</th>
                        <th class="col-view">조회수</th>
                    </tr>
                `;
            } else {
                thead.innerHTML = `
                    <tr>
                        <th class="col-num">번호</th>
                        <th class="col-cat">구분</th>
                        <th class="col-title">제목</th>
                        <th class="col-file">첨부</th>
                        <th class="col-year">등록일</th>
                        <th class="col-view">조회수</th>
                    </tr>
                `;
            }
        }
    }

    // Filter
    let filtered = notices;
    if (noticeSearchQuery) {
        filtered = notices.filter(p => {
            const query = noticeSearchQuery.toLowerCase();
            if (noticeSearchType === "title") return p.title.toLowerCase().includes(query);
            if (noticeSearchType === "content") return p.content.toLowerCase().includes(query);
            return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query);
        });
    }

    // Sort by id descending (newest first)
    filtered.sort((a, b) => b.id - a.id);

    // Update count
    const totalCount = document.getElementById("notice-total-count");
    if (totalCount) totalCount.textContent = filtered.length;

    // Paginate
    const startIndex = (noticePage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Render Table
    const tbody = document.getElementById("notice-list-tbody");
    if (!tbody) return;

    if (paginated.length === 0) {
        const colSpan = isAdmin ? 7 : 6;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="col-title" style="text-align: center; padding: 30px; color: var(--text-muted);">등록된 공지사항이 없습니다.</td></tr>`;
    } else {
        tbody.innerHTML = paginated.map(p => {
            const isNoticeRow = p.category === "안내" || p.category === "시스템";
            const rowStyle = isNoticeRow ? 'style="background-color: #fff9f9;"' : '';
            const badgeClass = isNoticeRow ? 'badge red' : 'badge grey';
            const fileIcon = p.file ? '<i class="fa-regular fa-file-pdf"></i>' : '';

            const selectTd = isAdmin ?
                `<td class="col-select" style="text-align: center;"><input type="checkbox" class="post-select-chk" data-id="${p.id}" onclick="event.stopPropagation()"></td>` : '';

            return `
                <tr ${rowStyle}>
                    ${selectTd}
                    <td class="col-num">${isNoticeRow ? `<span class="${badgeClass}">공지</span>` : p.id}</td>
                    <td class="col-cat">${p.category}</td>
                    <td class="col-title left">
                        <a href="#" onclick="openDetailModal(${p.id}, 'notice', event)" style="font-weight: ${isNoticeRow ? '700' : '500'}; color: var(--text-dark);">${escapeHtml(p.title)}</a>
                        ${isAdmin ? `<button class="btn-delete-small" onclick="deletePostDirectly(${p.id}, 'notice', event)" title="글 삭제" style="margin-left: 8px; background: none; border: none; color: #cb3c31; cursor: pointer; font-size: 0.85rem; padding: 2px 5px; transition: all 0.2s;" onmouseover="this.style.color='#b03228'" onmouseout="this.style.color='#cb3c31'"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </td>
                    <td class="col-file">${fileIcon}</td>
                    <td class="col-year">${p.date}</td>
                    <td class="col-view">${p.views}</td>
                </tr>
            `;
        }).join("");
    }

    // Bind select all checkbox
    const selectAllNotice = document.getElementById("notice-select-all");
    if (selectAllNotice) {
        selectAllNotice.addEventListener("change", (e) => {
            const chks = document.querySelectorAll("#notice-list-tbody .post-select-chk");
            chks.forEach(chk => chk.checked = e.target.checked);
        });
    }

    renderPagination("notice", filtered.length, noticePage);
}

async function renderFreeBoard() {
    const user = getLoggedInUser();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    // Toggle thead checkboxes
    const table = document.querySelector("#section-freeboard .board-table");
    if (table) {
        const thead = table.querySelector("thead");
        if (thead) {
            if (isAdmin) {
                thead.innerHTML = `
                    <tr>
                        <th class="col-select" style="width: 40px; text-align: center;"><input type="checkbox" id="freeboard-select-all"></th>
                        <th class="col-num" style="width: 8%;">번호</th>
                        <th class="col-cat" style="width: 15%;">구분</th>
                        <th class="col-title">제목</th>
                        <th class="col-year" style="width: 15%;">작성자</th>
                        <th class="col-year" style="width: 15%;">등록일</th>
                        <th class="col-view" style="width: 10%;">조회수</th>
                    </tr>
                `;
            } else {
                thead.innerHTML = `
                    <tr>
                        <th class="col-num" style="width: 8%;">번호</th>
                        <th class="col-cat" style="width: 15%;">구분</th>
                        <th class="col-title">제목</th>
                        <th class="col-year" style="width: 15%;">작성자</th>
                        <th class="col-year" style="width: 15%;">등록일</th>
                        <th class="col-view" style="width: 10%;">조회수</th>
                    </tr>
                `;
            }
        }
    }

    showBoardLoading("freeboard-list-tbody", isAdmin ? 7 : 6);

    let posts = [];
    try {
        posts = await DB_getFreeboard();
    } catch (e) {
        const tbody = document.getElementById("freeboard-list-tbody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="text-align:center;padding:30px;color:#cb3c31;"><i class="fa-solid fa-triangle-exclamation"></i> 데이터를 불러오지 못했습니다.</td></tr>`;
        return;
    }

    // Filter
    let filtered = posts;
    if (freeboardSearchQuery) {
        filtered = posts.filter(p => {
            const query = freeboardSearchQuery.toLowerCase();
            if (freeboardSearchType === "title") return p.title.toLowerCase().includes(query);
            if (freeboardSearchType === "content") return p.content.toLowerCase().includes(query);
            return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query);
        });
    }

    // Sort by id descending
    filtered.sort((a, b) => b.id - a.id);

    // Update count
    const totalCount = document.getElementById("freeboard-total-count");
    if (totalCount) totalCount.textContent = filtered.length;

    // Paginate
    const startIndex = (freeboardPage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Render Table
    const tbody = document.getElementById("freeboard-list-tbody");
    if (!tbody) return;

    if (paginated.length === 0) {
        const colSpan = isAdmin ? 7 : 6;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 30px; color: var(--text-muted);">등록된 게시글이 없습니다.</td></tr>`;
    } else {
        tbody.innerHTML = paginated.map(p => {
            const badgeStyle = getCategoryBadgeStyle(p.category);

            const selectTd = isAdmin ?
                `<td class="col-select" style="text-align: center;"><input type="checkbox" class="post-select-chk" data-id="${p.id}" onclick="event.stopPropagation()"></td>` : '';

            return `
                <tr>
                    ${selectTd}
                    <td class="col-num">${p.id}</td>
                    <td class="col-cat"><span class="badge" style="background-color: ${badgeStyle.bg}; color: ${badgeStyle.color}; font-size: 0.8rem; padding: 3px 8px; border-radius: 3px; font-weight: 700;">${p.category}</span></td>
                    <td class="col-title left">
                        <a href="#" onclick="openDetailModal(${p.id}, 'freeboard', event)" style="color: var(--text-dark);">${escapeHtml(p.title)}</a>
                        ${isAdmin ? `<button class="btn-delete-small" onclick="deletePostDirectly(${p.id}, 'freeboard', event)" title="글 삭제" style="margin-left: 8px; background: none; border: none; color: #cb3c31; cursor: pointer; font-size: 0.85rem; padding: 2px 5px; transition: all 0.2s;" onmouseover="this.style.color='#b03228'" onmouseout="this.style.color='#cb3c31'"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </td>
                    <td class="col-year">${escapeHtml(p.author)}</td>
                    <td class="col-year">${p.date}</td>
                    <td class="col-view">${p.views}</td>
                </tr>
            `;
        }).join("");
    }

    // Bind select all checkbox
    const selectAllFreeboard = document.getElementById("freeboard-select-all");
    if (selectAllFreeboard) {
        selectAllFreeboard.addEventListener("change", (e) => {
            const chks = document.querySelectorAll("#freeboard-list-tbody .post-select-chk");
            chks.forEach(chk => chk.checked = e.target.checked);
        });
    }

    renderPagination("freeboard", filtered.length, freeboardPage);
}

function getCategoryBadgeStyle(cat) {
    switch (cat) {
        case "자유": return { bg: "var(--color-blue)", color: "white" };
        case "질문": return { bg: "var(--color-red)", color: "white" };
        case "정보": return { bg: "var(--color-green)", color: "white" };
        case "소통": return { bg: "var(--color-yellow)", color: "#1A1A1A" };
        default: return { bg: "var(--bg-slate)", color: "white" };
    }
}

// Render dynamic pagination UI
function renderPagination(type, totalItems, currentPage) {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const containerId = type === "notice" ? "notice-pagination" : "freeboard-pagination";
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = "";

    // First & Prev buttons
    html += `<a href="#" onclick="changePage('${type}', 1, event)" class="page-btn ${currentPage === 1 ? 'disabled' : ''}" style="${currentPage === 1 ? 'pointer-events: none; opacity: 0.5;' : ''}"><i class="fa-solid fa-angles-left"></i></a>`;
    const prevPage = Math.max(1, currentPage - 1);
    html += `<a href="#" onclick="changePage('${type}', ${prevPage}, event)" class="page-btn ${currentPage === 1 ? 'disabled' : ''}" style="${currentPage === 1 ? 'pointer-events: none; opacity: 0.5;' : ''}"><i class="fa-solid fa-angle-left"></i></a>`;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        html += `<a href="#" onclick="changePage('${type}', ${i}, event)" class="page-num ${isActive ? 'active' : ''}" style="${isActive ? 'background-color: var(--color-green); color: white; border-color: var(--color-green); font-weight: 700;' : ''}">${i}</a>`;
    }

    // Next & Last buttons
    const nextPage = Math.min(totalPages, currentPage + 1);
    html += `<a href="#" onclick="changePage('${type}', ${nextPage}, event)" class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" style="${currentPage === totalPages ? 'pointer-events: none; opacity: 0.5;' : ''}"><i class="fa-solid fa-angle-right"></i></a>`;
    html += `<a href="#" onclick="changePage('${type}', ${totalPages}, event)" class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" style="${currentPage === totalPages ? 'pointer-events: none; opacity: 0.5;' : ''}"><i class="fa-solid fa-angles-right"></i></a>`;

    container.innerHTML = html;
}

window.changePage = function (type, page, event) {
    if (event) event.preventDefault();
    if (type === "notice") {
        noticePage = page;
        renderNoticeBoard();
    } else if (type === "freeboard") {
        freeboardPage = page;
        renderFreeBoard();
    } else if (type === "seminar_news") {
        seminarNewsPage = page;
        renderSeminarNews();
    }
};

// ==========================================
// 세미나 소식 — 렌더링 & CRUD
// ==========================================
async function renderSeminarNews() {
    const user    = getLoggedInUser();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    const grid = document.getElementById("seminar-news-grid");
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> 불러오는 중...</div>`;

    let posts = [];
    try {
        posts = await DB_getSeminarNews();
    } catch (e) {
        if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#cb3c31;"><i class="fa-solid fa-triangle-exclamation"></i> 데이터를 불러오지 못했습니다.</div>`;
        return;
    }

    // 최신 세미나 일자 순 정렬
    const sorted = [...posts].sort((a, b) => {
        const da = new Date(a.seminarDate || a.createdAt || 0);
        const db = new Date(b.seminarDate || b.createdAt || 0);
        return db - da;
    });

    const totalEl = document.getElementById("seminar-news-total");
    if (totalEl) totalEl.textContent = sorted.length;

    const totalPages = Math.max(1, Math.ceil(sorted.length / SN_ITEMS_PER_PAGE));
    if (seminarNewsPage > totalPages) seminarNewsPage = 1;
    const start     = (seminarNewsPage - 1) * SN_ITEMS_PER_PAGE;
    const paginated = sorted.slice(start, start + SN_ITEMS_PER_PAGE);

    const grid = document.getElementById("seminar-news-grid");
    if (!grid) return;

    if (paginated.length === 0) {
        grid.innerHTML = `
            <div class="sn-empty" style="grid-column:1/-1;">
                <i class="fa-regular fa-calendar-xmark"></i>
                <p>등록된 세미나 소식이 없습니다.</p>
                ${isAdmin ? `<button class="btn-apply" style="margin-top:12px;" onclick="openSnModal()"><i class="fa-solid fa-pen"></i> 첫 번째 소식 등록하기</button>` : ''}
            </div>`;
        document.getElementById("seminar-news-pagination").innerHTML = '';
        return;
    }

    grid.innerHTML = paginated.map(p => {
        const dateStr = p.seminarDate
            ? new Date(p.seminarDate).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})
            : '';
        const thumbHtml = p.thumbnail
            ? `<img src="${escapeHtml(p.thumbnail)}" alt="세미나 이미지" onerror="this.style.display='none'">`
            : `<i class="fa-solid fa-music"></i>`;
        const linkHtml = p.link
            ? `<a href="${escapeHtml(p.link)}" class="sn-card-link"
                  target="${p.link.startsWith('http') ? '_blank' : '_self'}">
                   <i class="fa-solid fa-arrow-right"></i> 자세히 보기
               </a>`
            : '<span></span>';
        const adminBtns = isAdmin
            ? `<div class="sn-card-admin-btns">
                   <button class="btn-sn-edit"   onclick="openSnModal(${p.id})" title="수정"><i class="fa-solid fa-pen"></i></button>
                   <button class="btn-sn-delete" onclick="deleteSnPost(${p.id})" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
               </div>`
            : '';

        return `
        <div class="sn-card">
            <div class="sn-card-thumb">
                ${thumbHtml}
                <span class="sn-cat-badge">${escapeHtml(p.category)}</span>
            </div>
            <div class="sn-card-body">
                <div class="sn-card-meta">
                    ${dateStr   ? `<span><i class="fa-regular fa-calendar"></i>${dateStr}</span>` : ''}
                    ${p.location ? `<span><i class="fa-solid fa-location-dot"></i>${escapeHtml(p.location)}</span>` : ''}
                </div>
                <div class="sn-card-title">${escapeHtml(p.title)}</div>
                <div class="sn-card-excerpt">${escapeHtml(p.content)}</div>
            </div>
            <div class="sn-card-footer">
                ${linkHtml}
                ${adminBtns}
            </div>
        </div>`;
    }).join('');

    // 페이지네이션
    const pEl = document.getElementById("seminar-news-pagination");
    if (pEl) {
        const dis = s => s ? 'pointer-events:none;opacity:0.5;' : '';
        const act = a => a ? 'background:var(--color-green);color:white;border-color:var(--color-green);font-weight:700;' : '';
        const isFirst = seminarNewsPage === 1;
        const isLast  = seminarNewsPage === totalPages;
        let html = '';
        html += `<a href="#" onclick="changePage('seminar_news',1,event)" class="page-btn${isFirst?' disabled':''}" style="${dis(isFirst)}"><i class="fa-solid fa-angles-left"></i></a>`;
        html += `<a href="#" onclick="changePage('seminar_news',${Math.max(1,seminarNewsPage-1)},event)" class="page-btn${isFirst?' disabled':''}" style="${dis(isFirst)}"><i class="fa-solid fa-angle-left"></i></a>`;
        for (let i = 1; i <= totalPages; i++)
            html += `<a href="#" onclick="changePage('seminar_news',${i},event)" class="page-num${i===seminarNewsPage?' active':''}" style="${act(i===seminarNewsPage)}">${i}</a>`;
        html += `<a href="#" onclick="changePage('seminar_news',${Math.min(totalPages,seminarNewsPage+1)},event)" class="page-btn${isLast?' disabled':''}" style="${dis(isLast)}"><i class="fa-solid fa-angle-right"></i></a>`;
        html += `<a href="#" onclick="changePage('seminar_news',${totalPages},event)" class="page-btn${isLast?' disabled':''}" style="${dis(isLast)}"><i class="fa-solid fa-angles-right"></i></a>`;
        pEl.innerHTML = html;
    }
}

window.openSnModal = async function(editId) {
    const overlay = document.getElementById('sn-modal-overlay');
    if (!overlay) return;
    document.getElementById('sn-write-form').reset();
    document.getElementById('sn-post-id').value = '';
    document.getElementById('sn-modal-title').textContent = '세미나 소식 등록';
    document.querySelector('#sn-write-form .btn-submit').textContent = '등록';

    if (editId !== undefined) {
        let posts = [];
        try { posts = await DB_getSeminarNews(); } catch(e) {}
        const p = posts.find(x => x.id === editId);
        if (!p) return;
        document.getElementById('sn-post-id').value    = p.id;
        document.getElementById('sn-category').value   = p.category || '정기세미나';
        document.getElementById('sn-date-input').value = p.seminarDate || '';
        document.getElementById('sn-title').value      = p.title || '';
        document.getElementById('sn-location').value   = p.location || '';
        document.getElementById('sn-content').value    = p.content || '';
        document.getElementById('sn-link').value       = p.link || '';
        document.getElementById('sn-thumbnail').value  = p.thumbnail || '';
        document.getElementById('sn-modal-title').textContent = '세미나 소식 수정';
        document.querySelector('#sn-write-form .btn-submit').textContent = '수정';

    }
    overlay.style.display = 'flex';
};

function closeSnModal() {
    const overlay = document.getElementById('sn-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('sn-write-form').reset();
}

window.handleSnSubmit = async function(e) {
    e.preventDefault();
    const user = getLoggedInUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
        alert('관리자만 등록할 수 있습니다.');
        return;
    }

    const editId = parseInt(document.getElementById('sn-post-id').value) || null;
    const today  = new Date().toISOString().slice(0, 10);

    const rec = {
        id:          editId || Date.now(),
        category:    document.getElementById('sn-category').value,
        title:       document.getElementById('sn-title').value.trim(),
        seminarDate: document.getElementById('sn-date-input').value,
        location:    document.getElementById('sn-location').value.trim(),
        content:     document.getElementById('sn-content').value.trim(),
        link:        document.getElementById('sn-link').value.trim(),
        thumbnail:   document.getElementById('sn-thumbnail').value.trim(),
        createdAt:   today,
    };

    const btn = document.querySelector('#sn-write-form .btn-submit');
    if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

    try {
        if (editId) {
            await DB_updateSeminarNews(editId, rec);
        } else {
            await DB_addSeminarNews(rec);
        }
        closeSnModal();
        await renderSeminarNews();
        alert(editId ? '✅ 수정되었습니다.' : '✅ 세미나 소식이 등록되었습니다.');
    } catch(err) {
        alert('저장에 실패했습니다: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = editId ? '수정' : '등록'; }
    }
};

window.deleteSnPost = async function(id) {
    const user = getLoggedInUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) return;
    if (!confirm('이 세미나 소식을 삭제하시겠습니까?')) return;
    try {
        await DB_deleteSeminarNews(id);
        await renderSeminarNews();
    } catch(err) {
        alert('삭제에 실패했습니다: ' + err.message);
    }
};

// ==========================================
// 4. Modal Interactions & CRUD Operations
// ==========================================
function initButtonListeners() {
    // ── 세미나 소식 모달 버튼 ──
    const btnWriteSn = document.getElementById('btn-write-seminar-news');
    if (btnWriteSn) btnWriteSn.addEventListener('click', () => openSnModal());

    const btnCloseSn  = document.getElementById('btn-close-sn');
    const btnCancelSn = document.getElementById('btn-cancel-sn');
    if (btnCloseSn)  btnCloseSn.addEventListener('click',  closeSnModal);
    if (btnCancelSn) btnCancelSn.addEventListener('click', closeSnModal);

    const snOverlay = document.getElementById('sn-modal-overlay');
    if (snOverlay) snOverlay.addEventListener('click', e => { if (e.target === snOverlay) closeSnModal(); });

    // Write buttons clicks
    const btnWriteNotice = document.getElementById("btn-write-notice");
    if (btnWriteNotice) {
        btnWriteNotice.addEventListener("click", () => {
            openWriteModal("notice");
        });
    }

    const btnWritePost = document.getElementById("btn-write-post");
    if (btnWritePost) {
        btnWritePost.addEventListener("click", () => {
            openWriteModal("freeboard");
        });
    }

    // Search buttons click
    const btnNoticeSearch = document.getElementById("btn-notice-search");
    if (btnNoticeSearch) {
        btnNoticeSearch.addEventListener("click", () => {
            const query = document.getElementById("notice-search-query").value.trim();
            const type = document.getElementById("notice-search-type").value;
            noticeSearchQuery = query;
            noticeSearchType = type;
            noticePage = 1;
            renderNoticeBoard();
        });
    }

    // Bind notice search Enter key
    const noticeSearchInput = document.getElementById("notice-search-query");
    if (noticeSearchInput) {
        noticeSearchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                btnNoticeSearch.click();
            }
        });
    }

    const btnFreeboardSearch = document.getElementById("btn-freeboard-search");
    if (btnFreeboardSearch) {
        btnFreeboardSearch.addEventListener("click", () => {
            const query = document.getElementById("freeboard-search-query").value.trim();
            const type = document.getElementById("freeboard-search-type").value;
            freeboardSearchQuery = query;
            freeboardSearchType = type;
            freeboardPage = 1;
            renderFreeBoard();
        });
    }

    // Bind freeboard search Enter key
    const freeboardSearchInput = document.getElementById("freeboard-search-query");
    if (freeboardSearchInput) {
        freeboardSearchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                btnFreeboardSearch.click();
            }
        });
    }

    // Close Modals buttons
    document.getElementById("btn-close-write").addEventListener("click", closeWriteModal);
    document.getElementById("btn-cancel-write").addEventListener("click", closeWriteModal);

    document.getElementById("btn-close-detail").addEventListener("click", closeDetailModal);
    document.getElementById("btn-close-detail-footer").addEventListener("click", closeDetailModal);

    // Edit & Delete click handlers inside detail modal
    document.getElementById("btn-edit-post").addEventListener("click", handleEditClick);
    document.getElementById("btn-delete-post").addEventListener("click", handleDeleteClick);

    // Bulk Delete Buttons Listener
    const btnDeleteSelectedNotice = document.getElementById("btn-delete-selected-notice");
    if (btnDeleteSelectedNotice) {
        btnDeleteSelectedNotice.addEventListener("click", () => {
            deleteSelectedPosts("notice");
        });
    }

    const btnDeleteSelectedFreeboard = document.getElementById("btn-delete-selected-freeboard");
    if (btnDeleteSelectedFreeboard) {
        btnDeleteSelectedFreeboard.addEventListener("click", () => {
            deleteSelectedPosts("freeboard");
        });
    }
}

// Modal State Variables
let currentDetailPostId = null;
let currentDetailPostType = null;

// Opening Write Modal
async function openWriteModal(type, editPostId = null) {
    const user = getLoggedInUser();

    // 1. Permission checks
    if (type === "notice") {
        if (!user || !ADMIN_ROLES.includes(user.role)) {
            alert("공지사항은 관리인만 등록할 수 있습니다.");
            return;
        }
    } else {
        // Free board: must be logged in
        if (!user) {
            if (confirm("로그인한 회원만 글을 작성할 수 있습니다.\n로그인 페이지로 이동하시겠습니까?")) {
                window.location.href = "login.html";
            }
            return;
        }
    }

    // Set type hidden input
    document.getElementById("write-post-type").value = type;
    document.getElementById("write-post-id").value = editPostId || "";

    // Set Author name (Read-Only)
    document.getElementById("post-author").value = user.name;

    // Populate Categories Dropdown
    const categorySelect = document.getElementById("post-category");
    if (type === "notice") {
        categorySelect.innerHTML = `
            <option value="안내">안내</option>
            <option value="시스템">시스템</option>
            <option value="일반">일반</option>
        `;
    } else {
        categorySelect.innerHTML = `
            <option value="자유">자유</option>
            <option value="질문">질문</option>
            <option value="정보">정보</option>
            <option value="소통">소통</option>
        `;
    }

    // Control datetime picker visibility for admins
    const groupDisplay = document.getElementById("group-post-date-display");
    const groupInput = document.getElementById("group-post-date-input");
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    if (isAdmin) {
        if (groupDisplay) groupDisplay.style.display = "none";
        if (groupInput) groupInput.style.display = "block";
    } else {
        if (groupDisplay) groupDisplay.style.display = "block";
        if (groupInput) groupInput.style.display = "none";
    }

    // Auto-fill today's date in the date display field
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}. ${String(todayObj.getMonth() + 1).padStart(2, '0')}. ${String(todayObj.getDate()).padStart(2, '0')}`;
    const dateDisplayEl = document.getElementById("post-date-display");
    if (dateDisplayEl) dateDisplayEl.value = todayStr;

    // ISO time string helper for datetime-local value (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    const dateInputEl = document.getElementById("post-date-input");
    if (dateInputEl) dateInputEl.value = localISOTime;

    // Set Title text depending on Create or Edit
    const writeModalTitle = document.getElementById("write-modal-title");

    if (editPostId) {
        // Edit mode: GAS에서 최신 데이터 가져와서 채우기
        writeModalTitle.textContent = type === "notice" ? "공지사항 수정" : "자유게시판 글 수정";
        try {
            const allPosts = type === "notice" ? await DB_getNotices() : await DB_getFreeboard();
            const post = allPosts.find(p => p.id === parseInt(editPostId));
            if (post) {
                categorySelect.value = post.category;
                document.getElementById("post-author").value = post.author;
                document.getElementById("post-title").value = post.title;
                document.getElementById("post-content").value = post.content;

                if (dateDisplayEl) dateDisplayEl.value = post.date;
                if (dateInputEl) {
                    const isoVal = parseDateToISOString(post.date);
                    dateInputEl.value = isoVal || localISOTime;
                }
            }
        } catch(e) {
            // 데이터 로드 실패해도 모달은 열어둠
        }
    } else {
        // Create mode: clear fields
        writeModalTitle.textContent = type === "notice" ? "공지사항 등록" : "자유게시판 글쓰기";
        categorySelect.selectedIndex = 0;
        document.getElementById("post-title").value = "";
        document.getElementById("post-content").value = "";
    }

    // Show overlay modal
    document.getElementById("write-modal-overlay").classList.add("active");
}

function closeWriteModal() {
    document.getElementById("write-modal-overlay").classList.remove("active");
}

// Submitting Post Submit Form
window.handlePostSubmit = async function (event) {
    event.preventDefault();

    const type     = document.getElementById("write-post-type").value;
    const idInput  = document.getElementById("write-post-id").value;
    const category = document.getElementById("post-category").value;
    const author   = document.getElementById("post-author").value;
    const title    = document.getElementById("post-title").value.trim();
    const content  = document.getElementById("post-content").value.trim();

    const user = getLoggedInUser();
    if (!user) {
        alert("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
    }

    const isAdmin = ADMIN_ROLES.includes(user.role);

    // 저장 버튼 비활성화
    const submitBtn = document.querySelector("#write-post-form .btn-submit") ||
                      document.querySelector(".write-modal-footer .btn-submit");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "저장 중..."; }

    try {
        if (idInput) {
            // 1. UPDATE EXISTING POST
            const postId = parseInt(idInput);
            const updateData = { category, title, content };

            if (isAdmin) {
                const inputDateVal = document.getElementById("post-date-input").value;
                if (inputDateVal) updateData.date = formatDateStringToCustom(inputDateVal);
            }

            if (type === "notice") {
                await DB_updateNotice(postId, updateData);
            } else {
                await DB_updateFreePost(postId, updateData);
            }
            alert("수정되었습니다.");
        } else {
            // 2. CREATE NEW POST
            let formattedDate = "";
            if (isAdmin) {
                const inputDateVal = document.getElementById("post-date-input").value;
                if (inputDateVal) {
                    formattedDate = formatDateStringToCustom(inputDateVal);
                }
            }
            if (!formattedDate) {
                const dateObj = new Date();
                formattedDate = `${dateObj.getFullYear()}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${String(dateObj.getDate()).padStart(2, '0')}`;
            }

            const newPost = {
                id:       Date.now(),
                type:     type,
                category: category,
                title:    title,
                content:  content,
                author:   author,
                email:    user.email,
                date:     formattedDate,
                views:    0
            };

            if (type === "notice") {
                await DB_addNotice(newPost);
            } else {
                await DB_addFreePost(newPost);
            }
            alert("등록되었습니다.");
        }

        // 성공 시 모달 닫고 목록 새로고침
        closeWriteModal();
        if (type === "notice") {
            noticePage = 1;
            await renderNoticeBoard();
        } else {
            freeboardPage = 1;
            await renderFreeBoard();
        }
    } catch (err) {
        alert("저장에 실패했습니다: " + err.message);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "등록"; }
    }
};

// Opening Detail View Modal
window.openDetailModal = async function (id, type, event) {
    if (event) event.preventDefault();

    // GAS에서 최신 데이터 가져오기
    let posts = [];
    try {
        posts = type === "notice" ? await DB_getNotices() : await DB_getFreeboard();
    } catch(e) {
        alert("게시글을 불러오지 못했습니다.");
        return;
    }

    const post = posts.find(p => p.id === id);
    if (!post) {
        alert("해당 게시글이 존재하지 않습니다.");
        return;
    }

    currentDetailPostId = id;
    currentDetailPostType = type;

    // 1. 조회수 증가 (GAS 업데이트, 화면만 먼저 반영)
    const newViews = (parseInt(post.views || 0) + 1);
    post.views = newViews;
    if (type === "notice") {
        DB_updateNotice(id, { views: newViews }).catch(() => {});
    } else {
        DB_updateFreePost(id, { views: newViews }).catch(() => {});
    }

    // 2. Render Details
    const catBadge = document.getElementById("detail-category");
    catBadge.textContent = post.category;
    catBadge.className = `badge cat-${post.category}`;

    const badgeStyle = getCategoryBadgeStyle(post.category);
    catBadge.style.backgroundColor = badgeStyle.bg;
    catBadge.style.color = badgeStyle.color;

    document.getElementById("detail-title").textContent = post.title;
    document.getElementById("detail-author").textContent = post.author;
    document.getElementById("detail-date").textContent = post.date;
    document.getElementById("detail-views").textContent = newViews;
    document.getElementById("detail-content").textContent = post.content;

    // 3. Permission controls
    const actionButtons = document.getElementById("detail-action-buttons");
    const user = getLoggedInUser();

    let canEditDelete = false;
    if (user) {
        if (ADMIN_ROLES.includes(user.role)) {
            canEditDelete = true;
        } else if (type === "freeboard") {
            canEditDelete = (post.email === user.email);
        }
    }
    actionButtons.style.display = canEditDelete ? "flex" : "none";

    // Show Modal
    document.getElementById("detail-modal-overlay").classList.add("active");
};

function closeDetailModal() {
    document.getElementById("detail-modal-overlay").classList.remove("active");
    currentDetailPostId = null;
    currentDetailPostType = null;
}

// Handling Edit Request inside Detail Modal
function handleEditClick() {
    if (!currentDetailPostId || !currentDetailPostType) return;

    const postId = currentDetailPostId;
    const postType = currentDetailPostType;

    // Close detail modal, open write modal in edit mode
    closeDetailModal();
    openWriteModal(postType, postId);
}

// Handling Delete Request inside Detail Modal
async function handleDeleteClick() {
    if (!currentDetailPostId || !currentDetailPostType) return;

    const postId   = currentDetailPostId;
    const postType = currentDetailPostType;

    if (!confirm("정말로 이 글을 삭제하시겠습니까?")) return;

    const user = getLoggedInUser();
    if (!user) {
        alert("로그인 세션이 유효하지 않습니다.");
        return;
    }

    try {
        if (postType === "notice") {
            await DB_deleteNotice(postId);
        } else {
            await DB_deleteFreePost(postId);
        }
        alert("삭제되었습니다.");
        closeDetailModal();
        if (postType === "notice") {
            noticePage = 1;
            await renderNoticeBoard();
        } else {
            freeboardPage = 1;
            await renderFreeBoard();
        }
    } catch(err) {
        alert("삭제에 실패했습니다: " + err.message);
    }
}

// Helper to escape HTML to prevent XSS in client-rendered content
function escapeHtml(text) {
    if (typeof text !== "string") return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.deletePostDirectly = async function (postId, postType, event) {
    if (event) event.stopPropagation();

    if (!confirm("정말로 이 글을 삭제하시겠습니까?")) return;

    const user = getLoggedInUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
        alert("삭제 권한이 없습니다.");
        return;
    }

    try {
        if (postType === "notice") {
            await DB_deleteNotice(postId);
        } else {
            await DB_deleteFreePost(postId);
        }
        alert("삭제되었습니다.");
        if (postType === "notice") {
            noticePage = 1;
            await renderNoticeBoard();
        } else {
            freeboardPage = 1;
            await renderFreeBoard();
        }
    } catch(err) {
        alert("삭제에 실패했습니다: " + err.message);
    }
};

// --- Custom Additions for Date Handling & Bulk Deletion ---

function parseDateToISOString(dateStr) {
    if (!dateStr) return "";
    // Remove dots, and replace multiple spaces
    const cleaned = dateStr.replace(/\./g, "").replace(/\s+/g, " ").trim();
    // Example format: "2026 05 29" or "2026 05 29 14:30"
    const parts = cleaned.split(" ");
    if (parts.length >= 3) {
        const yyyy = parts[0];
        const mm = parts[1].padStart(2, '0');
        const dd = parts[2].padStart(2, '0');
        let hh = "00";
        let mi = "00";
        if (parts.length >= 4) {
            const timeParts = parts[3].split(":");
            if (timeParts.length >= 1) hh = timeParts[0].padStart(2, '0');
            if (timeParts.length >= 2) mi = timeParts[1].padStart(2, '0');
        }
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }
    return "";
}

function formatDateStringToCustom(isoStr) {
    if (!isoStr) return "";
    // Example isoStr: "2026-06-14T15:30"
    const parts = isoStr.split("T");
    if (parts.length === 2) {
        const datePart = parts[0]; // "2026-06-14"
        const timePart = parts[1]; // "15:30"
        const dateItems = datePart.split("-");
        if (dateItems.length === 3) {
            return `${dateItems[0]}. ${dateItems[1]}. ${dateItems[2]} ${timePart}`;
        }
    } else {
        const dateItems = isoStr.split("-");
        if (dateItems.length === 3) {
            return `${dateItems[0]}. ${dateItems[1]}. ${dateItems[2]}`;
        }
    }
    return isoStr;
}

window.deleteSelectedPosts = async function (postType) {
    const user = getLoggedInUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
        alert("삭제 권한이 없습니다.");
        return;
    }

    const tbodyId = postType === "notice" ? "notice-list-tbody" : "freeboard-list-tbody";
    const checkedBoxes = document.querySelectorAll(`#${tbodyId} .post-select-chk:checked`);

    if (checkedBoxes.length === 0) {
        alert("삭제할 글을 선택해 주세요.");
        return;
    }

    if (!confirm(`선택한 ${checkedBoxes.length}개의 글을 정말로 삭제하시겠습니까?`)) {
        return;
    }

    const idsToDelete = Array.from(checkedBoxes).map(chk => parseInt(chk.getAttribute("data-id")));

    try {
        // 선택된 글들을 병렬로 삭제
        const deletePromises = idsToDelete.map(id =>
            postType === "notice" ? DB_deleteNotice(id) : DB_deleteFreePost(id)
        );
        await Promise.all(deletePromises);
        alert("선택한 글들이 삭제되었습니다.");
    } catch(err) {
        alert("일부 삭제에 실패했습니다: " + err.message);
    }

    // Uncheck select all checkbox
    const selectAllCheckbox = document.getElementById(postType === "notice" ? "notice-select-all" : "freeboard-select-all");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    // Refresh board
    if (postType === "notice") {
        noticePage = 1;
        await renderNoticeBoard();
    } else {
        freeboardPage = 1;
        await renderFreeBoard();
    }
};
