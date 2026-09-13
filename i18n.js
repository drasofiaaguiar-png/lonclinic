/* ========================================
   i18n — English / Portuguese / Spanish
   Selector-based: no HTML attributes needed
======================================== */
(function () {
    'use strict';

    const STORAGE_KEY = 'clinic_lang';
    function langFromUrl() {
        try {
            const q = new URLSearchParams(window.location.search).get('lang');
            if (q && ['en', 'pt', 'es'].includes(q)) return q;
        } catch (e) { /* ignore */ }
        return null;
    }
    const urlLang = langFromUrl();
    let currentLang = urlLang || localStorage.getItem(STORAGE_KEY) || 'pt';
    if (urlLang) {
        try { localStorage.setItem(STORAGE_KEY, urlLang); } catch (e) { /* ignore */ }
    }

    /* ── Page detection ── */
    function detectPage() {
        const p = window.location.pathname.toLowerCase();
        if (p.includes('/marcar')) return 'marcar';
        if (p.includes('book.html') || p.includes('book-consultation') || /\/book(\/|$)/.test(p)) return 'book';
        if (p.includes('info.html') || p.includes('/info')) return 'info';
        if (p.includes('travel') && !p.includes('/blog') && !p.includes('/consulta/')) return 'travel';
        if (/^\/(blog|magazine|consulta\/|nutricao\/|burnout\/|consultas)(\/|$)?/.test(p) || /^\/consulta\//.test(p)) {
            return 'content';
        }
        try {
            const b = document.body;
            if (b && (b.classList.contains('mag-body') || b.classList.contains('cq-body') || b.classList.contains('qx-body') || b.classList.contains('guide-body') || b.classList.contains('bo-body') || b.classList.contains('nu-body'))) {
                return 'content';
            }
        } catch (e) { /* ignore */ }
        return 'index';
    }
    const PAGE = detectPage();

    /* ══════════════════════════════════════════
       TRANSLATIONS  — { s: selector, en, pt, es }
       h:true → use innerHTML instead of textContent
       a:'attr' → set attribute
    ══════════════════════════════════════════ */

    /* ── Shared lon-nav (travel, book, marcar, info — all use /#... links) ── */
    const LON_NAV = [
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"], .lon-nav-links a[href="#servicos"], .lon-mobile-menu a[href="#servicos"]', en: 'Consultations', pt: 'Consultas', es: 'Consultas' },
        { s: '.lon-nav-links a[href="/consulta"], .lon-mobile-menu a[href="/consulta"]', en: 'Specialties', pt: 'Especialidades', es: 'Especialidades' },
        { s: '.lon-nav-links a[href="/burnout"], .lon-mobile-menu a[href="/burnout"]', en: 'Burnout', pt: 'Burnout', es: 'Burnout' },
        { s: '.lon-nav-links a[href="/magazine"], .lon-mobile-menu a[href="/magazine"]', en: 'Magazine', pt: 'Magazine', es: 'Magazine' },
        { s: '.lon-nav-links a[href="/#equipa"], .lon-mobile-menu a[href="/#equipa"], .lon-nav-links a[href="#equipa"], .lon-mobile-menu a[href="#equipa"]', en: 'The team', pt: 'A Equipa', es: 'El equipo' },
        { s: '.lon-nav-actions > a.lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions > a.lon-btn-primary[href="/marcar/clinica-geral"]:not([data-talk-cta])', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },
        { s: '.lon-mobile-menu a[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-skip', en: 'Skip to content', pt: 'Saltar para o conteúdo', es: 'Saltar al contenido' },
        { s: '.lon-wa-float', en: 'WhatsApp', pt: 'WhatsApp', es: 'WhatsApp' },
        { s: '.lon-wa-float', a: 'aria-label', en: 'Chat on WhatsApp', pt: 'Falar por WhatsApp', es: 'Hablar por WhatsApp' },
    ];

    /* ── Shared footer / legal (longevity/travel pages) ── */
    const COMMON = [
        { s: '.footer-support-title', en: 'Get Support', pt: 'Obtenha Suporte', es: 'Obtener Apoyo' },
        { s: '.footer-columns .footer-links:nth-child(1) h4', en: 'Company', pt: 'Empresa', es: 'Empresa' },
        { s: '.footer-columns .footer-links:nth-child(2) h4', en: 'Members', pt: 'Membros', es: 'Miembros' },
        { s: '.footer-columns .footer-links:nth-child(3) h4', en: 'Follow', pt: 'Seguir', es: 'Seguir' },
        { s: '.footer-columns .footer-links:nth-child(4) h4', en: 'Services', pt: 'Serviços', es: 'Servicios' },
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(3)', en: 'Careers', pt: 'Carreiras', es: 'Empleo' },
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(4)', en: 'Press Room', pt: 'Imprensa', es: 'Prensa' },
        { s: '.footer-columns .footer-links:nth-child(2) a:nth-child(2)', en: 'Log In', pt: 'Iniciar Sessão', es: 'Iniciar sesión' },
        { s: '.footer-bottom-left > p', en: '\u00A9 2026 Longevity Clinic', pt: '\u00A9 2026 Clínica de Longevidade', es: '\u00A9 2026 Clínica de Longevidad' },
        { s: '.footer-bottom-left a:nth-child(3)', en: 'Cookie Notice', pt: 'Aviso de Cookies', es: 'Aviso de Cookies' },
        { s: '.footer-bottom-left a:nth-child(4)', en: 'Privacy Policy', pt: 'Política de Privacidade', es: 'Política de Privacidad' },
        { s: '.footer-bottom-left a:nth-child(5)', en: 'Terms of Service', pt: 'Termos de Serviço', es: 'Términos de Servicio' },
        { s: '.footer-locale > span:first-of-type', en: 'Portugal', pt: 'Portugal', es: 'Portugal' },
        { s: '.footer-address', en: 'Lisbon, Portugal', pt: 'Lisboa, Portugal', es: 'Lisboa, Portugal' },
    ];

    /* ═══════════════════════════
       INDEX PAGE  (Lon Clinic telemedicine homepage)
    ═══════════════════════════ */
    const INDEX = [
        { s: 'title', en: 'Your online health clinic | Lon Clinic', pt: 'A sua clínica de saúde, online | Lon Clinic', es: 'Su clínica de salud, online | Lon Clinic', special: 'title' },

        /* ── Nav ── */
        { s: '.lon-nav-links a[href="#servicos"], .lon-mobile-menu a[href="#servicos"], .lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Consultations', pt: 'Consultas', es: 'Consultas' },
        { s: '.lon-nav-links a[href="/consulta"], .lon-mobile-menu a[href="/consulta"]', en: 'Specialties', pt: 'Especialidades', es: 'Especialidades' },
        { s: '.lon-nav-links a[href="/burnout"], .lon-mobile-menu a[href="/burnout"]', en: 'Burnout', pt: 'Burnout', es: 'Burnout' },
        { s: '.lon-nav-links a[href="/magazine"], .lon-mobile-menu a[href="/magazine"]', en: 'Magazine', pt: 'Magazine', es: 'Magazine' },
        { s: '.lon-nav-links a[href="#equipa"], .lon-mobile-menu a[href="#equipa"], .lon-nav-links a[href="/#equipa"], .lon-mobile-menu a[href="/#equipa"]', en: 'The team', pt: 'A Equipa', es: 'El equipo' },
        { s: '.lon-nav-actions .lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions .lon-btn-primary[href="/marcar/clinica-geral"]:not([data-talk-cta])', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },

        /* ── Hero ── */
        { s: '.dr-badge', en: '<span class="dr-badge-dot" aria-hidden="true"></span>Your online health clinic.', pt: '<span class="dr-badge-dot" aria-hidden="true"></span>A sua clínica de saúde, online.', es: '<span class="dr-badge-dot" aria-hidden="true"></span>Su clínica de salud, online.', h: true },
        { s: '.lon-home .dr-hero-title-line', en: 'Medical, Psychology and Nutrition consultations.', pt: 'Consultas Médicas, de Psicologia e de Nutrição.', es: 'Consultas Médicas, de Psicología y de Nutrición.' },
        { s: '.lon-home .dr-lead', en: 'Find team-based care at LON Clinic with qualified professionals.', pt: 'Encontre na LON Clinic um acompanhamento em equipa com profissionais qualificados.', es: 'Encuentre en LON Clinic un acompañamiento en equipo con profesionales cualificados.' },
        { s: '#lonHeroBook .lon-btn-label', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },
        { s: '.dr-hero-service-wrap .visually-hidden', en: 'Consultation type', pt: 'Tipo de consulta', es: 'Tipo de consulta' },
        { s: '#lonHeroService option[value="clinica_geral"]', en: 'Doctor', pt: 'Médico', es: 'Médico' },
        { s: '#lonHeroService option[value="nutricao_programa"]', en: 'Nutrition', pt: 'Nutrição', es: 'Nutrición' },
        { s: '#lonHeroService option[value="psicologia"]', en: 'Psychologist', pt: 'Psicólogo', es: 'Psicólogo' },
        { s: '.dr-hero-meta', en: 'Online consultation · No travel · Wherever you are', pt: 'Consulta online · Sem deslocações · Onde quer que esteja', es: 'Consulta online · Sin desplazamientos · Esté donde esté' },
        { s: '.dr-live-slots-kicker', en: 'Available appointments', pt: 'Consultas disponíveis', es: 'Consultas disponibles' },
        { s: '.dr-next-slot-kicker', en: 'Next available', pt: 'Próximo horário', es: 'Próximo horario' },
        { s: '.dr-next-slot-price', en: '39 € · general medicine', pt: '39 € · clínica geral', es: '39 € · medicina general' },
        { s: '.dr-next-slot-other', en: 'See available times →', pt: 'Ver horários disponíveis →', es: 'Ver horarios disponibles →' },
        { s: '.dr-hero-help', en: 'Not sure which consultation to choose? <a href="#servicos">Help me choose →</a>', pt: 'Não sabe qual consulta escolher? <a href="#servicos">Ajude-me a escolher →</a>', es: '¿No sabe qué consulta elegir? <a href="#servicos">Ayúdeme a elegir →</a>', h: true },
        { s: '.dr-float-card strong', en: 'Your online health clinic.', pt: 'A sua clínica de saúde, online.', es: 'Su clínica de salud, online.' },

        /* ── Trust bullets ── */
        { s: '.dr-trust-list li:nth-child(1)', en: 'Clinic certified by the Health Regulatory Authority no. 45.475', pt: 'Clínica certificada pela Entidade Reguladora da Saúde nº 45.475', es: 'Clínica certificada por la Entidad Reguladora de la Salud n.º 45.475' },
        { s: '.dr-trust-list li:nth-child(2)', en: 'Doctors registered with the Medical Association', pt: 'Médicos inscritos na Ordem dos Médicos', es: 'Médicos inscritos en el Colegio de Médicos' },
        { s: '.dr-trust-list li:nth-child(3)', en: 'Nutritionists and psychologists registered with their respective professional bodies', pt: 'Nutricionistas e Psicólogos inscritos nas respetivas Ordens', es: 'Nutricionistas y psicólogos inscritos en sus respectivos Colegios profesionales' },
        { s: '.dr-trust-list li:nth-child(4)', en: 'Consultations in Portuguese, English and Spanish', pt: 'Consultas em português, inglês e espanhol', es: 'Consultas en portugués, inglés y español' },
        { s: '.dr-trust-list li:nth-child(5)', en: 'Prescriptions and exam requests, when clinically indicated', pt: 'Receitas e pedidos de exames, quando clinicamente indicados', es: 'Recetas y solicitudes de exámenes, cuando estén clínicamente indicadas' },
        { s: '.dr-trust-list li:nth-child(6)', en: 'No waiting room. No travel.', pt: 'Sem sala de espera. Sem deslocação.', es: 'Sin sala de espera. Sin desplazamiento.' },

        /* ── Burnout quiz promo ── */
        { s: '.dr-burnout-promo__eyebrow', en: 'Occupational mental health', pt: 'Saúde mental ocupacional', es: 'Salud mental ocupacional' },
        { s: '#burnout-promo-title', en: 'Tiredness that will not go away?', pt: 'Cansaço que não passa?', es: '¿Cansancio que no pasa?' },
        { s: '.dr-burnout-promo__lead', en: 'Not all tiredness is burnout. But understanding what is happening can be the first step. Take our free test, based on the <strong>Copenhagen Burnout Inventory</strong>, and get your result immediately.', pt: 'Nem todo o cansaço é burnout. Mas perceber o que está a acontecer pode ser o primeiro passo. Faça o nosso teste gratuito, baseado no <strong>Copenhagen Burnout Inventory</strong>, e receba o resultado imediatamente.', es: 'No todo el cansancio es burnout. Pero entender lo que está ocurriendo puede ser el primer paso. Haga nuestro test gratuito, basado en el <strong>Copenhagen Burnout Inventory</strong>, y reciba el resultado de inmediato.', h: true },
        { s: '.dr-burnout-promo__meta span:nth-child(1)', en: '4 minutes', pt: '4 minutos', es: '4 minutos' },
        { s: '.dr-burnout-promo__meta span:nth-child(2)', en: 'Free', pt: 'Gratuito', es: 'Gratuito' },
        { s: '.dr-burnout-promo__meta span:nth-child(3)', en: 'Immediate result', pt: 'Resultado imediato', es: 'Resultado inmediato' },
        { s: '.dr-burnout-promo__cta', en: 'Take the test →', pt: 'Fazer o teste →', es: 'Hacer el test →' },
        { s: '.dr-burnout-promo-actions .lon-text-link', en: 'Explore the Burnout Centre →', pt: 'Conhecer o Centro Burnout →', es: 'Conocer el Centro Burnout →' },
        { s: '.lon-service-card[data-category="mental"] .lon-service-extra a', en: 'Take the burnout test →', pt: 'Fazer teste de burnout →', es: 'Hacer test de burnout →' },
        { s: '#lon-service-psicologia-avulsa .lon-service-chip', en: 'Psychology', pt: 'Psicologia', es: 'Psicología' },
        { s: '#lon-service-psicologia-avulsa h3', en: 'Single Psychology Session', pt: 'Sessão Avulsa de Psicologia', es: 'Sesión suelta de Psicología' },
        { s: '#lon-service-psicologia-burnout .lon-service-chip', en: 'Psychology', pt: 'Psicologia', es: 'Psicología' },
        { s: '#lon-service-psicologia-burnout h3', en: 'Psychology Subscription', pt: 'Subscrição de Psicologia', es: 'Suscripción de Psicología' },
        { s: '#lon-service-psicologia-burnout .lon-service-price', en: '56 € /week · billed monthly', pt: '56 € /semana · cobrado mensalmente', es: '56 € /semana · cobrado mensualmente' },
        { s: '#lon-service-psicologia-burnout .lon-service-extra a', en: 'See psychology programmes →', pt: 'Ver programas de psicologia →', es: 'Ver programas de psicología →' },
        { s: '#lon-service-saude-mental .lon-service-chip', en: 'Mental Health', pt: 'Saúde Mental', es: 'Salud Mental' },
        { s: '#lon-service-saude-mental h3', en: 'Medical Mental Health Consultation', pt: 'Consulta Médica de Saúde Mental', es: 'Consulta Médica de Salud Mental' },
        { s: '#lon-service-burnout .lon-service-chip', en: 'Burn Out', pt: 'Burn Out', es: 'Burn Out' },
        { s: '#lon-service-burnout h3', en: 'Specialized Burnout Consultation', pt: 'Consulta Especializada em Burnout', es: 'Consulta Especializada en Burnout' },
        { s: '#lon-service-burnout .lon-service-extra a', en: 'Take the burnout test →', pt: 'Fazer teste de burnout →', es: 'Hacer test de burnout →' },
        { s: '#lon-service-burnout-sub .lon-service-chip', en: 'Subscription', pt: 'Subscrição', es: 'Suscripción' },
        { s: '#lon-service-burnout-sub h3', en: 'Anti-Burnout Subscription', pt: 'Subscrição Anti-Burnout', es: 'Suscripción Anti-Burnout' },
        { s: '#lon-service-burnout-sub .lon-service-extra a', en: '4 consultations/month · €54/session →', pt: '4 consultas/mês · 54€/sessão →', es: '4 consultas/mes · 54€/sesión →' },

        /* ── How it works ── */
        { s: '#como-funciona .lon-how-head .lon-kicker', en: 'Simple from the first click to the consultation', pt: 'Simples do primeiro clique à consulta', es: 'Simple desde el primer clic hasta la consulta' },
        { s: '#como-funciona-title', en: 'Taking care of your health can be <em class="serif-accent">simple.</em>', pt: 'Cuidar da sua saúde pode ser <em class="serif-accent">simples.</em>', es: 'Cuidar de su salud puede ser <em class="serif-accent">sencillo.</em>', h: true },
        { s: '.lon-how-steps li:nth-child(1) h3', en: 'Choose', pt: 'Escolha', es: 'Elija' },
        { s: '.lon-how-steps li:nth-child(1) p', en: 'Tell us what you need and choose the most suitable consultation. If you have doubts, we will help.', pt: 'Diga-nos o que precisa e escolha a consulta mais adequada. Se tiver dúvidas, nós ajudamos.', es: 'Díganos qué necesita y elija la consulta más adecuada. Si tiene dudas, le ayudamos.' },
        { s: '.lon-how-steps li:nth-child(2) h3', en: 'Book', pt: 'Agende', es: 'Reserve' },
        { s: '.lon-how-steps li:nth-child(2) p', en: 'Choose the day and time that suit you best.', pt: 'Escolha o dia e a hora que melhor lhe convêm.', es: 'Elija el día y la hora que mejor le convengan.' },
        { s: '.lon-how-steps li:nth-child(3) h3', en: 'Confirm', pt: 'Confirme', es: 'Confirme' },
        { s: '.lon-how-steps li:nth-child(3) p', en: 'Pay online securely.', pt: 'Faça o pagamento online de forma segura.', es: 'Realice el pago online de forma segura.' },
        { s: '.lon-how-steps li:nth-child(4) h3', en: 'Consult', pt: 'Consulte', es: 'Consulte' },
        { s: '.lon-how-steps li:nth-child(4) p', en: 'At the scheduled time, join the consultation from your computer, tablet or smartphone.', pt: 'À hora marcada, entre na consulta através do seu computador, tablet ou smartphone.', es: 'A la hora prevista, entre en la consulta desde su ordenador, tablet o smartphone.' },
        { s: '.lon-how-steps li:nth-child(5) h3', en: 'Continue', pt: 'Continue', es: 'Continúe' },
        { s: '.lon-how-steps li:nth-child(5) p', en: 'When needed, you can continue to be followed by our team.', pt: 'Quando necessário, pode voltar a ser acompanhado pela nossa equipa.', es: 'Cuando sea necesario, puede volver a ser atendido por nuestro equipo.' },
        { s: '#como-funciona .lon-section-cta .lon-btn-label', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },

        /* ── Need chooser ── */
        { s: '.lon-need-header:not(.lon-care-header) .lon-need-kicker', en: 'Find the right care', pt: 'Encontre o cuidado certo', es: 'Encuentre el cuidado adecuado' },
        { s: '#lon-need-title', en: 'Tell us what you need. We will help.', pt: 'Diga-nos o que precisa. Nós ajudamos.', es: 'Díganos qué necesita. Le ayudamos.' },
        { s: '.lon-need-header:not(.lon-care-header) .lon-need-lead', en: 'It is not always easy to know which professional to see. Start with your need and find the simplest path to take care of your health.', pt: 'Nem sempre é fácil saber que profissional deve consultar. Comece pela sua necessidade e encontre o caminho mais simples para cuidar da sua saúde.', es: 'No siempre es fácil saber a qué profesional consultar. Empiece por su necesidad y encuentre el camino más sencillo para cuidar su salud.' },
        { s: '#lon-need-medico h3', en: 'I need to speak to a doctor', pt: 'Preciso de falar com um médico', es: 'Necesito hablar con un médico' },
        { s: '#lon-need-medico .lon-need-desc', en: 'Symptoms, health questions, recurring problems, medication, tests or follow-up.', pt: 'Sintomas, dúvidas de saúde, problemas recorrentes, medicação, exames ou acompanhamento.', es: 'Síntomas, dudas de salud, problemas recurrentes, medicación, pruebas o seguimiento.' },
        { s: '#lon-need-psico h3', en: 'I am not feeling well', pt: 'Não me estou a sentir bem', es: 'No me estoy sintiendo bien' },
        { s: '#lon-need-psico .lon-need-desc', en: 'Anxiety, stress, burnout, emotional difficulties, relationships, or simply the need to talk to someone.', pt: 'Ansiedade, stress, burnout, dificuldades emocionais, relações ou simplesmente a necessidade de falar com alguém.', es: 'Ansiedad, estrés, burnout, dificultades emocionales, relaciones o simplemente la necesidad de hablar con alguien.' },
        { s: '#lon-need-viagem h3', en: 'I am travelling', pt: 'Vou viajar', es: 'Voy a viajar' },
        { s: '#lon-need-viagem .lon-need-desc', en: 'Prepare your health before you travel with personalised advice on prevention, vaccination and destination-related risks.', pt: 'Prepare a sua saúde antes de viajar com aconselhamento personalizado sobre prevenção, vacinação e riscos associados ao destino.', es: 'Prepare su salud antes de viajar con consejo personalizado sobre prevención, vacunación y riesgos asociados al destino.' },
        { s: '#lon-need-nutricao h3', en: 'I want to lose weight and/or learn to eat better', pt: 'Quero perder peso e/ou aprender a comer melhor', es: 'Quiero perder peso y/o aprender a comer mejor' },
        { s: '#lon-need-nutricao .lon-need-desc', en: 'A weight-loss programme with medical and nutritional follow-up to build healthier, more sustainable habits.', pt: 'Programa de perda de peso com acompanhamento médico e nutricional para criar hábitos mais saudáveis e sustentáveis.', es: 'Programa de pérdida de peso con seguimiento médico y nutricional para crear hábitos más saludables y sostenibles.' },
        { s: '#lon-need-urgente h3', en: 'I need to be seen quickly', pt: 'Preciso de ser visto rapidamente', es: 'Necesito ser atendido rápidamente' },
        { s: '#lon-need-urgente .lon-need-desc', en: 'For clinical situations that need a prompt medical assessment, but are not emergencies.', pt: 'Para situações clínicas que necessitam de avaliação médica rápida, mas que não são emergências.', es: 'Para situaciones clínicas que necesitan una evaluación médica rápida, pero que no son emergencias.' },
        { s: '.lon-need-emergency', en: 'In a medical emergency, call <a href="tel:112">112</a>.', pt: 'Em caso de emergência médica, ligue <a href="tel:112">112</a>.', es: 'En caso de emergencia médica, llame al <a href="tel:112">112</a>.', h: true },
        { s: '.lon-need-or', en: 'All consultations', pt: 'Todas as consultas', es: 'Todas las consultas' },

        /* ── Need-section consultations ── */
        { s: '#lon-offer-clinica-geral h4', en: 'General Medicine Consultation', pt: 'Consulta de Clínica Geral', es: 'Consulta de Medicina General' },
        { s: '#lon-offer-clinica-geral .lon-need-offer-price', en: '39 € · 30 min', pt: '39 € · 30 min', es: '39 € · 30 min' },
        { s: '#lon-offer-clinica-geral .lon-btn', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },
        { s: '#lon-offer-renovacao h4', en: 'Medical Treatment Renewal', pt: 'Renovação de Tratamento Médico', es: 'Renovación de Tratamiento Médico' },
        { s: '#lon-offer-renovacao .lon-btn', en: 'Book — 19 €', pt: 'Marcar — 19 €', es: 'Reservar — 19 €' },
        { s: '#lon-offer-psico-avulsa h4', en: 'Single Psychology Session', pt: 'Sessão Avulsa de Psicologia', es: 'Sesión suelta de Psicología' },
        { s: '#lon-offer-psico-avulsa .lon-btn', en: 'Book — 60 €', pt: 'Marcar — 60 €', es: 'Reservar — 60 €' },
        { s: '#lon-offer-psico-sub h4', en: 'Psychology Subscription', pt: 'Subscrição de Psicologia', es: 'Suscripción de Psicología' },
        { s: '#lon-offer-psico-sub .lon-need-offer-price', en: '56 € /week · billed monthly', pt: '56 € /semana · cobrado mensalmente', es: '56 € /semana · cobrado mensualmente' },
        { s: '#lon-offer-psico-sub .lon-btn', en: 'Subscribe — 56 €/week', pt: 'Subscrever — 56 €/semana', es: 'Suscribirse — 56 €/semana' },
        { s: '#lon-offer-saude-mental h4', en: 'Medical Mental Health Consultation', pt: 'Consulta Médica de Saúde Mental', es: 'Consulta Médica de Salud Mental' },
        { s: '#lon-offer-saude-mental .lon-need-offer-price', en: '60 € · 30–45 min', pt: '60 € · 30–45 min', es: '60 € · 30–45 min' },
        { s: '#lon-offer-saude-mental .lon-btn', en: 'Book — 60 €', pt: 'Marcar — 60 €', es: 'Reservar — 60 €' },
        { s: '#lon-offer-burnout h4', en: 'Specialized Burnout Consultation', pt: 'Consulta Especializada em Burnout', es: 'Consulta Especializada en Burnout' },
        { s: '#lon-offer-burnout .lon-need-offer-price', en: '60 € · 60 min', pt: '60 € · 60 min', es: '60 € · 60 min' },
        { s: '#lon-offer-burnout .lon-btn', en: 'Book — 60 €', pt: 'Marcar — 60 €', es: 'Reservar — 60 €' },
        { s: '#lon-offer-burnout .lon-need-offer-extra a', en: 'Take the burnout test →', pt: 'Fazer teste de burnout →', es: 'Hacer test de burnout →' },
        { s: '#lon-offer-travel h4', en: "Traveler's Consultation", pt: 'Consulta do Viajante', es: 'Consulta del Viajero' },
        { s: '#lon-offer-travel .lon-need-offer-price', en: '39 € · 20 min', pt: '39 € · 20 min', es: '39 € · 20 min' },
        { s: '#lon-offer-travel .lon-btn', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },
        { s: '#lon-offer-travel-2 h4', en: "Traveler's Consultation — 2 people", pt: 'Consulta do Viajante 2 pessoas', es: 'Consulta del Viajero — 2 personas' },
        { s: '#lon-offer-travel-2 .lon-need-offer-price', en: '69 € · 30 min', pt: '69 € · 30 min', es: '69 € · 30 min' },
        { s: '#lon-offer-travel-2 .lon-btn', en: 'Book — 69 €', pt: 'Marcar — 69 €', es: 'Reservar — 69 €' },
        { s: '#lon-offer-nutricao h4', en: 'Weight-loss programme: medical and nutritional follow-up', pt: 'Programa de perda de peso: Acompanhamento médico e nutricional', es: 'Programa de pérdida de peso: Acompañamiento médico y nutricional' },
        { s: '#lon-service-nutricao-programa h3', en: 'Weight-loss programme: medical and nutritional follow-up', pt: 'Programa de perda de peso: Acompanhamento médico e nutricional', es: 'Programa de pérdida de peso: Acompañamiento médico y nutricional' },
        { s: '#lon-offer-nutricao .lon-need-offer-price', en: '115 € in month 1 · then 75 €/month', pt: '115 € no mês 1 · depois 75 €/mês', es: '115 € en el mes 1 · después 75 €/mes' },
        { s: '#lon-offer-nutricao .lon-btn', en: 'Book — 115 €', pt: 'Marcar — 115 €', es: 'Reservar — 115 €' },
        { s: '#lon-offer-longevidade h4', en: 'Longevity & Preventive Health Consultation', pt: 'Consulta de Longevidade e Saúde Preventiva', es: 'Consulta de Longevidad y Salud Preventiva' },
        { s: '#lon-offer-longevidade .lon-need-offer-price', en: '79 € · 45–60 min', pt: '79 € · 45–60 min', es: '79 € · 45–60 min' },
        { s: '#lon-offer-longevidade .lon-btn', en: 'Book — 79 €', pt: 'Marcar — 79 €', es: 'Reservar — 79 €' },
        { s: '#lon-offer-urgente h4', en: 'Urgent Medical Consultation', pt: 'Consulta Médica Urgente', es: 'Consulta Médica Urgente' },
        { s: '#lon-offer-urgente .lon-need-offer-price', en: '35 € · 20–30 min', pt: '35 € · 20–30 min', es: '35 € · 20–30 min' },
        { s: '#lon-offer-urgente .lon-btn', en: 'Book — 35 €', pt: 'Marcar — 35 €', es: 'Reservar — 35 €' },

        /* ── Service tabs ── */
        { s: '.lon-tab[data-tab="urgencias"]', en: 'General Medicine', pt: 'Medicina Geral', es: 'Medicina General' },
        { s: '.lon-tab[data-tab="mental"]', en: 'Mental Health', pt: 'Saúde Mental', es: 'Salud Mental' },
        { s: '.lon-tab[data-tab="especialidades"]', en: "Traveler's Health", pt: 'Saúde do Viajante', es: 'Salud del Viajero' },
        { s: '.lon-tab[data-tab="longevidade"]', en: 'Longevity Medicine', pt: 'Medicina da Longevidade', es: 'Medicina de la Longevidad' },
        { s: '.lon-tab[data-tab="nutricao"]', en: 'Nutrition', pt: 'Nutrição', es: 'Nutrición' },

        /* ── Service chips ── */
        { s: '.lon-services .lon-service-card:nth-child(1) .lon-service-chip', en: 'General Medicine', pt: 'Medicina Geral', es: 'Medicina General' },
        { s: '.lon-services .lon-service-card:nth-child(2) .lon-service-chip', en: 'Urgent', pt: 'Urgência', es: 'Urgencia' },
        { s: '.lon-services .lon-service-card:nth-child(8) .lon-service-chip', en: 'Follow-up', pt: 'Seguimento', es: 'Seguimiento' },
        { s: '.lon-services .lon-service-card:nth-child(9) .lon-service-chip', en: 'Traveler', pt: 'Viajante', es: 'Viajero' },
        { s: '.lon-services .lon-service-card:nth-child(10) .lon-service-chip', en: 'Traveler — 2 people', pt: 'Viajante 2 pessoas', es: 'Viajero — 2 personas' },
        { s: '.lon-services .lon-service-card:nth-child(11) .lon-service-chip', en: 'Longevity', pt: 'Longevidade', es: 'Longevidad' },

        /* ── Service names ── */
        { s: '.lon-services .lon-service-card:nth-child(1) h3', en: 'General Medicine Consultation', pt: 'Consulta de Clínica Geral', es: 'Consulta de Medicina General' },
        { s: '.lon-services .lon-service-card:nth-child(2) h3', en: 'Urgent Medical Consultation', pt: 'Consulta Médica Urgente', es: 'Consulta Médica Urgente' },
        { s: '.lon-services .lon-service-card:nth-child(8) h3', en: 'Medical Treatment Renewal', pt: 'Renovação de Tratamento Médico', es: 'Renovación de Tratamiento Médico' },
        { s: '.lon-services .lon-service-card:nth-child(9) h3', en: "Traveler's Consultation", pt: 'Consulta do Viajante', es: 'Consulta del Viajero' },
        { s: '.lon-services .lon-service-card:nth-child(10) h3', en: "Traveler's Consultation — 2 people", pt: 'Consulta do Viajante 2 pessoas', es: 'Consulta del Viajero — 2 personas' },
        { s: '.lon-services .lon-service-card:nth-child(11) h3', en: 'Longevity & Preventive Health Consultation', pt: 'Consulta de Longevidade e Saúde Preventiva', es: 'Consulta de Longevidad y Salud Preventiva' },

        /* ── Book buttons ── */
        { s: '.lon-services .lon-service-card:nth-child(1) .lon-btn-soft', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },
        { s: '.lon-services .lon-service-card:nth-child(2) .lon-btn-soft', en: 'Book — 35 €', pt: 'Marcar — 35 €', es: 'Reservar — 35 €' },
        { s: '#lon-service-psicologia-avulsa .lon-btn-soft', en: 'Book — 60 €', pt: 'Marcar — 60 €', es: 'Reservar — 60 €' },
        { s: '#lon-service-psicologia-burnout .lon-btn-soft', en: 'Subscribe — 56 €/week', pt: 'Subscrever — 56 €/semana', es: 'Suscribirse — 56 €/semana' },
        { s: '#lon-service-terapia-casal .lon-service-chip', en: 'Psychology', pt: 'Psicologia', es: 'Psicología' },
        { s: '#lon-service-terapia-casal h3', en: 'Couples therapy', pt: 'Terapia de casal', es: 'Terapia de pareja' },
        { s: '#lon-service-terapia-casal .lon-btn-soft', en: 'Book — 75 €', pt: 'Marcar — 75 €', es: 'Reservar — 75 €' },
        { s: '#lon-service-terapia-casal .lon-service-extra a', en: 'Learn more →', pt: 'Saber mais →', es: 'Saber más →' },
        { s: '#lon-service-terapia-casal-sub .lon-service-chip', en: 'Subscription', pt: 'Subscrição', es: 'Suscripción' },
        { s: '#lon-service-terapia-casal-sub h3', en: 'Weekly couples therapy', pt: 'Terapia de casal semanal', es: 'Terapia de pareja semanal' },
        { s: '#lon-service-terapia-casal-sub .lon-service-price', en: '65 € /week · billed monthly', pt: '65 € /semana · cobrado mensalmente', es: '65 € /semana · cobrado mensualmente' },
        { s: '#lon-service-terapia-casal-sub .lon-btn-soft', en: 'Subscribe — 65 €/week', pt: 'Subscrever — 65 €/semana', es: 'Suscribirse — 65 €/semana' },
        { s: '#lon-service-terapia-casal-sub .lon-service-extra a', en: 'Learn more →', pt: 'Saber mais →', es: 'Saber más →' },
        { s: '#lon-service-saude-mental .lon-btn-soft', en: 'Book — 60 €', pt: 'Marcar — 60 €', es: 'Reservar — 60 €' },
        { s: '#lon-service-burnout .lon-btn-soft', en: 'Book — 60 €', pt: 'Marcar — 60 €', es: 'Reservar — 60 €' },
        { s: '#lon-service-burnout-sub .lon-btn-soft', en: 'Subscribe — 216 €/mo', pt: 'Subscrever — 216 €/mês', es: 'Suscribirse — 216 €/mes' },
        { s: '.lon-services .lon-service-card:nth-child(8) .lon-btn-soft', en: 'Book — 19 €', pt: 'Marcar — 19 €', es: 'Reservar — 19 €' },
        { s: '.lon-services .lon-service-card:nth-child(9) .lon-btn-soft', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },
        { s: '.lon-services .lon-service-card:nth-child(10) .lon-btn-soft', en: 'Book — 69 €', pt: 'Marcar — 69 €', es: 'Reservar — 69 €' },
        { s: '.lon-services .lon-service-card:nth-child(11) .lon-btn-soft', en: 'Book — 79 €', pt: 'Marcar — 79 €', es: 'Reservar — 79 €' },

        /* ── Differentiation ── */
        { s: '.lon-diff .lon-kicker', en: 'Why Lon Clinic?', pt: 'Porque a Lon Clinic?', es: '¿Por qué Lon Clinic?' },
        { s: '#lon-diff-title', en: 'An online clinic, with a human relationship.', pt: 'Uma clínica online, com relação humana.', es: 'Una clínica online, con relación humana.' },
        { s: '.lon-diff .lon-section-lead', en: 'Technology makes the consultation more accessible. But it is people who make the difference.', pt: 'A tecnologia torna a consulta mais acessível. Mas são as pessoas que fazem a diferença.', es: 'La tecnología hace la consulta más accesible. Pero son las personas quienes marcan la diferencia.' },
        { s: '.lon-diff-grid li:nth-child(1) h3', en: 'Professionals you can trust', pt: 'Profissionais em quem pode confiar', es: 'Profesionales en quienes puede confiar' },
        { s: '.lon-diff-grid li:nth-child(1) p', en: 'We work with qualified professionals registered with their respective professional bodies.', pt: 'Trabalhamos com profissionais qualificados e inscritos nas respetivas Ordens profissionais.', es: 'Trabajamos con profesionales cualificados e inscritos en sus respectivos Colegios profesionales.' },
        { s: '.lon-diff-grid li:nth-child(2) h3', en: 'A story, not just a consultation', pt: 'Uma história, não apenas uma consulta', es: 'Una historia, no solo una consulta' },
        { s: '.lon-diff-grid li:nth-child(2) p', en: 'Knowing each person’s context and history allows for more consistent follow-up.', pt: 'Conhecer o contexto e o historial de cada pessoa permite um acompanhamento mais consistente.', es: 'Conocer el contexto y el historial de cada persona permite un seguimiento más consistente.' },
        { s: '.lon-diff-grid li:nth-child(3) h3', en: 'Continuity of care', pt: 'Continuidade dos cuidados', es: 'Continuidad de los cuidados' },
        { s: '.lon-diff-grid li:nth-child(3) p', en: 'When you need to come back, the aim is that follow-up can continue — without having to start all over again.', pt: 'Quando precisa de voltar, o objetivo é que o acompanhamento possa continuar — sem ter de começar tudo de novo.', es: 'Cuando necesita volver, el objetivo es que el seguimiento pueda continuar — sin tener que empezar de cero.' },
        { s: '.lon-diff-grid li:nth-child(4) h3', en: 'Several areas of health', pt: 'Várias áreas de saúde', es: 'Varias áreas de salud' },
        { s: '.lon-diff-grid li:nth-child(4) p', en: 'Medicine, mental health and nutrition in the same place.', pt: 'Medicina, saúde mental e nutrição no mesmo espaço.', es: 'Medicina, salud mental y nutrición en el mismo espacio.' },
        { s: '.lon-diff-grid li:nth-child(5) h3', en: 'No travel', pt: 'Sem deslocações', es: 'Sin desplazamientos' },
        { s: '.lon-diff-grid li:nth-child(5) p', en: 'Consult from your computer, tablet or smartphone, wherever you are.', pt: 'Consulte através do seu computador, tablet ou smartphone, onde quer que esteja.', es: 'Consulte desde su ordenador, tablet o smartphone, esté donde esté.' },
        { s: '.lon-diff-grid li:nth-child(6) h3', en: 'Personalised care', pt: 'Cuidado personalizado', es: 'Cuidado personalizado' },
        { s: '.lon-diff-grid li:nth-child(6) p', en: 'Each consultation starts from each person’s concrete situation. There are no identical answers for everyone.', pt: 'Cada consulta parte da situação concreta de cada pessoa. Não existem respostas iguais para todos.', es: 'Cada consulta parte de la situación concreta de cada persona. No hay respuestas iguales para todos.' },

        /* ── Team section ── */
        { s: '.lon-team-kicker', en: 'Who is on the other side of the consultation', pt: 'Quem está do outro lado da consulta', es: 'Quién está al otro lado de la consulta' },
        { s: '#lon-team-title', en: 'Professionals who care with knowledge and <em class="serif-accent">attention.</em>', pt: 'Profissionais que cuidam com conhecimento e <em class="serif-accent">atenção.</em>', es: 'Profesionales que cuidan con conocimiento y <em class="serif-accent">atención.</em>', h: true },
        { s: '.lon-team-lead', en: 'At Lon Clinic, we select professionals with clinical experience, appropriate training and a person-centred approach.', pt: 'Na Lon Clinic, selecionamos profissionais com experiência clínica, formação adequada e uma abordagem centrada na pessoa.', es: 'En Lon Clinic, seleccionamos profesionales con experiencia clínica, formación adecuada y un enfoque centrado en la persona.' },
        { s: '.lon-team-name', en: 'Dr Rita Aguiar', pt: 'Dra. Rita Aguiar', es: 'Dra. Rita Aguiar' },
        { s: '.lon-team-role', en: 'Physician', pt: 'Médica', es: 'Médica' },
        { s: '.lon-team-credentials li:nth-child(1)', en: '9 years of clinical practice', pt: '9 anos de prática clínica', es: '9 años de práctica clínica' },
        { s: '.lon-team-credentials li:nth-child(2)', en: 'Professional registration with the Portuguese Medical Association', pt: 'Cédula Profissional da Ordem dos Médicos em Portugal', es: 'Cédula profesional del Colegio de Médicos de Portugal' },
        { s: '.lon-team-credentials li:nth-child(3)', en: 'Postgraduate degree in Travel Medicine and Mobile Populations (2021), Faculty of Medicine, University of Porto', pt: 'Pós-graduação em Medicina do Viajante e das Populações Móveis (2021), Faculdade de Medicina da Universidade do Porto', es: 'Posgrado en Medicina del Viajero y Poblaciones Móviles (2021), Facultad de Medicina de la Universidad de Oporto' },
        { s: '.lon-team-credentials li:nth-child(4)', en: 'Consultancy with the World Health Organization, Mobile Populations section (2023)', pt: 'Consultadoria na Organização Mundial de Saúde, secção de Populações Móveis (2023)', es: 'Consultoría en la Organización Mundial de la Salud, sección de Poblaciones Móviles (2023)' },
        { s: '.lon-team-verify a:nth-child(1)', en: 'Profile and credentials', pt: 'Perfil e credenciais', es: 'Perfil y credenciales' },
        { s: '.lon-team-more', en: 'View profile and credentials →', pt: 'Ver perfil e credenciais →', es: 'Ver perfil y credenciales →' },
        { s: '.lon-team-actions .lon-btn-dark', en: 'Book consultation →', pt: 'Marcar consulta →', es: 'Reservar consulta →' },
        { s: '.lon-team-all .lon-text-link', en: 'View Dr Rita Aguiar’s profile →', pt: 'Ver perfil da Dra. Rita Aguiar →', es: 'Ver el perfil de la Dra. Rita Aguiar →' },

        /* ── After the consultation ── */
        { s: '.lon-after .lon-kicker', en: 'Care continues', pt: 'O cuidado continua', es: 'El cuidado continúa' },
        { s: '#lon-after-title', en: 'The consultation is only one part of follow-up.', pt: 'A consulta é apenas uma parte do acompanhamento.', es: 'La consulta es solo una parte del seguimiento.' },
        { s: '.lon-after .lon-section-lead', en: 'Depending on the situation and the clinical assessment, the professional may:', pt: 'Dependendo da situação e da avaliação clínica, o profissional poderá:', es: 'Según la situación y la evaluación clínica, el profesional podrá:' },
        { s: '.lon-after-grid li:nth-child(1) h3', en: 'Assess', pt: 'Avaliar', es: 'Evaluar' },
        { s: '.lon-after-grid li:nth-child(1) p', en: 'Understand the symptoms, context and relevant history.', pt: 'Compreender os sintomas, contexto e historial relevante.', es: 'Comprender los síntomas, el contexto y el historial relevante.' },
        { s: '.lon-after-grid li:nth-child(2) h3', en: 'Guide', pt: 'Orientar', es: 'Orientar' },
        { s: '.lon-after-grid li:nth-child(2) p', en: 'Explain the next steps and answer your questions.', pt: 'Explicar os próximos passos e esclarecer as suas dúvidas.', es: 'Explicar los próximos pasos y resolver sus dudas.' },
        { s: '.lon-after-grid li:nth-child(3) h3', en: 'Prescribe', pt: 'Prescrever', es: 'Prescribir' },
        { s: '.lon-after-grid li:nth-child(3) p', en: 'Issue prescriptions when clinically indicated.', pt: 'Emitir receitas quando clinicamente indicado.', es: 'Emitir recetas cuando esté clínicamente indicado.' },
        { s: '.lon-after-grid li:nth-child(4) h3', en: 'Request tests', pt: 'Pedir exames', es: 'Pedir pruebas' },
        { s: '.lon-after-grid li:nth-child(4) p', en: 'Issue test requests when clinically indicated.', pt: 'Emitir pedidos de exames quando clinicamente indicados.', es: 'Emitir solicitudes de pruebas cuando estén clínicamente indicadas.' },
        { s: '.lon-after-grid li:nth-child(5) h3', en: 'Follow up', pt: 'Acompanhar', es: 'Acompañar' },
        { s: '.lon-after-grid li:nth-child(5) p', en: 'Recommend another consultation or follow-up when needed.', pt: 'Recomendar nova consulta ou acompanhamento quando necessário.', es: 'Recomendar una nueva consulta o seguimiento cuando sea necesario.' },
        { s: '.lon-after-note', en: 'Prescriptions, test requests and other guidance always depend on the clinical assessment carried out by the health professional.', pt: 'A emissão de receitas, pedidos de exames e outras orientações depende sempre da avaliação clínica realizada pelo profissional de saúde.', es: 'La emisión de recetas, solicitudes de pruebas y otras orientaciones depende siempre de la evaluación clínica realizada por el profesional de salud.' },

        /* ── Testimonials ── */
        { s: '.lon-testimonials-kicker', en: 'Our patients’ experience', pt: 'A experiência dos nossos pacientes', es: 'La experiencia de nuestros pacientes' },
        { s: '#lon-testimonials-title', en: 'Being heard makes a difference.', pt: 'Ser ouvido faz diferença.', es: 'Ser escuchado marca la diferencia.' },
        { s: '.lon-tp-badge-score', en: 'Excellent', pt: 'Excelente', es: 'Excelente' },
        { s: 'a[data-trustpilot-profile]', a: 'href', en: 'https://www.trustpilot.com/review/lonclinic.com', pt: 'https://pt.trustpilot.com/review/lonclinic.com', es: 'https://es.trustpilot.com/review/lonclinic.com' },
        { s: '.lon-testimonial-seed .lon-testimonial-quote', en: 'The doctor who saw me was very friendly, very clear in her approach and answered all my questions. I will definitely contact you again.', pt: '«A doutora que me atendeu era super simpática, muito clara na abordagem do tema e esclareceu-me todas as dúvidas. Sem dúvida voltarei a contactar-vos.»', es: 'La doctora que me atendió fue muy amable, muy clara en su enfoque y resolvió todas mis dudas. Sin duda volveré a contactaros.' },
        { s: '.lon-testimonial-seed .lon-testimonial-author', en: 'Verified patient', pt: 'Paciente verificada', es: 'Paciente verificada' },
        { s: '.lon-testimonial-seed .lon-testimonial-date', en: 'June 2026', pt: 'Junho de 2026', es: 'Junio de 2026' },
        { s: '.lon-testimonial-seed .lon-testimonial-translation-note', en: 'Translated from Portuguese (not the original text)', pt: '', es: 'Traducción del portugués (no es el texto original)' },
        { s: '.lon-testimonial-tp .lon-testimonial-quote', en: 'I was able to book an appointment for the same day and, at the end, I also received the prescription for the vaccines I needed. Dr Rita was very friendly, attentive and professional.', pt: '«Consegui marcar a consulta para o próprio dia e, no final, tive também a prescrição das vacinas de que precisava. A Dra. Rita foi muito simpática, atenciosa e profissional.»', es: 'Pude reservar la cita para el mismo día y, al final, también recibí la receta de las vacunas que necesitaba. La Dra. Rita fue muy amable, atenta y profesional.' },
        { s: '.lon-testimonial-tp .lon-testimonial-source', en: 'via Trustpilot', pt: 'via Trustpilot', es: 'vía Trustpilot' },
        { s: '.lon-testimonial-tp .lon-testimonial-date', en: 'September 2026', pt: 'Setembro de 2026', es: 'Septiembre de 2026' },
        { s: '.lon-testimonial-tp .lon-testimonial-translation-note', en: 'Translated from Portuguese (not the original text)', pt: '', es: 'Traducción del portugués (no es el texto original)' },
        { s: '.lon-testimonials-actions .lon-text-link', en: 'See all reviews →', pt: 'Ver todas as avaliações →', es: 'Ver todas las valoraciones →' },
        { s: '.lon-testimonials-actions .lon-review-toggle', en: 'Leave your review', pt: 'Deixe a sua opinião', es: 'Deje su opinión' },
        { s: '.lon-trustpilot-label', en: 'Review Lon Clinic on Trustpilot →', pt: 'Avaliar a Lon Clinic no Trustpilot →', es: 'Valorar Lon Clinic en Trustpilot →' },
        { s: 'a[data-trustpilot-evaluate]', a: 'href', en: 'https://www.trustpilot.com/evaluate/lonclinic.com', pt: 'https://pt.trustpilot.com/evaluate/lonclinic.com', es: 'https://es.trustpilot.com/evaluate/lonclinic.com' },
        { s: '#lon-review-form-title', en: 'Leave your review', pt: 'Deixe a sua opinião', es: 'Deje su opinión' },
        { s: '.lon-leave-review .lon-review-form-desc', en: 'Share your experience with us. You can choose to make it visible to other visitors.', pt: 'Partilhe a sua experiência connosco. Pode optar por torná-la visível para outros visitantes.', es: 'Comparta su experiencia con nosotros. Puede optar por hacerla visible para otros visitantes.' },
        { s: '.lon-review-trustpilot-alt-text', en: 'Prefer an independent review?', pt: 'Prefere uma avaliação independente?', es: '¿Prefiere una valoración independiente?' },
        { s: '#lonReviewForm label[for="review-author"]', en: 'Name <span class="lon-review-optional">(optional)</span>', pt: 'Nome <span class="lon-review-optional">(opcional)</span>', es: 'Nombre <span class="lon-review-optional">(opcional)</span>', h: true },
        { s: '#lonReviewForm label[for="review-email"]', en: 'Email <span class="lon-review-optional">(optional, not published)</span>', pt: 'Email <span class="lon-review-optional">(opcional, não é publicado)</span>', es: 'Email <span class="lon-review-optional">(opcional, no se publica)</span>', h: true },
        { s: '#lonReviewForm .lon-review-label', en: 'Rating', pt: 'Avaliação', es: 'Valoración' },
        { s: '#lonReviewForm label[for="review-body"]', en: 'Your review', pt: 'A sua opinião', es: 'Su opinión' },
        { s: '#lonReviewForm .lon-review-public-check span', en: 'I authorise publishing this review on the website so other visitors can read it', pt: 'Autorizo a publicação desta opinião no site para que outros visitantes a possam ler', es: 'Autorizo la publicación de esta opinión en el sitio web para que otros visitantes puedan leerla' },
        { s: '#lonReviewForm button[type="submit"]', en: 'Submit review', pt: 'Enviar opinião', es: 'Enviar opinión' },
        { s: '#review-author', a: 'placeholder', en: 'e.g. Maria S.', pt: 'Ex.: Maria S.', es: 'Ej.: María S.' },
        { s: '#review-body', a: 'placeholder', en: 'Tell us about your consultation…', pt: 'Conte-nos como correu a consulta…', es: 'Cuéntenos cómo fue la consulta…' },

        /* ── Urgent ── */
        { s: '.lon-urgent-home .lon-kicker', en: 'Need a prompt medical assessment?', pt: 'Precisa de uma avaliação médica rápida?', es: '¿Necesita una evaluación médica rápida?' },
        { s: '#lon-urgent-title', en: 'See a doctor without leaving home.', pt: 'Consulte um médico sem sair de casa.', es: 'Consulte a un médico sin salir de casa.' },
        { s: '.lon-urgent-home .lon-section-lead', en: 'When a health situation needs a prompt assessment, you can book an urgent medical consultation online.', pt: 'Quando uma situação de saúde precisa de avaliação rápida, pode marcar uma consulta médica urgente online.', es: 'Cuando una situación de salud necesita una evaluación rápida, puede reservar una consulta médica urgente online.' },
        { s: '.lon-urgent-offer h3', en: 'Urgent Medical Consultation', pt: 'Consulta Médica Urgente', es: 'Consulta Médica Urgente' },
        { s: '.lon-urgent-offer .lon-btn', en: 'Book urgent consultation →', pt: 'Marcar consulta urgente →', es: 'Reservar consulta urgente →' },
        { s: '.lon-urgent-note', en: 'The urgent consultation is for situations that need a prompt medical assessment, but are not emergencies.', pt: 'A consulta urgente destina-se a situações que necessitam de avaliação médica rápida, mas que não são emergências.', es: 'La consulta urgente se destina a situaciones que necesitan una evaluación médica rápida, pero que no son emergencias.' },

        /* ── FAQ ── */
        { s: '.lon-home-faq .lon-kicker', en: 'Before you book', pt: 'Antes de marcar', es: 'Antes de reservar' },
        { s: '#lon-faq-title', en: 'Do you have a <em class="serif-accent">question?</em>', pt: 'Tem alguma <em class="serif-accent">dúvida?</em>', es: '¿Tiene alguna <em class="serif-accent">duda?</em>', h: true },
        { s: '.lon-home-faq-list details:nth-child(1) summary', en: 'How does an online consultation work?', pt: 'Como funciona uma consulta online?', es: '¿Cómo funciona una consulta online?' },
        { s: '.lon-home-faq-list details:nth-child(1) .faq-a', en: 'The consultation takes place by video call through your computer, tablet or smartphone.', pt: 'A consulta é realizada por videochamada através do seu computador, tablet ou smartphone.', es: 'La consulta se realiza por videollamada a través de su ordenador, tablet o smartphone.' },
        { s: '.lon-home-faq-list details:nth-child(2) summary', en: 'Do I need to install an app?', pt: 'Preciso de instalar alguma aplicação?', es: '¿Necesito instalar alguna aplicación?' },
        { s: '.lon-home-faq-list details:nth-child(2) .faq-a', en: 'No. After booking, you will receive the instructions you need to join the consultation.', pt: 'Não. Após a marcação, receberá as instruções necessárias para aceder à consulta.', es: 'No. Tras la reserva, recibirá las instrucciones necesarias para acceder a la consulta.' },
        { s: '.lon-home-faq-list details:nth-child(3) summary', en: 'Can I book a consultation for today?', pt: 'Posso marcar uma consulta para hoje?', es: '¿Puedo reservar una consulta para hoy?' },
        { s: '.lon-home-faq-list details:nth-child(3) .faq-a', en: 'Yes, whenever there are available times. Check availability when you book.', pt: 'Sim, sempre que existam horários disponíveis. Consulte a disponibilidade no momento da marcação.', es: 'Sí, siempre que haya horarios disponibles. Consulte la disponibilidad en el momento de reservar.' },
        { s: '.lon-home-faq-list details:nth-child(4) summary', en: 'Can I be followed by the same professional?', pt: 'Posso ser acompanhado pelo mesmo profissional?', es: '¿Puedo ser atendido por el mismo profesional?' },
        { s: '.lon-home-faq-list details:nth-child(4) .faq-a', en: 'Whenever possible, we try to make continuity with the same professional easier.', pt: 'Sempre que possível, procuramos facilitar a continuidade com o mesmo profissional.', es: 'Siempre que sea posible, procuramos facilitar la continuidad con el mismo profesional.' },
        { s: '.lon-home-faq-list details:nth-child(5) summary', en: 'Can I get a prescription?', pt: 'Posso obter uma receita?', es: '¿Puedo obtener una receta?' },
        { s: '.lon-home-faq-list details:nth-child(5) .faq-a', en: 'When clinically indicated, the doctor may issue a prescription following the assessment.', pt: 'Quando clinicamente indicado, o médico poderá emitir uma receita na sequência da avaliação realizada.', es: 'Cuando esté clínicamente indicado, el médico podrá emitir una receta tras la evaluación realizada.' },
        { s: '.lon-home-faq-list details:nth-child(6) summary', en: 'Can I receive a test request?', pt: 'Posso receber um pedido de exames?', es: '¿Puedo recibir una solicitud de pruebas?' },
        { s: '.lon-home-faq-list details:nth-child(6) .faq-a', en: 'When clinically indicated, the professional may issue a test request.', pt: 'Quando clinicamente indicado, o profissional poderá emitir um pedido de exames.', es: 'Cuando esté clínicamente indicado, el profesional podrá emitir una solicitud de pruebas.' },
        { s: '.lon-home-faq-list details:nth-child(7) summary', en: 'What if I do not know which consultation to choose?', pt: 'E se não souber qual consulta escolher?', es: '¿Y si no sé qué consulta elegir?' },
        { s: '.lon-home-faq-list details:nth-child(7) .faq-a', en: 'Contact our team. We help identify the most suitable option for your situation.', pt: 'Contacte a nossa equipa. Ajudamos a identificar a opção mais adequada para a sua situação.', es: 'Contacte con nuestro equipo. Le ayudamos a identificar la opción más adecuada para su situación.' },
        { s: '.lon-home-faq-list details:nth-child(8) summary', en: 'Does an online consultation replace an in-person consultation?', pt: 'Uma consulta online substitui uma consulta presencial?', es: '¿Una consulta online sustituye una consulta presencial?' },
        { s: '.lon-home-faq-list details:nth-child(8) .faq-a', en: 'It depends on the situation. The professional will assess whether a telemedicine consultation is appropriate and may recommend an in-person assessment when needed.', pt: 'Depende da situação. O profissional avaliará se a consulta por telemedicina é adequada e poderá recomendar avaliação presencial quando necessário.', es: 'Depende de la situación. El profesional evaluará si la consulta por telemedicina es adecuada y podrá recomendar una evaluación presencial cuando sea necesario.' },
        { s: '.lon-home-faq .lon-section-cta .lon-text-link', en: 'See all frequently asked questions →', pt: 'Ver todas as perguntas frequentes →', es: 'Ver todas las preguntas frecuentes →' },

        /* ── CTA card ── */
        { s: '.lon-consult-cta-copy .lon-kicker', en: 'When you need us, we are here.', pt: 'Quando precisar, estamos aqui.', es: 'Cuando lo necesite, estamos aquí.' },
        { s: '.lon-consult-cta-copy h2', en: 'Start by taking care of what you need <em class="serif-accent">today.</em>', pt: 'Comece por cuidar do que precisa <em class="serif-accent">hoje.</em>', es: 'Empiece por cuidar lo que necesita <em class="serif-accent">hoy.</em>', h: true },
        { s: '.lon-consult-cta-copy > p:not(.lon-kicker):not(.lon-consult-cta-help)', en: 'A health question, a symptom, a concern, or simply the wish to take better care of yourself. Find the right consultation and speak with a Lon Clinic professional.', pt: 'Uma dúvida de saúde, um sintoma, uma preocupação ou simplesmente a vontade de cuidar melhor de si. Encontre a consulta certa e fale com um profissional da Lon Clinic.', es: 'Una duda de salud, un síntoma, una preocupación o simplemente las ganas de cuidarse mejor. Encuentre la consulta adecuada y hable con un profesional de Lon Clinic.' },
        { s: '.lon-consult-cta-copy .lon-btn-dark', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },
        { s: '.lon-consult-cta-help', en: 'Not sure where to start? <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer">Talk to our team →</a>', pt: 'Não sabe por onde começar? <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer">Falar com a nossa equipa →</a>', es: '¿No sabe por dónde empezar? <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer">Hablar con nuestro equipo →</a>', h: true },

        /* ── Contact section ── */
        { s: '.lon-contact-copy .lon-kicker', en: 'Need help?', pt: 'Precisa de ajuda?', es: '¿Necesita ayuda?' },
        { s: '.lon-contact-copy h2', en: 'We are available to help.', pt: 'Estamos disponíveis para ajudar.', es: 'Estamos disponibles para ayudar.' },
        { s: '.lon-contact-copy > p:not(.lon-kicker)', en: 'If you have questions about a consultation, a booking, or which service to choose, talk to us.', pt: 'Se tiver dúvidas sobre uma consulta, uma marcação ou sobre qual serviço escolher, fale connosco.', es: 'Si tiene dudas sobre una consulta, una reserva o sobre qué servicio elegir, hable con nosotros.' },
        { s: '.lon-contact-links a[href^="https://wa.me"]', en: 'Talk to us on WhatsApp →', pt: 'Falar connosco pelo WhatsApp →', es: 'Hablar con nosotros por WhatsApp →' },
        { s: '#lonContactForm label[for="contact-name"]', en: 'Name', pt: 'Nome', es: 'Nombre' },
        { s: '#lonContactForm label[for="contact-email"]', en: 'Email', pt: 'Email', es: 'Email' },
        { s: '#lonContactForm label[for="contact-phone"]', en: 'Phone', pt: 'Telefone', es: 'Teléfono' },
        { s: '#lonContactForm label[for="contact-message"]', en: 'Message', pt: 'Mensagem', es: 'Mensaje' },
        { s: '#contact-name', a: 'placeholder', en: 'Name', pt: 'Nome', es: 'Nombre' },
        { s: '#contact-email', a: 'placeholder', en: 'Email', pt: 'Email', es: 'Email' },
        { s: '#contact-phone', a: 'placeholder', en: 'Phone', pt: 'Telefone', es: 'Teléfono' },
        { s: '#contact-message', a: 'placeholder', en: 'How can we help?', pt: 'Como podemos ajudar?', es: '¿Cómo podemos ayudar?' },
        { s: '#lonContactForm button[type="submit"]', en: 'Send message', pt: 'Enviar mensagem', es: 'Enviar mensaje' },

        /* ── Footer ── */
        { s: '.lon-footer-brand > p', en: 'Your online health clinic.', pt: 'A sua clínica de saúde, online.', es: 'Su clínica de salud, online.' },
        { s: '.lon-footer-col:nth-child(2) h4', en: 'Consultations', pt: 'Consultas', es: 'Consultas' },
        { s: '.lon-footer-col:nth-child(3) h4', en: 'Lon Clinic', pt: 'Lon Clinic', es: 'Lon Clinic' },
        { s: '.lon-footer-col:nth-child(4) h4', en: 'Information', pt: 'Informação', es: 'Información' },
        { s: '.lon-footer-col:nth-child(5) h4', en: 'Contact', pt: 'Contacto', es: 'Contacto' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/clinica-geral"]', en: 'General Medicine', pt: 'Medicina Geral', es: 'Medicina General' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/urgente"]', en: 'Urgent Medical Consultation', pt: 'Consulta Médica Urgente', es: 'Consulta Médica Urgente' },
        { s: '.lon-footer-col:nth-child(2) a[href="/consulta#por-queixa"]', en: 'Consultations by complaint', pt: 'Consultas por Queixa', es: 'Consultas por motivo' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/travel"]', en: "Traveller's Health", pt: 'Saúde do Viajante', es: 'Salud del Viajero' },
        { s: '.lon-footer-col:nth-child(2) a[href="/saudemental"]', en: 'Mental Health', pt: 'Saúde Mental', es: 'Salud Mental' },
        { s: '.lon-footer-col:nth-child(2) a[href="/nutricao"]', en: 'Nutrition', pt: 'Nutrição', es: 'Nutrición' },
        { s: '.lon-footer-col:nth-child(2) a[href="/terapia-de-casal"]', en: 'Couples therapy', pt: 'Terapia de Casal', es: 'Terapia de pareja' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/longevidade"]', en: 'Longevity', pt: 'Longevidade', es: 'Longevidad' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=sobre-nos"]', en: 'About us', pt: 'Sobre nós', es: 'Sobre nosotros' },
        { s: '.lon-footer-col:nth-child(3) a[href="/equipa/rita-aguiar"]', en: 'The team', pt: 'A Equipa', es: 'El equipo' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=parcerias"]', en: 'Partnerships', pt: 'Parcerias', es: 'Asociaciones' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=registo-medico"]', en: 'Medical records', pt: 'Registo Médico', es: 'Registro médico' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=contato"]', en: 'Contact', pt: 'Contacto', es: 'Contacto' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=trabalhe-connosco"]', en: 'Work with us', pt: 'Trabalhe Connosco', es: 'Trabaje con nosotros' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=como-funciona"]', en: 'How it works', pt: 'Como funciona', es: 'Cómo funciona' },
        { s: '.lon-footer-col:nth-child(4) a[href="/faq"]', en: 'Frequently asked questions', pt: 'Perguntas Frequentes', es: 'Preguntas frecuentes' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=seguranca-dados"]', en: 'Data security', pt: 'Segurança dos Dados', es: 'Seguridad de datos' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=acessibilidade"]', en: 'Accessibility', pt: 'Acessibilidade', es: 'Accesibilidad' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=reclamacoes"]', en: 'Complaints', pt: 'Reclamações', es: 'Reclamaciones' },
        { s: '.lon-footer-col:nth-child(4) a[href="/magazine"]', en: 'Magazine', pt: 'Magazine', es: 'Magazine' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=termos-condicoes"]', en: 'Terms and conditions', pt: 'Termos e Condições', es: 'Términos y condiciones' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=politica-privacidade"]', en: 'Privacy policy', pt: 'Política de Privacidade', es: 'Política de privacidad' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=cookies"]', en: 'Cookie policy', pt: 'Política de Cookies', es: 'Política de cookies' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=acessibilidade"]', en: 'Accessibility', pt: 'Acessibilidade', es: 'Accesibilidad' },
        { s: '.lon-footer-bottom p', en: '\u00A9 Lon Clinic', pt: '\u00A9 Lon Clinic', es: '\u00A9 Lon Clinic' },
    ];

    /* ═══════════════════════════
       TRAVEL PAGE
    ═══════════════════════════ */
    const TRAVEL = [
        { s: 'title', en: 'Travel Medicine Clinic — Travel Globally. Stay Medically Prepared.', pt: 'Clínica de Medicina de Viagem — Viaje Globalmente. Mantenha-se Preparado.', es: 'Clínica de Medicina del Viajero — Viaje globalmente. Manténgase preparado.', special: 'title' },

        /* ── Hero ── */
        { s: '.hero-badge', en: 'Private Travel Medicine Clinic', pt: 'Clínica Privada de Medicina de Viagem', es: 'Clínica Privada de Medicina del Viajero' },
        { s: '.hero-title', en: 'Travel globally.<br>Stay medically prepared.', pt: 'Viaje globalmente.<br>Mantenha-se medicamente preparado.', es: 'Viaje globalmente.<br>Manténgase médicamente preparado.', h: true },
        { s: '.hero-subtitle', en: 'Personalized travel health consultations with experienced physicians — discreet, evidence-based, and tailored to your destination and medical profile.', pt: 'Consultas de saúde de viagem personalizadas com médicos experientes — discretas, baseadas em evidências e adaptadas ao seu destino e perfil médico.', es: 'Consultas de salud del viajero personalizadas con médicos experimentados — discretas, basadas en evidencia y adaptadas a su destino y perfil médico.' },
        { s: '.hero-actions .btn-primary', en: 'Book private travel consultation', pt: 'Marcar consulta privada de viagem', es: 'Reservar consulta privada de viaje' },
        { s: '.hero-actions .btn-outline', en: 'How it works', pt: 'Como funciona', es: 'Cómo funciona' },
        { s: '.rating-text', en: 'Destination-specific medical guidance for discerning international travelers', pt: 'Orientação médica específica por destino para viajantes internacionais exigentes', es: 'Orientación médica específica por destino para viajeros internacionales exigentes' },

        /* ── Why Travel ── */
        { s: '#why-travel .section-label', en: 'Why travel medicine', pt: 'Porquê medicina de viagem', es: 'Por qué medicina del viajero' },
        { s: '#why-travel .section-title', en: 'Because every destination carries<br>different health risks.', pt: 'Porque cada destino apresenta<br>riscos de saúde diferentes.', es: 'Porque cada destino conlleva<br>riesgos de salud diferentes.', h: true },
        { s: '#why-travel .section-desc:nth-child(3)', en: 'International travel exposes you to health risks that vary significantly by region, climate, infrastructure, and type of travel. Careful preparation reduces the likelihood of preventable illness and medical disruption abroad.', pt: 'As viagens internacionais expõem-no a riscos de saúde que variam significativamente por região, clima, infraestrutura e tipo de viagem. Uma preparação cuidadosa reduz a probabilidade de doenças evitáveis e perturbações médicas no estrangeiro.', es: 'Los viajes internacionales le exponen a riesgos de salud que varían significativamente según la región, el clima, la infraestructura y el tipo de viaje. Una preparación cuidadosa reduce la probabilidad de enfermedades prevenibles y contratiempos médicos en el extranjero.' },
        { s: '#why-travel .section-desc:nth-child(4)', en: 'Our travel consultations focus on proactive risk reduction so you can travel with confidence and peace of mind.', pt: 'As nossas consultas de viagem focam-se na redução proativa de riscos para que possa viajar com confiança e tranquilidade.', es: 'Nuestras consultas de viaje se centran en la reducción proactiva de riesgos para que pueda viajar con confianza y tranquilidad.' },
        { s: '#why-travel .included-card:nth-child(1) h3', en: 'Food- & Water-Borne Infections', pt: 'Infeções Alimentares e Hídricas', es: 'Infecciones alimentarias e hídricas' },
        { s: '#why-travel .included-card:nth-child(1) p', en: "Traveler's diarrhea, typhoid, hepatitis A, and other ingestion-related illnesses that vary by destination hygiene standards.", pt: 'Diarreia do viajante, febre tifoide, hepatite A e outras doenças relacionadas com a ingestão que variam conforme os padrões de higiene do destino.', es: 'Diarrea del viajero, fiebre tifoidea, hepatitis A y otras enfermedades relacionadas con la ingestión que varían según los estándares de higiene del destino.' },
        { s: '#why-travel .included-card:nth-child(2) h3', en: 'Mosquito-Borne Illnesses', pt: 'Doenças Transmitidas por Mosquitos', es: 'Enfermedades transmitidas por mosquitos' },
        { s: '#why-travel .included-card:nth-child(2) p', en: 'Malaria, dengue, Zika, and other vector-borne diseases requiring destination-specific prevention strategies.', pt: 'Malária, dengue, Zika e outras doenças transmitidas por vetores que requerem estratégias de prevenção específicas para o destino.', es: 'Malaria, dengue, Zika y otras enfermedades transmitidas por vectores que requieren estrategias de prevención específicas para el destino.' },
        { s: '#why-travel .included-card:nth-child(3) h3', en: 'Vaccine-Preventable Diseases', pt: 'Doenças Preveníveis por Vacinação', es: 'Enfermedades prevenibles por vacunación' },
        { s: '#why-travel .included-card:nth-child(3) p', en: "Ensuring you're protected against region-specific infectious diseases through proper immunization planning.", pt: 'Garantir a sua proteção contra doenças infecciosas específicas da região através de um planeamento de vacinação adequado.', es: 'Garantizar su protección contra enfermedades infecciosas específicas de la región mediante una planificación de vacunación adecuada.' },
        { s: '#why-travel .included-card:nth-child(4) h3', en: 'Altitude-Related Conditions', pt: 'Condições Relacionadas com Altitude', es: 'Enfermedades relacionadas con la altitud' },
        { s: '#why-travel .included-card:nth-child(4) p', en: 'Altitude sickness prevention and management for travel to high-elevation destinations and mountainous regions.', pt: 'Prevenção e gestão do mal de altitude para viagens a destinos de elevada altitude e regiões montanhosas.', es: 'Prevención y tratamiento del mal de altura para viajes a destinos de gran altitud y regiones montañosas.' },
        { s: '#why-travel .included-card:nth-child(5) h3', en: 'Region-Specific Environmental Risks', pt: 'Riscos Ambientais Específicos da Região', es: 'Riesgos ambientales específicos de la región' },
        { s: '#why-travel .included-card:nth-child(5) p', en: 'Climate extremes, sun exposure, wildlife hazards, and other environmental factors unique to your travel destinations.', pt: 'Extremos climáticos, exposição solar, perigos da vida selvagem e outros fatores ambientais únicos dos seus destinos de viagem.', es: 'Extremos climáticos, exposición solar, peligros de la fauna salvaje y otros factores ambientales propios de sus destinos de viaje.' },
        { s: '#why-travel .included-card:nth-child(6) h3', en: 'Travel-Related Medication Planning', pt: 'Planeamento de Medicação de Viagem', es: 'Planificación de medicación para el viaje' },
        { s: '#why-travel .included-card:nth-child(6) p', en: 'Ensuring you have appropriate medications, standby treatments, and an organized travel medical kit for your journey.', pt: 'Garantir que tem medicamentos adequados, tratamentos de reserva e um kit médico de viagem organizado para a sua jornada.', es: 'Garantizar que dispone de los medicamentos adecuados, tratamientos de reserva y un botiquín médico organizado para su viaje.' },

        /* ── What We Provide ── */
        { s: '#what-we-provide .section-label', en: 'What we provide', pt: 'O que oferecemos', es: 'Lo que ofrecemos' },
        { s: '#what-we-provide .section-title', en: 'Comprehensive, physician-led<br>travel health planning.', pt: 'Planeamento de saúde de viagem<br>abrangente, liderado por médicos.', es: 'Planificación integral de salud del viajero<br>dirigida por médicos.', h: true },
        { s: '#what-we-provide .detect-card:nth-child(1) h3', en: 'Vaccination Strategy', pt: 'Estratégia de Vacinação', es: 'Estrategia de vacunación' },
        { s: '#what-we-provide .detect-card:nth-child(1) p', en: 'Personalized review of your immunization history with clear recommendations based on your itinerary and risk level.', pt: 'Revisão personalizada do seu historial de vacinação com recomendações claras baseadas no seu itinerário e nível de risco.', es: 'Revisión personalizada de su historial de vacunación con recomendaciones claras según su itinerario y nivel de riesgo.' },
        { s: '#what-we-provide .detect-card:nth-child(2) h3', en: 'Malaria Risk Assessment', pt: 'Avaliação de Risco de Malária', es: 'Evaluación del riesgo de malaria' },
        { s: '#what-we-provide .detect-card:nth-child(2) p', en: 'Destination-based evaluation and preventive prescriptions when appropriate, tailored to your specific travel plans.', pt: 'Avaliação baseada no destino e prescrições preventivas quando adequado, adaptadas aos seus planos de viagem específicos.', es: 'Evaluación basada en el destino y prescripciones preventivas cuando corresponda, adaptadas a sus planes de viaje específicos.' },
        { s: '#what-we-provide .detect-card:nth-child(3) h3', en: 'Travel Illness Preparedness', pt: 'Preparação para Doenças de Viagem', es: 'Preparación para enfermedades del viajero' },
        { s: '#what-we-provide .detect-card:nth-child(3) p', en: "Guidance and, when indicated, standby treatment options for common travel-related conditions such as traveler's diarrhea.", pt: 'Orientação e, quando indicado, opções de tratamento de reserva para condições comuns relacionadas com viagens, como a diarreia do viajante.', es: 'Orientación y, cuando esté indicado, opciones de tratamiento de reserva para afecciones comunes del viajero, como la diarrea.' },
        { s: '#what-we-provide .detect-card:nth-child(4) h3', en: 'Altitude & Environmental Medicine', pt: 'Medicina de Altitude e Ambiental', es: 'Medicina de altura y ambiental' },
        { s: '#what-we-provide .detect-card:nth-child(4) p', en: 'Prevention and management strategies for high-altitude or extreme-climate travel, including acclimatization guidance.', pt: 'Estratégias de prevenção e gestão para viagens em altitude elevada ou clima extremo, incluindo orientação de aclimatação.', es: 'Estrategias de prevención y manejo para viajes a gran altitud o climas extremos, incluida la orientación sobre aclimatación.' },
        { s: '#what-we-provide .detect-card:nth-child(5) h3', en: 'Chronic Condition Planning', pt: 'Planeamento para Condições Crónicas', es: 'Planificación para enfermedades crónicas' },
        { s: '#what-we-provide .detect-card:nth-child(5) p', en: 'Tailored advice for travelers managing cardiovascular, respiratory, metabolic, or other ongoing medical conditions abroad.', pt: 'Aconselhamento personalizado para viajantes que gerem condições cardiovasculares, respiratórias, metabólicas ou outras condições médicas no estrangeiro.', es: 'Asesoramiento personalizado para viajeros que controlan afecciones cardiovasculares, respiratorias, metabólicas u otras enfermedades crónicas en el extranjero.' },
        { s: '#what-we-provide .detect-card:nth-child(6) h3', en: 'Medical Travel Kit Guidance', pt: 'Orientação para Kit Médico de Viagem', es: 'Orientación para el botiquín de viaje' },
        { s: '#what-we-provide .detect-card:nth-child(6) p', en: 'Curated recommendations on essential medications and supplies based on your destination and travel style.', pt: 'Recomendações curadas sobre medicamentos e materiais essenciais com base no seu destino e estilo de viagem.', es: 'Recomendaciones seleccionadas sobre medicamentos y suministros esenciales según su destino y estilo de viaje.' },

        /* ── How It Works ── */
        { s: '#how-it-works .section-label', en: 'How it works', pt: 'Como funciona', es: 'Cómo funciona' },
        { s: '#how-it-works .section-title', en: 'Discreet, efficient,<br>and fully online.', pt: 'Discreto, eficiente<br>e totalmente online.', es: 'Discreto, eficiente<br>y totalmente online.', h: true },
        { s: '#how-it-works .section-desc', en: 'Our travel health consultations are designed for convenience without compromising on thoroughness or medical quality.', pt: 'As nossas consultas de saúde de viagem são concebidas para conveniência sem comprometer a rigorosidade ou qualidade médica.', es: 'Nuestras consultas de salud del viajero están diseñadas para la comodidad sin comprometer la exhaustividad ni la calidad médica.' },
        { s: '#how-it-works .process-step:nth-child(1) .step-time', en: 'Step 1', pt: 'Passo 1', es: 'Paso 1' },
        { s: '#how-it-works .process-step:nth-child(1) h4', en: 'Share your itinerary', pt: 'Partilhe o seu itinerário', es: 'Comparta su itinerario' },
        { s: '#how-it-works .process-step:nth-child(1) p', en: 'Destinations, timing, style of travel, and planned activities.', pt: 'Destinos, datas, estilo de viagem e atividades planeadas.', es: 'Destinos, fechas, estilo de viaje y actividades planificadas.' },
        { s: '#how-it-works .process-step:nth-child(2) .step-time', en: 'Step 2', pt: 'Passo 2', es: 'Paso 2' },
        { s: '#how-it-works .process-step:nth-child(2) h4', en: 'Provide your medical background', pt: 'Forneça o seu historial médico', es: 'Proporcione su historial médico' },
        { s: '#how-it-works .process-step:nth-child(2) p', en: 'Relevant medical history, medications, allergies, and vaccination records where available.', pt: 'Historial médico relevante, medicamentos, alergias e registos de vacinação quando disponíveis.', es: 'Historial médico relevante, medicamentos, alergias y registros de vacunación cuando estén disponibles.' },
        { s: '#how-it-works .process-step:nth-child(3) .step-time', en: 'Step 3', pt: 'Passo 3', es: 'Paso 3' },
        { s: '#how-it-works .process-step:nth-child(3) h4', en: 'Private video consultation', pt: 'Consulta privada por vídeo', es: 'Consulta privada por vídeo' },
        { s: '#how-it-works .process-step:nth-child(3) p', en: 'A focused discussion with a physician trained in travel and preventive medicine.', pt: 'Uma discussão focada com um médico formado em medicina de viagem e preventiva.', es: 'Una conversación enfocada con un médico formado en medicina del viajero y preventiva.' },
        { s: '#how-it-works .process-step:nth-child(4) .step-time', en: 'Step 4', pt: 'Passo 4', es: 'Paso 4' },
        { s: '#how-it-works .process-step:nth-child(4) h4', en: 'Your personalized travel health plan', pt: 'O seu plano de saúde de viagem personalizado', es: 'Su plan de salud del viajero personalizado' },
        { s: '#how-it-works .process-step:nth-child(4) p', en: 'Clear written guidance, vaccine recommendations, and prescriptions when appropriate and permitted.', pt: 'Orientação escrita clara, recomendações de vacinas e prescrições quando adequado e permitido.', es: 'Orientación escrita clara, recomendaciones de vacunas y prescripciones cuando corresponda y esté permitido.' },
        { s: '#how-it-works .process-note span', en: 'Whenever possible, consultations should take place 4–8 weeks prior to departure to allow time for vaccinations and preventive measures.', pt: 'Sempre que possível, as consultas devem realizar-se 4–8 semanas antes da partida para permitir tempo para vacinações e medidas preventivas.', es: 'Siempre que sea posible, las consultas deben realizarse 4–8 semanas antes de la partida para disponer de tiempo para las vacunas y las medidas preventivas.' },

        /* ── Vaccines ── */
        { s: '#vaccines .section-label', en: 'Vaccination guidance', pt: 'Orientação sobre vacinação', es: 'Orientación sobre vacunación' },
        { s: '#vaccines .section-title', en: 'Clear, evidence-based<br>vaccine recommendations.', pt: 'Recomendações de vacinas<br>claras e baseadas em evidências.', es: 'Recomendaciones de vacunas<br>claras y basadas en evidencia.', h: true },
        { s: '#vaccines .section-desc', en: 'Vaccine decisions are individualized and based on destination-specific risk, duration of stay, planned activities, and your personal medical profile.', pt: 'As decisões sobre vacinas são individualizadas e baseadas no risco específico do destino, duração da estadia, atividades planeadas e o seu perfil médico pessoal.', es: 'Las decisiones sobre vacunas son individualizadas y se basan en el riesgo específico del destino, la duración de la estancia, las actividades planificadas y su perfil médico personal.' },
        { s: '#vaccines .vaccine-card:nth-child(1) h3', en: 'Routine Adult Protection', pt: 'Proteção de Rotina para Adultos', es: 'Protección rutinaria para adultos' },
        { s: '#vaccines .vaccine-card:nth-child(1) p', en: 'Which immunizations are part of standard adult health maintenance and may need updating.', pt: 'Quais imunizações fazem parte da manutenção padrão da saúde do adulto e podem precisar de atualização.', es: 'Qué inmunizaciones forman parte del mantenimiento estándar de salud del adulto y pueden necesitar actualización.' },
        { s: '#vaccines .vaccine-card:nth-child(2) h3', en: 'Itinerary-Specific Vaccines', pt: 'Vacinas Específicas do Itinerário', es: 'Vacunas específicas del itinerario' },
        { s: '#vaccines .vaccine-card:nth-child(2) p', en: 'Which immunizations are recommended for your specific destinations and travel activities.', pt: 'Quais imunizações são recomendadas para os seus destinos específicos e atividades de viagem.', es: 'Qué inmunizaciones se recomiendan para sus destinos específicos y actividades de viaje.' },
        { s: '#vaccines .vaccine-card:nth-child(3) h3', en: 'Entry Requirements', pt: 'Requisitos de Entrada', es: 'Requisitos de entrada' },
        { s: '#vaccines .vaccine-card:nth-child(3) p', en: 'Which immunizations may be required for entry into certain countries, including documentation guidance.', pt: 'Quais imunizações podem ser exigidas para entrada em determinados países, incluindo orientação sobre documentação.', es: 'Qué inmunizaciones pueden ser necesarias para entrar en determinados países, incluida la orientación sobre documentación.' },
        { s: '#vaccines .vaccine-card:nth-child(4) h3', en: 'Local Vaccination Arrangement', pt: 'Organização de Vacinação Local', es: 'Organización de vacunación local' },
        { s: '#vaccines .vaccine-card:nth-child(4) p', en: 'If in-person vaccination is indicated, we guide you on arranging this safely and efficiently in your location.', pt: 'Se a vacinação presencial for indicada, orientamos sobre como organizá-la de forma segura e eficiente na sua localização.', es: 'Si se indica la vacunación presencial, le orientamos para organizarla de forma segura y eficiente en su localidad.' },

        /* ── Travel Style ── */
        { s: '#travel-style .section-label', en: 'Tailored to you', pt: 'Adaptado a si', es: 'Adaptado a usted' },
        { s: '#travel-style .section-title', en: 'Travel medicine for every type<br>of international traveler.', pt: 'Medicina de viagem para todo o tipo<br>de viajante internacional.', es: 'Medicina del viajero para todo tipo<br>de viajero internacional.', h: true },
        { s: '#travel-style .travel-style-card:nth-child(1) h3', en: 'Leisure & Luxury Travel', pt: 'Viagem de Lazer e Luxo', es: 'Viaje de ocio y lujo' },
        { s: '#travel-style .travel-style-card:nth-child(1) p', en: 'Resort stays, cruises, and urban destinations with tailored health preparation for relaxed travel.', pt: 'Estadas em resorts, cruzeiros e destinos urbanos com preparação de saúde adaptada para viagens relaxadas.', es: 'Estancias en resorts, cruceros y destinos urbanos con preparación sanitaria adaptada para viajes relajados.' },
        { s: '#travel-style .travel-style-card:nth-child(2) h3', en: 'Adventure & Remote Travel', pt: 'Viagem de Aventura e Remota', es: 'Viaje de aventura y lugares remotos' },
        { s: '#travel-style .travel-style-card:nth-child(2) p', en: 'Trekking, safari, rural regions, and expedition-style trips requiring thorough medical preparation.', pt: 'Trekking, safari, regiões rurais e viagens de estilo expedição que requerem preparação médica rigorosa.', es: 'Senderismo, safari, regiones rurales y viajes de expedición que requieren una preparación médica exhaustiva.' },
        { s: '#travel-style .travel-style-card:nth-child(3) h3', en: 'Frequent Business Travel', pt: 'Viagens de Negócios Frequentes', es: 'Viajes de negocios frecuentes' },
        { s: '#travel-style .travel-style-card:nth-child(3) p', en: 'Ongoing support for professionals traveling across multiple regions with efficient, repeated consultation options.', pt: 'Apoio contínuo para profissionais que viajam por várias regiões com opções de consulta eficientes e recorrentes.', es: 'Apoyo continuo para profesionales que viajan por varias regiones con opciones de consulta eficientes y recurrentes.' },
        { s: '#travel-style .travel-style-card:nth-child(4) h3', en: 'Extended Stays & Relocation', pt: 'Estadias Prolongadas e Relocalização', es: 'Estancias prolongadas y reubicación' },
        { s: '#travel-style .travel-style-card:nth-child(4) p', en: 'Planning for long-term travel, second residences, or temporary relocation with comprehensive health strategy.', pt: 'Planeamento para viagens de longo prazo, segundas residências ou relocalização temporária com estratégia de saúde abrangente.', es: 'Planificación para viajes de larga duración, segundas residencias o reubicación temporal con una estrategia de salud integral.' },
        { s: '#travel-style .travel-style-card:nth-child(5) h3', en: 'Travel with Medical Conditions', pt: 'Viajar com Condições Médicas', es: 'Viajar con enfermedades crónicas' },
        { s: '#travel-style .travel-style-card:nth-child(5) p', en: 'Specialized preparation for travelers with existing health concerns requiring careful medical planning.', pt: 'Preparação especializada para viajantes com preocupações de saúde existentes que requerem planeamento médico cuidadoso.', es: 'Preparación especializada para viajeros con problemas de salud existentes que requieren una planificación médica cuidadosa.' },

        /* ── Doctor / Team ── */
        { s: '#team .section-label', en: 'Your medical team', pt: 'A sua equipa médica', es: 'Su equipo médico' },
        { s: '#team .section-title', en: 'Experienced physicians in travel and preventive medicine.', pt: 'Médicos experientes em medicina de viagem e preventiva.', es: 'Médicos experimentados en medicina del viajero y preventiva.' },
        { s: '#team .section-desc', en: 'Our doctors provide careful, up-to-date guidance grounded in international travel health standards. Every consultation is personalized, thorough, and designed to support safe travel without unnecessary interventions.', pt: 'Os nossos médicos fornecem orientação cuidadosa e atualizada fundamentada nos padrões internacionais de saúde de viagem. Cada consulta é personalizada, rigorosa e concebida para apoiar viagens seguras sem intervenções desnecessárias.', es: 'Nuestros médicos ofrecen una orientación cuidadosa y actualizada basada en los estándares internacionales de salud del viajero. Cada consulta es personalizada, exhaustiva y diseñada para apoyar viajes seguros sin intervenciones innecesarias.' },
        { s: '#team .doctor-list li:nth-child(1) span', en: 'Licensed physicians', pt: 'Médicos licenciados', es: 'Médicos licenciados' },
        { s: '#team .doctor-list li:nth-child(2) span', en: 'Evidence-based international travel guidance', pt: 'Orientação internacional de viagem baseada em evidências', es: 'Orientación de viaje internacional basada en evidencia' },
        { s: '#team .doctor-list li:nth-child(3) span', en: 'Personalized risk assessment', pt: 'Avaliação de risco personalizada', es: 'Evaluación de riesgo personalizada' },
        { s: '#team .doctor-list li:nth-child(4) span', en: 'Clear documentation for your records', pt: 'Documentação clara para os seus registos', es: 'Documentación clara para sus registros' },

        /* ── FAQ ── */
        { s: '#faq .section-label', en: 'Support', pt: 'Suporte', es: 'Soporte' },
        { s: '#faq .section-title', en: 'Frequently asked questions.', pt: 'Perguntas frequentes.', es: 'Preguntas frecuentes.' },
        { s: '#faq .faq-item:nth-child(1) .faq-question span', en: 'Are consultations conducted online?', pt: 'As consultas são realizadas online?', es: '¿Las consultas se realizan online?' },
        { s: '#faq .faq-item:nth-child(1) .faq-answer p', en: 'Yes. All travel consultations take place via secure video. You can connect from anywhere in the world, making it easy to prepare for your trip regardless of your current location.', pt: 'Sim. Todas as consultas de viagem realizam-se por vídeo seguro. Pode conectar-se a partir de qualquer lugar do mundo, facilitando a preparação da sua viagem independentemente da sua localização atual.', es: 'Sí. Todas las consultas del viajero se realizan por vídeo seguro. Puede conectarse desde cualquier lugar del mundo, lo que facilita la preparación de su viaje independientemente de su ubicación actual.' },
        { s: '#faq .faq-item:nth-child(2) .faq-question span', en: 'Can prescriptions be provided?', pt: 'Podem ser fornecidas prescrições?', es: '¿Se pueden proporcionar recetas?' },
        { s: '#faq .faq-item:nth-child(2) .faq-answer p', en: 'When medically appropriate and legally permitted, we can provide prescriptions related to travel health prevention or treatment, including malaria prophylaxis and standby treatments.', pt: 'Quando medicamente adequado e legalmente permitido, podemos fornecer prescrições relacionadas com a prevenção ou tratamento de saúde de viagem, incluindo profilaxia de malária e tratamentos de reserva.', es: 'Cuando sea médicamente apropiado y legalmente permitido, podemos proporcionar recetas relacionadas con la prevención o tratamiento de la salud del viajero, incluida la profilaxis antipalúdica y los tratamientos de reserva.' },
        { s: '#faq .faq-item:nth-child(3) .faq-question span', en: 'Do you administer vaccines directly?', pt: 'Administram vacinas diretamente?', es: '¿Administran vacunas directamente?' },
        { s: '#faq .faq-item:nth-child(3) .faq-answer p', en: 'We provide medical recommendations and documentation. If vaccines are indicated, we guide you in arranging them locally through trusted providers in your area.', pt: 'Fornecemos recomendações médicas e documentação. Se as vacinas forem indicadas, orientamos na sua organização local através de prestadores de confiança na sua área.', es: 'Proporcionamos recomendaciones médicas y documentación. Si se indican vacunas, le orientamos para organizarlas localmente a través de proveedores de confianza en su área.' },
        { s: '#faq .faq-item:nth-child(4) .faq-question span', en: 'How far in advance should I book?', pt: 'Com quanta antecedência devo marcar?', es: '¿Con cuánta antelación debo reservar?' },
        { s: '#faq .faq-item:nth-child(4) .faq-answer p', en: 'Ideally 4–8 weeks before departure to allow adequate time for vaccinations and preventive measures. However, we can still assist with shorter timelines and provide valuable guidance even close to your departure date.', pt: 'Idealmente 4–8 semanas antes da partida para permitir tempo adequado para vacinações e medidas preventivas. No entanto, podemos assistir com prazos mais curtos e fornecer orientação valiosa mesmo próximo da data de partida.', es: 'Idealmente 4–8 semanas antes de la salida para disponer del tiempo adecuado para las vacunas y las medidas preventivas. Sin embargo, también podemos ayudarle con plazos más cortos y proporcionar orientación valiosa incluso cerca de la fecha de salida.' },
        { s: '#faq .faq-item:nth-child(5) .faq-question span', en: 'Can you advise travelers with existing medical conditions?', pt: 'Podem aconselhar viajantes com condições médicas existentes?', es: '¿Pueden asesorar a viajeros con enfermedades crónicas?' },
        { s: '#faq .faq-item:nth-child(5) .faq-answer p', en: 'Yes. We provide tailored planning to help reduce risk while traveling with ongoing health concerns, including cardiovascular, respiratory, metabolic, and other chronic conditions.', pt: 'Sim. Fornecemos planeamento personalizado para ajudar a reduzir riscos ao viajar com preocupações de saúde contínuas, incluindo condições cardiovasculares, respiratórias, metabólicas e outras crónicas.', es: 'Sí. Ofrecemos una planificación personalizada para ayudar a reducir el riesgo al viajar con problemas de salud crónicos, incluidas las enfermedades cardiovasculares, respiratorias, metabólicas y otras.' },

        /* ── Longevity Bridge ── */
        { s: '#longevity-bridge .travel-title', en: 'Thinking beyond this trip?', pt: 'A pensar para além desta viagem?', es: '¿Piensa más allá de este viaje?' },
        { s: '#longevity-bridge .travel-desc', en: 'Our clinic also provides in-depth longevity and preventive health assessments focused on long-term wellbeing and healthy aging.', pt: 'A nossa clínica também oferece avaliações aprofundadas de longevidade e saúde preventiva focadas no bem-estar a longo prazo e envelhecimento saudável.', es: 'Nuestra clínica también ofrece evaluaciones exhaustivas de longevidad y salud preventiva centradas en el bienestar a largo plazo y el envejecimiento saludable.' },
        { s: '#longevity-bridge .btn', en: 'Explore our Longevity Clinic \u2192', pt: 'Explore a nossa Clínica de Longevidade \u2192', es: 'Explore nuestra Clínica de Longevidad \u2192' },

        /* ── CTA ── */
        { s: '#book .cta-title', en: 'Travel with clarity<br>and confidence.', pt: 'Viaje com clareza<br>e confiança.', es: 'Viaje con claridad<br>y confianza.', h: true },
        { s: '#book .cta-desc', en: 'Receive personalized, physician-led travel health guidance tailored to your journey and medical profile.', pt: 'Receba orientação de saúde de viagem personalizada, liderada por médicos, adaptada à sua jornada e perfil médico.', es: 'Reciba orientación de salud del viajero personalizada, dirigida por médicos, adaptada a su viaje y perfil médico.' },
        { s: '#book .cta-content > .btn', en: 'Book your private travel consultation', pt: 'Marque a sua consulta privada de viagem', es: 'Reserve su consulta privada de viaje' },
        { s: '#book .cta-travel-link', en: 'Looking for long-term preventive care? Visit our Longevity Clinic \u2192', pt: 'Procura cuidados preventivos a longo prazo? Visite a nossa Clínica de Longevidade \u2192', es: '¿Busca atención preventiva a largo plazo? Visite nuestra Clínica de Longevidad \u2192' },

        /* ── Footer (travel-specific) ── */
        { s: '.footer-columns .footer-links:nth-child(1) a:nth-child(2)', en: 'About', pt: 'Sobre', es: 'Sobre nosotros' },
        { s: '.footer-columns .footer-links:nth-child(1) a[href="/#team"]', en: 'Medical Team', pt: 'Equipa Médica', es: 'Equipo Médico' },
        { s: '.footer-links a[href="/"]', en: 'Longevity Clinic', pt: 'Clínica de Longevidade', es: 'Clínica de Longevidad' },
        { s: '.footer-links a[href="#book"]', en: 'Travel Consultation', pt: 'Consulta de Viagem', es: 'Consulta de Viaje' },
        { s: '.footer-links a[href="#how-it-works"]', en: 'How It Works', pt: 'Como Funciona', es: 'Cómo Funciona' },
        { s: '.footer-links a[href="#vaccines"]', en: 'Vaccinations', pt: 'Vacinações', es: 'Vacunas' },
    ];

    /* ═══════════════════════════
       BOOK PAGE
    ═══════════════════════════ */
    const BOOK = [
        { s: 'title', en: 'Book Your Consultation — Lon Clinic', pt: 'Marcar Consulta — Lon Clinic', es: 'Reservar Consulta — Lon Clinic', special: 'title' },

        /* ── Progress Steps ── */
        { s: '.progress-step[data-step="1"] .progress-label', en: 'Time', pt: 'Horário', es: 'Horario' },
        { s: '.progress-step[data-step="2"] .progress-label', en: 'Details & payment', pt: 'Dados e pagamento', es: 'Datos y pago' },
        { s: '.progress-step[data-step="4"] .progress-label', en: 'Confirmed', pt: 'Confirmado', es: 'Confirmado' },

        /* ── Step 1: Schedule ── */
        { s: '#step-1 .step-title', en: 'Choose date & time', pt: 'Escolha data e hora', es: 'Elija fecha y hora' },
        { s: '#step-1 .step-desc', en: 'Select a convenient time for your video consultation.', pt: 'Selecione um horário conveniente para a sua consulta por vídeo.', es: 'Seleccione una hora conveniente para su consulta por vídeo.' },
        { s: '.timezone-info span', en: 'Times shown in your local timezone', pt: 'Horários apresentados no seu fuso horário local', es: 'Horarios mostrados en su zona horaria local' },
        { s: '#back-1', en: 'Back', pt: 'Voltar', es: 'Atrás' },
        { s: '#next-1', en: 'Continue to details', pt: 'Continuar para dados', es: 'Continuar a datos' },

        /* ── Step 2: Details ── */
        { s: '#step-2 .step-title', en: 'Almost there. Let\'s confirm your appointment.', pt: 'Quase lá. Vamos confirmar a sua consulta.', es: 'Casi listo. Confirmemos su consulta.' },
        { s: '#checkoutEyebrow', en: 'Confirm and pay', pt: 'Confirmar e pagar', es: 'Confirmar y pagar' },
        { s: '#checkoutHeroLead', en: 'Review the time and psychologist, add your contact details, then complete secure payment.', pt: 'Reveja o horário e o psicólogo, indique o contacto e conclua o pagamento seguro.', es: 'Revise el horario y el psicólogo, indique su contacto y complete el pago seguro.' },
        { s: '#checkoutConsultKicker', en: 'Your appointment', pt: 'A sua consulta', es: 'Su consulta' },
        { s: '#checkoutModeChip', en: 'Video call', pt: 'Videochamada', es: 'Videollamada' },
        { s: '#checkoutTypeLabel', en: 'Type', pt: 'Tipo', es: 'Tipo' },
        { s: '#checkoutWhenLabel', en: 'When', pt: 'Quando', es: 'Cuándo' },
        { s: '#checkoutDurationLabel', en: 'Duration', pt: 'Duração', es: 'Duración' },
        { s: '#checkoutPriceLabel', en: 'Price', pt: 'Valor', es: 'Precio' },
        { s: '#checkoutDetailsTitle', en: 'Your details:', pt: 'Os seus dados:', es: 'Sus datos:' },
        { s: 'label[for="firstName"]', en: 'First name *', pt: 'Nome *', es: 'Nombre *' },
        { s: '#firstName', a: 'placeholder', en: 'John', pt: 'João', es: 'Juan' },
        { s: '#firstName ~ .form-error', en: 'Please enter your first name', pt: 'Por favor introduza o seu primeiro nome', es: 'Por favor introduzca su nombre' },
        { s: 'label[for="lastName"]', en: 'Last name *', pt: 'Apelido *', es: 'Apellido *' },
        { s: '#lastName', a: 'placeholder', en: 'Doe', pt: 'Silva', es: 'García' },
        { s: '#lastName ~ .form-error', en: 'Please enter your last name', pt: 'Por favor introduza o seu apelido', es: 'Por favor introduzca su apellido' },
        { s: 'label[for="email"]', en: 'Email *', pt: 'Email *', es: 'Email *' },
        { s: '#email', a: 'placeholder', en: 'john@example.com', pt: 'joao@exemplo.com', es: 'juan@ejemplo.com' },
        { s: '#email ~ .form-error', en: 'Please enter a valid email address', pt: 'Por favor introduza um endereço de email válido', es: 'Por favor introduzca un correo electrónico válido' },
        { s: 'label[for="phone"]', en: 'Mobile *', pt: 'Telemóvel *', es: 'Móvil *' },
        { s: '#phone', a: 'placeholder', en: '+351 928 372 775', pt: '+351 928 372 775', es: '+34 600 000 000' },
        { s: '#phone ~ .form-error', en: 'Please enter your phone number', pt: 'Por favor introduza o seu número de telefone', es: 'Por favor introduzca su número de teléfono' },
        { s: 'label[for="dob"]', en: 'Date of birth *', pt: 'Data de nascimento *', es: 'Fecha de nacimiento *' },
        { s: '#dob ~ .form-error', en: 'Please enter your date of birth', pt: 'Por favor introduza a sua data de nascimento', es: 'Por favor introduzca su fecha de nacimiento' },
        { s: 'label[for="country"]', en: 'Country of residence *', pt: 'País de residência *', es: 'País de residencia *' },
        { s: '#country option[value=""]', en: 'Select your country', pt: 'Selecione o seu país', es: 'Seleccione su país' },
        { s: '#country ~ .form-error', en: 'Please select your country', pt: 'Por favor selecione o seu país', es: 'Por favor seleccione su país' },
        { s: '.form-subsection-title', en: 'Health background', pt: 'Historial de saúde', es: 'Historial de salud' },
        { s: 'label[for="travelDest"]', en: 'Travel destination(s) *', pt: 'Destino(s) de viagem *', es: 'Destino(s) de viaje *' },
        { s: '#travelDest', a: 'placeholder', en: 'e.g. Thailand, Kenya, Peru', pt: 'ex. Tailândia, Quénia, Peru', es: 'ej. Tailandia, Kenia, Perú' },
        { s: '#travelDest ~ .form-hint', en: 'List all planned destinations for this trip', pt: 'Liste todos os destinos planeados para esta viagem', es: 'Liste todos los destinos planificados para este viaje' },
        { s: 'label[for="travelDates"]', en: 'Travel dates', pt: 'Datas de viagem', es: 'Fechas de viaje' },
        { s: '#travelDates', a: 'placeholder', en: 'e.g. March 15 – April 2, 2026', pt: 'ex. 15 de Março – 2 de Abril, 2026', es: 'ej. 15 de marzo – 2 de abril, 2026' },
        { s: 'label[for="concerns"]', en: 'Primary health concerns or goals', pt: 'Principais preocupações de saúde ou objetivos', es: 'Principales preocupaciones de salud u objetivos' },
        { s: '#concerns', a: 'placeholder', en: 'Describe what prompted you to book this consultation, any specific concerns, or health goals you\'d like to discuss...', pt: 'Descreva o que o levou a marcar esta consulta, quaisquer preocupações específicas ou objetivos de saúde que gostaria de discutir...', es: 'Describa qué le motivó a reservar esta consulta, cualquier preocupación específica u objetivos de salud que desee comentar...' },
        { s: 'label[for="medications"]', en: 'Current medications (if any)', pt: 'Medicação atual (se aplicável)', es: 'Medicamentos actuales (si los hay)' },
        { s: '#medications', a: 'placeholder', en: 'List any current medications, supplements, or treatments...', pt: 'Liste quaisquer medicamentos, suplementos ou tratamentos atuais...', es: 'Liste cualquier medicamento, suplemento o tratamiento actual...' },
        { s: 'label[for="allergies"]', en: 'Known allergies', pt: 'Alergias conhecidas', es: 'Alergias conocidas' },
        { s: '#allergies', a: 'placeholder', en: 'e.g. Penicillin, latex, none', pt: 'ex. Penicilina, látex, nenhuma', es: 'ej. Penicilina, látex, ninguna' },
        { s: '#checkoutBeforeTitle', en: 'What happens next:', pt: 'O que acontece a seguir:', es: 'Qué ocurre a continuación:' },
        { s: '#checkoutBeforeStep1', en: 'Complete the booking', pt: 'Finalizar o agendamento', es: 'Finalizar la reserva' },
        { s: '#checkoutBeforeStep2', en: 'You will receive a form by email to fill in your symptoms and clinical information securely.', pt: 'Receberá no email um formulário para preencher os seus sintomas e informação clínica de forma segura.', es: 'Recibirá por correo un formulario para completar sus síntomas e información clínica de forma segura.' },
        { s: '#consentText', en: 'I accept the <a href="/info.html?page=termos-condicoes" style="color: var(--accent);">Terms and Conditions</a> and the <a href="/info.html?page=politica-privacidade" style="color: var(--accent);">Privacy Policy</a>, and I consent to the secure processing of my health data for this private medical consultation.', pt: 'Aceito os <a href="/info.html?page=termos-condicoes" style="color: var(--accent);">Termos e Condições</a> e a <a href="/info.html?page=politica-privacidade" style="color: var(--accent);">Política de Privacidade</a>, e autorizo o tratamento seguro dos meus dados de saúde para esta consulta médica privada.', es: 'Acepto los <a href="/info.html?page=termos-condicoes" style="color: var(--accent);">Términos y Condiciones</a> y la <a href="/info.html?page=politica-privacidade" style="color: var(--accent);">Política de privacidad</a>, y autorizo el tratamiento seguro de mis datos de salud para esta consulta médica privada.', h: true },
        { s: '#consentError', en: 'You must accept the terms to proceed', pt: 'Tem de aceitar os termos para prosseguir', es: 'Debe aceptar los términos para continuar' },
        { s: '#checkoutPayTitle', en: 'Payment', pt: 'Pagamento', es: 'Pago' },
        { s: '#checkoutPayNote', en: 'Secure payment with card, Apple Pay or Google Pay, when available.', pt: 'Pagamento seguro com cartão, Apple Pay ou Google Pay, quando disponíveis.', es: 'Pago seguro con tarjeta, Apple Pay o Google Pay, cuando estén disponibles.' },
        { s: '#back-2', en: 'Back', pt: 'Voltar', es: 'Atrás' },
        { s: '#bookingSlotChange', en: 'Change time', pt: 'Alterar horário', es: 'Cambiar horario' },
        { s: '#lonBuyTrustLine1', en: 'Secure payment', pt: 'Pagamento seguro', es: 'Pago seguro' },
        { s: '#lonBuyTrustLine2', en: 'Appointment confirmed immediately after payment', pt: 'Consulta confirmada imediatamente após o pagamento', es: 'Consulta confirmada inmediatamente después del pago' },
        { s: '#lonBuyTrustLine3', en: 'Clinical details collected securely', pt: 'Dados clínicos recolhidos de forma segura', es: 'Datos clínicos recogidos de forma segura' },

        /* ── Step 3: Review & Pay ── */
        { s: '#step-3 .step-title', en: 'Review & pay', pt: 'Revisão e pagamento', es: 'Revisar y pagar' },
        { s: '#step-3 .step-desc', en: 'Review your booking details, then proceed to secure payment via Stripe.', pt: 'Reveja os detalhes da sua marcação e prossiga para pagamento seguro via Stripe.', es: 'Revise los detalles de su reserva y proceda al pago seguro mediante Stripe.' },
        { s: '.review-card:nth-child(1) .review-card-title', en: 'Appointment details', pt: 'Detalhes da consulta', es: 'Detalles de la cita' },
        { s: '.review-row:nth-child(2) .review-label', en: 'Service', pt: 'Serviço', es: 'Servicio' },
        { s: '.review-row:nth-child(3) .review-label', en: 'Date', pt: 'Data', es: 'Fecha' },
        { s: '.review-row:nth-child(4) .review-label', en: 'Time', pt: 'Hora', es: 'Hora' },
        { s: '.review-row:nth-child(5) .review-label', en: 'Format', pt: 'Formato', es: 'Formato' },
        { s: '.review-row:nth-child(5) .review-value', en: 'Secure video call', pt: 'Videochamada segura', es: 'Videollamada segura' },
        { s: '.review-card:nth-child(2) .review-card-title', en: 'Patient', pt: 'Paciente', es: 'Paciente' },
        { s: '.stripe-info-text', en: 'You\'ll be redirected to <strong>Stripe</strong> to enter your payment details securely. Card, Apple Pay, and Google Pay accepted.', pt: 'Será redirecionado para o <strong>Stripe</strong> para introduzir os seus dados de pagamento de forma segura. Cartão, Apple Pay e Google Pay aceites.', es: 'Será redirigido a <strong>Stripe</strong> para introducir sus datos de pago de forma segura. Se aceptan tarjeta, Apple Pay y Google Pay.', h: true },
        { s: '.stripe-info-sub', en: 'Stripe is PCI Level 1 certified — the highest level of security in the payments industry.', pt: 'O Stripe tem certificação PCI Nível 1 — o nível mais elevado de segurança na indústria de pagamentos.', es: 'Stripe tiene certificación PCI Nivel 1, el nivel más alto de seguridad en la industria de pagos.' },
        { s: '.summary-title', en: 'Booking summary', pt: 'Resumo da marcação', es: 'Resumen de la reserva' },
        { s: '.summary-note', en: 'Free rescheduling up to 24 hours before your appointment.', pt: 'Reagendamento gratuito até 24 horas antes da consulta.', es: 'Reprogramación gratuita hasta 24 horas antes de su cita.' },
        { s: '#back-3', en: 'Back', pt: 'Voltar', es: 'Atrás' },
        { s: '#next-3', en: 'Proceed to secure payment', pt: 'Prosseguir para pagamento seguro', es: 'Proceder al pago seguro' },
        { s: '.summary-details .summary-row:nth-child(1) .summary-label', en: 'Date', pt: 'Data', es: 'Fecha' },
        { s: '.summary-details .summary-row:nth-child(2) .summary-label', en: 'Time', pt: 'Hora', es: 'Hora' },
        { s: '.summary-details .summary-row:nth-child(3) .summary-label', en: 'Format', pt: 'Formato', es: 'Formato' },
        { s: '.summary-details .summary-row:nth-child(3) .summary-value', en: 'Secure video call', pt: 'Videochamada segura', es: 'Videollamada segura' },
        { s: '.summary-details .summary-row:nth-child(4) .summary-label', en: 'Patient', pt: 'Paciente', es: 'Paciente' },
        { s: '.summary-total .summary-label', en: 'Total', pt: 'Total', es: 'Total' },

        /* ── Step 4: Confirmation ── */
        { s: '#confirmTitle', en: 'Consultation confirmed', pt: 'Consulta confirmada', es: 'Consulta confirmada' },
        { s: '#confirmLead', en: 'To help your doctor prepare, fill in your clinical details below <strong>(takes less than 2 minutes)</strong>. We also sent this link to <strong id="confirmEmail">your email</strong>.', pt: 'Para o médico preparar a sua consulta, preencha os seus dados clínicos no formulário abaixo <strong>(demora menos de 2 minutos)</strong>. Enviámos o mesmo link para <strong id="confirmEmail">o seu email</strong>.', es: 'Para que el médico prepare su consulta, complete sus datos clínicos abajo <strong>(tarda menos de 2 minutos)</strong>. También enviamos este enlace a <strong id="confirmEmail">su email</strong>.', h: true },
        { s: '.confirmation-card .confirmation-row:nth-child(1) .confirmation-label', en: 'Service', pt: 'Serviço', es: 'Servicio' },
        { s: '.confirmation-card .confirmation-row:nth-child(2) .confirmation-label', en: 'Date & Time', pt: 'Data e Hora', es: 'Fecha y Hora' },
        { s: '.confirmation-card .confirmation-row:nth-child(3) .confirmation-label', en: 'Format', pt: 'Formato', es: 'Formato' },
        { s: '.confirmation-card .confirmation-row:nth-child(3) .confirmation-value', en: 'Secure video call', pt: 'Videochamada segura', es: 'Videollamada segura' },
        { s: '.confirmation-card .confirmation-row:nth-child(4) .confirmation-label', en: 'Amount paid', pt: 'Valor pago', es: 'Importe pagado' },
        { s: '.confirmation-card .confirmation-row:nth-child(5) .confirmation-label', en: 'Booking reference', pt: 'Referência da marcação', es: 'Referencia de reserva' },
        { s: '.confirmation-next-steps h3', en: 'What happens next', pt: 'Próximos passos', es: 'Qué ocurre a continuación' },
        { s: '#intakeFormTitle', en: 'Clinical form', pt: 'Ficha clínica', es: 'Ficha clínica' },
        { s: 'label[for="intakeDob"]', en: 'Date of birth *', pt: 'Data de nascimento *', es: 'Fecha de nacimiento *' },
        { s: 'label[for="intakeCountry"]', en: 'Country of residence', pt: 'País de residência', es: 'País de residencia' },
        { s: 'label[for="intakeConcerns"]', en: 'Symptoms or reason for the consultation *', pt: 'Sintomas ou motivo da consulta *', es: 'Síntomas o motivo de la consulta *' },
        { s: '#intakeConcerns', a: 'placeholder', en: 'What brings you today? How long? What have you already tried?', pt: 'O que o traz hoje? Há quanto tempo? O que já tentou?', es: '¿Qué le trae hoy? ¿Desde cuándo? ¿Qué ha intentado ya?' },
        { s: 'label[for="intakeMedications"]', en: 'Current medication', pt: 'Medicação atual', es: 'Medicación actual' },
        { s: 'label[for="intakeAllergies"]', en: 'Known allergies', pt: 'Alergias conhecidas', es: 'Alergias conocidas' },
        { s: 'label[for="intakeNhs"]', en: 'NHS / SNS number (optional)', pt: 'Nº utente / NHS (opcional)', es: 'N.º de usuario / NHS (opcional)' },
        { s: '#intakeSubmitBtn', en: 'Send clinical form', pt: 'Enviar ficha clínica', es: 'Enviar ficha clínica' },
        { s: '.intake-done-title', en: 'Clinical form received', pt: 'Ficha clínica recebida', es: 'Ficha clínica recibida' },
        { s: '.next-step-item:nth-child(1) strong', en: 'Complete the clinical form', pt: 'Preencha a ficha clínica', es: 'Complete la ficha clínica' },
        { s: '.next-step-item:nth-child(1) p', en: 'The form above (or the link in your email) reaches the doctor before your appointment.', pt: 'O formulário acima (ou o link no email) chega ao médico antes da consulta.', es: 'El formulario de arriba (o el enlace del correo) llega al médico antes de la cita.' },
        { s: '.next-step-item:nth-child(2) strong', en: 'Prepare for your consultation', pt: 'Prepare-se para a consulta', es: 'Prepárese para su consulta' },
        { s: '.next-step-item:nth-child(2) p', en: 'Have any relevant medical records, test results, or questions ready.', pt: 'Tenha quaisquer registos médicos, resultados de exames ou perguntas relevantes preparados.', es: 'Tenga listos los registros médicos, resultados de pruebas o preguntas relevantes.' },
        { s: '.next-step-item:nth-child(3) strong', en: 'Join your video call', pt: 'Junte-se à videochamada', es: 'Únase a su videollamada' },
        { s: '.next-step-item:nth-child(3) p', en: 'Click the link in your email at your scheduled time. No software download needed.', pt: 'Clique no link do email à hora agendada. Não é necessário transferir software.', es: 'Haga clic en el enlace de su email a la hora programada. No se necesita descargar software.' },
        { s: '.confirmation-actions .btn-outline', en: 'Back to homepage', pt: 'Voltar à página inicial', es: 'Volver a la página de inicio' },

        /* ── Footer ── */
        { s: '.footer-bottom > p', en: '\u00A9 2026 Lon Clinic. All rights reserved.', pt: '\u00A9 2026 Lon Clinic. Todos os direitos reservados.', es: '\u00A9 2026 Lon Clinic. Todos los derechos reservados.' },
        { s: '.footer-legal a:nth-child(1)', en: 'Privacy Policy', pt: 'Política de Privacidade', es: 'Política de Privacidad' },
        { s: '.footer-legal a:nth-child(2)', en: 'Terms of Service', pt: 'Termos de Serviço', es: 'Términos de Servicio' },
        { s: '.footer-legal a[href="/"]', en: 'Back to site', pt: 'Voltar ao site', es: 'Volver al sitio' },
    ];

    /* ═══════════════════════════
       MARCAR PAGE  (booking step 1)
    ═══════════════════════════ */
    const MARCAR = [
        { s: 'title', en: 'Book Appointment — Lon Clinic', pt: 'Marcar consulta — Lon Clinic', es: 'Reservar consulta — Lon Clinic', special: 'title' },

        /* ── Nav ── */
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Consultations', pt: 'Consultas', es: 'Consultas' },
        { s: '.lon-nav-links a[href="/consulta"], .lon-mobile-menu a[href="/consulta"]', en: 'Specialties', pt: 'Especialidades', es: 'Especialidades' },
        { s: '.lon-nav-links a[href="/burnout"], .lon-mobile-menu a[href="/burnout"]', en: 'Burnout', pt: 'Burnout', es: 'Burnout' },
        { s: '.lon-nav-links a[href="/magazine"], .lon-mobile-menu a[href="/magazine"]', en: 'Magazine', pt: 'Magazine', es: 'Magazine' },
        { s: '.lon-nav-links a[href="/#equipa"], .lon-mobile-menu a[href="/#equipa"]', en: 'The team', pt: 'A Equipa', es: 'El equipo' },
        { s: '.lon-nav-actions .lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions .lon-btn-primary[href="/marcar/clinica-geral"]:not([data-talk-cta])', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },

        /* ── Error ── */
        { s: '#marcarError .marcar-error', en: 'Consultation type not found. Choose a service on the <a href="/#servicos">homepage</a>.', pt: 'Tipo de consulta não encontrado. Escolha um serviço na <a href="/#servicos">página inicial</a>.', es: 'Tipo de consulta no encontrado. Elija un servicio en la <a href="/#servicos">página de inicio</a>.', h: true },

        /* ── Need choice ── */
        { s: '#marcarNeedBack', en: '\u2190 Back to homepage', pt: '\u2190 Voltar ao início', es: '\u2190 Volver al inicio' },
        { s: '#marcarNeedTitle', en: 'What do you need right now?', pt: 'O que precisa neste momento?', es: '¿Qué necesita en este momento?' },
        { s: '#marcarNeedMedicina .marcar-need-name', en: 'Medicine', pt: 'Medicina', es: 'Medicina' },
        { s: '#marcarNeedMedicina .marcar-need-desc', en: 'Medical consultations, urgent care and follow-up', pt: 'Consultas médicas, urgência e acompanhamento', es: 'Consultas médicas, urgencia y seguimiento' },
        { s: '#marcarNeedPsicologia .marcar-need-name', en: 'Psychology', pt: 'Psicologia', es: 'Psicología' },
        { s: '#marcarNeedPsicologia .marcar-need-desc', en: 'Mental health, anxiety and burnout', pt: 'Saúde mental, ansiedade e burnout', es: 'Salud mental, ansiedad y burnout' },
        { s: '#marcarNeedNutricao .marcar-need-name', en: 'Nutrition', pt: 'Nutrição', es: 'Nutrición' },
        { s: '#marcarNeedNutricao .marcar-need-desc', en: 'Clinical nutrition and personalised follow-up', pt: 'Nutrição clínica e acompanhamento personalizado', es: 'Nutrición clínica y seguimiento personalizado' },
        { s: '#marcarNeedLongevidade .marcar-need-name', en: 'Prevention & Longevity', pt: 'Prevenção & Longevidade', es: 'Prevención y longevidad' },
        { s: '#marcarNeedLongevidade .marcar-need-desc', en: 'Preventive health and a long-term plan', pt: 'Saúde preventiva e plano a longo prazo', es: 'Salud preventiva y plan a largo plazo' },

        /* ── Back link ── */
        { s: '#marcarBookingBack', en: '\u2190 Back', pt: '\u2190 Voltar', es: '\u2190 Volver' },
        { s: '#marcarPageTitle', en: 'Let\'s book your appointment', pt: 'Vamos marcar a sua consulta', es: 'Vamos a reservar su consulta' },
        { s: '#marcarTypeLabel', en: 'Consultation type', pt: 'Tipo de consulta', es: 'Tipo de consulta' },
        { s: '.lon-lang-banner-en', en: 'Consultations are provided in English and Portuguese', pt: 'As consultas são em inglês e português.', es: 'Las consultas se prestan en inglés y portugués.' },

        /* ── Service meta ── */
        { s: '.marcar-meta span:nth-child(2)', en: 'Video call', pt: 'Videochamada', es: 'Videollamada' },
        { s: '.marcar-desc p', en: 'What is included:', pt: 'O que inclui:', es: 'Qué incluye:' },
        { s: '#marcarBurnoutLink', en: 'Haven\'t taken the test yet? <a href="/burnout/teste?ref=marcar-burnout">Take the free burnout test</a> — 4 min.', pt: 'Ainda não fez o teste? <a href="/burnout/teste?ref=marcar-burnout">Faça o teste de burnout</a> — 4 min, gratuito.', es: '¿Aún no ha hecho el test? <a href="/burnout/teste?ref=marcar-burnout">Haga el test de burnout</a> — 4 min, gratuito.', h: true },

        /* ── Schedule section ── */
        { s: '#marcarScheduleTitle', en: 'Date and time', pt: 'Data e hora', es: 'Fecha y hora' },
        { s: '#marcarScheduleSub', en: 'Tap a free slot — or pick another day on the calendar.', pt: 'Toque num horário livre, ou escolha outro dia no calendário.', es: 'Toque un horario libre, o elija otro día en el calendario.' },
        { s: '#marcarQuickKicker', en: 'Next available times', pt: 'Próximos horários disponíveis', es: 'Próximos horarios disponibles' },
        { s: '#marcarCalPrev', a: 'aria-label', en: 'Previous month', pt: 'Mês anterior', es: 'Mes anterior' },
        { s: '#marcarCalNext', a: 'aria-label', en: 'Next month', pt: 'Mês seguinte', es: 'Mes siguiente' },

        /* ── Timezone note (text only via span) ── */
        { s: '.marcar-tz-text', en: 'Times shown in your device\'s local timezone', pt: 'Horários no fuso local do seu dispositivo', es: 'Horarios en la zona horaria local de su dispositivo' },

        /* ── Actions ── */
        { s: '.marcar-actions .lon-btn-ghost', en: 'Cancel', pt: 'Cancelar', es: 'Cancelar' },
        { s: '#marcarContinue', en: 'Continue to details and payment', pt: 'Continuar para dados e pagamento', es: 'Continuar a datos y pago' },
    ];

    const CONTENT = [
        { s: '[data-talk-cta="doctor"]', en: 'Talk to a doctor', pt: 'Fale com um médico', es: 'Hable con un médico' },
        { s: '[data-talk-cta="doctorNow"]', en: 'Talk to a doctor now', pt: 'Fale com um médico agora', es: 'Hable con un médico ahora' },
        { s: '[data-talk-cta="psych"]', en: 'Talk to a psychologist', pt: 'Fale com um psicólogo', es: 'Hable con un psicólogo' },
        { s: '[data-talk-cta="psychFind"]', en: 'Find your psychologist', pt: 'Encontre o seu psicólogo', es: 'Encuentre a su psicólogo' },
        { s: '[data-talk-cta="nutrition"]', en: 'Talk to a nutritionist', pt: 'Fale com um nutricionista', es: 'Hable con un nutricionista' },
        { s: '[data-talk-cta="nutritionFind"]', en: 'Find your nutritionist', pt: 'Encontre o seu nutricionista', es: 'Encuentre a su nutricionista' }
    ];

    /* ═══════════════════════════
       INFO PAGE
    ═══════════════════════════ */
    const INFO = [
        { s: 'title', en: 'Information | Lon Clinic', pt: 'Informação | Lon Clinic', es: 'Información | Lon Clinic', special: 'title' },
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Consultations', pt: 'Consultas', es: 'Consultas' },
        { s: '.lon-nav-links a[href="/consulta"], .lon-mobile-menu a[href="/consulta"]', en: 'Specialties', pt: 'Especialidades', es: 'Especialidades' },
        { s: '.lon-nav-links a[href="/burnout"], .lon-mobile-menu a[href="/burnout"]', en: 'Burnout', pt: 'Burnout', es: 'Burnout' },
        { s: '.lon-nav-links a[href="/magazine"], .lon-mobile-menu a[href="/magazine"]', en: 'Magazine', pt: 'Magazine', es: 'Magazine' },
        { s: '.lon-nav-links a[href="/#equipa"], .lon-mobile-menu a[href="/#equipa"]', en: 'The team', pt: 'A Equipa', es: 'El equipo' },
        { s: '.lon-nav-actions .lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions .lon-btn-primary[href="/marcar/clinica-geral"]:not([data-talk-cta])', en: 'Book — 39 €', pt: 'Marcar — 39 €', es: 'Reservar — 39 €' },
        { s: '.foot', en: 'If you need immediate assistance, contact <a href="mailto:info@lonclinic.com">info@lonclinic.com</a> or +351 928 372 775.', pt: 'Se precisar de ajuda imediata, contacte <a href="mailto:info@lonclinic.com">info@lonclinic.com</a> ou +351 928 372 775.', es: 'Si necesita asistencia inmediata, contacte <a href="mailto:info@lonclinic.com">info@lonclinic.com</a> o +351 928 372 775.', h: true },
    ];

    /* ═══════════════════════════
       COUNTRY NAMES  (book page)
    ═══════════════════════════ */
    const COUNTRIES = {
        US: { en: 'United States', pt: 'Estados Unidos', es: 'Estados Unidos' },
        GB: { en: 'United Kingdom', pt: 'Reino Unido', es: 'Reino Unido' },
        SE: { en: 'Sweden', pt: 'Suécia', es: 'Suecia' },
        DE: { en: 'Germany', pt: 'Alemanha', es: 'Alemania' },
        FR: { en: 'France', pt: 'França', es: 'Francia' },
        NL: { en: 'Netherlands', pt: 'Países Baixos', es: 'Países Bajos' },
        NO: { en: 'Norway', pt: 'Noruega', es: 'Noruega' },
        DK: { en: 'Denmark', pt: 'Dinamarca', es: 'Dinamarca' },
        FI: { en: 'Finland', pt: 'Finlândia', es: 'Finlandia' },
        CH: { en: 'Switzerland', pt: 'Suíça', es: 'Suiza' },
        AT: { en: 'Austria', pt: 'Áustria', es: 'Austria' },
        BE: { en: 'Belgium', pt: 'Bélgica', es: 'Bélgica' },
        ES: { en: 'Spain', pt: 'Espanha', es: 'España' },
        IT: { en: 'Italy', pt: 'Itália', es: 'Italia' },
        PT: { en: 'Portugal', pt: 'Portugal', es: 'Portugal' },
        IE: { en: 'Ireland', pt: 'Irlanda', es: 'Irlanda' },
        CA: { en: 'Canada', pt: 'Canadá', es: 'Canadá' },
        AU: { en: 'Australia', pt: 'Austrália', es: 'Australia' },
        NZ: { en: 'New Zealand', pt: 'Nova Zelândia', es: 'Nueva Zelanda' },
        AE: { en: 'United Arab Emirates', pt: 'Emirados Árabes Unidos', es: 'Emiratos Árabes Unidos' },
        SG: { en: 'Singapore', pt: 'Singapura', es: 'Singapur' },
        HK: { en: 'Hong Kong', pt: 'Hong Kong', es: 'Hong Kong' },
        JP: { en: 'Japan', pt: 'Japão', es: 'Japón' },
        OTHER: { en: 'Other', pt: 'Outro', es: 'Otro' },
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
            es: [
                { text: 'SALUD CARDIOVASCULAR', gridX: 0.18, gridY: 0.28 },
                { text: 'SISTEMA INMUNE', gridX: 0.42, gridY: 0.22 },
                { text: 'MAPEO CUTÁNEO', gridX: 0.82, gridY: 0.12 },
                { text: 'MARCADORES METABÓLICOS', gridX: 0.28, gridY: 0.55 },
                { text: 'VASOS SANGUÍNEOS', gridX: 0.72, gridY: 0.38 },
                { text: 'ARTERIAS PERIFÉRICAS', gridX: 0.60, gridY: 0.62 },
                { text: 'EQUILIBRIO HORMONAL', gridX: 0.15, gridY: 0.72 },
                { text: 'ENVEJECIMIENTO CELULAR', gridX: 0.88, gridY: 0.55 },
                { text: 'FUNCIÓN COGNITIVA', gridX: 0.50, gridY: 0.15 },
                { text: 'DENSIDAD ÓSEA', gridX: 0.35, gridY: 0.78 },
                { text: 'INFLAMACIÓN', gridX: 0.75, gridY: 0.75 },
                { text: 'OXIGENACIÓN', gridX: 0.10, gridY: 0.45 },
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
            es: [
                { text: 'PREVENCIÓN DE MALARIA', gridX: 0.18, gridY: 0.28 },
                { text: 'VACUNAS DE VIAJE', gridX: 0.42, gridY: 0.20 },
                { text: 'MEDICINA DE ALTURA', gridX: 0.82, gridY: 0.14 },
                { text: 'SEGURIDAD ALIMENTARIA', gridX: 0.28, gridY: 0.55 },
                { text: 'ENFERMEDADES HÍDRICAS', gridX: 0.72, gridY: 0.38 },
                { text: 'ENFERMEDADES POR INSECTOS', gridX: 0.58, gridY: 0.62 },
                { text: 'GESTIÓN DEL JET LAG', gridX: 0.12, gridY: 0.70 },
                { text: 'EXPOSICIÓN SOLAR', gridX: 0.88, gridY: 0.55 },
                { text: 'MEDICACIÓN DE VIAJE', gridX: 0.50, gridY: 0.15 },
                { text: 'ENFERMEDADES CRÓNICAS', gridX: 0.35, gridY: 0.78 },
                { text: 'RIESGO DEL DESTINO', gridX: 0.75, gridY: 0.75 },
                { text: 'BOTIQUÍN MÉDICO', gridX: 0.10, gridY: 0.45 },
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
            loading: 'Loading available times…',
            urgentContactHint:
                'Urgent or need a time that is not listed? Contact us at info@lonclinic.com or (+351) 928 372 775.',
            videoCall: 'Video call',
            secureVideoCall: 'Secure video call',
            services: {
                clinica_geral: 'General Medicine / Check-Up',
                urgente: 'Urgent Medical Consultation (Adults)',
                travel: 'Travel Medicine Consultation',
                saude_mental: 'Medical Mental Health Consultation',
                burnout: 'Specialized Burnout Consultation',
                burnout_mensal: 'Anti-Burnout Subscription',
                burnout_programa: 'Anti-Burnout Program (8 sessions)',
                renovacao: 'Medical Treatment Renewal',
                longevidade: 'Longevity & Preventive Health Consultation',
                nutricao_consulta: 'Nutrition consultation',
                nutricao_programa: 'Weight-loss program · 6 months (medical follow-up + nutrition)',
                nutricao_completo: 'Complete program (nutrition + psychology) — month 1',
                nutricao_completo_reforcado: 'Complete program — higher first payment',
                psicologia: 'Psychology session',
                psicologia_mensal: 'Psychology subscription',
                terapia_casal: 'Couples therapy',
                terapia_casal_mensal: 'Couples therapy subscription',
            },
            typeOptions: {
                clinica_geral: 'General Medicine / Check-up',
                urgente: 'Urgent Medical Consultation',
                psicologia: 'Mental Health / Psychology',
                terapia_casal: 'Couples therapy',
                nutricao_programa: 'Nutrition',
                burnout: 'Burnout',
                travel: 'Travel Medicine',
                longevidade: 'Longevity',
                renovacao: 'Treatment renewal'
            },
            durations: {
                clinica_geral: '30 minutes',
                urgente: '20–30 min',
                travel: '20 min',
                saude_mental: '30–45 min',
                psicologia: '50 minutes',
                psicologia_mensal: '50 minutes · 4 sessions/month',
                terapia_casal: '50–60 min',
                terapia_casal_mensal: '50–60 min · 4 sessions/month',
                burnout: '60 min',
                burnout_mensal: '60 min · 4 sessions/month',
                burnout_programa: '8 sessions · 60 min',
                renovacao: '15–20 min',
                longevidade: '45–60 min',
                nutricao_consulta: '30 minutes',
                nutricao_programa: 'Month 1 now · later months billed separately (not automatic)',
                nutricao_completo: 'Month 1 · then €187/month',
                nutricao_completo_reforcado: 'Month 1 · then €168/month',
                infeccao_urinaria: '20–30 min'
            },
            payCta: 'Pay {price}',
            redirecting: 'Redirecting to Stripe…',
            yourConsultation: 'Your appointment',
            typeLabel: 'Type',
        },
        pt: {
            months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            selectDateFirst: 'Selecione uma data primeiro',
            pickDate: 'Por favor escolha uma data no calendário.',
            noSlots: 'Sem horários disponíveis nesta data. Tente outro dia.',
            loading: 'A carregar horários…',
            urgentContactHint:
                'Precisa com urgência ou de um horário que não está listado? Contacte-nos em info@lonclinic.com ou (+351) 928 372 775.',
            videoCall: 'Videochamada',
            secureVideoCall: 'Videochamada segura',
            services: {
                clinica_geral: 'Consulta Clínica Geral / Check Up',
                urgente: 'Consulta Médica Urgente (Adultos)',
                travel: 'Consulta do Viajante',
                saude_mental: 'Consulta Médica de Saúde Mental',
                burnout: 'Consulta Especializada em Burnout',
                burnout_mensal: 'Subscrição Anti-Burnout',
                burnout_programa: 'Programa Anti-Burnout (8 sessões)',
                renovacao: 'Renovação de Tratamento Médico',
                longevidade: 'Consulta de Longevidade e Saúde Preventiva',
                nutricao_consulta: 'Consulta de nutrição',
                nutricao_programa: 'Programa de perda de peso · 6 meses (acompanhamento médico + nutrição)',
                nutricao_completo: 'Programa Completo (nutrição + psicologia) — mês 1',
                nutricao_completo_reforcado: 'Programa Completo — entrada reforçada',
                psicologia: 'Sessão de Psicologia',
                psicologia_mensal: 'Subscrição de Psicologia',
                terapia_casal: 'Terapia de casal',
                terapia_casal_mensal: 'Subscrição de terapia de casal',
            },
            typeOptions: {
                clinica_geral: 'Clínica Geral / Check-up',
                urgente: 'Consulta Médica Urgente',
                psicologia: 'Saúde Mental / Psicologia',
                terapia_casal: 'Terapia de casal',
                nutricao_programa: 'Nutrição',
                burnout: 'Burnout',
                travel: 'Medicina do Viajante',
                longevidade: 'Longevidade',
                renovacao: 'Renovação de tratamento'
            },
            durations: {
                clinica_geral: '30 minutos',
                urgente: '20–30 min',
                travel: '20 min',
                saude_mental: '30–45 min',
                psicologia: '50 minutos',
                psicologia_mensal: '50 minutos · 4 sessões/mês',
                terapia_casal: '50–60 min',
                terapia_casal_mensal: '50–60 min · 4 sessões/mês',
                burnout: '60 min',
                burnout_mensal: '60 min · 4 consultas/mês',
                burnout_programa: '8 sessões · 60 min',
                renovacao: '15–20 min',
                longevidade: '45–60 min',
                nutricao_consulta: '30 minutos',
                nutricao_programa: 'Mês 1 agora · meses seguintes cobrados à parte (não é débito automático)',
                nutricao_completo: 'Mês 1 · depois 187 €/mês',
                nutricao_completo_reforcado: 'Mês 1 · depois 168 €/mês',
                infeccao_urinaria: '20–30 min'
            },
            payCta: 'Pagar {price}',
            redirecting: 'A redirecionar…',
            yourConsultation: 'A sua consulta',
            typeLabel: 'Tipo',
        },
        es: {
            months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            weekdays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            selectDateFirst: 'Seleccione primero una fecha',
            pickDate: 'Elija una fecha en el calendario.',
            noSlots: 'No hay horarios disponibles en esta fecha. Pruebe otro día.',
            loading: 'Cargando horarios disponibles…',
            urgentContactHint:
                '¿Urgente o necesita un horario que no aparece? Escríbanos a info@lonclinic.com o llame al (+351) 928 372 775.',
            videoCall: 'Videollamada',
            secureVideoCall: 'Videollamada segura',
            services: {
                clinica_geral: 'Consulta de medicina general / chequeo',
                urgente: 'Consulta médica urgente (adultos)',
                travel: 'Consulta de medicina del viajero',
                saude_mental: 'Consulta médica de salud mental',
                burnout: 'Consulta especializada en burnout',
                burnout_mensal: 'Suscripción Anti-Burnout',
                burnout_programa: 'Programa anti-burnout (8 sesiones)',
                renovacao: 'Renovación de tratamiento médico',
                longevidade: 'Consulta de longevidad y salud preventiva',
                nutricao_consulta: 'Consulta de nutrición',
                nutricao_programa: 'Programa de pérdida de peso · 6 meses (seguimiento médico + nutrición)',
                nutricao_completo: 'Programa completo (nutrición + psicología) — mes 1',
                nutricao_completo_reforcado: 'Programa completo — entrada reforzada',
                psicologia: 'Sesión de psicología',
                psicologia_mensal: 'Suscripción de psicología',
                terapia_casal: 'Terapia de pareja',
                terapia_casal_mensal: 'Suscripción de terapia de pareja',
            },
            typeOptions: {
                clinica_geral: 'Medicina general / Chequeo',
                urgente: 'Consulta médica urgente',
                psicologia: 'Salud mental / Psicología',
                terapia_casal: 'Terapia de pareja',
                nutricao_programa: 'Nutrición',
                burnout: 'Burnout',
                travel: 'Medicina del viajero',
                longevidade: 'Longevidad',
                renovacao: 'Renovación de tratamiento'
            },
            durations: {
                clinica_geral: '30 minutos',
                urgente: '20–30 min',
                travel: '20 min',
                saude_mental: '30–45 min',
                psicologia: '50 minutos',
                psicologia_mensal: '50 minutos · 4 sesiones/mes',
                terapia_casal: '50–60 min',
                terapia_casal_mensal: '50–60 min · 4 sesiones/mes',
                burnout: '60 min',
                burnout_mensal: '60 min · 4 consultas/mes',
                burnout_programa: '8 sesiones · 60 min',
                renovacao: '15–20 min',
                longevidade: '45–60 min',
                nutricao_consulta: '30 minutos',
                nutricao_programa: 'Mes 1 ahora · meses siguientes cobrados aparte (no es cargo automático)',
                nutricao_completo: 'Mes 1 · luego 187 €/mes',
                nutricao_completo_reforcado: 'Mes 1 · luego 168 €/mes',
                infeccao_urinaria: '20–30 min'
            },
            payCta: 'Pagar {price}',
            redirecting: 'Redirigiendo…',
            yourConsultation: 'Su consulta',
            typeLabel: 'Tipo',
        },
    };

    /* ══════════════════════════════════════════
       CORE FUNCTIONS
    ══════════════════════════════════════════ */

    function getEntries() {
        const map = { index: INDEX, travel: TRAVEL, book: BOOK, marcar: MARCAR, info: INFO, content: CONTENT };
        const pageEntries = map[PAGE] || [];
        const commonEntries = (PAGE !== 'book') ? COMMON : [];
        // Shared public nav + skip/WhatsApp on every page that uses the Lon chrome.
        const lonNav = document.querySelector('.lon-nav, .lon-skip, .lon-wa-float') ? LON_NAV : [];
        return [...lonNav, ...pageEntries, ...commonEntries];
    }

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
                el.setAttribute(entry.a, value);
            } else if (entry.h) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        });
    }

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

            // Timeslot heading
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

        // Marcar page: update calendar weekday headers
        if (PAGE === 'marcar') {
            const wdays = (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).weekdays;
            const weekdaySpans = document.querySelectorAll('.marcar-cal-weekdays span');
            weekdaySpans.forEach((span, i) => {
                if (wdays[i]) span.textContent = wdays[i];
            });

            // Update times heading if still on placeholder text
            const marcarTimesHeading = document.getElementById('marcarTimesHeading');
            if (marcarTimesHeading) {
                const allPlaceholders = ['en', 'pt', 'es'].map(k => BOOKING_STRINGS[k].selectDateFirst);
                if (allPlaceholders.some(p => marcarTimesHeading.textContent.trim() === p)) {
                    marcarTimesHeading.textContent = (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).selectDateFirst;
                }
            }

            // Empty times message
            const marcarTimesEmpty = document.querySelector('.marcar-times-empty');
            if (marcarTimesEmpty) {
                const allPick = ['en', 'pt', 'es'].map(k => BOOKING_STRINGS[k].pickDate);
                if (allPick.some(p => marcarTimesEmpty.textContent.trim() === p)) {
                    marcarTimesEmpty.textContent = (BOOKING_STRINGS[lang] || BOOKING_STRINGS.en).pickDate;
                }
            }
        }

        // Update <html lang>
        document.documentElement.lang = lang === 'pt' ? 'pt-PT' : lang === 'es' ? 'es' : 'en';

        const bookingLocaleInput = document.getElementById('bookingLocale');
        if (bookingLocaleInput) bookingLocaleInput.value = lang;
    }

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

        // Notify marcar.js
        if (window.MARCAR_LANG_CHANGED) {
            window.MARCAR_LANG_CHANGED(lang);
        }

        // Notify info.html
        if (window.INFO_LANG_CHANGED) {
            window.INFO_LANG_CHANGED(lang);
        }

        if (window.REVIEWS_LANG_CHANGED) {
            window.REVIEWS_LANG_CHANGED(lang);
        }

        if (window.SLOTS_LANG_CHANGED) {
            window.SLOTS_LANG_CHANGED(lang);
        }

        document.querySelectorAll('.lon-testimonial-translation-note').forEach(function (el) {
            el.setAttribute('aria-hidden', lang === 'pt' ? 'true' : 'false');
        });

        const reviewForm = document.getElementById('lonReviewForm');
        if (reviewForm) reviewForm.setAttribute('data-locale', lang);

        const reviewSubmit = document.querySelector('#lonReviewForm button[type="submit"]');
        if (reviewSubmit) {
            const sending = { en: 'Sending…', pt: 'A enviar…', es: 'Enviando…' };
            reviewSubmit.setAttribute('data-sending', sending[lang] || sending.en);
        }
    }

    /* ══════════════════════════════════════════
       TOGGLE UI
    ══════════════════════════════════════════ */
    const LANG_FLAGS = { pt: '🇵🇹', en: '🇬🇧', es: '🇪🇸' };

    function setToggleOpen(toggle, open) {
        toggle.classList.toggle('is-open', open);
        const current = toggle.querySelector('.lang-current');
        if (current) current.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function closeAllToggles(except) {
        document.querySelectorAll('.lang-toggle.is-open').forEach(t => {
            if (t !== except) setToggleOpen(t, false);
        });
    }

    function bindLangToggleClick(el) {
        el.addEventListener('click', (e) => {
            const current = e.target.closest('.lang-current');
            if (current) {
                const open = !el.classList.contains('is-open');
                closeAllToggles(el);
                setToggleOpen(el, open);
                return;
            }
            const btn = e.target.closest('.lang-btn');
            if (!btn) return;
            const lang = btn.dataset.lang;
            if (lang && lang !== currentLang) setLang(lang);
            setToggleOpen(el, false);
        });
    }

    // Close the compact (mobile) dropdown when tapping outside or pressing Escape
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-toggle')) closeAllToggles();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllToggles();
    });

    function createToggleHTML() {
        return `<div class="lang-toggle" role="group" aria-label="Language selector">
            <button type="button" class="lang-current" aria-label="Language" aria-haspopup="true" aria-expanded="false"><span class="lang-flag" aria-hidden="true">${LANG_FLAGS[currentLang] || LANG_FLAGS.en}</span></button>
            <div class="lang-options">
                <button type="button" class="lang-btn${currentLang === 'pt' ? ' active' : ''}" data-lang="pt" aria-pressed="${currentLang === 'pt'}"><span class="lang-flag" aria-hidden="true">🇵🇹</span> PT</button>
                <button type="button" class="lang-btn${currentLang === 'en' ? ' active' : ''}" data-lang="en" aria-pressed="${currentLang === 'en'}"><span class="lang-flag" aria-hidden="true">🇬🇧</span> EN</button>
                <button type="button" class="lang-btn${currentLang === 'es' ? ' active' : ''}" data-lang="es" aria-pressed="${currentLang === 'es'}"><span class="lang-flag" aria-hidden="true">🇪🇸</span> ES</button>
            </div>
        </div>`;
    }

    function createToggle() {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = createToggleHTML();
        const toggle = wrapper.firstElementChild;

        bindLangToggleClick(toggle);

        // Desktop nav
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
            const mobileWrapper = document.createElement('div');
            mobileWrapper.innerHTML = createToggleHTML();
            const mobileToggle = mobileWrapper.firstElementChild;
            mobileToggle.classList.add('lang-toggle-mobile');
            bindLangToggleClick(mobileToggle);
            mobileContent.insertBefore(mobileToggle, mobileContent.firstChild);
        }

        // Lon mobile drawer — only when the header has no compact flag toggle
        const lonMobileMenu = document.getElementById('lonMobileMenu');
        if (lonMobileMenu && !mobileContent && !lonNavActions) {
            const lonWrapper = document.createElement('div');
            lonWrapper.innerHTML = createToggleHTML();
            const lonMobileToggle = lonWrapper.firstElementChild;
            lonMobileToggle.classList.add('lang-toggle-mobile');
            bindLangToggleClick(lonMobileToggle);
            lonMobileMenu.insertBefore(lonMobileToggle, lonMobileMenu.firstChild);
        }
    }

    function updateToggleUI(lang) {
        document.querySelectorAll('.lang-toggle .lang-btn').forEach(btn => {
            const active = btn.dataset.lang === lang;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active);
        });
        document.querySelectorAll('.lang-toggle .lang-current .lang-flag').forEach(flag => {
            flag.textContent = LANG_FLAGS[lang] || LANG_FLAGS.en;
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
        const labels = WAVE_LABELS[PAGE];
        if (labels) {
            window.PARTICLE_WAVE_LABELS = labels[currentLang] || labels.en;
        }

        createToggle();
        // Always apply translations so stored language is respected on every page
        applyAll(currentLang);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
