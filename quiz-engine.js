/**
 * Quiz definitions loader and scoring (server-side).
 */

const fs = require('fs');
const path = require('path');

const QUIZ_DIR = path.join(__dirname, 'data', 'quizzes');

function listQuizFiles() {
    if (!fs.existsSync(QUIZ_DIR)) return [];
    return fs.readdirSync(QUIZ_DIR).filter((f) => f.endsWith('.json'));
}

function loadQuizRaw(quizId) {
    const id = String(quizId || '').trim();
    if (!id || !/^[a-z0-9-]+$/.test(id)) return null;
    const filePath = path.join(QUIZ_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function listQuizzesPublic() {
    return listQuizFiles()
        .map((file) => {
            const raw = loadQuizRaw(file.replace(/\.json$/, ''));
            if (!raw || !raw.id) return null;
            return {
                id: raw.id,
                title: raw.title,
                description: raw.description || '',
                estimatedMinutes: raw.estimatedMinutes || null,
                questionCount: Array.isArray(raw.questions) ? raw.questions.length : 0
            };
        })
        .filter(Boolean);
}

function quizForClient(quizId) {
    const raw = loadQuizRaw(quizId);
    if (!raw) return null;
    const questions = (raw.questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type || 'single',
        options: (q.options || []).map((o) => ({
            id: o.id,
            label: o.label
        }))
    }));
    return {
        id: raw.id,
        title: raw.title,
        description: raw.description || '',
        estimatedMinutes: raw.estimatedMinutes || null,
        ctaBooking: raw.ctaBooking || '/book-consultation',
        questions
    };
}

function scoreAnswers(quizId, answers) {
    const raw = loadQuizRaw(quizId);
    if (!raw) return null;

    const answerMap =
        answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    let totalScore = 0;
    const breakdown = [];

    for (const q of raw.questions || []) {
        const selected = answerMap[q.id];
        const optionIds = q.type === 'multi' && Array.isArray(selected) ? selected : [selected];
        let questionScore = 0;
        const selectedLabels = [];

        for (const optId of optionIds) {
            if (!optId) continue;
            const opt = (q.options || []).find((o) => o.id === optId);
            if (opt) {
                questionScore += typeof opt.score === 'number' ? opt.score : 0;
                selectedLabels.push(opt.label);
            }
        }

        totalScore += questionScore;
        breakdown.push({
            questionId: q.id,
            question: q.text,
            selected: selectedLabels,
            score: questionScore
        });
    }

    const bands = raw.scoring?.bands || [];
    let band =
        bands.find((b) => totalScore >= b.min && totalScore <= b.max) ||
        bands[bands.length - 1] ||
        null;

    return {
        quizId: raw.id,
        quizTitle: raw.title,
        score: totalScore,
        maxScore: bands.reduce((m, b) => Math.max(m, b.max || 0), totalScore),
        level: band?.level || 'unknown',
        title: band?.title || 'Your results',
        summary: band?.summary || '',
        recommendations: band?.recommendations || [],
        breakdown,
        ctaBooking: raw.ctaBooking || '/book-consultation',
        completedAt: new Date().toISOString()
    };
}

function validateAnswers(quizId, answers) {
    const raw = loadQuizRaw(quizId);
    if (!raw) return { ok: false, error: 'Quiz not found' };
    if (!answers || typeof answers !== 'object') {
        return { ok: false, error: 'Answers are required' };
    }
    for (const q of raw.questions || []) {
        const val = answers[q.id];
        if (q.type === 'multi') {
            if (!Array.isArray(val) || val.length === 0) {
                return { ok: false, error: `Please answer: ${q.text}` };
            }
            continue;
        }
        if (!val || typeof val !== 'string') {
            return { ok: false, error: `Please answer: ${q.text}` };
        }
        const opt = (q.options || []).find((o) => o.id === val);
        if (!opt) return { ok: false, error: 'Invalid answer selection' };
    }
    return { ok: true };
}

module.exports = {
    listQuizzesPublic,
    quizForClient,
    scoreAnswers,
    validateAnswers,
    loadQuizRaw
};
