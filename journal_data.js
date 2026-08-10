const defaultMockJournals = [
    {
        id: "v5n1",
        volume: "5",
        number: "1",
        tonggwon: "7",
        title: "제7호",
        fullTitle: "한국음악문화 제7호",
        label: "제7호",
        bannerInfo: "제7호 (2025. 12.)",
        date: "2025. 12. 31",
        cover: "cover.png",
        pdf: "한국음악문화 제7호 (동국한국음악학회).pdf",
        desc: "이번 호는 한국 불교음악과 전통 민속음악 분야의 심층 연구를 담았습니다. 통도사 의례 음악, 신라 범패, 동해안별신굿, 국악관현악 악기 연구 등 다양한 주제를 아우르는 논문이 수록되어 있습니다.",
        articles: [
            {
                num: 5,
                category: "전통음악",
                title: "국악관현악에서 B♭대금과 E♭대금의 음정 및 음색에 관한 연구",
                enTitle: "A Study on Pitch and Timbre of B♭ Daegeum and E♭ Daegeum in Korean Orchestra",
                author: "정지훈",
                pdf: "국악관현악에서 B♭대금과 E♭대금의 - 정지훈.pdf"
            },
            {
                num: 4,
                category: "민속음악",
                title: "동해안별신굿의 골메기굿 사설에 대한 연구",
                enTitle: "A Study on the Lyrics of Golmegi-gut in Donghae-an Byeolshin-gut",
                author: "홍효진",
                pdf: "동해안별신굿의 골메기굿 사설에 대한 연구 - 홍효진.pdf"
            },
            {
                num: 3,
                category: "불교음악",
                title: "신라의 범패 통도소리의 의미와 가치",
                enTitle: "The Meaning and Value of Tongdo-sori, the Beompae of Silla",
                author: "윤소희",
                pdf: "신라의 범패 통도소리 의미와 가치 - 윤소희.pdf"
            },
            {
                num: 2,
                category: "불교음악",
                title: "통도사 새벽예불의 전승 양상과 현대적 의의",
                enTitle: "Transmission Patterns and Contemporary Significance of the Dawn Ritual at Tongdosa",
                author: "양영진",
                pdf: "통도사 새벽예불의 전승 양상과 현대적 의의 - 양영진.pdf"
            },
            {
                num: 1,
                category: "불교음악",
                title: "통도사 영축 삼보이운의 전통성 연구",
                enTitle: "A Study on the Traditionality of Yeongchuk Samboi-un at Tongdosa",
                author: "최명철 (원명)",
                pdf: "통도사 영축 삼보이운의 전통성 연구 - 최명철 (원명).pdf"
            }
        ]
    }
];

// ============================================================
// 버전 관리 & localStorage 초기화
// ★ 버전을 올리면 기존 localStorage 캐시를 강제 삭제합니다.
const JOURNAL_DB_VERSION = "4";  // 병합 로직 도입, 6호 캐시 완전 삭제

const storedVersion = localStorage.getItem("journal_db_version");
if (!localStorage.getItem("journal_db") || storedVersion !== JOURNAL_DB_VERSION) {
    // 버전이 다르면 무조건 초기화 (sheets 캐시 포함)
    localStorage.setItem("journal_db", JSON.stringify(defaultMockJournals));
    localStorage.setItem("journal_db_version", JOURNAL_DB_VERSION);
}

// ============================================================
// GAS 데이터 병합 유틸 — 모든 페이지에서 이 함수를 사용해야 합니다.
//
// 역할: GAS에서 받은 데이터와 defaultMockJournals를 id 기준으로 병합.
//   - GAS에 있는 id   → GAS 데이터 우선 (최신 편집 반영)
//   - GAS에 없는 id   → 로컬(defaultMockJournals) 데이터 보존
//   → GAS 시트에 7호가 누락되어도 로컬 7호가 항상 포함됨
// ============================================================
window.mergeJournals = function(gasData) {
    const merged = {};
    // 1) GAS 데이터를 먼저 등록
    if (Array.isArray(gasData)) {
        gasData.forEach(j => {
            if (typeof j.articles === 'string') {
                try { j.articles = JSON.parse(j.articles); } catch(e) { j.articles = []; }
            }
            if (!Array.isArray(j.articles)) j.articles = [];
            merged[j.id] = j;
        });
    }
    // 2) 로컬 기본 데이터 중 GAS에 없는 항목 추가 (누락 보완)
    defaultMockJournals.forEach(localJ => {
        if (!merged[localJ.id]) {
            merged[localJ.id] = localJ;
        }
    });
    // 3) tonggwon 내림차순 정렬 → [0]이 항상 최신호
    return Object.values(merged).sort(
        (a, b) => parseInt(b.tonggwon || 0) - parseInt(a.tonggwon || 0)
    );
};

// ============================================================
// 초기 journalData 로드 (localStorage → defaultMockJournals 순 fallback)
let journalData = [];
try {
    const rawData = localStorage.getItem("journal_db");
    journalData = rawData ? JSON.parse(rawData) : defaultMockJournals.slice();
} catch (e) {
    journalData = defaultMockJournals.slice();
}

// 항상 mergeJournals로 정규화 (로컬 캐시에서도 7호 보장)
journalData = window.mergeJournals(journalData);

// Export if used in Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { journalData, defaultMockJournals, mergeJournals: window.mergeJournals };
}
