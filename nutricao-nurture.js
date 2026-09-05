'use strict';

const DELAYS_MS = {
    1: 60 * 60 * 1000,
    2: 24 * 60 * 60 * 1000,
    3: 48 * 60 * 60 * 1000
};

function firstNameOf(name) {
    const t = String(name || '').trim();
    if (!t) return '';
    return t.split(/\s+/)[0];
}

function planMeta(plan) {
    const completo = plan === 'completo';
    return {
        plan: completo ? 'completo' : 'nutricao',
        profile: completo ? 'emocional' : 'autonomo',
        planLabel: completo ? 'Programa Completo' : 'Programa Nutrição'
    };
}

function checkoutHref(plan) {
    return plan === 'completo'
        ? '/nutricao/programa?plano=completo#pagamento'
        : '/nutricao/programa?plano=nutricao#planos';
}

function dueStep(claimedAtMs, nurtureStep, nowMs) {
    const claimed = Number(claimedAtMs);
    const next = (Number(nurtureStep) || 0) + 1;
    if (!Number.isFinite(claimed) || claimed <= 0) return 0;
    if (next < 1 || next > 3) return 0;
    return claimed + DELAYS_MS[next] <= Number(nowMs) ? next : 0;
}

function wrapEmail(escapeHtml, preheader, title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f1ec;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr>
<td style="text-align:center;padding:0 0 28px;">
<p style="margin:0;font-size:22px;font-weight:700;color:#1c2a24;letter-spacing:-0.02em;">LON Clinic</p>
<p style="margin:6px 0 0;font-size:11px;color:#7a8a82;text-transform:uppercase;letter-spacing:0.16em;">Medicina, Nutrição &amp; Bem-Estar Integrado</p>
</td>
</tr>
<tr>
<td style="background:#ffffff;border-radius:18px;padding:36px 32px 32px;box-shadow:0 8px 28px rgba(28,42,36,0.06);">
${bodyHtml}
</td>
</tr>
<tr>
<td style="padding:28px 8px 8px;text-align:center;">
<p style="margin:0 0 4px;font-size:12px;color:#7a8a82;">LON Clinic — Medicina, Nutrição &amp; Bem-Estar Integrado</p>
<p style="margin:0;font-size:12px;"><a href="https://www.lonclinic.com" style="color:#7a8a82;text-decoration:none;">www.lonclinic.com</a></p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function p(text) {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3d4a44;">${text}</p>`;
}

function h3(text) {
    return `<p style="margin:20px 0 8px;font-size:15px;font-weight:700;color:#1c2a24;">${text}</p>`;
}

function buildStepEmail(opts) {
    const escapeHtml = opts.escapeHtml;
    const buttonHtml = opts.buttonHtml;
    const name = firstNameOf(opts.name) || 'olá';
    const planLabel = planMeta(opts.plan).planLabel;
    const ctaUrl = opts.ctaUrl;
    const step = Number(opts.step);

    if (step === 1) {
        const subject = `O seu perfil metabólico está pronto, ${name}`;
        const preheader = 'Veja o diagnóstico do seu teste de avaliação e o plano recomendado pela equipa clínica.';
        const text = [
            `Olá, ${name},`,
            '',
            'Obrigado por completar a sua Avaliação Inicial na LON Clinic.',
            '',
            'Com base nas informações que partilhou connosco, a nossa equipa analisou o seu perfil. Identificámos que o seu principal obstáculo na perda de peso não é a falta de vontade — é a ausência de um protocolo clínico integrado que trate a causa raiz do problema.',
            '',
            'Quando tentamos perder peso focando apenas em «comer menos», ignoramos os três pilares que realmente ditam o sucesso sustentável:',
            '',
            'Marcadores Biomédicos: Como estão a sua tiróide, glicemia, insulina e níveis hormonais?',
            'Acompanhamento Nutricional Frequente: Para ajustar o plano à sua rotina real, e não a uma dieta teórica.',
            'Fator Emocional & Stress: Como a ansiedade e o cansaço afetam as suas escolhas alimentares.',
            '',
            `Com base nas suas respostas, enquadrámos o seu perfil no ${planLabel}.`,
            '',
            `Rever o seu diagnóstico e o plano recomendado: ${ctaUrl}`,
            '',
            'Se tiver alguma dúvida sobre como funcionam os exames de sangue ou as consultas online, basta responder diretamente a este e-mail.',
            '',
            'Um abraço,',
            'Equipa Clínica LON',
            '',
            'LON Clinic — Medicina, Nutrição & Bem-Estar Integrado'
        ].join('\n');
        const html = wrapEmail(escapeHtml, preheader, subject, [
            p(`Olá, ${escapeHtml(name)},`),
            p('Obrigado por completar a sua Avaliação Inicial na LON Clinic.'),
            p('Com base nas informações que partilhou connosco, a nossa equipa analisou o seu perfil. Identificámos que o seu principal obstáculo na perda de peso não é a falta de vontade — é a ausência de um protocolo clínico integrado que trate a causa raiz do problema.'),
            p('Quando tentamos perder peso focando apenas em «comer menos», ignoramos os três pilares que realmente ditam o sucesso sustentável:'),
            `<ul style="margin:0 0 16px;padding-left:20px;color:#3d4a44;font-size:15px;line-height:1.65;">
<li style="margin:0 0 8px;"><strong style="color:#1c2a24;">Marcadores biomédicos:</strong> Como estão a sua tiróide, glicemia, insulina e níveis hormonais?</li>
<li style="margin:0 0 8px;"><strong style="color:#1c2a24;">Acompanhamento nutricional frequente:</strong> Para ajustar o plano à sua rotina real, e não a uma dieta teórica.</li>
<li style="margin:0;"><strong style="color:#1c2a24;">Fator emocional &amp; stress:</strong> Como a ansiedade e o cansaço afetam as suas escolhas alimentares.</li>
</ul>`,
            p(`Com base nas suas respostas, enquadrámos o seu perfil no <strong style="color:#1c2a24;">${escapeHtml(planLabel)}</strong>.`),
            buttonHtml(ctaUrl, 'Rever o seu diagnóstico e o plano recomendado'),
            p('Se tiver alguma dúvida sobre como funcionam os exames de sangue ou as consultas online, basta responder diretamente a este e-mail.'),
            p('Um abraço,<br>Equipa Clínica LON')
        ].join('\n'));
        return { subject, preheader, text, html };
    }

    if (step === 2) {
        const subject = 'O que acontece na sua 1ª Consulta Médica?';
        const preheader = 'Saiba como funcionam os exames de sangue e o acompanhamento nos 6 meses.';
        const text = [
            `Olá, ${name},`,
            '',
            'Uma das perguntas que mais recebemos de novos pacientes é: «Como é que a LON Clinic é diferente das dietas tradicionais?»',
            '',
            'A resposta é simples: nós não adivinhamos, medimos.',
            '',
            'Nas dietas normais, recebe um papel impresso com calorias genéricas. Na LON Clinic, o seu percurso de 6 meses é totalmente guiado por dados do seu próprio corpo:',
            '',
            'Mês 1 (O Diagnóstico): Avaliação clínica e requisição de um painel de análises. Na consulta seguinte, analisamos cada marcador para identificar bloqueios metabólicos.',
            'Meses 2 a 5 (A Ação): 2 consultas de nutrição por mês, chat no portal e ajustes quinzenais para o plano se adaptar a viagens, jantares e à rotina de trabalho.',
            'Mês 6 (A Prova): Repetimos as análises e fazemos uma consulta final para comparar o progresso ANTES vs. DEPOIS.',
            '',
            'Sem fórmulas mágicas. Apenas medicina, ciência e acompanhamento humano.',
            '',
            `Ver opções de subscrição a partir de 75€/mês: ${ctaUrl}`,
            '',
            'As vagas para novos acompanhamentos este mês são limitadas para garantir a qualidade do acompanhamento individual.',
            '',
            'Até breve,',
            'Drª Rita Aguiar',
            'LON Clinic'
        ].join('\n');
        const html = wrapEmail(escapeHtml, preheader, subject, [
            p(`Olá, ${escapeHtml(name)},`),
            p('Uma das perguntas que mais recebemos de novos pacientes é: «Como é que a LON Clinic é diferente das dietas tradicionais?»'),
            p('A resposta é simples: nós não adivinhamos, medimos.'),
            p('Nas dietas normais, recebe um papel impresso com calorias genéricas. Na LON Clinic, o seu percurso de 6 meses é totalmente guiado por dados do seu próprio corpo:'),
            h3('Mês 1 — O diagnóstico'),
            p('Avaliação clínica e requisição de um painel de análises. Na consulta seguinte, analisamos cada marcador para identificar bloqueios metabólicos. As análises fazem-se no laboratório da sua preferência — não estão incluídas no preço do programa.'),
            h3('Meses 2 a 5 — A ação'),
            p('2 consultas de nutrição por mês, chat no portal e ajustes quinzenais para o plano se adaptar a viagens, jantares e à rotina de trabalho.'),
            h3('Mês 6 — A prova'),
            p('Repetimos as análises e fazemos uma consulta final para comparar o progresso ANTES vs. DEPOIS.'),
            p('Sem fórmulas mágicas. Apenas medicina, ciência e acompanhamento humano.'),
            buttonHtml(ctaUrl, 'Ver opções de subscrição a partir de 75€/mês'),
            p('As vagas para novos acompanhamentos este mês são limitadas para garantir a qualidade do acompanhamento individual.'),
            p('Até breve,<br>Drª Rita Aguiar<br>LON Clinic')
        ].join('\n'));
        return { subject, preheader, text, html };
    }

    const subject = `${name}, ainda com dúvidas sobre o programa?`;
    const preheader = 'Respondemos às 3 perguntas mais frequentes antes de começar.';
    const text = [
        `Olá, ${name},`,
        '',
        'Queremos garantir que tem toda a informação necessária para tomar a melhor decisão pela sua saúde. Reunimos as 3 dúvidas mais comuns de quem está prestes a iniciar o programa de 6 meses:',
        '',
        '1. «Os exames de sangue estão incluídos ou posso usar o meu seguro/SNS?»',
        'O nosso médico emite a requisição oficial das análises na 1.ª consulta. Pode realizá-las no laboratório da sua preferência, utilizando o seu seguro de saúde, SNS ou convenções habituais.',
        '',
        '2. «Se escolher o plano com Psicologia, como funcionam as sessões?»',
        'As sessões de psicologia acontecem quinzenalmente (2x/mês) por videoconsulta. São focadas em reestruturação comportamental, gestão da ansiedade e fim dos episódios de fome emocional.',
        '',
        '3. «Existe fidelização?»',
        'Sim, o programa tem uma fidelização mínima de 3 meses. Clinicamente, 90 dias é o tempo mínimo necessário para consolidar alterações metabólicas e criar hábitos alimentares sustentáveis.',
        '',
        `Garantir a minha vaga no Programa Metabólico: ${ctaUrl}`,
        '',
        'Nos vemos na sua primeira consulta,',
        'Equipa LON Clinic'
    ].join('\n');
    const html = wrapEmail(escapeHtml, preheader, subject, [
        p(`Olá, ${escapeHtml(name)},`),
        p('Queremos garantir que tem toda a informação necessária para tomar a melhor decisão pela sua saúde. Reunimos as 3 dúvidas mais comuns de quem está prestes a iniciar o programa de 6 meses:'),
        h3('1. «Os exames de sangue estão incluídos ou posso usar o meu seguro/SNS?»'),
        p('O nosso médico emite a requisição oficial das análises na 1.ª consulta. Pode realizá-las no laboratório da sua preferência, utilizando o seu seguro de saúde, SNS ou convenções habituais.'),
        h3('2. «Se escolher o plano com Psicologia, como funcionam as sessões?»'),
        p('As sessões de psicologia acontecem quinzenalmente (2x/mês) por videoconsulta. São focadas em reestruturação comportamental, gestão da ansiedade e fim dos episódios de fome emocional.'),
        h3('3. «Existe fidelização?»'),
        p('Sim, o programa tem uma fidelização mínima de 3 meses. Clinicamente, 90 dias é o tempo mínimo necessário para consolidar alterações metabólicas e criar hábitos alimentares sustentáveis.'),
        p('Se está pronto(a) para transformar a sua saúde de forma definitiva, o seu plano continua reservado:'),
        buttonHtml(ctaUrl, 'Garantir a minha vaga no Programa Metabólico'),
        p('Nos vemos na sua primeira consulta,<br>Equipa LON Clinic')
    ].join('\n'));
    return { subject, preheader, text, html };
}

module.exports = {
    DELAYS_MS,
    firstNameOf,
    planMeta,
    checkoutHref,
    dueStep,
    buildStepEmail
};
