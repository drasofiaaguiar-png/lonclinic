/* ========================================
   i18n — English / Portuguese translations
   Selector-based: no HTML attributes needed
======================================== */
(function () {
    'use strict';

    const STORAGE_KEY = 'clinic_lang';
    let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

    /* ── Page detection ── */
    function detectPage() {
        const p = window.location.pathname.toLowerCase();
        if (p.includes('travel')) return 'travel';
        if (p.includes('book')) return 'book';
        return 'index';
    }
    const PAGE = detectPage();

    /* ══════════════════════════════════════════
       TRANSLATIONS  — { s: selector, en, pt }
       h:true → use innerHTML instead of textContent
       a:'attr' → set attribute
    ══════════════════════════════════════════ */

    /* ── Shared footer / legal ── */
    const COMMON = [
        /* Footer support sidebar */
        { s: '.footer-support-title', en: 'Get Support', pt: 'Obtenha Suporte' },
        /* Footer column headings */
        { s: '.footer-columns .footer-links:nth-child(1) h4', en: 'Company', pt: 'Empresa' },
        { s: '.footer-columns .footer-links:nth-child(2) h4', en: 'Members', pt: 'Membros' },
        { s: '.footer-columns .footer-links:nth-child(3) h4', en: 'Follow', pt: 'Seguir' },
        { s: '.footer-columns .footer-links:nth-child(4) h4', en: 'Services', pt: 'Serviços' },
        /* Company links */
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(3)', en: 'Careers', pt: 'Carreiras' },
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(4)', en: 'Press Room', pt: 'Imprensa' },
        /* Members links */
        { s: '.footer-columns .footer-links:nth-child(2) a:nth-child(2)', en: 'Log In', pt: 'Iniciar Sessão' },
        /* Footer bottom */
        { s: '.footer-bottom-left > p', en: '\u00A9 2026 Longevity Clinic', pt: '\u00A9 2026 Clínica de Longevidade' },
        { s: '.footer-bottom-left a:nth-child(3)', en: 'Cookie Notice', pt: 'Aviso de Cookies' },
        { s: '.footer-bottom-left a:nth-child(4)', en: 'Privacy Policy', pt: 'Política de Privacidade' },
        { s: '.footer-bottom-left a:nth-child(5)', en: 'Terms of Service', pt: 'Termos de Serviço' },
        { s: '.footer-locale > span:first-of-type', en: 'Portugal', pt: 'Portugal' },
        { s: '.footer-address', en: 'Lisbon, Portugal', pt: 'Lisboa, Portugal' },
    ];

    /* Homepage-style header (lon-nav) on book, travel, etc. */
    const LON_NAV = [
        { s: '.lon-nav-links a[href="/#inicio"], .lon-mobile-menu a[href="/#inicio"]', en: 'Home', pt: 'Início' },
        { s: '.lon-nav-links a[href="/#platform"], .lon-mobile-menu a[href="/#platform"]', en: 'Platform', pt: 'Plataforma' },
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Services', pt: 'Serviços' },
        { s: '.lon-nav-links a[href="/#contacto"], .lon-mobile-menu a[href="/#contacto"]', en: 'Contact', pt: 'Contato' },
        { s: '.lon-nav-actions > a.lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login' },
        { s: '.lon-nav-actions > a.lon-btn-primary[href="/#servicos"]', en: 'Book consultation', pt: 'Marcar consulta' },
        { s: '.lon-mobile-menu a[href="/patient-portal"]', en: 'Login', pt: 'Login' },
    ];

    /* ═══════════════════════════
       INDEX PAGE
    ═══════════════════════════ */
    const INDEX = [
        /* ── Title / Meta ── */
        { s: 'title', en: 'Longevity Clinic — Add Life to Your Years', pt: 'Clínica de Longevidade — Adicione Vida aos Seus Anos', special: 'title' },

        /* ── Nav ── */
        { s: '.nav-link[href="#approach"], .mobile-link[href="#approach"]', en: 'Our Approach', pt: 'A Nossa Abordagem' },
        { s: '.nav-link[href="#how-it-works"], .mobile-link[href="#how-it-works"]', en: 'How It Works', pt: 'Como Funciona' },
        { s: '.nav-link[href="#insights"], .mobile-link[href="#insights"]', en: 'Insights', pt: 'Resultados' },
        { s: '.nav-link[href="#faq"], .mobile-link[href="#faq"]', en: 'FAQ', pt: 'FAQ' },
        { s: '.nav-member, .mobile-link[href="/patient-portal"]', en: 'Patient login', pt: 'Área do Paciente' },
        { s: '.nav-btn, .mobile-btn', en: 'Book Assessment', pt: 'Marcar Avaliação' },

        /* ── Hero ── */
        { s: '.hero-badge', en: 'Private Online Longevity Clinic', pt: 'Clínica de Longevidade Online Privada' },
        { s: '.hero-title', en: 'Add life to your years.<br>Not just years to your life.', pt: 'Adicione vida aos seus anos.<br>Não apenas anos à sua vida.', h: true },
        { s: '.hero-subtitle', en: 'Personalized longevity assessments with physicians specialized in preventive and long-term health — delivered entirely online.', pt: 'Avaliações de longevidade personalizadas com médicos especializados em saúde preventiva e de longo prazo — realizadas inteiramente online.' },
        { s: '.price-amount', en: 'Online medical consultations', pt: 'Consultas médicas online' },
        { s: '.hero-actions .btn-primary', en: 'Book your longevity assessment', pt: 'Marque a sua avaliação de longevidade' },
        { s: '.hero-actions .btn-outline', en: 'Explore our approach', pt: 'Explore a nossa abordagem' },
        { s: '.hero-travel-link', en: 'Traveling soon? Visit our Travel Medicine Clinic →', pt: 'Vai viajar em breve? Visite a nossa Clínica de Medicina de Viagem →' },
        { s: '.rating-text', en: 'Trusted by health-conscious individuals worldwide', pt: 'A confiança de indivíduos preocupados com a saúde em todo o mundo' },

        /* ── Approach (#approach) ── */
        { s: '#approach .section-label', en: 'Longevity care', pt: 'Cuidados de longevidade' },
        { s: '#approach .section-title', en: 'Proactive medicine for a longer,<br>healthier life.', pt: 'Medicina proativa para uma vida mais longa<br>e saudável.', h: true },
        { s: '#approach .section-desc', en: 'We focus on early risk detection, prevention, and long-term optimization — not just treating illness once it appears.', pt: 'Focamo-nos na deteção precoce de riscos, prevenção e otimização a longo prazo — não apenas no tratamento da doença quando esta se manifesta.' },
        { s: '#approach .included-card:nth-child(1) h3', en: 'Deep Health Review', pt: 'Avaliação de Saúde Aprofundada' },
        { s: '#approach .included-card:nth-child(1) p', en: 'Comprehensive evaluation of your medical history, lifestyle, family risks, and current concerns.', pt: 'Avaliação abrangente do seu historial médico, estilo de vida, riscos familiares e preocupações atuais.' },
        { s: '#approach .included-card:nth-child(2) h3', en: 'Biomarker Interpretation', pt: 'Interpretação de Biomarcadores' },
        { s: '#approach .included-card:nth-child(2) p', en: 'We analyze your blood work and key health markers to uncover early signals of disease risk.', pt: 'Analisamos as suas análises sanguíneas e marcadores-chave de saúde para descobrir sinais precoces de risco de doença.' },
        { s: '#approach .included-card:nth-child(3) h3', en: 'Risk Reduction Strategy', pt: 'Estratégia de Redução de Risco' },
        { s: '#approach .included-card:nth-child(3) p', en: 'Clear medical guidance to reduce cardiovascular, metabolic, and age-related disease risks.', pt: 'Orientação médica clara para reduzir riscos de doenças cardiovasculares, metabólicas e relacionadas com a idade.' },
        { s: '#approach .included-card:nth-child(4) h3', en: 'Personalized Action Plan', pt: 'Plano de Ação Personalizado' },
        { s: '#approach .included-card:nth-child(4) p', en: 'A practical roadmap covering lifestyle, screenings, and preventive steps tailored to your goals.', pt: 'Um roteiro prático que abrange estilo de vida, rastreios e medidas preventivas adaptadas aos seus objetivos.' },

        /* ── Why It Matters (#why-it-matters) ── */
        { s: '#why-it-matters .section-label', en: 'Why it matters', pt: 'Porque importa' },
        { s: '#why-it-matters .section-title', en: 'Most chronic disease is preventable<br>— if you act early.', pt: 'A maioria das doenças crónicas é prevenível<br>— se agir cedo.', h: true },
        { s: '#why-it-matters .section-desc', en: 'Longevity medicine focuses on identifying and addressing risk factors years before symptoms begin.', pt: 'A medicina da longevidade foca-se na identificação e abordagem de fatores de risco anos antes do início dos sintomas.' },
        { s: '#why-it-matters .detect-card:nth-child(1) h3', en: 'Cardiovascular Disease Prevention', pt: 'Prevenção de Doenças Cardiovasculares' },
        { s: '#why-it-matters .detect-card:nth-child(1) p', en: 'Heart disease remains the leading cause of death worldwide. Early intervention in blood pressure, lipids, and lifestyle can dramatically reduce your risk.', pt: 'As doenças cardíacas continuam a ser a principal causa de morte a nível mundial. A intervenção precoce na pressão arterial, lípidos e estilo de vida pode reduzir drasticamente o seu risco.' },
        { s: '#why-it-matters .detect-card:nth-child(2) h3', en: 'Metabolic Health & Diabetes Risk', pt: 'Saúde Metabólica e Risco de Diabetes' },
        { s: '#why-it-matters .detect-card:nth-child(2) p', en: 'Insulin resistance and metabolic dysfunction often develop silently over years. We identify early metabolic shifts before they become disease.', pt: 'A resistência à insulina e a disfunção metabólica desenvolvem-se frequentemente de forma silenciosa ao longo dos anos. Identificamos alterações metabólicas precoces antes de se tornarem doença.' },
        { s: '#why-it-matters .detect-card:nth-child(3) h3', en: 'Cognitive Health & Aging Brain', pt: 'Saúde Cognitiva e Envelhecimento Cerebral' },
        { s: '#why-it-matters .detect-card:nth-child(3) p', en: 'Protecting brain health starts decades before cognitive decline. We assess modifiable risk factors that influence long-term cognitive function.', pt: 'A proteção da saúde cerebral começa décadas antes do declínio cognitivo. Avaliamos fatores de risco modificáveis que influenciam a função cognitiva a longo prazo.' },
        { s: '#why-it-matters .detect-card:nth-child(4) h3', en: 'Cancer Screening Strategy', pt: 'Estratégia de Rastreio Oncológico' },
        { s: '#why-it-matters .detect-card:nth-child(4) p', en: 'A personalized screening timeline based on your family history, genetics, and risk profile — so you know when and what to test for.', pt: 'Uma cronologia de rastreios personalizada com base no seu historial familiar, genética e perfil de risco — para que saiba quando e o que testar.' },
        { s: '#why-it-matters .detect-card:nth-child(5) h3', en: 'Hormonal & Energy Health', pt: 'Saúde Hormonal e Energética' },
        { s: '#why-it-matters .detect-card:nth-child(5) p', en: 'Hormonal balance affects energy, mood, body composition, and aging. We evaluate key hormonal markers and provide evidence-based guidance.', pt: 'O equilíbrio hormonal afeta a energia, o humor, a composição corporal e o envelhecimento. Avaliamos os principais marcadores hormonais e fornecemos orientação baseada em evidências.' },
        { s: '#why-it-matters .detect-card:nth-child(6) h3', en: 'Lifestyle Factors That Influence Lifespan', pt: 'Fatores de Estilo de Vida que Influenciam a Longevidade' },
        { s: '#why-it-matters .detect-card:nth-child(6) p', en: 'Sleep, nutrition, exercise, and stress management are pillars of longevity. We help you optimize each one based on your unique health data.', pt: 'Sono, nutrição, exercício e gestão do stress são pilares da longevidade. Ajudamos a otimizar cada um com base nos seus dados de saúde únicos.' },

        /* ── How It Works (#how-it-works) ── */
        { s: '#how-it-works .section-label', en: 'How it works', pt: 'Como funciona' },
        { s: '#how-it-works .section-title', en: 'Expert preventive care.<br>Fully online.', pt: 'Cuidados preventivos especializados.<br>Totalmente online.', h: true },
        { s: '#how-it-works .section-desc', en: 'Our longevity assessments are designed for depth and convenience — conducted entirely via secure video with thorough digital follow-up.', pt: 'As nossas avaliações de longevidade são concebidas para profundidade e conveniência — realizadas inteiramente por vídeo seguro com acompanhamento digital completo.' },
        { s: '#how-it-works .process-step:nth-child(1) .step-time', en: 'Step 1', pt: 'Passo 1' },
        { s: '#how-it-works .process-step:nth-child(1) h4', en: 'Complete your health profile', pt: 'Complete o seu perfil de saúde' },
        { s: '#how-it-works .process-step:nth-child(1) p', en: 'Tell us about your history, lifestyle, family risks, and any recent test results.', pt: 'Fale-nos sobre o seu historial, estilo de vida, riscos familiares e quaisquer resultados de exames recentes.' },
        { s: '#how-it-works .process-step:nth-child(2) .step-time', en: 'Step 2', pt: 'Passo 2' },
        { s: '#how-it-works .process-step:nth-child(2) h4', en: 'Video consultation with a physician', pt: 'Consulta por vídeo com um médico' },
        { s: '#how-it-works .process-step:nth-child(2) p', en: 'A dedicated, in-depth discussion focused on long-term health, not rushed symptom care.', pt: 'Uma discussão dedicada e aprofundada focada na saúde a longo prazo, sem pressa.' },
        { s: '#how-it-works .process-step:nth-child(3) .step-time', en: 'Step 3', pt: 'Passo 3' },
        { s: '#how-it-works .process-step:nth-child(3) h4', en: 'Your longevity roadmap', pt: 'O seu roteiro de longevidade' },
        { s: '#how-it-works .process-step:nth-child(3) p', en: 'You receive a clear prevention strategy, screening plan, and guidance on next medical steps.', pt: 'Recebe uma estratégia de prevenção clara, plano de rastreios e orientação sobre os próximos passos médicos.' },

        /* ── Insights (#insights) ── */
        { s: '#insights .section-label', en: 'Your insights', pt: 'Os seus resultados' },
        { s: '#insights .section-title', en: 'We turn data into decisions.', pt: 'Transformamos dados em decisões.' },
        { s: '#insights .section-desc', en: 'Every consultation delivers clear, prioritized guidance you can act on — not just numbers on a page.', pt: 'Cada consulta oferece orientação clara e prioritizada sobre a qual pode agir — não apenas números numa página.' },
        { s: '#insights .tracking-card-large h3', en: 'Risk Overview', pt: 'Visão Geral de Riscos' },
        { s: '#insights .tracking-card-large .tracking-info p', en: 'Your most important long-term health risks, clearly explained and prioritized by clinical relevance.', pt: 'Os seus riscos de saúde a longo prazo mais importantes, claramente explicados e priorizados por relevância clínica.' },
        { s: '#insights .tracking-card:nth-child(2) h3', en: 'Biomarkers That Matter', pt: 'Biomarcadores que Importam' },
        { s: '#insights .tracking-card:nth-child(2) p:last-child', en: 'Understand which lab values are relevant — and which are not.', pt: 'Compreenda quais valores laboratoriais são relevantes — e quais não são.' },
        { s: '#insights .tracking-card:nth-child(3) h3', en: 'Screening Timeline', pt: 'Cronologia de Rastreios' },
        { s: '#insights .tracking-card:nth-child(3) p:last-child', en: 'Know when to test, scan, or follow up based on your personal profile.', pt: 'Saiba quando testar, rastrear ou fazer acompanhamento com base no seu perfil pessoal.' },
        { s: '#insights .tracking-card:nth-child(4) h3', en: 'Lifestyle Medicine', pt: 'Medicina do Estilo de Vida' },
        { s: '#insights .tracking-card:nth-child(4) p:last-child', en: 'Evidence-based changes that meaningfully influence long-term health.', pt: 'Mudanças baseadas em evidências que influenciam significativamente a saúde a longo prazo.' },
        { s: '#insights .tracking-card:nth-child(5) h3', en: 'Medical Referrals', pt: 'Referenciações Médicas' },
        { s: '#insights .tracking-card:nth-child(5) p:last-child', en: 'Guidance on when specialist input or imaging may be appropriate.', pt: 'Orientação sobre quando a intervenção de especialistas ou exames de imagem podem ser adequados.' },

        /* ── Partnership (#partnership) ── */
        { s: '#partnership .section-label', en: 'Long-term partnership', pt: 'Parceria a longo prazo' },
        { s: '#partnership .section-title', en: 'Longevity is a journey —<br>not a one-time visit.', pt: 'A longevidade é uma jornada —<br>não uma visita única.', h: true },
        { s: '#partnership .section-desc', en: 'We build lasting relationships focused on your evolving health over the years.', pt: 'Construímos relações duradouras focadas na evolução da sua saúde ao longo dos anos.' },
        { s: '#partnership .build-card:nth-child(1) h3', en: 'Ongoing Reviews', pt: 'Avaliações Contínuas' },
        { s: '#partnership .build-card:nth-child(1) p', en: 'Track changes in your health markers over time with regular reassessments and updated recommendations.', pt: 'Acompanhe as alterações nos seus marcadores de saúde ao longo do tempo com reavaliações regulares e recomendações atualizadas.' },
        { s: '#partnership .build-card:nth-child(2) h3', en: 'Prevention-Focused Care', pt: 'Cuidados Focados na Prevenção' },
        { s: '#partnership .build-card:nth-child(2) p', en: 'Stay ahead of disease rather than reacting to it. Our approach is proactive by design, not reactive.', pt: 'Antecipe-se à doença em vez de reagir a ela. A nossa abordagem é proativa por conceção, não reativa.' },
        { s: '#partnership .build-card:nth-child(3) h3', en: 'Continuity with Your Doctor', pt: 'Continuidade com o Seu Médico' },
        { s: '#partnership .build-card:nth-child(3) p', en: 'Build a long-term relationship with a physician who understands your evolving health profile.', pt: 'Construa uma relação a longo prazo com um médico que compreende o seu perfil de saúde em evolução.' },

        /* ── Doctor (#team) ── */
        { s: '#team .section-label', en: 'Your medical team', pt: 'A sua equipa médica' },
        { s: '#team .section-title', en: 'Doctors focused on prevention and healthy aging.', pt: 'Médicos focados na prevenção e envelhecimento saudável.' },
        { s: '#team .section-desc', en: 'Our physicians specialize in preventive medicine, risk assessment, and evidence-based longevity strategies. Consultations are thorough, personalized, and centered on long-term wellbeing.', pt: 'Os nossos médicos são especializados em medicina preventiva, avaliação de risco e estratégias de longevidade baseadas em evidências. As consultas são rigorosas, personalizadas e centradas no bem-estar a longo prazo.' },
        { s: '#team .doctor-list li:nth-child(1) span', en: 'Licensed physicians with preventive care expertise', pt: 'Médicos licenciados com experiência em cuidados preventivos' },
        { s: '#team .doctor-list li:nth-child(2) span', en: 'Evidence-based longevity approach', pt: 'Abordagem de longevidade baseada em evidências' },
        { s: '#team .doctor-list li:nth-child(3) span', en: 'Clear, practical medical guidance', pt: 'Orientação médica clara e prática' },
        { s: '#team .doctor-list li:nth-child(4) span', en: 'Personalized, unrushed consultations', pt: 'Consultas personalizadas e sem pressa' },

        /* ── Travel bridge (#travel) ── */
        { s: '#travel .travel-title', en: 'Traveling internationally?<br>We also run a Travel Medicine Clinic.', pt: 'Vai viajar para o estrangeiro?<br>Temos também uma Clínica de Medicina de Viagem.', h: true },
        { s: '#travel .travel-desc', en: 'In addition to longevity care, our physicians provide destination-specific travel health consultations — including vaccines, malaria prevention, altitude advice, and travel prescriptions.', pt: 'Para além dos cuidados de longevidade, os nossos médicos oferecem consultas de saúde de viagem específicas para o destino — incluindo vacinas, prevenção de malária, aconselhamento de altitude e prescrições de viagem.' },
        { s: '#travel .btn', en: 'Visit Travel Medicine Clinic →', pt: 'Visite a Clínica de Medicina de Viagem →' },

        /* ── FAQ (#faq) ── */
        { s: '#faq .section-label', en: 'Support', pt: 'Suporte' },
        { s: '#faq .section-title', en: 'Frequently asked questions.', pt: 'Perguntas frequentes.' },
        { s: '#faq .faq-item:nth-child(1) .faq-question span', en: 'What is a longevity assessment?', pt: 'O que é uma avaliação de longevidade?' },
        { s: '#faq .faq-item:nth-child(1) .faq-answer p', en: 'A preventive medical consultation focused on identifying long-term disease risks and creating a personalized strategy to support healthy aging. It goes beyond routine checkups to address the root causes of chronic disease before symptoms appear.', pt: 'Uma consulta médica preventiva focada na identificação de riscos de doenças a longo prazo e na criação de uma estratégia personalizada para apoiar o envelhecimento saudável. Vai além dos check-ups de rotina para abordar as causas profundas das doenças crónicas antes que os sintomas apareçam.' },
        { s: '#faq .faq-item:nth-child(2) .faq-question span', en: 'Is this service online?', pt: 'Este serviço é online?' },
        { s: '#faq .faq-item:nth-child(2) .faq-answer p', en: 'Yes. All consultations are conducted via secure video with digital follow-up and planning. You can access expert longevity care from anywhere in the world.', pt: 'Sim. Todas as consultas são realizadas por vídeo seguro com acompanhamento e planeamento digital. Pode aceder a cuidados especializados de longevidade a partir de qualquer lugar do mundo.' },
        { s: '#faq .faq-item:nth-child(3) .faq-question span', en: 'Do I need lab tests beforehand?', pt: 'Preciso de análises prévias?' },
        { s: '#faq .faq-item:nth-child(3) .faq-answer p', en: 'Not necessarily. We can review existing results or advise you on which tests would be useful before or after your consultation. We\'ll guide you either way.', pt: 'Não necessariamente. Podemos rever resultados existentes ou aconselhá-lo sobre quais testes seriam úteis antes ou depois da consulta. Orientamos em qualquer caso.' },
        { s: '#faq .faq-item:nth-child(4) .faq-question span', en: 'Is this a replacement for my GP?', pt: 'Isto substitui o meu médico de família?' },
        { s: '#faq .faq-item:nth-child(4) .faq-answer p', en: 'No. We provide specialized preventive consultations that complement your regular healthcare. Think of us as an additional layer of expertise focused specifically on longevity and disease prevention.', pt: 'Não. Fornecemos consultas preventivas especializadas que complementam os seus cuidados de saúde regulares. Pense em nós como uma camada adicional de especialização focada especificamente na longevidade e prevenção de doenças.' },
        { s: '#faq .faq-item:nth-child(5) .faq-question span', en: 'Do you also provide travel consultations?', pt: 'Também fazem consultas de viagem?' },
        { s: '#faq .faq-item:nth-child(5) .faq-answer p', en: 'Yes. We operate a dedicated <a href="/travel-clinic" style="color: #c5c72c; text-decoration: underline;">Travel Medicine Clinic</a> for destination-specific medical advice, vaccinations, malaria prevention, and travel prescriptions.', pt: 'Sim. Temos uma <a href="/travel-clinic" style="color: #c5c72c; text-decoration: underline;">Clínica de Medicina de Viagem</a> dedicada para aconselhamento médico específico por destino, vacinações, prevenção de malária e prescrições de viagem.', h: true },

        /* ── CTA (#book) ── */
        { s: '#book .cta-title', en: 'Start planning for a longer,<br>healthier future.', pt: 'Comece a planear um futuro<br>mais longo e saudável.', h: true },
        { s: '#book .cta-desc', en: 'Book your online longevity assessment today and take a proactive step toward healthier aging.', pt: 'Marque a sua avaliação de longevidade online hoje e dê um passo proativo rumo a um envelhecimento mais saudável.' },
        { s: '#book .cta-content > .btn', en: 'Book your longevity consultation', pt: 'Marque a sua consulta de longevidade' },
        { s: '#book .cta-travel-link', en: 'Need travel health advice instead? Visit our Travel Medicine Clinic →', pt: 'Precisa de aconselhamento de saúde de viagem? Visite a nossa Clínica de Medicina de Viagem →' },

        /* ── Footer (index-specific) ── */
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(2)', en: 'About', pt: 'Sobre' },
        { s: '.footer-columns .footer-links:nth-child(1) a[href="#team"]', en: 'Medical Team', pt: 'Equipa Médica' },
        { s: '.footer-links a[href="#book"]', en: 'Longevity Assessment', pt: 'Avaliação de Longevidade' },
        { s: '.footer-links a[href="/travel-clinic"]', en: 'Travel Medicine', pt: 'Medicina de Viagem' },
        { s: '.footer-links a[href="#how-it-works"]', en: 'How It Works', pt: 'Como Funciona' },
        { s: '.footer-links a[href="#insights"]', en: 'Insights', pt: 'Resultados' },
    ];

    /* ═══════════════════════════
       TRAVEL PAGE
    ═══════════════════════════ */
    const TRAVEL = [
        /* ── Title ── */
        { s: 'title', en: 'Travel Medicine Clinic — Travel Globally. Stay Medically Prepared.', pt: 'Clínica de Medicina de Viagem — Viaje Globalmente. Mantenha-se Preparado.', special: 'title' },

        /* ── Hero ── */
        { s: '.hero-badge', en: 'Private Travel Medicine Clinic', pt: 'Clínica Privada de Medicina de Viagem' },
        { s: '.hero-title', en: 'Travel globally.<br>Stay medically prepared.', pt: 'Viaje globalmente.<br>Mantenha-se medicamente preparado.', h: true },
        { s: '.hero-subtitle', en: 'Personalized travel health consultations with experienced physicians — discreet, evidence-based, and tailored to your destination and medical profile.', pt: 'Consultas de saúde de viagem personalizadas com médicos experientes — discretas, baseadas em evidências e adaptadas ao seu destino e perfil médico.' },
        { s: '.hero-actions .btn-primary', en: 'Book private travel consultation', pt: 'Marcar consulta privada de viagem' },
        { s: '.hero-actions .btn-outline', en: 'How it works', pt: 'Como funciona' },
        { s: '.rating-text', en: 'Destination-specific medical guidance for discerning international travelers', pt: 'Orientação médica específica por destino para viajantes internacionais exigentes' },

        /* ── Why Travel (#why-travel) ── */
        { s: '#why-travel .section-label', en: 'Why travel medicine', pt: 'Porquê medicina de viagem' },
        { s: '#why-travel .section-title', en: 'Because every destination carries<br>different health risks.', pt: 'Porque cada destino apresenta<br>riscos de saúde diferentes.', h: true },
        { s: '#why-travel .section-desc:nth-child(3)', en: 'International travel exposes you to health risks that vary significantly by region, climate, infrastructure, and type of travel. Careful preparation reduces the likelihood of preventable illness and medical disruption abroad.', pt: 'As viagens internacionais expõem-no a riscos de saúde que variam significativamente por região, clima, infraestrutura e tipo de viagem. Uma preparação cuidadosa reduz a probabilidade de doenças evitáveis e perturbações médicas no estrangeiro.' },
        { s: '#why-travel .section-desc:nth-child(4)', en: 'Our travel consultations focus on proactive risk reduction so you can travel with confidence and peace of mind.', pt: 'As nossas consultas de viagem focam-se na redução proativa de riscos para que possa viajar com confiança e tranquilidade.' },
        { s: '#why-travel .included-card:nth-child(1) h3', en: 'Food- & Water-Borne Infections', pt: 'Infeções Alimentares e Hídricas' },
        { s: '#why-travel .included-card:nth-child(1) p', en: 'Traveler\'s diarrhea, typhoid, hepatitis A, and other ingestion-related illnesses that vary by destination hygiene standards.', pt: 'Diarreia do viajante, febre tifoide, hepatite A e outras doenças relacionadas com a ingestão que variam conforme os padrões de higiene do destino.' },
        { s: '#why-travel .included-card:nth-child(2) h3', en: 'Mosquito-Borne Illnesses', pt: 'Doenças Transmitidas por Mosquitos' },
        { s: '#why-travel .included-card:nth-child(2) p', en: 'Malaria, dengue, Zika, and other vector-borne diseases requiring destination-specific prevention strategies.', pt: 'Malária, dengue, Zika e outras doenças transmitidas por vetores que requerem estratégias de prevenção específicas para o destino.' },
        { s: '#why-travel .included-card:nth-child(3) h3', en: 'Vaccine-Preventable Diseases', pt: 'Doenças Preveníveis por Vacinação' },
        { s: '#why-travel .included-card:nth-child(3) p', en: 'Ensuring you\'re protected against region-specific infectious diseases through proper immunization planning.', pt: 'Garantir a sua proteção contra doenças infecciosas específicas da região através de um planeamento de vacinação adequado.' },
        { s: '#why-travel .included-card:nth-child(4) h3', en: 'Altitude-Related Conditions', pt: 'Condições Relacionadas com Altitude' },
        { s: '#why-travel .included-card:nth-child(4) p', en: 'Altitude sickness prevention and management for travel to high-elevation destinations and mountainous regions.', pt: 'Prevenção e gestão do mal de altitude para viagens a destinos de elevada altitude e regiões montanhosas.' },
        { s: '#why-travel .included-card:nth-child(5) h3', en: 'Region-Specific Environmental Risks', pt: 'Riscos Ambientais Específicos da Região' },
        { s: '#why-travel .included-card:nth-child(5) p', en: 'Climate extremes, sun exposure, wildlife hazards, and other environmental factors unique to your travel destinations.', pt: 'Extremos climáticos, exposição solar, perigos da vida selvagem e outros fatores ambientais únicos dos seus destinos de viagem.' },
        { s: '#why-travel .included-card:nth-child(6) h3', en: 'Travel-Related Medication Planning', pt: 'Planeamento de Medicação de Viagem' },
        { s: '#why-travel .included-card:nth-child(6) p', en: 'Ensuring you have appropriate medications, standby treatments, and an organized travel medical kit for your journey.', pt: 'Garantir que tem medicamentos adequados, tratamentos de reserva e um kit médico de viagem organizado para a sua jornada.' },

        /* ── What We Provide (#what-we-provide) ── */
        { s: '#what-we-provide .section-label', en: 'What we provide', pt: 'O que oferecemos' },
        { s: '#what-we-provide .section-title', en: 'Comprehensive, physician-led<br>travel health planning.', pt: 'Planeamento de saúde de viagem<br>abrangente, liderado por médicos.', h: true },
        { s: '#what-we-provide .detect-card:nth-child(1) h3', en: 'Vaccination Strategy', pt: 'Estratégia de Vacinação' },
        { s: '#what-we-provide .detect-card:nth-child(1) p', en: 'Personalized review of your immunization history with clear recommendations based on your itinerary and risk level.', pt: 'Revisão personalizada do seu historial de vacinação com recomendações claras baseadas no seu itinerário e nível de risco.' },
        { s: '#what-we-provide .detect-card:nth-child(2) h3', en: 'Malaria Risk Assessment', pt: 'Avaliação de Risco de Malária' },
        { s: '#what-we-provide .detect-card:nth-child(2) p', en: 'Destination-based evaluation and preventive prescriptions when appropriate, tailored to your specific travel plans.', pt: 'Avaliação baseada no destino e prescrições preventivas quando adequado, adaptadas aos seus planos de viagem específicos.' },
        { s: '#what-we-provide .detect-card:nth-child(3) h3', en: 'Travel Illness Preparedness', pt: 'Preparação para Doenças de Viagem' },
        { s: '#what-we-provide .detect-card:nth-child(3) p', en: 'Guidance and, when indicated, standby treatment options for common travel-related conditions such as traveler\'s diarrhea.', pt: 'Orientação e, quando indicado, opções de tratamento de reserva para condições comuns relacionadas com viagens, como a diarreia do viajante.' },
        { s: '#what-we-provide .detect-card:nth-child(4) h3', en: 'Altitude & Environmental Medicine', pt: 'Medicina de Altitude e Ambiental' },
        { s: '#what-we-provide .detect-card:nth-child(4) p', en: 'Prevention and management strategies for high-altitude or extreme-climate travel, including acclimatization guidance.', pt: 'Estratégias de prevenção e gestão para viagens em altitude elevada ou clima extremo, incluindo orientação de aclimatação.' },
        { s: '#what-we-provide .detect-card:nth-child(5) h3', en: 'Chronic Condition Planning', pt: 'Planeamento para Condições Crónicas' },
        { s: '#what-we-provide .detect-card:nth-child(5) p', en: 'Tailored advice for travelers managing cardiovascular, respiratory, metabolic, or other ongoing medical conditions abroad.', pt: 'Aconselhamento personalizado para viajantes que gerem condições cardiovasculares, respiratórias, metabólicas ou outras condições médicas no estrangeiro.' },
        { s: '#what-we-provide .detect-card:nth-child(6) h3', en: 'Medical Travel Kit Guidance', pt: 'Orientação para Kit Médico de Viagem' },
        { s: '#what-we-provide .detect-card:nth-child(6) p', en: 'Curated recommendations on essential medications and supplies based on your destination and travel style.', pt: 'Recomendações curadas sobre medicamentos e materiais essenciais com base no seu destino e estilo de viagem.' },

        /* ── How It Works (#how-it-works) ── */
        { s: '#how-it-works .section-label', en: 'How it works', pt: 'Como funciona' },
        { s: '#how-it-works .section-title', en: 'Discreet, efficient,<br>and fully online.', pt: 'Discreto, eficiente<br>e totalmente online.', h: true },
        { s: '#how-it-works .section-desc', en: 'Our travel health consultations are designed for convenience without compromising on thoroughness or medical quality.', pt: 'As nossas consultas de saúde de viagem são concebidas para conveniência sem comprometer a rigorosidade ou qualidade médica.' },
        { s: '#how-it-works .process-step:nth-child(1) .step-time', en: 'Step 1', pt: 'Passo 1' },
        { s: '#how-it-works .process-step:nth-child(1) h4', en: 'Share your itinerary', pt: 'Partilhe o seu itinerário' },
        { s: '#how-it-works .process-step:nth-child(1) p', en: 'Destinations, timing, style of travel, and planned activities.', pt: 'Destinos, datas, estilo de viagem e atividades planeadas.' },
        { s: '#how-it-works .process-step:nth-child(2) .step-time', en: 'Step 2', pt: 'Passo 2' },
        { s: '#how-it-works .process-step:nth-child(2) h4', en: 'Provide your medical background', pt: 'Forneça o seu historial médico' },
        { s: '#how-it-works .process-step:nth-child(2) p', en: 'Relevant medical history, medications, allergies, and vaccination records where available.', pt: 'Historial médico relevante, medicamentos, alergias e registos de vacinação quando disponíveis.' },
        { s: '#how-it-works .process-step:nth-child(3) .step-time', en: 'Step 3', pt: 'Passo 3' },
        { s: '#how-it-works .process-step:nth-child(3) h4', en: 'Private video consultation', pt: 'Consulta privada por vídeo' },
        { s: '#how-it-works .process-step:nth-child(3) p', en: 'A focused discussion with a physician trained in travel and preventive medicine.', pt: 'Uma discussão focada com um médico formado em medicina de viagem e preventiva.' },
        { s: '#how-it-works .process-step:nth-child(4) .step-time', en: 'Step 4', pt: 'Passo 4' },
        { s: '#how-it-works .process-step:nth-child(4) h4', en: 'Your personalized travel health plan', pt: 'O seu plano de saúde de viagem personalizado' },
        { s: '#how-it-works .process-step:nth-child(4) p', en: 'Clear written guidance, vaccine recommendations, and prescriptions when appropriate and permitted.', pt: 'Orientação escrita clara, recomendações de vacinas e prescrições quando adequado e permitido.' },
        { s: '#how-it-works .process-note span', en: 'Whenever possible, consultations should take place 4–8 weeks prior to departure to allow time for vaccinations and preventive measures.', pt: 'Sempre que possível, as consultas devem realizar-se 4–8 semanas antes da partida para permitir tempo para vacinações e medidas preventivas.' },

        /* ── Vaccines (#vaccines) ── */
        { s: '#vaccines .section-label', en: 'Vaccination guidance', pt: 'Orientação sobre vacinação' },
        { s: '#vaccines .section-title', en: 'Clear, evidence-based<br>vaccine recommendations.', pt: 'Recomendações de vacinas<br>claras e baseadas em evidências.', h: true },
        { s: '#vaccines .section-desc', en: 'Vaccine decisions are individualized and based on destination-specific risk, duration of stay, planned activities, and your personal medical profile.', pt: 'As decisões sobre vacinas são individualizadas e baseadas no risco específico do destino, duração da estadia, atividades planeadas e o seu perfil médico pessoal.' },
        { s: '#vaccines .vaccine-card:nth-child(1) h3', en: 'Routine Adult Protection', pt: 'Proteção de Rotina para Adultos' },
        { s: '#vaccines .vaccine-card:nth-child(1) p', en: 'Which immunizations are part of standard adult health maintenance and may need updating.', pt: 'Quais imunizações fazem parte da manutenção padrão da saúde do adulto e podem precisar de atualização.' },
        { s: '#vaccines .vaccine-card:nth-child(2) h3', en: 'Itinerary-Specific Vaccines', pt: 'Vacinas Específicas do Itinerário' },
        { s: '#vaccines .vaccine-card:nth-child(2) p', en: 'Which immunizations are recommended for your specific destinations and travel activities.', pt: 'Quais imunizações são recomendadas para os seus destinos específicos e atividades de viagem.' },
        { s: '#vaccines .vaccine-card:nth-child(3) h3', en: 'Entry Requirements', pt: 'Requisitos de Entrada' },
        { s: '#vaccines .vaccine-card:nth-child(3) p', en: 'Which immunizations may be required for entry into certain countries, including documentation guidance.', pt: 'Quais imunizações podem ser exigidas para entrada em determinados países, incluindo orientação sobre documentação.' },
        { s: '#vaccines .vaccine-card:nth-child(4) h3', en: 'Local Vaccination Arrangement', pt: 'Organização de Vacinação Local' },
        { s: '#vaccines .vaccine-card:nth-child(4) p', en: 'If in-person vaccination is indicated, we guide you on arranging this safely and efficiently in your location.', pt: 'Se a vacinação presencial for indicada, orientamos sobre como organizá-la de forma segura e eficiente na sua localização.' },

        /* ── Travel Style (#travel-style) ── */
        { s: '#travel-style .section-label', en: 'Tailored to you', pt: 'Adaptado a si' },
        { s: '#travel-style .section-title', en: 'Travel medicine for every type<br>of international traveler.', pt: 'Medicina de viagem para todo o tipo<br>de viajante internacional.', h: true },
        { s: '#travel-style .travel-style-card:nth-child(1) h3', en: 'Leisure & Luxury Travel', pt: 'Viagem de Lazer e Luxo' },
        { s: '#travel-style .travel-style-card:nth-child(1) p', en: 'Resort stays, cruises, and urban destinations with tailored health preparation for relaxed travel.', pt: 'Estadas em resorts, cruzeiros e destinos urbanos com preparação de saúde adaptada para viagens relaxadas.' },
        { s: '#travel-style .travel-style-card:nth-child(2) h3', en: 'Adventure & Remote Travel', pt: 'Viagem de Aventura e Remota' },
        { s: '#travel-style .travel-style-card:nth-child(2) p', en: 'Trekking, safari, rural regions, and expedition-style trips requiring thorough medical preparation.', pt: 'Trekking, safari, regiões rurais e viagens de estilo expedição que requerem preparação médica rigorosa.' },
        { s: '#travel-style .travel-style-card:nth-child(3) h3', en: 'Frequent Business Travel', pt: 'Viagens de Negócios Frequentes' },
        { s: '#travel-style .travel-style-card:nth-child(3) p', en: 'Ongoing support for professionals traveling across multiple regions with efficient, repeated consultation options.', pt: 'Apoio contínuo para profissionais que viajam por várias regiões com opções de consulta eficientes e recorrentes.' },
        { s: '#travel-style .travel-style-card:nth-child(4) h3', en: 'Extended Stays & Relocation', pt: 'Estadias Prolongadas e Relocalização' },
        { s: '#travel-style .travel-style-card:nth-child(4) p', en: 'Planning for long-term travel, second residences, or temporary relocation with comprehensive health strategy.', pt: 'Planeamento para viagens de longo prazo, segundas residências ou relocalização temporária com estratégia de saúde abrangente.' },
        { s: '#travel-style .travel-style-card:nth-child(5) h3', en: 'Travel with Medical Conditions', pt: 'Viajar com Condições Médicas' },
        { s: '#travel-style .travel-style-card:nth-child(5) p', en: 'Specialized preparation for travelers with existing health concerns requiring careful medical planning.', pt: 'Preparação especializada para viajantes com preocupações de saúde existentes que requerem planeamento médico cuidadoso.' },

        /* ── Doctor (#team) ── */
        { s: '#team .section-label', en: 'Your medical team', pt: 'A sua equipa médica' },
        { s: '#team .section-title', en: 'Experienced physicians in travel and preventive medicine.', pt: 'Médicos experientes em medicina de viagem e preventiva.' },
        { s: '#team .section-desc', en: 'Our doctors provide careful, up-to-date guidance grounded in international travel health standards. Every consultation is personalized, thorough, and designed to support safe travel without unnecessary interventions.', pt: 'Os nossos médicos fornecem orientação cuidadosa e atualizada fundamentada nos padrões internacionais de saúde de viagem. Cada consulta é personalizada, rigorosa e concebida para apoiar viagens seguras sem intervenções desnecessárias.' },
        { s: '#team .doctor-list li:nth-child(1) span', en: 'Licensed physicians', pt: 'Médicos licenciados' },
        { s: '#team .doctor-list li:nth-child(2) span', en: 'Evidence-based international travel guidance', pt: 'Orientação internacional de viagem baseada em evidências' },
        { s: '#team .doctor-list li:nth-child(3) span', en: 'Personalized risk assessment', pt: 'Avaliação de risco personalizada' },
        { s: '#team .doctor-list li:nth-child(4) span', en: 'Clear documentation for your records', pt: 'Documentação clara para os seus registos' },

        /* ── FAQ (#faq) ── */
        { s: '#faq .section-label', en: 'Support', pt: 'Suporte' },
        { s: '#faq .section-title', en: 'Frequently asked questions.', pt: 'Perguntas frequentes.' },
        { s: '#faq .faq-item:nth-child(1) .faq-question span', en: 'Are consultations conducted online?', pt: 'As consultas são realizadas online?' },
        { s: '#faq .faq-item:nth-child(1) .faq-answer p', en: 'Yes. All travel consultations take place via secure video. You can connect from anywhere in the world, making it easy to prepare for your trip regardless of your current location.', pt: 'Sim. Todas as consultas de viagem realizam-se por vídeo seguro. Pode conectar-se a partir de qualquer lugar do mundo, facilitando a preparação da sua viagem independentemente da sua localização atual.' },
        { s: '#faq .faq-item:nth-child(2) .faq-question span', en: 'Can prescriptions be provided?', pt: 'Podem ser fornecidas prescrições?' },
        { s: '#faq .faq-item:nth-child(2) .faq-answer p', en: 'When medically appropriate and legally permitted, we can provide prescriptions related to travel health prevention or treatment, including malaria prophylaxis and standby treatments.', pt: 'Quando medicamente adequado e legalmente permitido, podemos fornecer prescrições relacionadas com a prevenção ou tratamento de saúde de viagem, incluindo profilaxia de malária e tratamentos de reserva.' },
        { s: '#faq .faq-item:nth-child(3) .faq-question span', en: 'Do you administer vaccines directly?', pt: 'Administram vacinas diretamente?' },
        { s: '#faq .faq-item:nth-child(3) .faq-answer p', en: 'We provide medical recommendations and documentation. If vaccines are indicated, we guide you in arranging them locally through trusted providers in your area.', pt: 'Fornecemos recomendações médicas e documentação. Se as vacinas forem indicadas, orientamos na sua organização local através de prestadores de confiança na sua área.' },
        { s: '#faq .faq-item:nth-child(4) .faq-question span', en: 'How far in advance should I book?', pt: 'Com quanta antecedência devo marcar?' },
        { s: '#faq .faq-item:nth-child(4) .faq-answer p', en: 'Ideally 4–8 weeks before departure to allow adequate time for vaccinations and preventive measures. However, we can still assist with shorter timelines and provide valuable guidance even close to your departure date.', pt: 'Idealmente 4–8 semanas antes da partida para permitir tempo adequado para vacinações e medidas preventivas. No entanto, podemos assistir com prazos mais curtos e fornecer orientação valiosa mesmo próximo da data de partida.' },
        { s: '#faq .faq-item:nth-child(5) .faq-question span', en: 'Can you advise travelers with existing medical conditions?', pt: 'Podem aconselhar viajantes com condições médicas existentes?' },
        { s: '#faq .faq-item:nth-child(5) .faq-answer p', en: 'Yes. We provide tailored planning to help reduce risk while traveling with ongoing health concerns, including cardiovascular, respiratory, metabolic, and other chronic conditions.', pt: 'Sim. Fornecemos planeamento personalizado para ajudar a reduzir riscos ao viajar com preocupações de saúde contínuas, incluindo condições cardiovasculares, respiratórias, metabólicas e outras crónicas.' },

        /* ── Longevity Bridge (#longevity-bridge) ── */
        { s: '#longevity-bridge .travel-title', en: 'Thinking beyond this trip?', pt: 'A pensar para além desta viagem?' },
        { s: '#longevity-bridge .travel-desc', en: 'Our clinic also provides in-depth longevity and preventive health assessments focused on long-term wellbeing and healthy aging.', pt: 'A nossa clínica também oferece avaliações aprofundadas de longevidade e saúde preventiva focadas no bem-estar a longo prazo e envelhecimento saudável.' },
        { s: '#longevity-bridge .btn', en: 'Explore our Longevity Clinic →', pt: 'Explore a nossa Clínica de Longevidade →' },

        /* ── CTA (#book) ── */
        { s: '#book .cta-title', en: 'Travel with clarity<br>and confidence.', pt: 'Viaje com clareza<br>e confiança.', h: true },
        { s: '#book .cta-desc', en: 'Receive personalized, physician-led travel health guidance tailored to your journey and medical profile.', pt: 'Receba orientação de saúde de viagem personalizada, liderada por médicos, adaptada à sua jornada e perfil médico.' },
        { s: '#book .cta-content > .btn', en: 'Book your private travel consultation', pt: 'Marque a sua consulta privada de viagem' },
        { s: '#book .cta-travel-link', en: 'Looking for long-term preventive care? Visit our Longevity Clinic →', pt: 'Procura cuidados preventivos a longo prazo? Visite a nossa Clínica de Longevidade →' },

        /* ── Footer (travel-specific) ── */
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(2)', en: 'About', pt: 'Sobre' },
        { s: '.footer-columns .footer-links:nth-child(1) a[href="/#team"]', en: 'Medical Team', pt: 'Equipa Médica' },
        { s: '.footer-links a[href="/"]', en: 'Longevity Clinic', pt: 'Clínica de Longevidade' },
        { s: '.footer-links a[href="#book"]', en: 'Travel Consultation', pt: 'Consulta de Viagem' },
        { s: '.footer-links a[href="#how-it-works"]', en: 'How It Works', pt: 'Como Funciona' },
        { s: '.footer-links a[href="#vaccines"]', en: 'Vaccinations', pt: 'Vacinações' },
    ];

    /* ═══════════════════════════
       BOOK PAGE
    ═══════════════════════════ */
    const BOOK = [
        /* ── Title ── */
        { s: 'title', en: 'Book Your Consultation — Longevity Clinic', pt: 'Marcar Consulta — Clínica de Longevidade', special: 'title' },

        /* ── Progress Steps ── */
        { s: '.progress-step[data-step="1"] .progress-label', en: 'Schedule', pt: 'Agendar' },
        { s: '.progress-step[data-step="2"] .progress-label', en: 'Details', pt: 'Dados' },
        { s: '.progress-step[data-step="3"] .progress-label', en: 'Payment', pt: 'Pagamento' },
        { s: '.progress-step[data-step="4"] .progress-label', en: 'Confirmed', pt: 'Confirmado' },

        /* ── Step 1: Schedule ── */
        { s: '#step-1 .step-title', en: 'Choose date & time', pt: 'Escolha data e hora' },
        { s: '#step-1 .step-desc', en: 'Select a convenient time for your video consultation.', pt: 'Selecione um horário conveniente para a sua consulta por vídeo.' },
        { s: '.timezone-info span', en: 'Times shown in your local timezone', pt: 'Horários apresentados no seu fuso horário local' },
        { s: '#back-1', en: 'Back', pt: 'Voltar' },
        { s: '#next-1', en: 'Continue to details', pt: 'Continuar para dados' },

        /* ── Step 2: Details ── */
        { s: '#step-2 .step-title', en: 'Your details', pt: 'Os seus dados' },
        { s: '#step-2 .step-desc', en: 'Please provide your information so we can prepare for your consultation.', pt: 'Por favor forneça as suas informações para que possamos preparar a sua consulta.' },
        { s: 'label[for="firstName"]', en: 'First name *', pt: 'Primeiro nome *' },
        { s: '#firstName', a: 'placeholder', en: 'John', pt: 'João' },
        { s: '#firstName ~ .form-error', en: 'Please enter your first name', pt: 'Por favor introduza o seu primeiro nome' },
        { s: 'label[for="lastName"]', en: 'Last name *', pt: 'Apelido *' },
        { s: '#lastName', a: 'placeholder', en: 'Doe', pt: 'Silva' },
        { s: '#lastName ~ .form-error', en: 'Please enter your last name', pt: 'Por favor introduza o seu apelido' },
        { s: 'label[for="email"]', en: 'Email address *', pt: 'Endereço de email *' },
        { s: '#email', a: 'placeholder', en: 'john@example.com', pt: 'joao@exemplo.com' },
        { s: '#email ~ .form-error', en: 'Please enter a valid email address', pt: 'Por favor introduza um endereço de email válido' },
        { s: 'label[for="phone"]', en: 'Phone number *', pt: 'Número de telefone *' },
        { s: '#phone', a: 'placeholder', en: '+351 928 372 775', pt: '+351 928 372 775' },
        { s: '#phone ~ .form-error', en: 'Please enter your phone number', pt: 'Por favor introduza o seu número de telefone' },
        { s: 'label[for="dob"]', en: 'Date of birth *', pt: 'Data de nascimento *' },
        { s: '#dob ~ .form-error', en: 'Please enter your date of birth', pt: 'Por favor introduza a sua data de nascimento' },
        { s: 'label[for="country"]', en: 'Country of residence *', pt: 'País de residência *' },
        { s: '#country option[value=""]', en: 'Select your country', pt: 'Selecione o seu país' },
        { s: '#country ~ .form-error', en: 'Please select your country', pt: 'Por favor selecione o seu país' },
        { s: '.form-section-title', en: 'Health background', pt: 'Historial de saúde' },
        { s: 'label[for="travelDest"]', en: 'Travel destination(s) *', pt: 'Destino(s) de viagem *' },
        { s: '#travelDest', a: 'placeholder', en: 'e.g. Thailand, Kenya, Peru', pt: 'ex. Tailândia, Quénia, Peru' },
        { s: '#travelDest ~ .form-hint', en: 'List all planned destinations for this trip', pt: 'Liste todos os destinos planeados para esta viagem' },
        { s: 'label[for="travelDates"]', en: 'Travel dates', pt: 'Datas de viagem' },
        { s: '#travelDates', a: 'placeholder', en: 'e.g. March 15 – April 2, 2026', pt: 'ex. 15 de Março – 2 de Abril, 2026' },
        { s: 'label[for="concerns"]', en: 'Primary health concerns or goals', pt: 'Principais preocupações de saúde ou objetivos' },
        { s: '#concerns', a: 'placeholder', en: 'Describe what prompted you to book this consultation, any specific concerns, or health goals you\'d like to discuss...', pt: 'Descreva o que o levou a marcar esta consulta, quaisquer preocupações específicas ou objetivos de saúde que gostaria de discutir...' },
        { s: 'label[for="medications"]', en: 'Current medications (if any)', pt: 'Medicação atual (se aplicável)' },
        { s: '#medications', a: 'placeholder', en: 'List any current medications, supplements, or treatments...', pt: 'Liste quaisquer medicamentos, suplementos ou tratamentos atuais...' },
        { s: 'label[for="allergies"]', en: 'Known allergies', pt: 'Alergias conhecidas' },
        { s: '#allergies', a: 'placeholder', en: 'e.g. Penicillin, latex, none', pt: 'ex. Penicilina, látex, nenhuma' },
        { s: '#consent ~ .checkbox-text', en: 'I consent to my health information being securely processed for the purpose of this consultation. <a href="#" style="color: var(--accent);">Privacy Policy</a>', pt: 'Autorizo o tratamento seguro das minhas informações de saúde para efeitos desta consulta. <a href="#" style="color: var(--accent);">Política de Privacidade</a>', h: true },
        { s: '#terms ~ .checkbox-text', en: 'I agree to the <a href="#" style="color: var(--accent);">Terms of Service</a> and understand this is a private medical consultation.', pt: 'Concordo com os <a href="#" style="color: var(--accent);">Termos de Serviço</a> e compreendo que esta é uma consulta médica privada.', h: true },
        { s: '.form-checkbox-group:nth-child(12) .form-error', en: 'You must consent to proceed', pt: 'Deve consentir para prosseguir' },
        { s: '.form-checkbox-group:nth-child(13) .form-error', en: 'You must agree to the terms', pt: 'Deve concordar com os termos' },
        { s: '#back-2', en: 'Back', pt: 'Voltar' },
        { s: '#next-2', en: 'Continue to payment', pt: 'Continuar para pagamento' },

        /* ── Step 3: Review & Pay ── */
        { s: '#step-3 .step-title', en: 'Review & pay', pt: 'Revisão e pagamento' },
        { s: '#step-3 .step-desc', en: 'Review your booking details, then proceed to secure payment via Stripe.', pt: 'Reveja os detalhes da sua marcação e prossiga para pagamento seguro via Stripe.' },
        { s: '.review-card:nth-child(1) .review-card-title', en: 'Appointment details', pt: 'Detalhes da consulta' },
        { s: '.review-row:nth-child(2) .review-label', en: 'Service', pt: 'Serviço' },
        { s: '.review-row:nth-child(3) .review-label', en: 'Date', pt: 'Data' },
        { s: '.review-row:nth-child(4) .review-label', en: 'Time', pt: 'Hora' },
        { s: '.review-row:nth-child(5) .review-label', en: 'Format', pt: 'Formato' },
        { s: '.review-row:nth-child(5) .review-value', en: 'Secure video call', pt: 'Videochamada segura' },
        { s: '.review-card:nth-child(2) .review-card-title', en: 'Patient', pt: 'Paciente' },
        { s: '.stripe-info-text', en: 'You\'ll be redirected to <strong>Stripe</strong> to enter your payment details securely. Card, Apple Pay, and Google Pay accepted.', pt: 'Será redirecionado para o <strong>Stripe</strong> para introduzir os seus dados de pagamento de forma segura. Cartão, Apple Pay e Google Pay aceites.', h: true },
        { s: '.stripe-info-sub', en: 'Stripe is PCI Level 1 certified — the highest level of security in the payments industry.', pt: 'O Stripe tem certificação PCI Nível 1 — o nível mais elevado de segurança na indústria de pagamentos.' },
        { s: '.summary-title', en: 'Booking summary', pt: 'Resumo da marcação' },
        { s: '.summary-note', en: 'Free rescheduling up to 24 hours before your appointment.', pt: 'Reagendamento gratuito até 24 horas antes da consulta.' },
        { s: '#back-3', en: 'Back', pt: 'Voltar' },
        { s: '#next-3', en: 'Proceed to secure payment', pt: 'Prosseguir para pagamento seguro' },
        { s: '.summary-details .summary-row:nth-child(1) .summary-label', en: 'Date', pt: 'Data' },
        { s: '.summary-details .summary-row:nth-child(2) .summary-label', en: 'Time', pt: 'Hora' },
        { s: '.summary-details .summary-row:nth-child(3) .summary-label', en: 'Format', pt: 'Formato' },
        { s: '.summary-details .summary-row:nth-child(3) .summary-value', en: 'Secure video call', pt: 'Videochamada segura' },
        { s: '.summary-details .summary-row:nth-child(4) .summary-label', en: 'Patient', pt: 'Paciente' },
        { s: '.summary-total .summary-label', en: 'Total', pt: 'Total' },

        /* ── Step 4: Confirmation ── */
        { s: '#step-4 .step-title', en: 'Booking confirmed!', pt: 'Marcação confirmada!' },
        { s: '#step-4 .step-desc', en: 'Your consultation has been successfully scheduled. A confirmation email has been sent to <strong id="confirmEmail">your email</strong>.', pt: 'A sua consulta foi agendada com sucesso. Um email de confirmação foi enviado para <strong id="confirmEmail">o seu email</strong>.', h: true },
        { s: '.confirmation-card .confirmation-row:nth-child(1) .confirmation-label', en: 'Service', pt: 'Serviço' },
        { s: '.confirmation-card .confirmation-row:nth-child(2) .confirmation-label', en: 'Date & Time', pt: 'Data e Hora' },
        { s: '.confirmation-card .confirmation-row:nth-child(3) .confirmation-label', en: 'Format', pt: 'Formato' },
        { s: '.confirmation-card .confirmation-row:nth-child(3) .confirmation-value', en: 'Secure video call', pt: 'Videochamada segura' },
        { s: '.confirmation-card .confirmation-row:nth-child(4) .confirmation-label', en: 'Amount paid', pt: 'Valor pago' },
        { s: '.confirmation-card .confirmation-row:nth-child(5) .confirmation-label', en: 'Booking reference', pt: 'Referência da marcação' },
        { s: '.confirmation-next-steps h3', en: 'What happens next', pt: 'Próximos passos' },
        { s: '.next-step-item:nth-child(1) strong', en: 'Check your email', pt: 'Verifique o seu email' },
        { s: '.next-step-item:nth-child(1) p', en: 'You\'ll receive a confirmation with your video link and preparation instructions.', pt: 'Receberá uma confirmação com o link de vídeo e instruções de preparação.' },
        { s: '.next-step-item:nth-child(2) strong', en: 'Prepare for your consultation', pt: 'Prepare-se para a consulta' },
        { s: '.next-step-item:nth-child(2) p', en: 'Have any relevant medical records, test results, or questions ready.', pt: 'Tenha quaisquer registos médicos, resultados de exames ou perguntas relevantes preparados.' },
        { s: '.next-step-item:nth-child(3) strong', en: 'Join your video call', pt: 'Junte-se à videochamada' },
        { s: '.next-step-item:nth-child(3) p', en: 'Click the link in your email at your scheduled time. No software download needed.', pt: 'Clique no link do email à hora agendada. Não é necessário transferir software.' },
        { s: '.confirmation-actions .btn-outline', en: 'Back to homepage', pt: 'Voltar à página inicial' },

        /* ── Footer ── */
        { s: '.footer-bottom > p', en: '\u00A9 2026 Longevity Clinic. All rights reserved.', pt: '\u00A9 2026 Clínica de Longevidade. Todos os direitos reservados.' },
        { s: '.footer-legal a:nth-child(1)', en: 'Privacy Policy', pt: 'Política de Privacidade' },
        { s: '.footer-legal a:nth-child(2)', en: 'Terms of Service', pt: 'Termos de Serviço' },
        { s: '.footer-legal a[href="/"]', en: 'Back to site', pt: 'Voltar ao site' },
    ];

    /* ═══════════════════════════
       COUNTRY NAMES  (book page)
    ═══════════════════════════ */
    const COUNTRIES = {
        US: { en: 'United States', pt: 'Estados Unidos' },
        GB: { en: 'United Kingdom', pt: 'Reino Unido' },
        SE: { en: 'Sweden', pt: 'Suécia' },
        DE: { en: 'Germany', pt: 'Alemanha' },
        FR: { en: 'France', pt: 'França' },
        NL: { en: 'Netherlands', pt: 'Países Baixos' },
        NO: { en: 'Norway', pt: 'Noruega' },
        DK: { en: 'Denmark', pt: 'Dinamarca' },
        FI: { en: 'Finland', pt: 'Finlândia' },
        CH: { en: 'Switzerland', pt: 'Suíça' },
        AT: { en: 'Austria', pt: 'Áustria' },
        BE: { en: 'Belgium', pt: 'Bélgica' },
        ES: { en: 'Spain', pt: 'Espanha' },
        IT: { en: 'Italy', pt: 'Itália' },
        PT: { en: 'Portugal', pt: 'Portugal' },
        IE: { en: 'Ireland', pt: 'Irlanda' },
        CA: { en: 'Canada', pt: 'Canadá' },
        AU: { en: 'Australia', pt: 'Austrália' },
        NZ: { en: 'New Zealand', pt: 'Nova Zelândia' },
        AE: { en: 'United Arab Emirates', pt: 'Emirados Árabes Unidos' },
        SG: { en: 'Singapore', pt: 'Singapura' },
        HK: { en: 'Hong Kong', pt: 'Hong Kong' },
        JP: { en: 'Japan', pt: 'Japão' },
        OTHER: { en: 'Other', pt: 'Outro' },
    };

    /* ═══════════════════════════
       PARTICLE WAVE LABELS
    ═══════════════════════════ */
    const WAVE_LABELS = {
        index: {
            en: [
                { text: 'CARDIOVASCULAR HEALTH', gridX: 0.18, gridY: 0.28 },
                { text: 'IMMUNE SYSTEM', gridX: 0.42, gridY: 0.22 },
                { text: 'SKIN MAPPING', gridX: 0.82, gridY: 0.12 },
                { text: 'METABOLIC MARKERS', gridX: 0.28, gridY: 0.55 },
                { text: 'BLOOD VESSELS', gridX: 0.72, gridY: 0.38 },
                { text: 'PERIPHERAL ARTERIES', gridX: 0.60, gridY: 0.62 },
                { text: 'HORMONAL BALANCE', gridX: 0.15, gridY: 0.72 },
                { text: 'CELLULAR AGING', gridX: 0.88, gridY: 0.55 },
                { text: 'COGNITIVE FUNCTION', gridX: 0.50, gridY: 0.15 },
                { text: 'BONE DENSITY', gridX: 0.35, gridY: 0.78 },
                { text: 'INFLAMMATION', gridX: 0.75, gridY: 0.75 },
                { text: 'OXYGENATION', gridX: 0.10, gridY: 0.45 },
            ],
            pt: [
                { text: 'SAÚDE CARDIOVASCULAR', gridX: 0.18, gridY: 0.28 },
                { text: 'SISTEMA IMUNITÁRIO', gridX: 0.42, gridY: 0.22 },
                { text: 'MAPEAMENTO CUTÂNEO', gridX: 0.82, gridY: 0.12 },
                { text: 'MARCADORES METABÓLICOS', gridX: 0.28, gridY: 0.55 },
                { text: 'VASOS SANGUÍNEOS', gridX: 0.72, gridY: 0.38 },
                { text: 'ARTÉRIAS PERIFÉRICAS', gridX: 0.60, gridY: 0.62 },
                { text: 'EQUILÍBRIO HORMONAL', gridX: 0.15, gridY: 0.72 },
                { text: 'ENVELHECIMENTO CELULAR', gridX: 0.88, gridY: 0.55 },
                { text: 'FUNÇÃO COGNITIVA', gridX: 0.50, gridY: 0.15 },
                { text: 'DENSIDADE ÓSSEA', gridX: 0.35, gridY: 0.78 },
                { text: 'INFLAMAÇÃO', gridX: 0.75, gridY: 0.75 },
                { text: 'OXIGENAÇÃO', gridX: 0.10, gridY: 0.45 },
            ],
        },
        travel: {
            en: [
                { text: 'MALARIA PREVENTION', gridX: 0.18, gridY: 0.28 },
                { text: 'TRAVEL VACCINES', gridX: 0.42, gridY: 0.20 },
                { text: 'ALTITUDE MEDICINE', gridX: 0.82, gridY: 0.14 },
                { text: 'FOOD SAFETY', gridX: 0.28, gridY: 0.55 },
                { text: 'WATER-BORNE DISEASE', gridX: 0.72, gridY: 0.38 },
                { text: 'INSECT-BORNE ILLNESS', gridX: 0.58, gridY: 0.62 },
                { text: 'JET LAG MANAGEMENT', gridX: 0.12, gridY: 0.70 },
                { text: 'SUN EXPOSURE', gridX: 0.88, gridY: 0.55 },
                { text: 'TRAVEL MEDICATIONS', gridX: 0.50, gridY: 0.15 },
                { text: 'CHRONIC CONDITION CARE', gridX: 0.35, gridY: 0.78 },
                { text: 'DESTINATION RISK', gridX: 0.75, gridY: 0.75 },
                { text: 'MEDICAL KIT', gridX: 0.10, gridY: 0.45 },
            ],
            pt: [
                { text: 'PREVENÇÃO DE MALÁRIA', gridX: 0.18, gridY: 0.28 },
                { text: 'VACINAS DE VIAGEM', gridX: 0.42, gridY: 0.20 },
                { text: 'MEDICINA DE ALTITUDE', gridX: 0.82, gridY: 0.14 },
                { text: 'SEGURANÇA ALIMENTAR', gridX: 0.28, gridY: 0.55 },
                { text: 'DOENÇAS HÍDRICAS', gridX: 0.72, gridY: 0.38 },
                { text: 'DOENÇAS POR INSETOS', gridX: 0.58, gridY: 0.62 },
                { text: 'GESTÃO DE JET LAG', gridX: 0.12, gridY: 0.70 },
                { text: 'EXPOSIÇÃO SOLAR', gridX: 0.88, gridY: 0.55 },
                { text: 'MEDICAÇÃO DE VIAGEM', gridX: 0.50, gridY: 0.15 },
                { text: 'CONDIÇÕES CRÓNICAS', gridX: 0.35, gridY: 0.78 },
                { text: 'RISCO DO DESTINO', gridX: 0.75, gridY: 0.75 },
                { text: 'KIT MÉDICO', gridX: 0.10, gridY: 0.45 },
            ],
        },
    };

    /* ═══════════════════════════
       CALENDAR / BOOKING STRINGS
    ═══════════════════════════ */
    const BOOKING_STRINGS = {
        en: {
            months: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'],
            weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            selectDateFirst: 'Select a date first',
            pickDate: 'Please pick a date from the calendar.',
            noSlots: 'No available slots on this date. Please try another day.',
            urgentContactHint:
                'Urgent or need a time that is not listed? Contact us at info@lonclinic.com or (+351) 928 372 775.',
            videoCall: 'Video call',
            secureVideoCall: 'Secure video call',
            services: {
                clinica_geral: 'General Medicine / Check-Up',
                urgente: 'Urgent Medical Consultation (Adults)',
                travel: 'Travel Medicine Consultation',
                saude_mental: 'Adult Mental Health Consultation',
                renovacao: 'Medical Treatment Renewal',
                longevidade: 'Longevity & Preventive Health Consultation',
            },
        },
        pt: {
            months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            selectDateFirst: 'Selecione uma data primeiro',
            pickDate: 'Por favor escolha uma data no calendário.',
            noSlots: 'Sem horários disponíveis nesta data. Tente outro dia.',
            urgentContactHint:
                'Precisa com urgência ou de um horário que não está listado? Contacte-nos em info@lonclinic.com ou (+351) 928 372 775.',
            videoCall: 'Videochamada',
            secureVideoCall: 'Videochamada segura',
            services: {
                clinica_geral: 'Consulta Clínica Geral / Check Up',
                urgente: 'Consulta Médica Urgente (Adultos)',
                travel: 'Consulta do Viajante',
                saude_mental: 'Consulta de Saúde Mental Adultos',
                renovacao: 'Renovação de Tratamento Médico',
                longevidade: 'Consulta de Longevidade e Saúde Preventiva',
            },
        },
        es: {
            months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            weekdays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            selectDateFirst: 'Seleccione primero una fecha',
            pickDate: 'Elija una fecha en el calendario.',
            noSlots: 'No hay horarios disponibles en esta fecha. Pruebe otro día.',
            urgentContactHint:
                '¿Urgente o necesita un horario que no aparece? Escríbanos a info@lonclinic.com o llame al (+351) 928 372 775.',
            videoCall: 'Videollamada',
            secureVideoCall: 'Videollamada segura',
            services: {
                clinica_geral: 'Consulta de medicina general / chequeo',
                urgente: 'Consulta médica urgente (adultos)',
                travel: 'Consulta de medicina del viajero',
                saude_mental: 'Consulta de salud mental (adultos)',
                renovacao: 'Renovación de tratamiento médico',
                longevidade: 'Consulta de longevidad y salud preventiva',
            },
        },
    };

    /* ══════════════════════════════════════════
       CORE FUNCTIONS
    ══════════════════════════════════════════ */

    /** Gather all translation entries for the current page */
    function getEntries() {
        const map = { index: INDEX, travel: TRAVEL, book: BOOK };
        const pageEntries = map[PAGE] || [];
        // Common footer entries (skip on book page which has its own footer)
        const commonEntries = (PAGE !== 'book') ? COMMON : [];
        const lonNav = document.getElementById('lonNav') ? LON_NAV : [];
        return [...lonNav, ...pageEntries, ...commonEntries];
    }

    /** Apply a single translation entry */
    function applyEntry(entry, lang) {
        if (entry.special === 'title') {
            document.title = entry[lang] || entry.en;
            return;
        }

        const els = document.querySelectorAll(entry.s);
        if (!els.length) return;

        const value = entry[lang] || entry.en;

        els.forEach(el => {
            if (entry.a) {
                // Attribute (placeholder, title, etc.)
                el.setAttribute(entry.a, value);
            } else if (entry.h) {
                // innerHTML
                el.innerHTML = value;
            } else {
                // textContent
                el.textContent = value;
            }
        });
    }

    /** Apply all translations for a given language */
    function applyAll(lang) {
        const entries = getEntries();
        entries.forEach(entry => applyEntry(entry, lang));

        // Country names on book page
        if (PAGE === 'book') {
            const countrySelect = document.getElementById('country');
            if (countrySelect) {
                Object.entries(COUNTRIES).forEach(([code, names]) => {
                    const opt = countrySelect.querySelector(`option[value="${code}"]`);
                    if (opt) opt.textContent = names[lang] || names.pt || names.en;
                });
            }

            // Calendar weekday headers
            const weekdaySpans = document.querySelectorAll('.calendar-weekdays span');
            const wdays = (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).weekdays;
            weekdaySpans.forEach((span, i) => {
                if (wdays[i]) span.textContent = wdays[i];
            });

            // Timeslot heading — reset label when switching language if still on placeholder
            const timeslotHeading = document.getElementById('timeslotHeading');
            if (timeslotHeading) {
                const placeholderTexts = ['en', 'pt', 'es'].map((k) => BOOKING_STRINGS[k].selectDateFirst);
                if (placeholderTexts.includes(timeslotHeading.textContent.trim())) {
                    timeslotHeading.textContent = (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).selectDateFirst;
                }
            }

            // Timeslot empty message
            const timeslotEmpty = document.querySelector('.timeslot-empty');
            if (timeslotEmpty) {
                timeslotEmpty.textContent = (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).pickDate;
            }

            const urgentHint = document.getElementById('timeslotUrgentHint');
            if (urgentHint && !urgentHint.hidden) {
                urgentHint.textContent =
                    (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).urgentContactHint;
            }
        }

        // Update <html lang>
        document.documentElement.lang = lang === 'pt' ? 'pt-PT' : lang === 'es' ? 'es' : 'en';

        const bookingLocaleInput = document.getElementById('bookingLocale');
        if (bookingLocaleInput) bookingLocaleInput.value = lang;
    }

    /** Set language and persist */
    function setLang(lang) {
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        applyAll(lang);
        updateToggleUI(lang);

        // Notify particle wave
        if (window.PARTICLE_WAVE_REINIT) {
            const labels = WAVE_LABELS[PAGE];
            if (labels) {
                window.PARTICLE_WAVE_LABELS = labels[lang] || labels.en;
                window.PARTICLE_WAVE_REINIT();
            }
        }

        // Notify booking.js
        if (window.BOOKING_LANG_CHANGED) {
            window.BOOKING_LANG_CHANGED(lang);
        }
    }

    /* ══════════════════════════════════════════
       TOGGLE UI  — injected into the DOM
    ══════════════════════════════════════════ */
    function bindLangToggleClick(el) {
        el.addEventListener('click', (e) => {
            const btn = e.target.closest('.lang-btn');
            if (!btn) return;
            const lang = btn.dataset.lang;
            if (lang && lang !== currentLang) setLang(lang);
        });
    }

    function createToggle() {
        const toggle = document.createElement('div');
        toggle.className = 'lang-toggle';
        toggle.innerHTML = `
            <button type="button" class="lang-btn${currentLang === 'en' ? ' active' : ''}" data-lang="en">EN</button>
            <span class="lang-sep">|</span>
            <button type="button" class="lang-btn${currentLang === 'pt' ? ' active' : ''}" data-lang="pt">PT</button>
            <span class="lang-sep">|</span>
            <button type="button" class="lang-btn${currentLang === 'es' ? ' active' : ''}" data-lang="es">ES</button>
        `;

        bindLangToggleClick(toggle);

        // Desktop: classic navbar or Lon header (book, index, travel, …)
        const navActions = document.querySelector('.nav-actions');
        const lonNavActions = document.querySelector('.lon-nav-actions');
        if (navActions) {
            navActions.insertBefore(toggle, navActions.firstChild);
        } else if (lonNavActions) {
            lonNavActions.insertBefore(toggle, lonNavActions.firstChild);
        }

        // Mobile menu (classic site)
        const mobileContent = document.querySelector('.mobile-menu-content');
        if (mobileContent) {
            const mobileToggle = toggle.cloneNode(true);
            mobileToggle.className = 'lang-toggle lang-toggle-mobile';
            bindLangToggleClick(mobileToggle);
            mobileContent.insertBefore(mobileToggle, mobileContent.firstChild);
        }

        // Lon mobile drawer (book, index, travel, …)
        const lonMobileMenu = document.getElementById('lonMobileMenu');
        if (lonMobileMenu && !mobileContent) {
            const lonMobileToggle = toggle.cloneNode(true);
            lonMobileToggle.className = 'lang-toggle lang-toggle-mobile';
            bindLangToggleClick(lonMobileToggle);
            lonMobileMenu.insertBefore(lonMobileToggle, lonMobileMenu.firstChild);
        }
    }

    function updateToggleUI(lang) {
        document.querySelectorAll('.lang-toggle .lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    }

    /* ══════════════════════════════════════════
       GLOBAL API  — for other scripts
    ══════════════════════════════════════════ */
    window.CLINIC_I18N = {
        getLang: () => currentLang,
        getMonthNames: () => (BOOKING_STRINGS[currentLang] || BOOKING_STRINGS.en).months,
        getWeekdayNames: () => (BOOKING_STRINGS[currentLang] || BOOKING_STRINGS.en).weekdays,
        getBookingString: (key) => (BOOKING_STRINGS[currentLang] || BOOKING_STRINGS.en)[key],
        getServiceLabel: (key) => (BOOKING_STRINGS[currentLang] || BOOKING_STRINGS.en).services[key],
        getWaveLabels: () => {
            const labels = WAVE_LABELS[PAGE];
            return labels ? (labels[currentLang] || labels.en) : null;
        },
    };

    /* ══════════════════════════════════════════
       INIT
    ══════════════════════════════════════════ */
    function init() {
        // Set particle wave labels before particle-wave.js runs
        const labels = WAVE_LABELS[PAGE];
        if (labels) {
            window.PARTICLE_WAVE_LABELS = labels[currentLang] || labels.en;
        }

        createToggle();

        // Apply translations if not English
        if (currentLang !== 'en') {
            applyAll(currentLang);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
