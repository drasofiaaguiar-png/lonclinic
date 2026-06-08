document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('quizList');
    const errEl = document.getElementById('quizListError');

    try {
        const res = await fetch('/api/quizzes');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load quizzes');

        const quizzes = data.quizzes || [];
        if (!quizzes.length) {
            listEl.innerHTML = '<p style="text-align:center;color:#6b7f72;">No quizzes available yet.</p>';
            return;
        }

        listEl.innerHTML = quizzes
            .map((q) => {
                const meta = [
                    q.questionCount ? `${q.questionCount} questions` : null,
                    q.estimatedMinutes ? `~${q.estimatedMinutes} min` : null
                ]
                    .filter(Boolean)
                    .join(' · ');
                return `
                    <a href="/quiz/${encodeURIComponent(q.id)}" class="quiz-list-card">
                        <h2>${escapeHtml(q.title)}</h2>
                        <p>${escapeHtml(q.description)}</p>
                        <span class="quiz-list-meta">${escapeHtml(meta)} · Free</span>
                    </a>
                `;
            })
            .join('');
    } catch (err) {
        if (errEl) {
            errEl.textContent = err.message || 'Could not load quizzes.';
            errEl.style.display = 'block';
        }
        listEl.innerHTML = '';
    }
});

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
