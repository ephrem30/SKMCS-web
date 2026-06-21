// 1. Immediately Initialize Database to solve timing bug
// This MUST run at script load time (not inside DOMContentLoaded) so that
// other inline scripts on pages like member_admin.html can read the data immediately.
(function() {
    const registeredUsersStr = localStorage.getItem("registered_users");
    const defaultMockUsers = [
        { email: "admin@gmail.com", password: "admin123", name: "최고관리자", role: "admin", affiliation: "한국음악학회", phone: "010-1234-5678", birth: "1980-01-01" },
        { email: "secretary@gmail.com", password: "sec123", name: "학회간사", role: "secretary", affiliation: "한국음악학회", phone: "010-2345-6789", birth: "1985-05-15" },
        { email: "reviewer@gmail.com", password: "rev123", name: "심사위원", role: "reviewer", affiliation: "한국음악학회", phone: "010-3456-7890", birth: "1975-08-20" },
        { email: "editor@gmail.com", password: "edi123", name: "편집위원장", role: "editor", affiliation: "한국음악학회", phone: "010-4567-8901", birth: "1972-11-30" },
        { email: "president@gmail.com", password: "pre123", name: "학회회장", role: "president", affiliation: "한국음악학회", phone: "010-5678-9012", birth: "1965-03-25" }
    ];
    
    if (!registeredUsersStr) {
        // No data at all — initialize with defaults
        localStorage.setItem("registered_users", JSON.stringify(defaultMockUsers));
    } else {
        try {
            let users = JSON.parse(registeredUsersStr);
            if (!Array.isArray(users)) {
                localStorage.setItem("registered_users", JSON.stringify(defaultMockUsers));
            } else {
                // Ensure all default admin/staff accounts exist (merge, don't overwrite)
                let changed = false;
                defaultMockUsers.forEach(mock => {
                    const exists = users.some(u => u.email && u.email.toLowerCase() === mock.email.toLowerCase());
                    if (!exists) {
                        users.push(mock);
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem("registered_users", JSON.stringify(users));
                }
            }
        } catch (e) {
            localStorage.setItem("registered_users", JSON.stringify(defaultMockUsers));
        }
    }

    // Automatically grant full admin authority to the user named "최우창"
    const currentUsersStr = localStorage.getItem("registered_users");
    if (currentUsersStr) {
        try {
            let users = JSON.parse(currentUsersStr);
            let updated = false;
            users.forEach(u => {
                if (u.name === "최우창" && u.role !== "admin") {
                    u.role = "admin";
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem("registered_users", JSON.stringify(users));
            }
        } catch (e) {
            console.error("Error updating 최우창 user role:", e);
        }
    }
})();

// 2. Global Helpers for Special Admin & Database Reset
window.isSpecialAdmin = function(user) {
    if (!user) return false;
    return user.email.toLowerCase() === 'admin@gmail.com' || user.name === '최우창';
};

window.resetSystemDatabase = function() {
    const defaultMockUsers = [
        { email: "admin@gmail.com", password: "admin123", name: "최고관리자", role: "admin", affiliation: "한국음악학회", phone: "010-1234-5678", birth: "1980-01-01" },
        { email: "secretary@gmail.com", password: "sec123", name: "학회간사", role: "secretary", affiliation: "한국음악학회", phone: "010-2345-6789", birth: "1985-05-15" },
        { email: "reviewer@gmail.com", password: "rev123", name: "심사위원", role: "reviewer", affiliation: "한국음악학회", phone: "010-3456-7890", birth: "1975-08-20" },
        { email: "editor@gmail.com", password: "edi123", name: "편집위원장", role: "editor", affiliation: "한국음악학회", phone: "010-4567-8901", birth: "1972-11-30" },
        { email: "president@gmail.com", password: "pre123", name: "학회회장", role: "president", affiliation: "한국음악학회", phone: "010-5678-9012", birth: "1965-03-25" }
    ];

    const DEFAULT_NOTICES = [
        { id: 6, type: "notice", category: "시스템", title: "[공지] 한국음악학회 공식 홈페이지 오픈 안내", file: false, date: "2026. 05. 29", views: 0, content: "안녕하십니까, 한국음악학회입니다.\n\n2026년 5월 29일부로 한국음악학회 공식 홈페이지가 새롭게 오픈하였습니다.\n\n■ 주요 서비스 안내\n\n1. 논문 온라인 투고 시스템\n   - 회원 로그인 후 논문 파일 및 연구윤리서약서를 온라인으로 간편하게 접수하실 수 있습니다.\n   - 투고 후 심사 진행 상황을 실시간으로 확인하실 수 있습니다.\n\n2. 학회지 원문 서비스\n   - 역대 학회지(한국음악문화)의 논문 원문을 홈페이지에서 열람 및 다운로드하실 수 있습니다.\n\n3. 학술활동 안내\n   - 학술대회, 연구모임, 세미나 일정을 실시간으로 확인하실 수 있습니다.\n\n4. 회원 서비스\n   - 온라인 입회 신청, 회원 정보 조회 등 다양한 회원 서비스를 제공합니다.\n\n■ 문의사항\n홈페이지 이용 중 불편사항이나 오류가 발견되실 경우, 학회 사무국으로 연락 주시기 바랍니다.\n- E-mail: skmcs@dgu.ac.kr\n- 주소: (04620) 서울특별시 중구 필동로 1길 30 동국대학교 문화관\n\n회원 여러분의 많은 관심과 이용을 부탁드립니다.\n\n한국음악학회 사무국 드림", author: "관리인", email: "admin@gugak.go.kr" },
        { id: 5, type: "notice", category: "안내", title: "2026년 춘계 학술대회 일정 및 논문 발표 신청 안내", file: true, date: "2026. 03. 11", views: 152, content: "2026년 춘계 학술대회 일정 및 논문 발표 신청 안내입니다.\n\n대중음악콘텐츠학회지 연구윤리 검증절차에 의해 본 학회 학술지 「대중음악콘텐츠학... [중략]\n많은 관심과 투고 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" },
        { id: 4, type: "notice", category: "시스템", title: "학회 홈페이지 리뉴얼 및 온라인 투고 시스템 오픈 안내", file: false, date: "2026. 02. 20", views: 301, content: "학회 홈페이지 리뉴얼 및 온라인 투고 시스템 오픈 안내입니다.\n\n회원 여러분의 편리한 논문 투고를 돕기 위해 신규 온라인 논문투고 시스템이 도입되었습니다.\n앞으로 새로운 시스템을 이용하여 논문을 접수해 주시기 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" },
        { id: 3, type: "notice", category: "안내", title: "한국음악학회 제50권 2호 원문 서비스 오픈", file: false, date: "2026. 02. 15", views: 85, content: "안녕하십니까, 한국음악학회입니다.\n\n한국음악학회 학회지 제50권 2호의 원문 서비스가 홈페이지를 통해 개시되었습니다.\n원문은 회원 로그인 후 열람 및 다운로드 받으실 수 있습니다.", author: "관리인", email: "admin@gugak.go.kr" },
        { id: 2, type: "notice", category: "일반", title: "2026년도 신임 임원진 선출 결과 공고", file: true, date: "2026. 01. 30", views: 120, content: "2026년도 신임 임원진 선출 결과 공고입니다.\n\n자세한 임원진 구성표는 첨부된 PDF 파일을 참조해 주시기 바랍니다.\n올해 학회를 이끌어 주실 분들께 큰 응원 부탁드립니다.", author: "관리인", email: "admin@gugak.go.kr" },
        { id: 1, type: "notice", category: "안내", title: "학회 연회비 납부 계좌 변경 안내", file: false, date: "2026. 05. 29", views: 214, content: "학회 연회비 납부 계좌가 다음과 같이 변경되었습니다.\n\n- 은행: 신한은행\n- 계좌번호: 140-015-967840\n- 예금주: 한국음악학회 박범훈\n\n회원 여러분께서는 연회비 송금 시 착오 없으시길 바랍니다.", author: "관리인", email: "admin@gugak.go.kr" }
    ];

    const DEFAULT_FREEBOARD = [
        { id: 3, type: "freeboard", category: "자유", title: "안녕하세요. 신임 회원 인사드립니다.", date: "2026. 05. 28", views: 12, content: "이번에 학회에 가입하게 된 김민우입니다. 국악관현악 연구에 관심이 많습니다. 앞으로 많은 지도 편달 부탁드립니다.", author: "김민우", email: "minwoo@gmail.com" },
        { id: 2, type: "freeboard", category: "질문", title: "2026년 춘계 학술대회 발표 자료 양식 관련 질문", date: "2026. 05. 27", views: 24, content: "춘계 학술대회 구두 발표 PPT 템플릿이나 양식이 따로 제공되는지 궁금합니다. 아니면 자유 양식으로 준비해도 되나요? 아시는 분 답변 부탁드립니다.", author: "이영희", email: "younghee@gmail.com" },
        { id: 1, type: "freeboard", category: "정보", title: "국악 학술 정보 사이트 공유합니다.", date: "2026. 05. 20", views: 45, content: "한국음악 연구에 유용한 자료들이 모여있는 국립국악원 국악학술정보시스템 링크를 공유합니다. 연구에 참고하시기 바랍니다.\n링크: http://gugak.go.kr", author: "박철수", email: "chulsoo@gmail.com" }
    ];

    localStorage.setItem("registered_users", JSON.stringify(defaultMockUsers));
    localStorage.setItem("notice_posts", JSON.stringify(DEFAULT_NOTICES));
    localStorage.setItem("notice_posts_idx", "7");
    localStorage.setItem("notice_posts_version", "v2026-05-29b");
    localStorage.setItem("freeboard_posts", JSON.stringify(DEFAULT_FREEBOARD));
    localStorage.setItem("freeboard_posts_idx", "4");
    
    // Clear logged in user session on reset
    localStorage.removeItem("logged_in_user");
};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Print button handler
    const printBtns = document.querySelectorAll('.page-utils a[title="인쇄"]');
    printBtns.forEach(btn => {
        // Set href to javascript:void(0) to prevent page jump and add click event
        btn.setAttribute('href', '#');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.print();
        });
    });

    // 2. Share button handler
    const shareBtns = document.querySelectorAll('.page-utils a[title="공유"]');
    shareBtns.forEach(btn => {
        btn.setAttribute('href', '#');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openShareModal();
        });
    });

    let loggedInUserStr = localStorage.getItem("logged_in_user");


    if (loggedInUserStr) {
        try {
            let user = JSON.parse(loggedInUserStr);
            // Dynamic session sync with latest DB data
            const latestUsersStr = localStorage.getItem("registered_users");
            if (latestUsersStr) {
                const users = JSON.parse(latestUsersStr);
                const latestUser = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
                if (latestUser) {
                    if (latestUser.role !== user.role || latestUser.name !== user.name) {
                        user.role = latestUser.role;
                        user.name = latestUser.name;
                        localStorage.setItem("logged_in_user", JSON.stringify(user));
                        loggedInUserStr = JSON.stringify(user);
                    }
                }
            }

            user = JSON.parse(loggedInUserStr); // reload synced user
            const utilLinks = document.querySelector(".util-links");
            if (utilLinks) {
                const roleNames = {
                    'admin': '관리인',
                    'secretary': '간사',
                    'reviewer': '심사위원',
                    'editor': '편집장',
                    'president': '회장',
                    'member': '일반회원',
                    'research': '연구회원',
                    'lifetime': '평생회원',
                    'group': '단체회원',
                    'special': '특별회원'
                };
                const displayRole = roleNames[user.role] || '회원';
                utilLinks.innerHTML = `
                    <span class="util-user" style="color: var(--text-muted); margin-right: 15px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fa-regular fa-user"></i> <strong>${user.name}</strong> (${displayRole})님
                    </span>
                    <a href="mypage.html" class="util-link"><i class="fa-solid fa-id-card"></i> 마이페이지</a>
                    <a href="#" id="btn-logout" class="util-link"><i class="fa-solid fa-right-from-bracket"></i> 로그아웃</a>
                    <a href="sitemap.html" class="util-link"><i class="fa-solid fa-sitemap"></i> 사이트맵</a>
                `;
                
                const btnLogout = document.getElementById("btn-logout");
                if (btnLogout) {
                    btnLogout.addEventListener("click", (e) => {
                        e.preventDefault();
                        localStorage.removeItem("logged_in_user");
                        window.location.href = "login.html";
                    });
                }
            }

            // Dynamic Admin/Reviewer Menu Injection
            const ALL_AUTHORIZED_ROLES = ["admin", "secretary", "reviewer", "editor", "president"];
            const ADMIN_ROLES = ["admin", "secretary", "editor", "president"];
            
            if (user && ALL_AUTHORIZED_ROLES.includes(user.role)) {
                const isAdmin = ADMIN_ROLES.includes(user.role);
                const mainNavUl = document.querySelector(".main-nav > ul");
                
                // 1. Top Navigation Bar: append appropriate menu
                if (mainNavUl && !document.querySelector(".nav-item-admin")) {
                    const adminLi = document.createElement("li");
                    adminLi.className = "nav-item nav-item-admin";
                    if (isAdmin) {
                        adminLi.innerHTML = `
                            <a href="submission.html?tab=admin-space">심사·관리인</a>
                            <div class="hover-bar red"></div>
                            <span class="sub-text">admin & reviewer</span>
                            <ul class="dropdown-menu">
                                <li><a href="submission.html?tab=reviewer-space">심사위원 공간</a></li>
                                <li><a href="submission.html?tab=admin-space">관리인 공간</a></li>
                                <li><a href="submission_review.html">논문 심사 규정</a></li>
                            </ul>
                        `;
                    } else {
                        adminLi.innerHTML = `
                            <a href="submission.html?tab=reviewer-space">심사위원 공간</a>
                            <div class="hover-bar green"></div>
                            <span class="sub-text">reviewer space</span>
                            <ul class="dropdown-menu">
                                <li><a href="submission.html?tab=reviewer-space">심사위원 공간</a></li>
                                <li><a href="submission_review.html">논문 심사 규정</a></li>
                            </ul>
                        `;
                    }
                    mainNavUl.appendChild(adminLi);
                }

                // 2. Left Quick Menu: append appropriate sidebar icon links
                const sidebarNav = document.querySelector(".sidebar-nav");
                if (sidebarNav) {
                    // Inject Reviewer Space link for all authorized users
                    if (!document.querySelector(".side-link-reviewer")) {
                        const revSideLink = document.createElement("a");
                        revSideLink.href = "submission.html?tab=reviewer-space";
                        revSideLink.className = "side-link side-link-reviewer";
                        revSideLink.style.cssText = "color: var(--color-green) !important; border-left-color: var(--color-green) !important;";
                        revSideLink.innerHTML = `
                            <i class="fa-solid fa-user-check" style="color: var(--color-green) !important;"></i>
                            <span class="side-text" style="color: var(--color-green) !important; font-weight: bold;">심사위원 공간</span>
                        `;
                        sidebarNav.appendChild(revSideLink);
                    }
                    
                    // Inject Admin Space link for admin/secretary/editor/president
                    if (isAdmin && !document.querySelector(".side-link-admin")) {
                        const adminSideLink = document.createElement("a");
                        adminSideLink.href = "submission.html?tab=admin-space";
                        adminSideLink.className = "side-link side-link-admin";
                        adminSideLink.style.cssText = "color: var(--color-red) !important; border-left-color: var(--color-red) !important;";
                        adminSideLink.innerHTML = `
                            <i class="fa-solid fa-user-shield" style="color: var(--color-red) !important;"></i>
                            <span class="side-text" style="color: var(--color-red) !important; font-weight: bold;">관리인 공간</span>
                        `;
                        sidebarNav.appendChild(adminSideLink);
                    }
                }

                // 3. Inject Member Management into Member Service dropdown menu (Admins only)
                if (isAdmin) {
                    const navItems = document.querySelectorAll(".main-nav > ul > li.nav-item");
                    navItems.forEach(item => {
                        const mainLink = item.querySelector("a");
                        if (mainLink && (mainLink.getAttribute("href") === "admission.html" || mainLink.textContent.trim().replace(/\s+/g, '') === "회원서비스")) {
                            const dropdown = item.querySelector(".dropdown-menu");
                            if (dropdown && !dropdown.querySelector('a[href="member_admin.html"]')) {
                                const memberAdminLi = document.createElement("li");
                                memberAdminLi.innerHTML = `<a href="member_admin.html">회원관리</a>`;
                                dropdown.appendChild(memberAdminLi);
                            }
                        }
                    });

                    // 4. Inject Member Management into Sitemap (Admins only)
                    const sitemapCards = document.querySelectorAll(".sitemap-card");
                    sitemapCards.forEach(card => {
                        const h3 = card.querySelector(".sitemap-title-wrap h3");
                        if (h3 && h3.textContent.trim().replace(/\s+/g, '') === "회원서비스") {
                            const linksList = card.querySelector(".sitemap-links-list");
                            if (linksList && !linksList.querySelector('a[href="member_admin.html"]')) {
                                const memberAdminSitemapLi = document.createElement("li");
                                memberAdminSitemapLi.className = "sitemap-link-item";
                                memberAdminSitemapLi.innerHTML = `<a href="member_admin.html">회원관리 <i class="fa-solid fa-angle-right"></i></a>`;
                                
                                const loginLinkItem = Array.from(linksList.querySelectorAll("li")).find(li => {
                                    const a = li.querySelector("a");
                                    return a && (a.getAttribute("href") === "login.html" || a.textContent.includes("로그인"));
                                });
                                if (loginLinkItem) {
                                    linksList.insertBefore(memberAdminSitemapLi, loginLinkItem);
                                } else {
                                    linksList.appendChild(memberAdminSitemapLi);
                                }
                            }
                        }
                    });

                    // 5. Inject Member Management and Member Directory into sub-tabs (Admins only)
                    const subTabs = document.querySelector(".sub-tabs");
                    if (subTabs) {
                        const hasAdmissionTab = subTabs.querySelector('a[href="admission.html"]');
                        const hasFormsTab = subTabs.querySelector('a[href="forms.html"]');
                        if (hasAdmissionTab || hasFormsTab) {
                            if (!subTabs.querySelector('a[href="member_admin.html"]')) {
                                const memberAdminTab = document.createElement("a");
                                memberAdminTab.href = "member_admin.html";
                                memberAdminTab.className = "tab-item";
                                memberAdminTab.textContent = "회원관리 (관리인)";
                                subTabs.appendChild(memberAdminTab);
                            }
                            if (!subTabs.querySelector('a[href="member_directory.html"]')) {
                                const memberDirTab = document.createElement("a");
                                memberDirTab.href = "member_directory.html";
                                memberDirTab.className = "tab-item";
                                memberDirTab.textContent = "회원명부";
                                subTabs.appendChild(memberDirTab);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error parsing user session:", err);
        }
    }

    // 4. Defensive cleanup: Force remove "편집위원회규정" menu items if present in DOM (for caching issues)
    const allDropItems = document.querySelectorAll(".dropdown-menu li, .main-nav li, .sitemap-link-item, .sitemap-col li");
    allDropItems.forEach(item => {
        if (item.textContent.trim().replace(/\s+/g, '') === "편집위원회규정") {
            item.remove();
        }
    });
    
    // 4. Update all placeholder links containing "회원가입" or "사이트맵"
    const allLinks = document.querySelectorAll("a");
    allLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href === "#" || !href) {
            const text = link.textContent.trim();
            if (text.includes("회원가입")) {
                link.setAttribute("href", "register.html");
            }
            if (text.includes("사이트맵")) {
                link.setAttribute("href", "sitemap.html");
            }
            if (text.includes("양식모음")) {
                link.setAttribute("href", "forms.html");
            }
        }
    });

    // 5. Mobile Responsive Menu Controller
    const headerContainer = document.querySelector(".header-container");
    const mainNav = document.querySelector(".main-nav");
    if (headerContainer && mainNav) {
        // Create mobile menu toggle button if it doesn't exist
        if (!document.querySelector(".mobile-menu-toggle")) {
            const toggleBtn = document.createElement("button");
            toggleBtn.className = "mobile-menu-toggle";
            toggleBtn.type = "button";
            toggleBtn.setAttribute("aria-label", "메뉴 열기");
            toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            headerContainer.appendChild(toggleBtn);
            
            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                mainNav.classList.toggle("mobile-active");
                const icon = toggleBtn.querySelector("i");
                if (mainNav.classList.contains("mobile-active")) {
                    icon.className = "fa-solid fa-xmark";
                } else {
                    icon.className = "fa-solid fa-bars";
                }
            });
            
            // Close menu if clicking outside
            document.addEventListener("click", (e) => {
                if (mainNav.classList.contains("mobile-active") && !mainNav.contains(e.target) && !toggleBtn.contains(e.target)) {
                    mainNav.classList.remove("mobile-active");
                    toggleBtn.querySelector("i").className = "fa-solid fa-bars";
                }
            });
        }

        // Add 'has-dropdown' class to nav-items with dropdown menus
        const navItems = mainNav.querySelectorAll(".nav-item");
        navItems.forEach(item => {
            const dropdown = item.querySelector(".dropdown-menu");
            if (dropdown) {
                item.classList.add("has-dropdown");
                const link = item.querySelector("a");
                link.addEventListener("click", (e) => {
                    if (window.matchMedia("(max-width: 992px)").matches) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Close other dropdowns
                        navItems.forEach(otherItem => {
                            if (otherItem !== item) {
                                otherItem.classList.remove("mobile-open");
                            }
                        });
                        
                        item.classList.toggle("mobile-open");
                    }
                });
            }
        });
    }
});

function openShareModal() {
    let overlay = document.getElementById('share-modal-overlay');
    const currentUrl = window.location.href;
    const pageTitle = document.title;
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'share-modal-overlay';
        overlay.className = 'share-modal-overlay';
        overlay.innerHTML = `
            <div class="share-modal">
                <div class="share-modal-header">
                    <h3>페이지 공유하기</h3>
                    <button class="share-modal-close" id="share-modal-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="share-sns-list">
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}" target="_blank" class="share-sns-item" title="페이스북에 공유">
                        <div class="share-sns-icon sns-facebook"><i class="fa-brands fa-facebook-f"></i></div>
                        <span>페이스북</span>
                    </a>
                    <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(pageTitle)}" target="_blank" class="share-sns-item" title="트위터 / X에 공유">
                        <div class="share-sns-icon sns-twitter"><i class="fa-brands fa-x-twitter"></i></div>
                        <span>트위터 / X</span>
                    </a>
                    <a href="https://story.kakao.com/s/share?url=${encodeURIComponent(currentUrl)}" target="_blank" class="share-sns-item" title="카카오스토리에 공유">
                        <div class="share-sns-icon sns-kakaostory"><i class="fa-solid fa-comment"></i></div>
                        <span>카카오스토리</span>
                    </a>
                    <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}" target="_blank" class="share-sns-item" title="라인에 공유">
                        <div class="share-sns-icon sns-line"><i class="fa-brands fa-line"></i></div>
                        <span>라인</span>
                    </a>
                    <a href="mailto:?subject=${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(currentUrl)}" class="share-sns-item" title="이메일로 공유">
                        <div class="share-sns-icon sns-email"><i class="fa-solid fa-envelope"></i></div>
                        <span>이메일</span>
                    </a>
                </div>
                <div class="share-link-copy-box">
                    <input type="text" class="share-link-input" value="${currentUrl}" readonly id="share-url-input">
                    <button class="share-btn-copy" id="share-btn-copy">링크 복사</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Event listener to close when overlay background is clicked
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeShareModal();
            }
        });
        
        // Close button click listener
        document.getElementById('share-modal-close').addEventListener('click', closeShareModal);
        
        // Copy button click listener
        document.getElementById('share-btn-copy').addEventListener('click', () => {
            const urlInput = document.getElementById('share-url-input');
            urlInput.select();
            urlInput.setSelectionRange(0, 99999); // Mobile compatibility
            
            navigator.clipboard.writeText(urlInput.value).then(() => {
                const copyBtn = document.getElementById('share-btn-copy');
                copyBtn.textContent = '복사 완료!';
                copyBtn.style.backgroundColor = 'var(--color-red)';
                setTimeout(() => {
                    copyBtn.textContent = '링크 복사';
                    copyBtn.style.backgroundColor = 'var(--color-green)';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers
                try {
                    document.execCommand('copy');
                    const copyBtn = document.getElementById('share-btn-copy');
                    copyBtn.textContent = '복사 완료!';
                    copyBtn.style.backgroundColor = 'var(--color-red)';
                    setTimeout(() => {
                        copyBtn.textContent = '링크 복사';
                        copyBtn.style.backgroundColor = 'var(--color-green)';
                    }, 2000);
                } catch (e) {
                    alert('링크 복사에 실패했습니다. 주소창의 주소를 복사해주세요.');
                }
            });
        });
    } else {
        // Update URL input value in case page changed without reload (SPA-like state changes)
        document.getElementById('share-url-input').value = currentUrl;
    }
    
    // Smooth transition
    setTimeout(() => {
        overlay.classList.add('active');
    }, 50);
}

function closeShareModal() {
    const overlay = document.getElementById('share-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// 독립적으로 실행되는 편집위원회규정 삭제 보장 스크립트
(function() {
    function removeEditorialRules() {
        try {
            const allLinks = document.querySelectorAll("a");
            allLinks.forEach(link => {
                const text = link.textContent.trim().replace(/\s+/g, '');
                if (text && (text === "편집위원회규정" || text.includes("편집위원회규정"))) {
                    const parentLi = link.closest("li");
                    if (parentLi) {
                        parentLi.remove();
                    } else {
                        link.remove();
                    }
                }
            });
            
            // Text node check fallback
            const allLi = document.querySelectorAll("li");
            allLi.forEach(li => {
                const text = li.textContent.trim().replace(/\s+/g, '');
                if (text === "편집위원회규정") {
                    li.remove();
                }
            });
        } catch (e) {
            console.error("Error removing editorial rules:", e);
        }
    }

    // Run immediately
    removeEditorialRules();
    
    // Run on DOMContentLoaded
    document.addEventListener("DOMContentLoaded", removeEditorialRules);
    
    // Run on window load
    window.addEventListener("load", removeEditorialRules);
})();

// 글로벌 정회원 권한 확인 함수
// - 임원급(admin/secretary/reviewer/editor/president)은 항상 접근 가능
// - 일반회원(member/research/lifetime/group/special)은 관리자가 is_regular='true' 설정 시 접근 가능
window.isRegularMemberOrAbove = function() {
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    if (!loggedInUserStr) return false;
    try {
        const user = JSON.parse(loggedInUserStr);
        // 임원급은 항상 접근
        const OFFICER_ROLES = ['admin', 'secretary', 'reviewer', 'editor', 'president'];
        if (OFFICER_ROLES.includes(user.role)) return true;
        // 일반회원은 is_regular 플래그 확인
        const MEMBER_ROLES = ['member', 'research', 'lifetime', 'group', 'special'];
        if (MEMBER_ROLES.includes(user.role) && String(user.is_regular) === 'true') return true;
        return false;
    } catch (e) {
        return false;
    }
};
