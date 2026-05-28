// freeboard.js - Functional Free Board & Notice Board CRUD with User Roles

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
const DEFAULT_NOTICES = [
    { id: 5, type: "notice", category: "안내", title: "2026년 춘계 학술대회 일정 및 논문 발표 신청 안내", file: true, date: "2026. 03. 11", views: 152, content: "2026년 춘계 학술대회 일정 및 논문 발표 신청 안내입니다.\n\n대중음악콘텐츠학회지 연구윤리 검증절차에 의해 본 학회 학술지 「대중음악콘텐츠학... [중략]\n많은 관심과 투고 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" },
    { id: 4, type: "notice", category: "시스템", title: "학회 홈페이지 리뉴얼 및 온라인 투고 시스템 오픈 안내", file: false, date: "2026. 02. 20", views: 301, content: "학회 홈페이지 리뉴얼 및 온라인 투고 시스템 오픈 안내입니다.\n\n회원 여러분의 편리한 논문 투고를 돕기 위해 신규 온라인 논문투고 시스템이 도입되었습니다.\n앞으로 새로운 시스템을 이용하여 논문을 접수해 주시기 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" },
    { id: 3, type: "notice", category: "안내", title: "한국음악학회 제50권 2호 원문 서비스 오픈", file: false, date: "2026. 02. 15", views: 85, content: "안녕하십니까, 한국음악학회입니다.\n\n한국음악학회 학회지 제50권 2호의 원문 서비스가 홈페이지를 통해 개시되었습니다.\n원문은 회원 로그인 후 열람 및 다운로드 받으실 수 있습니다.", author: "관리인", email: "admin@gugak.go.kr" },
    { id: 2, type: "notice", category: "일반", title: "2026년도 신임 임원진 선출 결과 공고", file: true, date: "2026. 01. 30", views: 120, content: "2026년도 신임 임원진 선출 결과 공고입니다.\n\n자세한 임원진 구성표는 첨부된 PDF 파일을 참조해 주시기 바랍니다.\n올해 학회를 이끌어 주실 분들께 큰 응원 부탁드립니다.", author: "관리인", email: "admin@gugak.go.kr" },
    { id: 1, type: "notice", category: "안내", title: "학회 연회비 납부 계좌 변경 안내", file: false, date: "2026. 01. 20", views: 214, content: "학회 연회비 납부 계좌가 다음과 같이 변경되었습니다.\n\n- 은행: 신한은행\n- 계좌번호: 140-015-967840\n- 예금주: 한국음악학회 박범훈\n\n회원 여러분께서는 연회비 송금 시 착오 없으시길 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" }
];

const DEFAULT_FREEBOARD = [
    { id: 3, type: "freeboard", category: "자유", title: "안녕하세요. 신임 회원 인사드립니다.", date: "2026. 05. 28", views: 12, content: "이번에 학회에 가입하게 된 김민우입니다. 국악관현악 연구에 관심이 많습니다. 앞으로 많은 지도 편달 부탁드립니다.", author: "김민우", email: "minwoo@gmail.com" },
    { id: 2, type: "freeboard", category: "질문", title: "2026년 춘계 학술대회 발표 자료 양식 관련 질문", date: "2026. 05. 27", views: 24, content: "춘계 학술대회 구두 발표 PPT 템플릿이나 양식이 따로 제공되는지 궁금합니다. 아니면 자유 양식으로 준비해도 되나요? 아시는 분 답변 부탁드립니다.", author: "이영희", email: "younghee@gmail.com" },
    { id: 1, type: "freeboard", category: "정보", title: "국악 학술 정보 사이트 공유합니다.", date: "2026. 05. 20", views: 45, content: "한국음악 연구에 유용한 자료들이 모여있는 국립국악원 국악학술정보시스템 링크를 공유합니다. 연구에 참고하시기 바랍니다.\n링크: http://gugak.go.kr", author: "박철수", email: "chulsoo@gmail.com" }
];

const ADMIN_ROLES = ["admin", "secretary", "editor", "president"];

let currentTab = "notice"; // 'notice' or 'freeboard'
let noticePage = 1;
let freeboardPage = 1;
const ITEMS_PER_PAGE = 5;

// Search terms
let noticeSearchQuery = "";
let noticeSearchType = "all";
let freeboardSearchQuery = "";
let freeboardSearchType = "all";

function initStorage() {
    if (!localStorage.getItem("notice_posts")) {
        localStorage.setItem("notice_posts", JSON.stringify(DEFAULT_NOTICES));
        localStorage.setItem("notice_posts_idx", "6");
    }
    if (!localStorage.getItem("freeboard_posts")) {
        localStorage.setItem("freeboard_posts", JSON.stringify(DEFAULT_FREEBOARD));
        localStorage.setItem("freeboard_posts_idx", "4");
    }
}

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
    } else {
        currentTab = "notice";
    }
    
    // Switch tabs UI
    updateTabsUI();
    
    // Bind Tab Click Handlers
    const tabNoticeBtn = document.getElementById("tab-notice");
    const tabFreeboardBtn = document.getElementById("tab-freeboard");
    
    if (tabNoticeBtn) {
        tabNoticeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("notice");
        });
    }
    
    if (tabFreeboardBtn) {
        tabFreeboardBtn.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("freeboard");
        });
    }
}

function switchTab(tabName) {
    if (currentTab === tabName) return;
    currentTab = tabName;
    
    // Update URL query string
    const url = new URL(window.location);
    url.searchParams.set("tab", tabName);
    window.history.pushState({}, "", url);
    
    // Render
    updateTabsUI();
    renderActiveTab();
}

function updateTabsUI() {
    const tabNoticeBtn = document.getElementById("tab-notice");
    const tabFreeboardBtn = document.getElementById("tab-freeboard");
    const sectionNotice = document.getElementById("section-notice");
    const sectionFreeboard = document.getElementById("section-freeboard");
    const breadcrumbCurrent = document.getElementById("breadcrumb-current");
    
    if (currentTab === "notice") {
        if (tabNoticeBtn) tabNoticeBtn.classList.add("active");
        if (tabFreeboardBtn) tabFreeboardBtn.classList.remove("active");
        if (sectionNotice) sectionNotice.style.display = "block";
        if (sectionFreeboard) sectionFreeboard.style.display = "none";
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = "공지사항";
    } else {
        if (tabNoticeBtn) tabNoticeBtn.classList.remove("active");
        if (tabFreeboardBtn) tabFreeboardBtn.classList.add("active");
        if (sectionNotice) sectionNotice.style.display = "none";
        if (sectionFreeboard) sectionFreeboard.style.display = "block";
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = "자유게시판";
    }
}

function renderActiveTab() {
    const user = getLoggedInUser();
    
    if (currentTab === "notice") {
        // Show write notice button only for admin
        const btnWriteNotice = document.getElementById("btn-write-notice");
        if (btnWriteNotice) {
            btnWriteNotice.style.display = (user && ADMIN_ROLES.includes(user.role)) ? "inline-block" : "none";
        }
        renderNoticeBoard();
    } else {
        // Free board write button is always visible, but click handler will check login status
        renderFreeBoard();
    }
}

// ==========================================
// 3. Board Rendering & Filtering
// ==========================================
function renderNoticeBoard() {
    const notices = JSON.parse(localStorage.getItem("notice_posts") || "[]");
    const user = getLoggedInUser();
    
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
        tbody.innerHTML = `<tr><td colspan="6" class="col-title" style="text-align: center; padding: 30px; color: var(--text-muted);">등록된 공지사항이 없습니다.</td></tr>`;
    } else {
        tbody.innerHTML = paginated.map(p => {
            const isNoticeRow = p.category === "안내" || p.category === "시스템";
            const rowStyle = isNoticeRow ? 'style="background-color: #fff9f9;"' : '';
            const badgeClass = isNoticeRow ? 'badge red' : 'badge grey';
            const fileIcon = p.file ? '<i class="fa-regular fa-file-pdf"></i>' : '';
            
            return `
                <tr ${rowStyle}>
                    <td class="col-num">${isNoticeRow ? `<span class="${badgeClass}">공지</span>` : p.id}</td>
                    <td class="col-cat">${p.category}</td>
                    <td class="col-title left">
                        <a href="#" onclick="openDetailModal(${p.id}, 'notice', event)" style="font-weight: ${isNoticeRow ? '700' : '500'}; color: var(--text-dark);">${escapeHtml(p.title)}</a>
                        ${user && ADMIN_ROLES.includes(user.role) ? `<button class="btn-delete-small" onclick="deletePostDirectly(${p.id}, 'notice', event)" title="글 삭제" style="margin-left: 8px; background: none; border: none; color: #cb3c31; cursor: pointer; font-size: 0.85rem; padding: 2px 5px; transition: all 0.2s;" onmouseover="this.style.color='#b03228'" onmouseout="this.style.color='#cb3c31'"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </td>
                    <td class="col-file">${fileIcon}</td>
                    <td class="col-year">${p.date}</td>
                    <td class="col-view">${p.views}</td>
                </tr>
            `;
        }).join("");
    }
    
    renderPagination("notice", filtered.length, noticePage);
}

function renderFreeBoard() {
    const posts = JSON.parse(localStorage.getItem("freeboard_posts") || "[]");
    const user = getLoggedInUser();
    
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">등록된 게시글이 없습니다.</td></tr>`;
    } else {
        tbody.innerHTML = paginated.map(p => {
            const badgeStyle = getCategoryBadgeStyle(p.category);
            
            return `
                <tr>
                    <td class="col-num">${p.id}</td>
                    <td class="col-cat"><span class="badge" style="background-color: ${badgeStyle.bg}; color: ${badgeStyle.color}; font-size: 0.8rem; padding: 3px 8px; border-radius: 3px; font-weight: 700;">${p.category}</span></td>
                    <td class="col-title left">
                        <a href="#" onclick="openDetailModal(${p.id}, 'freeboard', event)" style="color: var(--text-dark);">${escapeHtml(p.title)}</a>
                        ${user && ADMIN_ROLES.includes(user.role) ? `<button class="btn-delete-small" onclick="deletePostDirectly(${p.id}, 'freeboard', event)" title="글 삭제" style="margin-left: 8px; background: none; border: none; color: #cb3c31; cursor: pointer; font-size: 0.85rem; padding: 2px 5px; transition: all 0.2s;" onmouseover="this.style.color='#b03228'" onmouseout="this.style.color='#cb3c31'"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </td>
                    <td class="col-year">${escapeHtml(p.author)}</td>
                    <td class="col-year">${p.date}</td>
                    <td class="col-view">${p.views}</td>
                </tr>
            `;
        }).join("");
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

window.changePage = function(type, page, event) {
    if (event) event.preventDefault();
    if (type === "notice") {
        noticePage = page;
        renderNoticeBoard();
    } else {
        freeboardPage = page;
        renderFreeBoard();
    }
};

// ==========================================
// 4. Modal Interactions & CRUD Operations
// ==========================================
function initButtonListeners() {
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
}

// Modal State Variables
let currentDetailPostId = null;
let currentDetailPostType = null;

// Opening Write Modal
function openWriteModal(type, editPostId = null) {
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
    
    // Set Title text depending on Create or Edit
    const writeModalTitle = document.getElementById("write-modal-title");
    
    if (editPostId) {
        // Edit mode: fetch post data and prefill
        const postsKey = type === "notice" ? "notice_posts" : "freeboard_posts";
        const posts = JSON.parse(localStorage.getItem(postsKey) || "[]");
        const post = posts.find(p => p.id === parseInt(editPostId));
        
        if (post) {
            writeModalTitle.textContent = type === "notice" ? "공지사항 수정" : "자유게시판 글 수정";
            categorySelect.value = post.category;
            document.getElementById("post-author").value = post.author;
            document.getElementById("post-title").value = post.title;
            document.getElementById("post-content").value = post.content;
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
window.handlePostSubmit = function(event) {
    event.preventDefault();
    
    const type = document.getElementById("write-post-type").value;
    const idInput = document.getElementById("write-post-id").value;
    const category = document.getElementById("post-category").value;
    const author = document.getElementById("post-author").value;
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();
    
    const user = getLoggedInUser();
    if (!user) {
        alert("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
    }
    
    const postsKey = type === "notice" ? "notice_posts" : "freeboard_posts";
    const posts = JSON.parse(localStorage.getItem(postsKey) || "[]");
    
    if (idInput) {
        // 1. UPDATE EXISTING POST
        const postId = parseInt(idInput);
        const post = posts.find(p => p.id === postId);
        
        if (post) {
            // Check authorization before edit
            const isAuthorized = ADMIN_ROLES.includes(user.role) || post.email === user.email;
            if (!isAuthorized) {
                alert("권한이 없습니다. 본인의 글만 수정할 수 있습니다.");
                return;
            }
            
            post.category = category;
            post.title = title;
            post.content = content;
            localStorage.setItem(postsKey, JSON.stringify(posts));
            alert("수정되었습니다.");
        }
    } else {
        // 2. CREATE NEW POST
        const idxKey = type === "notice" ? "notice_posts_idx" : "freeboard_posts_idx";
        const currentIdx = parseInt(localStorage.getItem(idxKey) || "1");
        
        const dateObj = new Date();
        const formattedDate = `${dateObj.getFullYear()}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${String(dateObj.getDate()).padStart(2, '0')}`;
        
        const newPost = {
            id: currentIdx,
            type: type,
            category: category,
            title: title,
            content: content,
            author: author,
            email: user.email,
            date: formattedDate,
            views: 0
        };
        
        posts.unshift(newPost);
        localStorage.setItem(postsKey, JSON.stringify(posts));
        localStorage.setItem(idxKey, (currentIdx + 1).toString());
        alert("등록되었습니다.");
    }
    
    // Close write modal and refresh
    closeWriteModal();
    if (type === "notice") {
        noticePage = 1;
        renderNoticeBoard();
    } else {
        freeboardPage = 1;
        renderFreeBoard();
    }
};

// Opening Detail View Modal
window.openDetailModal = function(id, type, event) {
    if (event) event.preventDefault();
    
    const postsKey = type === "notice" ? "notice_posts" : "freeboard_posts";
    const posts = JSON.parse(localStorage.getItem(postsKey) || "[]");
    const post = posts.find(p => p.id === id);
    
    if (!post) {
        alert("해당 게시글이 존재하지 않습니다.");
        return;
    }
    
    currentDetailPostId = id;
    currentDetailPostType = type;
    
    // 1. Increment Views Counter
    post.views = parseInt(post.views || 0) + 1;
    localStorage.setItem(postsKey, JSON.stringify(posts));
    
    // 2. Render Details
    const catBadge = document.getElementById("detail-category");
    catBadge.textContent = post.category;
    catBadge.className = `badge cat-${post.category}`;
    
    // Set dynamic style for categories
    const badgeStyle = getCategoryBadgeStyle(post.category);
    catBadge.style.backgroundColor = badgeStyle.bg;
    catBadge.style.color = badgeStyle.color;
    
    document.getElementById("detail-title").textContent = post.title;
    document.getElementById("detail-author").textContent = post.author;
    document.getElementById("detail-date").textContent = post.date;
    document.getElementById("detail-views").textContent = post.views;
    document.getElementById("detail-content").textContent = post.content;
    
    // 3. Permission controls for Edit/Delete actions buttons
    const actionButtons = document.getElementById("detail-action-buttons");
    const user = getLoggedInUser();
    
    let canEditDelete = false;
    if (user) {
        if (ADMIN_ROLES.includes(user.role)) {
            // Admin can edit/delete everything
            canEditDelete = true;
        } else if (type === "freeboard") {
            // Members can edit/delete their own posts
            canEditDelete = (post.email === user.email);
        }
    }
    
    if (canEditDelete) {
        actionButtons.style.display = "flex";
    } else {
        actionButtons.style.display = "none";
    }
    
    // Show Modal
    document.getElementById("detail-modal-overlay").classList.add("active");
    
    // Re-render board below to update views count in real-time
    if (type === "notice") {
        renderNoticeBoard();
    } else {
        renderFreeBoard();
    }
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
function handleDeleteClick() {
    if (!currentDetailPostId || !currentDetailPostType) return;
    
    const postId = currentDetailPostId;
    const postType = currentDetailPostType;
    
    if (!confirm("정말로 이 글을 삭제하시겠습니까?")) return;
    
    const user = getLoggedInUser();
    if (!user) {
        alert("로그인 세션이 유효하지 않습니다.");
        return;
    }
    
    const postsKey = postType === "notice" ? "notice_posts" : "freeboard_posts";
    const posts = JSON.parse(localStorage.getItem(postsKey) || "[]");
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
        alert("게시글을 찾을 수 없습니다.");
        return;
    }
    
    const post = posts[postIndex];
    const isAuthorized = ADMIN_ROLES.includes(user.role) || post.email === user.email;
    if (!isAuthorized) {
        alert("삭제 권한이 없습니다.");
        return;
    }
    
    posts.splice(postIndex, 1);
    localStorage.setItem(postsKey, JSON.stringify(posts));
    alert("삭제되었습니다.");
    
    closeDetailModal();
    if (postType === "notice") {
        renderNoticeBoard();
    } else {
        renderFreeBoard();
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

window.deletePostDirectly = function(postId, postType, event) {
    if (event) event.stopPropagation(); // Prevent modal opening on click
    
    if (!confirm("정말로 이 글을 삭제하시겠습니까?")) return;
    
    const user = getLoggedInUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
        alert("삭제 권한이 없습니다.");
        return;
    }
    
    const postsKey = postType === "notice" ? "notice_posts" : "freeboard_posts";
    const posts = JSON.parse(localStorage.getItem(postsKey) || "[]");
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
        alert("게시글을 찾을 수 없습니다.");
        return;
    }
    
    posts.splice(postIndex, 1);
    localStorage.setItem(postsKey, JSON.stringify(posts));
    alert("삭제되었습니다.");
    
    if (postType === "notice") {
        renderNoticeBoard();
    } else {
        renderFreeBoard();
    }
};
