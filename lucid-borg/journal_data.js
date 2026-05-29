const defaultMockJournals = [
    {
        id: "v5n1",
        volume: "5",
        number: "1",
        tonggwon: "7",
        title: "제5권 1호 (통권 제7호)",
        fullTitle: "한국음악문화 제5권 1호 (통권 제7호)",
        label: "Volume 5, Issue 1 · 통권 제7호",
        bannerInfo: "제5권 1호 · 통권 제7호 (2025. 12.)",
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

// Initialize in localStorage if not exists
if (!localStorage.getItem("journal_db")) {
    localStorage.setItem("journal_db", JSON.stringify(defaultMockJournals));
}

// Load from localStorage and sort
let journalData = [];
try {
    const rawData = localStorage.getItem("journal_db");
    if (rawData) {
        journalData = JSON.parse(rawData);
    } else {
        journalData = defaultMockJournals;
    }
} catch (e) {
    journalData = defaultMockJournals;
}

// Sort journalData by Volume and Number descending
journalData.sort((a, b) => {
    const volA = parseInt(a.volume) || 0;
    const volB = parseInt(b.volume) || 0;
    if (volB !== volA) return volB - volA;
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numB - numA;
});

// Export if used in Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = journalData;
}
