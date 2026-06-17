const ALL_AUTHORIZED_ROLES = ["admin", "secretary", "reviewer", "editor", "president"];
const ADMIN_ROLES = ["admin", "secretary", "editor", "president"];

function initRegisteredUsers() {
    const data = localStorage.getItem("registered_users");
    const mockUsers = [
        { email: "admin@gmail.com", password: "admin123", name: "최고관리자", role: "admin", affiliation: "한국음악학회", phone: "010-1234-5678", birth: "1980-01-01" },
        { email: "secretary@gmail.com", password: "sec123", name: "학회간사", role: "secretary", affiliation: "한국음악학회", phone: "010-2345-6789", birth: "1985-05-15" },
        { email: "reviewer@gmail.com", password: "rev123", name: "심사위원", role: "reviewer", affiliation: "한국음악학회", phone: "010-3456-7890", birth: "1975-08-20" },
        { email: "editor@gmail.com", password: "edi123", name: "편집위원장", role: "editor", affiliation: "한국음악학회", phone: "010-4567-8901", birth: "1972-11-30" },
        { email: "president@gmail.com", password: "pre123", name: "학회회장", role: "president", affiliation: "한국음악학회", phone: "010-5678-9012", birth: "1965-03-25" }
    ];
    if (!data) {
        localStorage.setItem("registered_users", JSON.stringify(mockUsers));
    }
}

function initUploadedMaterials() {
    const data = localStorage.getItem("uploaded_materials");
    if (!data) {
        const defaultMaterials = [
            {
                id: "MAT-0001",
                name: "한국음악학회 정회원 입회신청서 양식",
                category: "입회안내",
                filename: "한국음악학회_정회원_가입신청서.hwp",
                formats: ["HWP", "PDF", "DOCX"],
                date: "2026-03-01"
            },
            {
                id: "MAT-0002",
                name: "논문 투고 신청서 및 저작권 위임 동의서",
                category: "논문투고",
                filename: "한국음악문화_논문투고양식.zip",
                formats: ["HWP", "PDF", "DOCX"],
                date: "2026-03-10"
            },
            {
                id: "MAT-0003",
                name: "한국음악학회 연구윤리규정 준수 서약서",
                category: "논문투고",
                filename: "연구윤리규정_준수서약서.hwp",
                formats: ["HWP", "PDF", "DOCX"],
                date: "2026-03-15"
            },
            {
                id: "MAT-0004",
                name: "논문 심사 의견서 양식 (심사위원용)",
                category: "심사위원",
                filename: "논문_심사의견서_양식.docx",
                formats: ["HWP", "PDF", "DOCX"],
                date: "2026-04-05"
            }
        ];
        localStorage.setItem("uploaded_materials", JSON.stringify(defaultMaterials));
    }
}

// Immediately initialize databases when script is loaded to prevent timing issues
initRegisteredUsers();
initUploadedMaterials();

document.addEventListener("DOMContentLoaded", () => {
    // 0. Initialize databases (redundant check for safety)
    initRegisteredUsers();
    initUploadedMaterials();

    // 1. Initialize submissions database
    getSubmissions();
    
    // 2. Set up tab switching and initial routing
    const tabs = document.querySelectorAll('#submission-tabs a');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName === 'online' || tabName === 'history' || tabName === 'reviewer-space' || tabName === 'admin-space') {
                const loggedInUserStr = localStorage.getItem("logged_in_user");
                if (!loggedInUserStr) {
                    e.preventDefault();
                    alert("로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.");
                    window.location.href = "login.html?redirect=submission.html?tab=" + tabName;
                    return;
                }
                const user = JSON.parse(loggedInUserStr);
                if (tabName === 'reviewer-space' && !ALL_AUTHORIZED_ROLES.includes(user.role)) {
                    e.preventDefault();
                    alert("심사위원 공간 권한이 없습니다.");
                    return;
                }
                if (tabName === 'admin-space' && !ADMIN_ROLES.includes(user.role)) {
                    e.preventDefault();
                    alert("관리인 공간 권한이 없습니다.");
                    return;
                }
            }
            e.preventDefault();
            switchTab(tabName);
        });
    });
    
    const btnGoSubmission = document.getElementById("btn-go-submission");
    if (btnGoSubmission) {
        btnGoSubmission.addEventListener("click", (e) => {
            const loggedInUser = localStorage.getItem("logged_in_user");
            if (!loggedInUser) {
                e.preventDefault();
                alert("로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.");
                window.location.href = "login.html?redirect=submission.html?tab=online";
                return;
            }
            e.preventDefault();
            switchTab("online");
        });
    }
    
    // Handle initial routing from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let activeTab = urlParams.get('tab') || 'guidelines';
    
    if (activeTab === 'online' || activeTab === 'history' || activeTab === 'reviewer-space' || activeTab === 'admin-space') {
        const loggedInUserStr = localStorage.getItem("logged_in_user");
        if (!loggedInUserStr) {
            alert("로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.");
            window.location.href = "login.html?redirect=submission.html?tab=" + activeTab;
            activeTab = 'guidelines';
        } else {
            const user = JSON.parse(loggedInUserStr);
            if (activeTab === 'reviewer-space' && !ALL_AUTHORIZED_ROLES.includes(user.role)) {
                alert("심사위원 공간 권한이 없습니다.");
                activeTab = 'guidelines';
            } else if (activeTab === 'admin-space' && !ADMIN_ROLES.includes(user.role)) {
                alert("관리인 공간 권한이 없습니다.");
                activeTab = 'guidelines';
            }
        }
    }
    
    // Update admin tab menu visibility based on session
    updateAdminTabVisibility();
    
    switchTab(activeTab, false);
    
    // 3. Wizard navigation buttons
    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            if (currentStep > 1) {
                currentStep--;
                updateWizardUI();
            }
        });
    }
    
    const btnNext = document.getElementById("btn-next");
    if (btnNext) {
        btnNext.addEventListener("click", () => {
            if (currentStep < 4) {
                if (validateStep(currentStep)) {
                    currentStep++;
                    updateWizardUI();
                }
            } else if (currentStep === 4) {
                if (validateStep(4)) {
                    submitPaper();
                }
            }
        });
    }
    
    // 4. Co-author add button
    const btnAddAuthor = document.getElementById("btn-add-author");
    if (btnAddAuthor) {
        btnAddAuthor.addEventListener("click", () => {
            addCoAuthorCard();
        });
    }
    
    // 5. File upload listeners
    let manuscriptFileObj = null;
    let agreementFileObj = null;

    const fileManuscript = document.getElementById("file-manuscript");
    if (fileManuscript) {
        fileManuscript.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                manuscriptFileObj = e.target.files[0];
                document.getElementById("manuscript-file-name").textContent = manuscriptFileObj.name + ` (${formatBytes(manuscriptFileObj.size)})`;
            } else {
                manuscriptFileObj = null;
                document.getElementById("manuscript-file-name").textContent = "선택된 파일 없음";
            }
        });
    }

    const fileAgreement = document.getElementById("file-agreement");
    if (fileAgreement) {
        fileAgreement.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                agreementFileObj = e.target.files[0];
                document.getElementById("agreement-file-name").textContent = agreementFileObj.name + ` (${formatBytes(agreementFileObj.size)})`;
            } else {
                agreementFileObj = null;
                document.getElementById("agreement-file-name").textContent = "선택된 파일 없음";
            }
        });
    }
    
    // Modal close elements
    const btnCloseModal = document.getElementById("btn-close-modal");
    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", closeDetailModal);
    }

    const detailModalOverlay = document.getElementById("submission-detail-modal");
    if (detailModalOverlay) {
        detailModalOverlay.addEventListener("click", (e) => {
            if (e.target === detailModalOverlay) {
                closeDetailModal();
            }
        });
    }
    
    // Admin status change save button
    const btnSaveStatus = document.getElementById("btn-save-status");
    if (btnSaveStatus) {
        btnSaveStatus.addEventListener("click", () => {
            if (!currentDetailId) return;
            
            const statusSelect = document.getElementById("admin-status-select");
            const reviewerSelect = document.getElementById("admin-reviewer-select");
            if (!statusSelect) return;
            
            const newStatus = statusSelect.value;
            const newReviewer = reviewerSelect ? reviewerSelect.value : "";
            
            const submissions = getSubmissions();
            const subIndex = submissions.findIndex(s => s.id === currentDetailId);
            if (subIndex === -1) return;
            
            submissions[subIndex].status = newStatus;
            submissions[subIndex].reviewer_email = newReviewer;
            localStorage.setItem("submissions_data", JSON.stringify(submissions));
            
            alert(`논문 상태가 [${newStatus}]으로 변경(저장)되었습니다.`);
            
            // Refresh detail view
            openDetailModal(currentDetailId);
            
            // Refresh table
            renderHistoryTable();
        });
    }
    
    // Admin show-deleted checkbox change listener
    const showDeletedCheckbox = document.getElementById("admin-show-deleted-checkbox");
    if (showDeletedCheckbox) {
        showDeletedCheckbox.addEventListener("change", () => {
            renderAdminSpaceTable();
        });
    }
    
    // Admin submission delete / restore button
    const btnDeleteSub = document.getElementById("btn-delete-submission");
    if (btnDeleteSub) {
        btnDeleteSub.addEventListener("click", () => {
            if (!currentDetailId) return;
            
            const submissions = getSubmissions();
            const subIndex = submissions.findIndex(s => s.id === currentDetailId);
            if (subIndex === -1) return;
            
            const sub = submissions[subIndex];
            if (sub.deleted) {
                // Restore paper
                submissions[subIndex].deleted = false;
                localStorage.setItem("submissions_data", JSON.stringify(submissions));
                alert("투고 내역이 성공적으로 복구되었습니다.");
                closeDetailModal();
                renderAdminSpaceTable();
                renderHistoryTable();
                if (typeof renderReviewerSpaceTable === 'function') {
                    renderReviewerSpaceTable();
                }
            } else {
                // Delete paper (soft delete)
                if (!confirm("정말로 이 투고 내역을 삭제하시겠습니까? (삭제된 내역은 '삭제된 논문 보기' 필터를 통해 복구할 수 있습니다)")) return;
                submissions[subIndex].deleted = true;
                localStorage.setItem("submissions_data", JSON.stringify(submissions));
                alert("투고 내역이 삭제되었습니다.");
                closeDetailModal();
                renderAdminSpaceTable();
                renderHistoryTable();
                if (typeof renderReviewerSpaceTable === 'function') {
                    renderReviewerSpaceTable();
                }
            }
        });
    }
    
    // Admin review file upload listeners
    let adminReviewFileObj = null;
    const adminFileInput = document.getElementById("admin-review-file-input");
    const adminSelectedFileName = document.getElementById("admin-selected-file-name");
    const btnUploadAdminFile = document.getElementById("btn-upload-admin-file");

    if (adminFileInput) {
        adminFileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                adminReviewFileObj = e.target.files[0];
                if (adminSelectedFileName) {
                    adminSelectedFileName.textContent = adminReviewFileObj.name + ` (${formatBytes(adminReviewFileObj.size)})`;
                }
                if (btnUploadAdminFile) {
                    btnUploadAdminFile.style.display = "inline-block";
                }
            } else {
                adminReviewFileObj = null;
                if (adminSelectedFileName) {
                    adminSelectedFileName.textContent = "선택된 파일 없음";
                }
                if (btnUploadAdminFile) {
                    btnUploadAdminFile.style.display = "none";
                }
            }
        });
    }

    if (btnUploadAdminFile) {
        btnUploadAdminFile.addEventListener("click", () => {
            if (!currentDetailId || !adminReviewFileObj) return;

            const submissions = getSubmissions();
            const subIndex = submissions.findIndex(s => s.id === currentDetailId);
            if (subIndex === -1) return;

            if (!submissions[subIndex].review_files) {
                submissions[subIndex].review_files = [];
            }

            submissions[subIndex].review_files.push({
                name: adminReviewFileObj.name,
                size: formatBytes(adminReviewFileObj.size),
                date: new Date().toISOString().substring(0, 10)
            });

            localStorage.setItem("submissions_data", JSON.stringify(submissions));
            alert("심사자료 파일이 성공적으로 업로드되었습니다.");

            // Reset upload UI
            adminReviewFileObj = null;
            if (adminFileInput) adminFileInput.value = "";
            if (adminSelectedFileName) adminSelectedFileName.textContent = "선택된 파일 없음";
            btnUploadAdminFile.style.display = "none";

            // Refresh modal and tables
            openDetailModal(currentDetailId);
            renderHistoryTable();
            if (window.renderAdminSpaceTable) window.renderAdminSpaceTable();
        });
    }
    
    // Helper to get file details for submission object
    window.getManuscriptFile = () => manuscriptFileObj;
    window.getAgreementFile = () => agreementFileObj;
    window.clearFiles = () => {
        manuscriptFileObj = null;
        agreementFileObj = null;
        if (fileManuscript) fileManuscript.value = "";
        if (fileAgreement) fileAgreement.value = "";
        const mLabel = document.getElementById("manuscript-file-name");
        if (mLabel) mLabel.textContent = "선택된 파일 없음";
        const aLabel = document.getElementById("agreement-file-name");
        if (aLabel) aLabel.textContent = "선택된 파일 없음";
    };
});

let currentStep = 1;
let coAuthorCount = 0;
let currentDetailId = null;

// Tab routing function
function switchTab(tabName, shouldPushState = true) {
    // Hide all sections
    document.querySelectorAll('.tab-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('#submission-tabs a').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show active section
    const targetSection = document.getElementById(`section-${tabName === 'online' ? 'submit-form' : tabName}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }
    
    // Activate target tab button
    const targetBtn = document.querySelector(`#submission-tabs a[data-tab="${tabName}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // Update breadcrumb text
    const breadcrumbTab = document.getElementById('breadcrumb-sub-tab');
    if (breadcrumbTab && targetBtn) {
        breadcrumbTab.textContent = targetBtn.textContent;
    }
    
    // Push history state if requested
    if (shouldPushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?tab=${tabName}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }
    
    // Tab specific initializations
    if (tabName === 'history') {
        renderHistoryTable();
    }
    
    if (tabName === 'online') {
        initWizard();
    }

    if (tabName === 'reviewer-space') {
        renderReviewerSpaceTable();
    }

    if (tabName === 'admin-space') {
        initAdminSpace();
    }
}

// Wizard state initialization
function initWizard() {
    currentStep = 1;
    updateWizardUI();
    
    // Prefill main author info using logged-in user
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    if (loggedInUserStr) {
        const user = JSON.parse(loggedInUserStr);
        const authorNameInput = document.getElementById("author-name-1");
        const authorEmailInput = document.getElementById("author-email-1");
        if (authorNameInput) authorNameInput.value = user.name || "";
        if (authorEmailInput) authorEmailInput.value = user.email || "";
    }
}

// Update wizard progress steps UI
function updateWizardUI() {
    for (let i = 1; i <= 4; i++) {
        const stepContent = document.getElementById(`step-content-${i}`);
        const stepIndicator = document.getElementById(`step-indicator-${i}`);
        
        if (stepContent) {
            if (i === currentStep) {
                stepContent.style.display = 'block';
                stepContent.classList.add('active');
            } else {
                stepContent.style.display = 'none';
                stepContent.classList.remove('active');
            }
        }
        
        if (stepIndicator) {
            if (i === currentStep) {
                stepIndicator.classList.add('active');
                stepIndicator.classList.remove('completed');
            } else if (i < currentStep) {
                stepIndicator.classList.remove('active');
                stepIndicator.classList.add('completed');
            } else {
                stepIndicator.classList.remove('active');
                stepIndicator.classList.remove('completed');
            }
        }
    }
    
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    
    if (btnPrev) {
        btnPrev.style.display = currentStep === 1 ? 'none' : 'inline-block';
    }
    
    if (btnNext) {
        if (currentStep === 4) {
            btnNext.innerHTML = '제출하기 <i class="fa-solid fa-paper-plane"></i>';
            btnNext.style.backgroundColor = 'var(--color-green)';
        } else {
            btnNext.innerHTML = '다음 <i class="fa-solid fa-angle-right"></i>';
            btnNext.style.backgroundColor = 'var(--color-red)';
        }
    }
}

// Wizard steps form validation
function validateStep(step) {
    if (step === 1) {
        const checkEthics = document.getElementById("check-ethics");
        const checkCopyright = document.getElementById("check-copyright");
        const checklist1 = document.getElementById("checklist-1");
        const checklist2 = document.getElementById("checklist-2");
        const checklist3 = document.getElementById("checklist-3");
        
        if (!checkEthics || !checkEthics.checked) {
            alert("연구 윤리 서약서에 동의하셔야 합니다.");
            return false;
        }
        if (!checkCopyright || !checkCopyright.checked) {
            alert("저작권 양도 및 출판권 동의서에 동의하셔야 합니다.");
            return false;
        }
        if (!checklist1 || !checklist1.checked || !checklist2 || !checklist2.checked || !checklist3 || !checklist3.checked) {
            alert("원고 제출 자가 체크리스트 항목을 모두 확인하고 동의하셔야 합니다.");
            return false;
        }
        return true;
    }
    
    if (step === 2) {
        const titleKo = document.getElementById("paper-title-ko").value.trim();
        const titleEn = document.getElementById("paper-title-en").value.trim();
        const abstractKo = document.getElementById("paper-abstract-ko").value.trim();
        const abstractEn = document.getElementById("paper-abstract-en").value.trim();
        const keywords = document.getElementById("paper-keywords").value.trim();
        
        if (!titleKo) {
            alert("국문 논문 제목을 입력하십시오.");
            document.getElementById("paper-title-ko").focus();
            return false;
        }
        if (!titleEn) {
            alert("영문 논문 제목을 입력하십시오.");
            document.getElementById("paper-title-en").focus();
            return false;
        }
        if (!abstractKo) {
            alert("국문 초록을 입력하십시오.");
            document.getElementById("paper-abstract-ko").focus();
            return false;
        }
        if (!abstractEn) {
            alert("영문 초록을 입력하십시오.");
            document.getElementById("paper-abstract-en").focus();
            return false;
        }
        if (!keywords) {
            alert("주제어/키워드를 입력하십시오.");
            document.getElementById("paper-keywords").focus();
            return false;
        }
        return true;
    }
    
    if (step === 3) {
        const aff1 = document.getElementById("author-aff-1").value.trim();
        if (!aff1) {
            alert("주저자의 소속 기관을 입력하십시오.");
            document.getElementById("author-aff-1").focus();
            return false;
        }
        
        // Validate co-authors
        const coAuthorCards = document.querySelectorAll(".co-author-card");
        let valid = true;
        coAuthorCards.forEach((card, index) => {
            if (!valid) return;
            const name = card.querySelector(".co-author-name").value.trim();
            const aff = card.querySelector(".co-author-aff").value.trim();
            const email = card.querySelector(".co-author-email").value.trim();
            
            if (!name) {
                alert(`공동저자 #${index + 1}의 성명을 입력하십시오.`);
                card.querySelector(".co-author-name").focus();
                valid = false;
                return;
            }
            if (!aff) {
                alert(`공동저자 #${index + 1}의 소속 기관을 입력하십시오.`);
                card.querySelector(".co-author-aff").focus();
                valid = false;
                return;
            }
            if (!email) {
                alert(`공동저자 #${index + 1}의 이메일을 입력하십시오.`);
                card.querySelector(".co-author-email").focus();
                valid = false;
                return;
            }
        });
        return valid;
    }
    
    if (step === 4) {
        const mFile = window.getManuscriptFile ? window.getManuscriptFile() : null;
        if (!mFile) {
            alert("심사용 본문 파일을 업로드해 주십시오.");
            return false;
        }
        return true;
    }
    return true;
}

// Add Co-author markup card
function addCoAuthorCard(name = "", affiliation = "", email = "", role = "Co-Author") {
    coAuthorCount++;
    const container = document.getElementById("co-authors-container");
    if (!container) return;
    
    const card = document.createElement("div");
    card.className = "author-card co-author-card";
    card.id = `co-author-card-${coAuthorCount}`;
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h4 style="margin: 0; font-size: 1.05rem; color: var(--text-dark);"><i class="fa-regular fa-user"></i> 공동저자</h4>
            <button type="button" class="btn-remove-author" data-id="${coAuthorCount}"><i class="fa-solid fa-trash-can"></i> 삭제</button>
        </div>
        <div class="form-row-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
            <div class="form-group" style="margin-bottom: 0;">
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 5px;">성명 *</label>
                <input type="text" class="co-author-name" value="${name}" placeholder="예: 홍길동" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 5px;">소속 기관 *</label>
                <input type="text" class="co-author-aff" value="${affiliation}" placeholder="예: 한국대학교" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 5px;">이메일 *</label>
                <input type="text" class="co-author-email" value="${email}" placeholder="예: coauthor@univ.ac.kr" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 5px;">구분 *</label>
                <select class="co-author-role" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit; font-size: 0.9rem;">
                    <option value="Co-Author" ${role === 'Co-Author' ? 'selected' : ''}>공동저자</option>
                    <option value="Corresponding Author" ${role === 'Corresponding Author' ? 'selected' : ''}>교신저자</option>
                </select>
            </div>
        </div>
    `;
    container.appendChild(card);
    
    // Add remove event listener
    card.querySelector(".btn-remove-author").addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const cardToRemove = document.getElementById(`co-author-card-${id}`);
        if (cardToRemove) {
            cardToRemove.remove();
        }
    });
}

// Submit final manuscript data to localStorage
function submitPaper() {
    const journal = document.getElementById("paper-journal").value;
    const category = document.getElementById("paper-category").value;
    const titleKo = document.getElementById("paper-title-ko").value.trim();
    const titleEn = document.getElementById("paper-title-en").value.trim();
    const abstractKo = document.getElementById("paper-abstract-ko").value.trim();
    const abstractEn = document.getElementById("paper-abstract-en").value.trim();
    const keywords = document.getElementById("paper-keywords").value.trim();
    
    const loggedInUser = JSON.parse(localStorage.getItem("logged_in_user"));
    
    const authors = [
        {
            name: loggedInUser.name,
            affiliation: document.getElementById("author-aff-1").value.trim(),
            email: loggedInUser.email,
            role: "Primary"
        }
    ];
    
    // Add co-authors
    document.querySelectorAll(".co-author-card").forEach(card => {
        authors.push({
            name: card.querySelector(".co-author-name").value.trim(),
            affiliation: card.querySelector(".co-author-aff").value.trim(),
            email: card.querySelector(".co-author-email").value.trim(),
            role: card.querySelector(".co-author-role").value
        });
    });
    
    const mFile = window.getManuscriptFile();
    const aFile = window.getAgreementFile();
    
    const newSubmission = {
        id: `SUB-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        journal: journal,
        category: category,
        title_ko: titleKo,
        title_en: titleEn,
        abstract_ko: abstractKo,
        abstract_en: abstractEn,
        keywords: keywords,
        authors: authors,
        file_manuscript: mFile.name,
        file_agreement: aFile ? aFile.name : "",
        date: new Date().toISOString().substring(0, 10),
        status: "접수완료",
        author_email: loggedInUser.email,
        reviewer_email: "",
        review_files: []
    };
    
    const submissions = getSubmissions();
    submissions.push(newSubmission);
    localStorage.setItem("submissions_data", JSON.stringify(submissions));
    
    alert("논문 투고가 완료되었습니다. 투고 내역 페이지로 이동합니다.");
    
    // Reset forms
    document.getElementById("paper-title-ko").value = "";
    document.getElementById("paper-title-en").value = "";
    document.getElementById("paper-abstract-ko").value = "";
    document.getElementById("paper-abstract-en").value = "";
    document.getElementById("paper-keywords").value = "";
    document.getElementById("author-aff-1").value = "";
    document.getElementById("check-ethics").checked = false;
    document.getElementById("check-copyright").checked = false;
    document.getElementById("checklist-1").checked = false;
    document.getElementById("checklist-2").checked = false;
    document.getElementById("checklist-3").checked = false;
    
    // Clear co-authors
    const coAuthorsContainer = document.getElementById("co-authors-container");
    if (coAuthorsContainer) coAuthorsContainer.innerHTML = "";
    
    // Clear files
    if (window.clearFiles) window.clearFiles();
    
    // Switch to history tab
    switchTab("history");
}

// Render history board table
function renderHistoryTable() {
    const tableBody = document.getElementById("history-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    if (!loggedInUserStr) return;
    
    const user = JSON.parse(loggedInUserStr);
    const isAuthorized = ALL_AUTHORIZED_ROLES.includes(user.role);
    const isAdmin = ADMIN_ROLES.includes(user.role);
    const isReviewer = ALL_AUTHORIZED_ROLES.includes(user.role) && !ADMIN_ROLES.includes(user.role);
    
    const adminIndicator = document.getElementById("admin-indicator");
    if (adminIndicator) {
        const roleLabels = {
            'admin': '관리인 모드',
            'president': '회장 모드',
            'editor': '편집장 모드',
            'secretary': '간사 모드',
            'reviewer': '심사위원 모드'
        };
        const currentLabel = roleLabels[user.role] || '심사·관리인 모드';

        if (isAdmin) {
            adminIndicator.style.display = 'flex';
            adminIndicator.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${currentLabel}`;
            adminIndicator.style.background = '#faecea';
            adminIndicator.style.borderColor = 'var(--color-red)';
            adminIndicator.style.color = 'var(--color-red)';
        } else if (isReviewer) {
            adminIndicator.style.display = 'flex';
            adminIndicator.innerHTML = `<i class="fa-solid fa-user-check"></i> ${currentLabel}`;
            adminIndicator.style.background = '#eef7f6';
            adminIndicator.style.borderColor = 'var(--color-green)';
            adminIndicator.style.color = 'var(--color-green)';
        } else {
            adminIndicator.style.display = 'none';
        }
    }
    
    const historyDesc = document.getElementById("history-desc");
    if (historyDesc) {
        if (isAdmin) {
            historyDesc.textContent = "학회에 접수된 전체 논문 목록과 심사 상태를 관리할 수 있습니다.";
        } else if (isReviewer) {
            historyDesc.textContent = "학회에 접수된 전체 논문 목록과 심사 진행 상황을 확인하고 논문을 다운로드할 수 있습니다.";
        } else {
            historyDesc.textContent = "투고하신 논문의 심사 단계별 진행 현황을 실시간으로 확인하실 수 있습니다.";
        }
    }

    // Show/hide admin-only delete column header
    document.querySelectorAll(".admin-only-col").forEach(el => {
        el.style.display = isAdmin ? "table-cell" : "none";
    });
    
    const submissions = getSubmissions();
    
    // Filter submissions: admin sees all active, reviewer sees assigned or own, member sees own
    const filteredSubmissions = submissions.filter(sub => {
        if (sub.deleted) return false;
        
        if (isAdmin) return true; // Admins see all
        
        if (user.role === 'reviewer') {
            const isAssigned = sub.reviewer_email === user.email;
            const isOwn = sub.author_email === user.email || (sub.authors && sub.authors.some(a => a.email === user.email));
            return isAssigned || isOwn;
        }
        
        const isOwn = sub.author_email === user.email || (sub.authors && sub.authors.some(a => a.email === user.email));
        return isOwn;
    });

    const colSpan = isAdmin ? 6 : 5;
        
    if (filteredSubmissions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${colSpan}" style="text-align: center; color: var(--text-muted); padding: 30px 0;">
                    ${isAuthorized ? '접수된 논문이 없습니다.' : '투고하신 논문이 없습니다.'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort submissions: newest first
    filteredSubmissions.sort((a, b) => b.id.localeCompare(a.id));
    
    filteredSubmissions.forEach((sub, index) => {
        const row = document.createElement("tr");
        row.setAttribute("data-id", sub.id);
        
        let badgeClass = "submitted";
        if (sub.status === "심사중") badgeClass = "reviewing";
        else if (sub.status === "게재확정") badgeClass = "accepted";
        else if (sub.status === "반려") badgeClass = "rejected";
        
        const titleHtml = isAuthorized 
            ? `<div><strong>${escapeHtml(sub.title_ko)}</strong></div><div style="font-size: 0.8rem; color: #888; margin-top: 4px;"><i class="fa-solid fa-user"></i> 제출자: ${escapeHtml(sub.author_email)}</div>`
            : `<strong>${escapeHtml(sub.title_ko)}</strong>`;

        // Admin delete button cell
        const deleteCellHtml = isAdmin ? `
            <td class="col-delete admin-only-col" style="text-align: center; vertical-align: middle;">
                <button class="btn-row-delete" data-id="${escapeHtml(sub.id)}" title="삭제"
                    style="background: #cb3c31; color: white; border: none; border-radius: 4px;
                           padding: 5px 9px; font-size: 0.78rem; cursor: pointer; line-height: 1;
                           display: inline-flex; align-items: center; gap: 4px; font-weight: 700;
                           transition: background 0.15s;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>` : '';
            
        row.innerHTML = `
            <td class="col-num" style="font-family: 'Poppins', sans-serif; font-weight: 500;">${filteredSubmissions.length - index}</td>
            <td class="col-journal">${escapeHtml(sub.journal)} (${escapeHtml(sub.category)})</td>
            <td class="col-title" style="text-align: left;">${titleHtml}</td>
            <td class="col-date" style="text-align: center; font-family: 'Poppins', sans-serif;">${sub.date}</td>
            <td class="col-status" style="text-align: center;">
                <span class="status-badge ${badgeClass}">${escapeHtml(sub.status)}</span>
            </td>
            ${deleteCellHtml}
        `;
        
        // Row click opens modal (but not delete button)
        row.addEventListener("click", (e) => {
            if (e.target.closest(".btn-row-delete")) return;
            openDetailModal(sub.id);
        });

        // Delete button click
        if (isAdmin) {
            const deleteBtn = row.querySelector(".btn-row-delete");
            if (deleteBtn) {
                deleteBtn.addEventListener("mouseenter", function() { this.style.background = "#b03228"; });
                deleteBtn.addEventListener("mouseleave", function() { this.style.background = "#cb3c31"; });
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteSubmissionFromBoard(sub.id);
                });
            }
        }
        
        tableBody.appendChild(row);
    });
}

// Delete submission directly from the board (Admin only - soft delete)
function deleteSubmissionFromBoard(id) {
    if (!confirm("이 논문 투고 내역을 삭제하시겠습니까?\n삭제 후 관리자 패널에서 복구할 수 있습니다.")) return;

    const submissions = getSubmissions();
    const idx = submissions.findIndex(s => s.id === id);
    if (idx === -1) return;

    submissions[idx].deleted = true;
    submissions[idx].deleted_at = new Date().toISOString();
    localStorage.setItem("submissions_data", JSON.stringify(submissions));

    // Refresh tables
    renderHistoryTable();
    if (typeof renderReviewerSpaceTable === 'function') renderReviewerSpaceTable();

    // Small toast-style notice
    const toast = document.createElement("div");
    toast.textContent = "논문이 삭제되었습니다. (관리자 패널에서 복구 가능)";
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: #333; color: white; padding: 12px 22px; border-radius: 8px;
        font-size: 0.9rem; font-weight: 600; z-index: 99999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25); pointer-events: none;
        animation: fadeInUp 0.25s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Open paper detail and admin moderation modal

function openDetailModal(id) {
    const submissions = getSubmissions();
    const sub = submissions.find(s => s.id === id);
    if (!sub) return;
    
    // Check authorization to view details
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    let isAuthorized = false;
    let isOwner = false;
    let isAdmin = false;
    let user = null;
    if (loggedInUserStr) {
        try {
            user = JSON.parse(loggedInUserStr);
            isAdmin = ADMIN_ROLES.includes(user.role);
            isAuthorized = ALL_AUTHORIZED_ROLES.includes(user.role);
            isOwner = user.email === sub.author_email || (sub.authors && sub.authors.some(a => a.email === user.email));
        } catch (e) {}
    }
    
    // Check visibility logic: Admin sees all, reviewer sees assigned or own, member sees own
    let canView = false;
    if (user) {
        if (isAdmin) {
            canView = true;
        } else if (sub.deleted) {
            canView = false; // Non-admins cannot view soft-deleted papers
        } else if (user.role === 'reviewer') {
            canView = (sub.reviewer_email === user.email) || isOwner;
        } else {
            canView = isOwner;
        }
    }
    
    if (!canView) {
        alert("이 논문에 대한 조회 권한이 없습니다.");
        return;
    }
    
    currentDetailId = id;
    
    document.getElementById("detail-id").textContent = sub.id;
    document.getElementById("detail-journal").textContent = sub.journal;
    document.getElementById("detail-category").textContent = sub.category;
    document.getElementById("detail-title-ko").textContent = sub.title_ko;
    document.getElementById("detail-title-en").textContent = sub.title_en;
    document.getElementById("detail-abstract-ko").textContent = sub.abstract_ko;
    document.getElementById("detail-abstract-en").textContent = sub.abstract_en;
    document.getElementById("detail-keywords").textContent = sub.keywords;
    document.getElementById("detail-date").textContent = sub.date;
    
    // Authors listing
    const authorsStr = sub.authors.map(a => `${escapeHtml(a.name)} (${escapeHtml(a.affiliation)}, ${escapeHtml(a.email)}) - [${a.role === 'Primary' ? '주저자' : (a.role === 'Co-Author' ? '공동저자' : '교신저자')}]`).join("<br>");
    document.getElementById("detail-authors").innerHTML = authorsStr;
    
    // Download manuscript link simulation & real download for admins/reviewers
    const fileEl = document.getElementById("detail-file");

    if (isAuthorized || isOwner) {
        // Map mock filename to real PDF files in the workspace
        let realFile = "통도사 새벽예불의 전승 양상과 현대적 의의 - 양영진.pdf";
        if (sub.file_manuscript.toLowerCase().includes("daegeum")) {
            realFile = "국악관현악에서 B♭대금과 E♭대금의 - 정지훈.pdf";
        } else if (sub.file_manuscript.toLowerCase().includes("gayageum")) {
            realFile = "신라의 범패 통도소리 의미와 가치 - 윤소희.pdf";
        }
        
        const downloadName = sub.file_manuscript.replace(/\.docx?$/i, ".pdf");
        
        fileEl.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i> <a href="${encodeURI(realFile)}" download="${escapeHtml(downloadName)}" style="text-decoration: underline; color: var(--color-blue); font-weight: bold;">${escapeHtml(sub.file_manuscript)} (다운로드 가능)</a>`;
    } else {
        fileEl.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i> <a href="#" style="text-decoration: line-through; color: #999; cursor: not-allowed;">${escapeHtml(sub.file_manuscript)} (권한 없음)</a>`;
        fileEl.querySelector("a").addEventListener("click", (e) => {
            e.preventDefault();
            alert("논문 다운로드 권한이 없습니다. (관리인 및 심사위원만 다운로드 가능합니다)");
        });
    }
    
    // Status badges
    const statusEl = document.getElementById("detail-status");
    let badgeClass = "submitted";
    if (sub.status === "심사중") badgeClass = "reviewing";
    else if (sub.status === "게재확정") badgeClass = "accepted";
    else if (sub.status === "반려") badgeClass = "rejected";
    statusEl.innerHTML = `<span class="status-badge ${badgeClass}">${escapeHtml(sub.status)}</span>`;
    
    // Show/hide review upload box for authorized staff
    const uploadBox = document.getElementById("admin-upload-box");
    if (uploadBox) {
        uploadBox.style.display = isAuthorized ? 'block' : 'none';
    }
    
    // Render uploaded review files
    const filesList = document.getElementById("admin-uploaded-files-list");
    if (filesList) {
        if (sub.review_files && sub.review_files.length > 0) {
            filesList.innerHTML = sub.review_files.map((file, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 4px 0;">
                    <span><i class="fa-solid fa-file-pdf" style="color: #cb3c31; margin-right: 5px;"></i> ${escapeHtml(file.name)} (${file.size}) - <small>${file.date}</small></span>
                    <a href="#" onclick="downloadReviewFile(${idx}, event)" style="color: var(--color-blue); text-decoration: underline; font-weight: 700; font-size: 0.8rem;"><i class="fa-solid fa-download"></i> 다운로드</a>
                </div>
            `).join("");
        } else {
            filesList.innerHTML = `<span style="color: #999; font-style: italic;">업로드된 심사자료 없음</span>`;
        }
    }

    // Admin check for status change control box
    const adminBox = document.getElementById("admin-status-control-box");
    if (adminBox) {
        adminBox.style.display = isAdmin ? 'block' : 'none';
        const statusSelect = document.getElementById("admin-status-select");
        if (statusSelect) {
            statusSelect.value = sub.status;
        }
        
        const reviewerSelect = document.getElementById("admin-reviewer-select");
        if (reviewerSelect) {
            // Populate reviewer options dynamically from registered_users (allow reviewers and administrators)
            reviewerSelect.innerHTML = '<option value="">미배정</option>';
            const registeredUsersStr = localStorage.getItem("registered_users");
            if (registeredUsersStr) {
                try {
                    const users = JSON.parse(registeredUsersStr);
                    const reviewers = users.filter(u => u.role === 'reviewer' || ADMIN_ROLES.includes(u.role));
                    reviewers.forEach(r => {
                        const opt = document.createElement("option");
                        opt.value = r.email;
                        opt.textContent = `${r.name} (${r.email})`;
                        reviewerSelect.appendChild(opt);
                    });
                } catch(e) {}
            }
            reviewerSelect.value = sub.reviewer_email || "";
        }
        
        const btnDeleteSub = document.getElementById("btn-delete-submission");
        if (btnDeleteSub) {
            if (sub.deleted) {
                btnDeleteSub.innerHTML = '<i class="fa-solid fa-trash-arrow-up"></i> 투고 내역 복구';
                btnDeleteSub.style.backgroundColor = "var(--color-green)";
                btnDeleteSub.style.borderColor = "var(--color-green)";
                btnDeleteSub.onmouseover = function() {
                    this.style.backgroundColor = '#236c62';
                    this.style.borderColor = '#236c62';
                };
                btnDeleteSub.onmouseout = function() {
                    this.style.backgroundColor = 'var(--color-green)';
                    this.style.borderColor = 'var(--color-green)';
                };
            } else {
                btnDeleteSub.innerHTML = '<i class="fa-solid fa-trash-can"></i> 투고 내역 삭제';
                btnDeleteSub.style.backgroundColor = "#cb3c31";
                btnDeleteSub.style.borderColor = "#cb3c31";
                btnDeleteSub.onmouseover = function() {
                    this.style.backgroundColor = '#b03228';
                    this.style.borderColor = '#b03228';
                };
                btnDeleteSub.onmouseout = function() {
                    this.style.backgroundColor = '#cb3c31';
                    this.style.borderColor = '#cb3c31';
                };
            }
        }
    }
    
    const modal = document.getElementById("submission-detail-modal");
    if (modal) {
        modal.style.display = "flex";
    }
}

// Close detail modal
function closeDetailModal() {
    const modal = document.getElementById("submission-detail-modal");
    if (modal) {
        modal.style.display = "none";
    }
    currentDetailId = null;
}

// Get/initialize submissions from localStorage
function getSubmissions() {
    let data = localStorage.getItem("submissions_data");
    let submissions = [];
    if (data) {
        try {
            submissions = JSON.parse(data);
        } catch (e) {
            submissions = [];
        }
    }
    if (!submissions || submissions.length === 0) {
        submissions = [
            {
                id: "SUB-2026-0001",
                journal: "한국음악문화",
                category: "국악",
                title_ko: "국악관현악에서 B♭대금과 E♭대금의 운지법 및 활용 방안 연구",
                title_en: "A Study on the Fingering and Application of B♭ Daegeum and E♭ Daegeum in Korean Traditional Orchestra",
                abstract_ko: "본 논문은 현대 국악관현악단에서 주로 사용되는 B♭대금과 E♭대금의 음역대 조율 및 다양한 운지법과 실제 악곡에서의 활용 방안을 고찰한다. 특히 가락의 진행 중 변청이나 조바꿈이 일어날 때의 대처 요령을 제시한다.",
                abstract_en: "This study investigates the range tuning, various fingerings, and practical application of B♭ Daegeum and E♭ Daegeum in contemporary traditional Korean orchestra music, focusing on scale changes and modulations.",
                keywords: "대금, 국악관현악, 운지법, 개량국악기",
                authors: [
                    { name: "정지훈", affiliation: "동국대학교", email: "jihoon@gmail.com", role: "Primary" },
                    { name: "김철수", affiliation: "서울대학교", email: "chulsoo@gmail.com", role: "Co-Author" }
                ],
                file_manuscript: "국악관현악에서 B♭대금과 E♭대금의 - 정지훈.pdf",
                file_agreement: "agreement.pdf",
                date: "2026-05-10",
                status: "심사중",
                author_email: "jihoon@gmail.com",
                reviewer_email: "reviewer@gmail.com",
                review_files: []
            },
            {
                id: "SUB-2026-0002",
                journal: "한국음악문화",
                category: "이론",
                title_ko: "신라의 범패 통도소리 의미와 가치 연구",
                title_en: "A Study on the Meaning and Value of Tongdori Beompae in Silla",
                abstract_ko: "본 논문은 통도사에서 전승되는 통도소리의 선율적 특징과 신라 시대 범패와의 역사적 상관성을 규명하고, 현대 무형문화유산적 가치를 밝혀내는 것을 목적으로 한다.",
                abstract_en: "This study examines the melodic characteristics of Tongdori Beompae preserved at Tongdosa, traces its historical connection back to Silla dynasty Buddhist chants, and evaluates its modern cultural value.",
                keywords: "범패, 통도소리, 신라불교, 불교음악",
                authors: [
                    { name: "윤소희", affiliation: "동국대학교", email: "sohee@gmail.com", role: "Primary" }
                ],
                file_manuscript: "신라의 범패 통도소리 의미와 가치 - 윤소희.pdf",
                file_agreement: "agreement2.pdf",
                date: "2026-05-12",
                status: "접수완료",
                author_email: "sohee@gmail.com",
                reviewer_email: "",
                review_files: []
            }
        ];
    }
    localStorage.setItem("submissions_data", JSON.stringify(submissions));
    return submissions;
}

// Helpers
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateAdminTabVisibility() {
    const tabReviewer = document.getElementById("tab-reviewer-space");
    const tabAdmin = document.getElementById("tab-admin-space");
    
    if (tabReviewer) tabReviewer.style.display = "none";
    if (tabAdmin) tabAdmin.style.display = "none";
    
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    if (loggedInUserStr) {
        try {
            const user = JSON.parse(loggedInUserStr);
            if (ALL_AUTHORIZED_ROLES.includes(user.role)) {
                if (tabReviewer) tabReviewer.style.display = "inline-block";
            }
            if (ADMIN_ROLES.includes(user.role)) {
                if (tabAdmin) tabAdmin.style.display = "inline-block";
            }
        } catch (e) {}
    }
}

// Render Admin Space: Sub-Tab 1 - 논문 심사 관리
window.renderAdminSpaceTable = function() {
    const tableBody = document.getElementById("admin-list-tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    const submissions = getSubmissions();
    
    // Update dashboard counts using active (non-deleted) submissions
    const activeSubmissions = submissions.filter(s => !s.deleted);
    const totalCount = activeSubmissions.length;
    const reviewingCount = activeSubmissions.filter(s => s.status === "심사중").length;
    const acceptedCount = activeSubmissions.filter(s => s.status === "게재확정").length;
    const rejectedCount = activeSubmissions.filter(s => s.status === "반려").length;
    
    const totalEl = document.getElementById("admin-total-papers");
    const reviewingEl = document.getElementById("admin-reviewing-papers");
    const acceptedEl = document.getElementById("admin-accepted-papers");
    const rejectedEl = document.getElementById("admin-rejected-papers");
    const listCountEl = document.getElementById("admin-list-count");
    
    if (totalEl) totalEl.textContent = totalCount;
    if (reviewingEl) reviewingEl.textContent = reviewingCount;
    if (acceptedEl) acceptedEl.textContent = acceptedCount;
    if (rejectedEl) rejectedEl.textContent = rejectedCount;
    
    const showDeletedCheckbox = document.getElementById("admin-show-deleted-checkbox");
    const showDeleted = showDeletedCheckbox ? showDeletedCheckbox.checked : false;
    
    const filteredSubmissions = submissions.filter(sub => {
        if (showDeleted) {
            return sub.deleted === true;
        } else {
            return !sub.deleted;
        }
    });
    
    if (listCountEl) listCountEl.textContent = filteredSubmissions.length;
    
    if (filteredSubmissions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px 0;">
                    ${showDeleted ? "삭제된 논문 내역이 없습니다." : "접수된 심사 대상 논문이 없습니다."}
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort submissions: newest first
    filteredSubmissions.sort((a, b) => b.id.localeCompare(a.id));
    
    filteredSubmissions.forEach((sub, index) => {
        const row = document.createElement("tr");
        row.setAttribute("data-id", sub.id);
        row.style.cursor = "pointer";
        
        let badgeClass = "submitted";
        if (sub.status === "심사중") badgeClass = "reviewing";
        else if (sub.status === "게재확정") badgeClass = "accepted";
        else if (sub.status === "반려") badgeClass = "rejected";
        
        const fileCount = sub.review_files ? sub.review_files.length : 0;
        const uploadStatusHtml = fileCount > 0 
            ? `<span style="color: var(--color-green); font-weight: 700;"><i class="fa-solid fa-file-circle-check"></i> 의견서 ${fileCount}건</span>` 
            : `<span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-cloud-arrow-up"></i> 자료 등록</span>`;
            
        // Map mock filename to real PDF files in the workspace
        let realFile = "통도사 새벽예불의 전승 양상과 현대적 의의 - 양영진.pdf";
        if (sub.file_manuscript.toLowerCase().includes("daegeum")) {
            realFile = "국악관현악에서 B♭대금과 E♭대금의 - 정지훈.pdf";
        } else if (sub.file_manuscript.toLowerCase().includes("gayageum")) {
            realFile = "신라의 범패 통도소리 의미와 가치 - 윤소희.pdf";
        }
        
        const downloadName = sub.file_manuscript.replace(/\.docx?$/i, ".pdf");
        const downloadBtnHtml = `<a href="${encodeURI(realFile)}" download="${escapeHtml(downloadName)}" class="btn-outline" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();"><i class="fa-solid fa-file-arrow-down"></i> 다운로드</a>`;

        row.innerHTML = `
            <td class="col-num" style="font-family: 'Poppins', sans-serif; font-weight: 500;">${submissions.length - index}</td>
            <td class="col-journal">${escapeHtml(sub.journal)} (${escapeHtml(sub.category)})</td>
            <td class="col-title" style="text-align: left; font-weight: 700;">${escapeHtml(sub.title_ko)}</td>
            <td class="col-author">${escapeHtml(sub.author_email)}</td>
            <td class="col-download" style="text-align: center;">${downloadBtnHtml}</td>
            <td class="col-status" style="text-align: center;">
                <span class="status-badge ${badgeClass}">${escapeHtml(sub.status)}</span>
            </td>
            <td class="col-action" style="text-align: center;">${uploadStatusHtml}</td>
        `;
        
        row.addEventListener("click", () => {
            openDetailModal(sub.id);
        });
        
        tableBody.appendChild(row);
    });
};

window.downloadReviewFile = function(idx, event) {
    if (event) event.preventDefault();
    if (event) event.stopPropagation();
    if (!currentDetailId) return;

    const submissions = getSubmissions();
    const sub = submissions.find(s => s.id === currentDetailId);
    if (!sub || !sub.review_files || !sub.review_files[idx]) return;

    const file = sub.review_files[idx];
    alert(`[파일 다운로드] ${file.name} (${file.size}) 파일이 성공적으로 다운로드되었습니다.`);
};

// Render Reviewer Space — Card Layout
function renderReviewerSpaceTable() {
    const cardList = document.getElementById("reviewer-card-list");
    const countEl  = document.getElementById("reviewer-list-count");
    if (!cardList) return;

    cardList.innerHTML = "";

    const submissions    = getSubmissions();
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    let loggedInUser = null;
    if (loggedInUserStr) {
        try { loggedInUser = JSON.parse(loggedInUserStr); } catch(e) {}
    }

    // Filter: reviewer/admin sees only their assigned papers
    const reviewerSubmissions = submissions.filter(sub => {
        if (sub.deleted) return false;
        if (loggedInUser && (loggedInUser.role === 'reviewer' || ADMIN_ROLES.includes(loggedInUser.role))) {
            return sub.reviewer_email === loggedInUser.email;
        }
        return true;
    });

    if (countEl) countEl.textContent = reviewerSubmissions.length;

    if (reviewerSubmissions.length === 0) {
        cardList.innerHTML = `
            <div class="reviewer-empty">
                <i class="fa-solid fa-inbox"></i>
                <p>배정된 심사 대상 논문이 없습니다.</p>
            </div>`;
        return;
    }

    reviewerSubmissions.sort((a, b) => b.id.localeCompare(a.id));

    reviewerSubmissions.forEach((sub, index) => {
        // Status
        let badgeClass = "submitted";
        if (sub.status === "심사중")   badgeClass = "reviewing";
        else if (sub.status === "게재확정") badgeClass = "accepted";
        else if (sub.status === "반려")    badgeClass = "rejected";

        // Review files
        const fileCount = sub.review_files ? sub.review_files.length : 0;
        const uploadHtml = fileCount > 0
            ? `<span class="reviewer-upload-status done"><i class="fa-solid fa-file-circle-check"></i> 제출완료 (${fileCount}건)</span>`
            : `<span class="reviewer-upload-status pending"><i class="fa-solid fa-cloud-arrow-up"></i> 미제출</span>`;

        // Download button
        let realFile = "통도사 새벽예불의 전승 양상과 현대적 의의 - 양영진.pdf";
        if (sub.file_manuscript.toLowerCase().includes("daegeum")) {
            realFile = "국악관현악에서 B♭대금과 E♭대금의 - 정지훈.pdf";
        } else if (sub.file_manuscript.toLowerCase().includes("gayageum")) {
            realFile = "신라의 범패 통도소리 의미와 가치 - 윤소희.pdf";
        }
        const downloadName = sub.file_manuscript.replace(/\.docx?$/i, ".pdf");

        // Card
        const card = document.createElement("div");
        card.className = "reviewer-card";
        card.setAttribute("data-id", sub.id);
        card.innerHTML = `
            <div class="reviewer-card-header">
                <span class="reviewer-card-num">${reviewerSubmissions.length - index}</span>
                <span class="reviewer-card-journal">${escapeHtml(sub.journal)} · ${escapeHtml(sub.category)}</span>
                <span class="status-badge ${badgeClass}">${escapeHtml(sub.status)}</span>
            </div>
            <div class="reviewer-card-title">${escapeHtml(sub.title_ko)}</div>
            <div class="reviewer-card-meta">
                <span><i class="fa-solid fa-user"></i> ${escapeHtml(sub.author_email)}</span>
                <span><i class="fa-solid fa-calendar"></i> ${sub.date || ''}</span>
            </div>
            <div class="reviewer-card-actions">
                <a href="${encodeURI(realFile)}" download="${escapeHtml(downloadName)}"
                   class="btn-outline reviewer-dl-btn"
                   onclick="event.stopPropagation();">
                    <i class="fa-solid fa-file-arrow-down"></i> 논문 다운로드
                </a>
                ${uploadHtml}
            </div>
        `;

        card.addEventListener("click", (e) => {
            if (e.target.closest(".reviewer-dl-btn")) return;
            openDetailModal(sub.id);
        });

        cardList.appendChild(card);
    });
}


// Initialize Admin Space: Bind sub-tabs and controls
function initAdminSpace() {
    const subTabs = document.querySelectorAll(".admin-sub-tab-btn");
    subTabs.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    const newSubTabs = document.querySelectorAll(".admin-sub-tab-btn");
    newSubTabs.forEach(btn => {
        btn.addEventListener("click", () => {
            newSubTabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const sub = btn.getAttribute("data-sub");
            
            document.querySelectorAll(".admin-sub-panel").forEach(panel => {
                panel.style.display = "none";
            });
            
            const targetPanel = document.getElementById(`admin-sub-${sub}`);
            if (targetPanel) {
                targetPanel.style.display = "block";
            }
            
            if (sub === "papers") {
                renderAdminSpaceTable();
            } else if (sub === "users") {
                renderAdminUsersTable();
            } else if (sub === "boards") {
                const boardSelect = document.getElementById("admin-board-select");
                const boardType = boardSelect ? boardSelect.value : "notice";
                renderAdminBoardsTable(boardType);
            } else if (sub === "uploads") {
                renderAdminUploadsTable();
            }
        });
    });

    const userSearchInput = document.getElementById("admin-users-search");
    if (userSearchInput) {
        const newSearchInput = userSearchInput.cloneNode(true);
        userSearchInput.parentNode.replaceChild(newSearchInput, userSearchInput);
        newSearchInput.addEventListener("input", () => {
            renderAdminUsersTable(newSearchInput.value.trim());
        });
    }

    const boardSelect = document.getElementById("admin-board-select");
    if (boardSelect) {
        const newBoardSelect = boardSelect.cloneNode(true);
        boardSelect.parentNode.replaceChild(newBoardSelect, boardSelect);
        newBoardSelect.addEventListener("change", () => {
            renderAdminBoardsTable(newBoardSelect.value);
        });
    }

    const btnSubmitMaterial = document.getElementById("btn-submit-material");
    if (btnSubmitMaterial) {
        const newBtn = btnSubmitMaterial.cloneNode(true);
        btnSubmitMaterial.parentNode.replaceChild(newBtn, btnSubmitMaterial);
        newBtn.addEventListener("click", handleMaterialUpload);
    }
    
    const materialFileInput = document.getElementById("upload-material-file");
    const materialFileLabel = document.getElementById("upload-material-file-name");
    if (materialFileInput && materialFileLabel) {
        const newMaterialFileInput = materialFileInput.cloneNode(true);
        materialFileInput.parentNode.replaceChild(newMaterialFileInput, materialFileInput);
        newMaterialFileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                materialFileLabel.textContent = e.target.files[0].name;
            } else {
                materialFileLabel.textContent = "선택된 파일 없음";
            }
        });
    }

    const activeSubBtn = document.querySelector(".admin-sub-tab-btn.active");
    if (activeSubBtn) {
        const sub = activeSubBtn.getAttribute("data-sub");
        document.querySelectorAll(".admin-sub-panel").forEach(panel => {
            panel.style.display = "none";
        });
        const targetPanel = document.getElementById(`admin-sub-${sub}`);
        if (targetPanel) {
            targetPanel.style.display = "block";
        }
        
        if (sub === "papers") {
            renderAdminSpaceTable();
        } else if (sub === "users") {
            renderAdminUsersTable();
        } else if (sub === "boards") {
            const bSelect = document.getElementById("admin-board-select");
            renderAdminBoardsTable(bSelect ? bSelect.value : "notice");
        } else if (sub === "uploads") {
            renderAdminUploadsTable();
        }
    } else {
        const papersBtn = document.querySelector('.admin-sub-tab-btn[data-sub="papers"]');
        if (papersBtn) papersBtn.click();
    }

    // Show special admin reset panel if applicable
    const loggedInUser = localStorage.getItem("logged_in_user");
    if (loggedInUser) {
        try {
            const userObj = JSON.parse(loggedInUser);
            if (window.isSpecialAdmin && window.isSpecialAdmin(userObj)) {
                const resetPanel = document.getElementById("special-admin-reset-panel");
                if (resetPanel) resetPanel.style.display = "block";
            }
        } catch(e) {}
    }
}

// Render Admin Space: Sub-Tab 2 - 회원 관리
window.renderAdminUsersTable = function(searchQuery = "") {
    const tbody = document.getElementById("admin-users-tbody");
    const countEl = document.getElementById("admin-users-count");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    initRegisteredUsers();
    const users = JSON.parse(localStorage.getItem("registered_users")) || [];
    
    const q = searchQuery.toLowerCase();
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
    );
    
    if (countEl) countEl.textContent = filteredUsers.length;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px 0;">
                    검색 결과와 일치하는 회원이 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    filteredUsers.forEach((usr, idx) => {
        const row = document.createElement("tr");
        
        let selectHtml = `<select onchange="changeUserRole('${usr.email}', this.value)" style="padding: 5px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit; font-size: 0.85rem; font-weight: 600; background: white;">`;
        const roles = [
            { val: "admin", lbl: "관리인" },
            { val: "secretary", lbl: "간사" },
            { val: "reviewer", lbl: "심사위원" },
            { val: "editor", lbl: "편집장" },
            { val: "president", lbl: "회장" },
            { val: "member", lbl: "일반회원" }
        ];
        roles.forEach(r => {
            selectHtml += `<option value="${r.val}" ${usr.role === r.val ? 'selected' : ''}>${r.lbl}</option>`;
        });
        selectHtml += `</select>`;
        
        row.innerHTML = `
            <td style="font-family: 'Poppins', sans-serif;">${idx + 1}</td>
            <td style="font-weight: 700; color: var(--text-dark);">${escapeHtml(usr.name)}</td>
            <td style="font-family: 'Poppins', sans-serif;">${escapeHtml(usr.email)}</td>
            <td>${escapeHtml(usr.phone || '-')}</td>
            <td>${escapeHtml(usr.affiliation || '-')}</td>
            <td style="text-align: center;">${selectHtml}</td>
            <td style="text-align: center;">
                <button type="button" onclick="deleteUser('${usr.email}')" style="padding: 4px 8px; font-size: 0.8rem; background-color: #cb3c31; border: 1px solid #cb3c31; color: white; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#b03228'; this.style.borderColor='#b03228';" onmouseout="this.style.backgroundColor='#cb3c31'; this.style.borderColor='#cb3c31';">삭제</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
};

window.changeUserRole = function(email, newRole) {
    const users = JSON.parse(localStorage.getItem("registered_users")) || [];
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return;
    
    users[idx].role = newRole;
    localStorage.setItem("registered_users", JSON.stringify(users));
    
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    if (loggedInUserStr) {
        const loggedInUser = JSON.parse(loggedInUserStr);
        if (loggedInUser.email.toLowerCase() === email.toLowerCase()) {
            loggedInUser.role = newRole;
            localStorage.setItem("logged_in_user", JSON.stringify(loggedInUser));
            
            alert("본인의 권한이 변경되어 세션을 갱신합니다. 페이지가 새로고침됩니다.");
            window.location.reload();
            return;
        }
    }
    
    alert(`[권한 변경] ${users[idx].name}님의 권한이 [${newRole}]으로 변경되었습니다.`);
    const userSearchInput = document.getElementById("admin-users-search");
    renderAdminUsersTable(userSearchInput ? userSearchInput.value.trim() : "");
};

window.deleteUser = function(email) {
    const loggedInUserStr = localStorage.getItem("logged_in_user");
    if (loggedInUserStr) {
        const loggedInUser = JSON.parse(loggedInUserStr);
        if (loggedInUser.email.toLowerCase() === email.toLowerCase()) {
            alert("자기 자신은 삭제할 수 없습니다.");
            return;
        }
    }
    
    if (!confirm(`정말로 해당 회원(${email})을 삭제하시겠습니까?`)) return;
    
    const users = JSON.parse(localStorage.getItem("registered_users")) || [];
    const filtered = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem("registered_users", JSON.stringify(filtered));
    
    alert("회원이 삭제되었습니다.");
    const userSearchInput = document.getElementById("admin-users-search");
    renderAdminUsersTable(userSearchInput ? userSearchInput.value.trim() : "");
};

// Render Admin Space: Sub-Tab 3 - 게시판 관리
window.renderAdminBoardsTable = function(boardType) {
    const tbody = document.getElementById("admin-boards-tbody");
    const countEl = document.getElementById("admin-boards-count");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    let posts = [];
    const dataStr = localStorage.getItem(`${boardType}_posts`);
    if (dataStr) {
        try {
            posts = JSON.parse(dataStr);
        } catch(e) {}
    }
    
    if (countEl) countEl.textContent = posts.length;
    
    if (posts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px 0;">
                    등록된 게시글이 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    posts.forEach((post) => {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td style="font-family: 'Poppins', sans-serif;">${post.id}</td>
            <td style="text-align: left; font-weight: 700;">
                <a href="news.html?tab=${boardType}&id=${post.id}" target="_blank" style="color: var(--text-dark); text-decoration: none; font-family: inherit;">
                    ${escapeHtml(post.title)}
                </a>
            </td>
            <td>${escapeHtml(post.author || '익명')}</td>
            <td style="text-align: center; font-family: 'Poppins', sans-serif;">${post.date}</td>
            <td style="text-align: center; font-family: 'Poppins', sans-serif;">${post.views || 0}</td>
            <td style="text-align: center;">
                <button type="button" onclick="deleteBoardPost('${boardType}', ${post.id})" style="padding: 4px 8px; font-size: 0.8rem; background-color: #cb3c31; border: 1px solid #cb3c31; color: white; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#b03228'; this.style.borderColor='#b03228';" onmouseout="this.style.backgroundColor='#cb3c31'; this.style.borderColor='#cb3c31';">삭제</button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

window.deleteBoardPost = function(boardType, postId) {
    if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;
    
    const key = `${boardType}_posts`;
    let posts = [];
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
        try {
            posts = JSON.parse(dataStr);
        } catch(e) {}
    }
    
    const filtered = posts.filter(p => p.id !== postId);
    localStorage.setItem(key, JSON.stringify(filtered));
    
    alert("게시글이 삭제되었습니다.");
    renderAdminBoardsTable(boardType);
};

// Render Admin Space: Sub-Tab 4 - 자료 업로드 관리
window.renderAdminUploadsTable = function() {
    const tbody = document.getElementById("admin-uploads-tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    initUploadedMaterials();
    const materials = JSON.parse(localStorage.getItem("uploaded_materials")) || [];
    
    if (materials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px 0;">
                    등록된 자료가 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    materials.forEach((mat, idx) => {
        const row = document.createElement("tr");
        
        const formats = mat.formats || ["HWP", "PDF", "DOCX"];
        const badgesHtml = formats.map(fmt => `<span class="form-badge badge-${fmt.toLowerCase()}">${fmt}</span>`).join(" ");
        
        row.innerHTML = `
            <td style="font-family: 'Poppins', sans-serif;">${idx + 1}</td>
            <td style="font-weight: 700; color: var(--text-dark); text-align: left;">${escapeHtml(mat.name)}</td>
            <td>${escapeHtml(mat.category)}</td>
            <td style="text-align: left; font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(mat.filename)}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                    ${badgesHtml}
                </div>
            </td>
            <td style="text-align: center;">
                <button type="button" onclick="deleteMaterial('${mat.id}')" style="padding: 4px 8px; font-size: 0.8rem; background-color: #cb3c31; border: 1px solid #cb3c31; color: white; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#b03228'; this.style.borderColor='#b03228';" onmouseout="this.style.backgroundColor='#cb3c31'; this.style.borderColor='#cb3c31';">삭제</button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

window.deleteMaterial = function(materialId) {
    if (!confirm("정말로 이 자료를 삭제하시겠습니까?")) return;
    
    const materials = JSON.parse(localStorage.getItem("uploaded_materials")) || [];
    const filtered = materials.filter(m => m.id !== materialId);
    localStorage.setItem("uploaded_materials", JSON.stringify(filtered));
    
    alert("자료가 삭제되었습니다.");
    renderAdminUploadsTable();
};

function handleMaterialUpload() {
    const nameInput = document.getElementById("upload-material-name");
    const categorySelect = document.getElementById("upload-material-category");
    const fileInput = document.getElementById("upload-material-file");
    
    if (!nameInput || !categorySelect || !fileInput) return;
    
    const name = nameInput.value.trim();
    const category = categorySelect.value;
    
    if (!name) {
        alert("서식/자료명을 입력해주세요.");
        nameInput.focus();
        return;
    }
    
    let filename = "";
    if (fileInput.files && fileInput.files[0]) {
        filename = fileInput.files[0].name;
    } else {
        alert("파일을 선택해주세요.");
        return;
    }
    
    const formats = [];
    if (document.getElementById("upload-format-hwp")?.checked) formats.push("HWP");
    if (document.getElementById("upload-format-pdf")?.checked) formats.push("PDF");
    if (document.getElementById("upload-format-docx")?.checked) formats.push("DOCX");
    
    if (formats.length === 0) {
        alert("최소 하나의 지원 파일 형식을 선택해주세요.");
        return;
    }
    
    const newMaterial = {
        id: `MAT-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        name: name,
        category: category,
        filename: filename,
        formats: formats,
        date: new Date().toISOString().substring(0, 10)
    };
    
    const materials = JSON.parse(localStorage.getItem("uploaded_materials")) || [];
    materials.push(newMaterial);
    localStorage.setItem("uploaded_materials", JSON.stringify(materials));
    
    alert("새로운 학회 자료가 성공적으로 등록되었습니다.");
    
    nameInput.value = "";
    categorySelect.selectedIndex = 0;
    fileInput.value = "";
    document.getElementById("upload-material-file-name").textContent = "선택된 파일 없음";
    document.getElementById("upload-format-hwp").checked = true;
    document.getElementById("upload-format-pdf").checked = true;
    document.getElementById("upload-format-docx").checked = true;
    
    renderAdminUploadsTable();
}
