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

    // 3. User Session Manager & DB Init
    const registeredUsersStr = localStorage.getItem("registered_users");
    const defaultMockUsers = [
        { email: "admin@gmail.com", password: "admin123", name: "최고관리인", role: "admin", affiliation: "한국음악학회", phone: "010-1234-5678", birth: "1980-01-01" },
        { email: "secretary@gmail.com", password: "sec123", name: "이간사", role: "secretary", affiliation: "한국음악학회", phone: "010-2345-6789", birth: "1985-05-15" },
        { email: "reviewer@gmail.com", password: "rev123", name: "박심사", role: "reviewer", affiliation: "동국대학교", phone: "010-3456-7890", birth: "1975-08-20" },
        { email: "editor@gmail.com", password: "edi123", name: "김편집", role: "editor", affiliation: "서울대학교", phone: "010-4567-8901", birth: "1972-11-30" },
        { email: "president@gmail.com", password: "pre123", name: "최회장", role: "president", affiliation: "한국음악학회", phone: "010-5678-9012", birth: "1965-03-25" },
        { email: "member@gmail.com", password: "mem123", name: "김회원", role: "member", affiliation: "한국음악대학", phone: "010-6789-0123", birth: "1990-07-07" },
        { email: "woochang@gmail.com", password: "admin123", name: "최우창", role: "admin", affiliation: "한국음악학회", phone: "010-9999-8888", birth: "1995-01-01" }
    ];
    if (!registeredUsersStr) {
        localStorage.setItem("registered_users", JSON.stringify(defaultMockUsers));
    } else {
        try {
            const users = JSON.parse(registeredUsersStr);
            const woochangUser = users.find(u => u.name === "최우창" || u.email === "woochang@gmail.com");
            if (woochangUser) {
                if (woochangUser.role !== "admin") {
                    woochangUser.role = "admin";
                    localStorage.setItem("registered_users", JSON.stringify(users));
                }
            } else {
                users.push({ email: "woochang@gmail.com", password: "admin123", name: "최우창", role: "admin", affiliation: "한국음악학회", phone: "010-9999-8888", birth: "1995-01-01" });
                localStorage.setItem("registered_users", JSON.stringify(users));
            }
        } catch (e) {
            localStorage.setItem("registered_users", JSON.stringify(defaultMockUsers));
        }
    }

    let loggedInUserStr = localStorage.getItem("logged_in_user");
    const isLoginPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html");
    
    if (!loggedInUserStr && !isLoginPage) {
        const defaultAdmin = { email: "admin@gmail.com", name: "최고관리인", role: "admin" };
        localStorage.setItem("logged_in_user", JSON.stringify(defaultAdmin));
        loggedInUserStr = JSON.stringify(defaultAdmin);
    }

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
