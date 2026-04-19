/* ========================================
   i18n — English / Portuguese / Spanish
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
        if (p.includes('marcar')) return 'marcar';
        if (p.includes('info')) return 'info';
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
        { s: '.lon-nav-links a[href="/#inicio"], .lon-mobile-menu a[href="/#inicio"]', en: 'Home', pt: 'Início', es: 'Inicio' },
        { s: '.lon-nav-links a[href="/#platform"], .lon-mobile-menu a[href="/#platform"]', en: 'Platform', pt: 'Plataforma', es: 'Plataforma' },
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Services', pt: 'Serviços', es: 'Servicios' },
        { s: '.lon-nav-links a[href="/#contacto"], .lon-mobile-menu a[href="/#contacto"]', en: 'Contact', pt: 'Contato', es: 'Contacto' },
        { s: '.lon-nav-actions > a.lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions > a.lon-btn-primary[href="/#servicos"]', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },
        { s: '.lon-mobile-menu a[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
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
        { s: 'title', en: 'Online Medical Consultations | Lon Clinic', pt: 'Consultas médicas online | Lon Clinic', es: 'Consultas médicas online | Lon Clinic', special: 'title' },

        /* ── Nav (homepage links have no leading slash) ── */
        { s: '.lon-nav-links a[href="#inicio"], .lon-mobile-menu a[href="#inicio"]', en: 'Home', pt: 'Início', es: 'Inicio' },
        { s: '.lon-nav-links a[href="#platform"], .lon-mobile-menu a[href="#platform"]', en: 'Platform', pt: 'Plataforma', es: 'Plataforma' },
        { s: '.lon-nav-links a[href="#servicos"], .lon-mobile-menu a[href="#servicos"]', en: 'Services', pt: 'Serviços', es: 'Servicios' },
        { s: '.lon-nav-links a[href="#contacto"], .lon-mobile-menu a[href="#contacto"]', en: 'Contact', pt: 'Contato', es: 'Contacto' },
        { s: '.lon-nav-actions .lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions .lon-btn-primary[href="#servicos"]', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },

        /* ── Hero ── */
        { s: '.dr-badge', en: 'Telemedicine Platform', pt: 'Plataforma de telemedicina', es: 'Plataforma de telemedicina' },
        { s: '.dr-hero-title-line:not(.dr-hero-title-line--secondary)', en: 'Online medical consultations.', pt: 'Consultas médicas online.', es: 'Consultas médicas online.' },
        { s: '.dr-hero-title-line--secondary', en: 'A new approach to your health.<br>Finally.', pt: 'Uma nova abordagem à sua saúde.<br>Finalmente.', es: 'Un nuevo enfoque para su salud.<br>Por fin.', h: true },
        { s: '.dr-lead', en: 'Book your medical consultation in minutes. Take care of your short and long-term health.', pt: 'Marque a sua consulta médica em minutos. Cuide da sua saúde a curto e a longo prazo.', es: 'Reserve su consulta médica en minutos. Cuide su salud a corto y largo plazo.' },
        { s: '.dr-cta-row .lon-btn-dark', en: 'View services', pt: 'Ver serviços', es: 'Ver servicios' },
        { s: '.dr-cta-row .lon-btn-soft', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },

        /* ── Trust bullets ── */
        { s: '.dr-trust-list li:nth-child(1)', en: 'Doctors accredited by the Portuguese Medical Association', pt: 'Médicos acreditados pela Ordem dos Médicos Português', es: 'Médicos acreditados por el Colegio de Médicos Português' },
        { s: '.dr-trust-list li:nth-child(2)', en: 'Consultations in Portuguese, English and Spanish', pt: 'Consultas em português, inglês e espanhol', es: 'Consultas en portugués, inglés y español' },
        { s: '.dr-trust-list li:nth-child(3)', en: 'Prescriptions and exam requests after the consultation', pt: 'Receitas e pedidos de exames no final da consulta', es: 'Recetas y solicitudes de exámenes al final de la consulta' },
        { s: '.dr-trust-list li:nth-child(4)', en: 'No waiting room. No travel.', pt: 'Sem sala de espera. Sem deslocação.', es: 'Sin sala de espera. Sin desplazamiento.' },

        /* ── Manifesto ── */
        { s: '.dr-clinic-manifesto__text', en: 'We are not a platform with hundreds of anonymous doctors. We are a clinic where each patient has a story and the doctor listens, follows up, and thinks about your long-term health.', pt: 'Não somos uma plataforma com centenas de médicos anónimos. Somos uma clínica onde cada paciente tem uma história e o médico ouve-te, acompanha-te, e pensa na tua saúde a longo prazo.', es: 'No somos una plataforma con cientos de médicos anónimos. Somos una clínica donde cada paciente tiene una historia y el médico te escucha, te acompaña y piensa en tu salud a largo plazo.' },

        /* ── How it works ── */
        { s: '#como-funciona-title', en: 'How to get started', pt: 'Como começar', es: 'Cómo comenzar' },
        { s: '#como-funciona-home > .lon-container > p > strong', en: 'How does it work?', pt: 'Como funciona?', es: '¿Cómo funciona?' },
        { s: '.lon-how-steps li:nth-child(1) h3', en: 'Choose consultation', pt: 'Escolher consulta', es: 'Elegir consulta' },
        { s: '.lon-how-steps li:nth-child(1) p', en: 'Select the specialty or certificate.', pt: 'Selecione a especialidade ou atestado.', es: 'Seleccione la especialidad o certificado.' },
        { s: '.lon-how-steps li:nth-child(2) h3', en: 'Schedule appointment', pt: 'Agendar consulta', es: 'Programar consulta' },
        { s: '.lon-how-steps li:nth-child(2) p', en: 'Book a day and time of your choice.', pt: 'Marque para um dia e hora à sua escolha.', es: 'Reserve el día y hora de su elección.' },
        { s: '.lon-how-steps li:nth-child(3) h3', en: 'Make payment', pt: 'Efetuar pagamento', es: 'Realizar pago' },
        { s: '.lon-how-steps li:nth-child(3) p', en: 'Pay by Credit Card or bank transfer.', pt: 'Utilize Cartão de Crédito ou Referência Multibanco.', es: 'Pague con tarjeta de crédito o transferencia bancaria.' },
        { s: '.lon-how-steps li:nth-child(4) h3', en: 'Medical consultation', pt: 'Consulta médica', es: 'Consulta médica' },
        { s: '.lon-how-steps li:nth-child(4) p', en: 'Join via your smartphone, tablet or computer.', pt: 'Aceda à consulta através do seu smartphone, tablet ou computador.', es: 'Acceda desde su smartphone, tablet o computadora.' },

        /* ── Service tabs ── */
        { s: '.lon-tab[data-tab="urgencias"]', en: 'General Medicine', pt: 'Medicina Geral', es: 'Medicina General' },
        { s: '.lon-tab[data-tab="mental"]', en: 'Mental Health', pt: 'Saúde Mental', es: 'Salud Mental' },
        { s: '.lon-tab[data-tab="especialidades"]', en: "Traveler's Health", pt: 'Saúde do Viajante', es: 'Salud del Viajero' },
        { s: '.lon-tab[data-tab="longevidade"]', en: 'Longevity Medicine', pt: 'Medicina da Longevidade', es: 'Medicina de la Longevidad' },

        /* ── Service chips ── */
        { s: '.lon-services .lon-service-card:nth-child(1) .lon-service-chip', en: 'General Medicine', pt: 'Medicina Geral', es: 'Medicina General' },
        { s: '.lon-services .lon-service-card:nth-child(2) .lon-service-chip', en: 'Urgent', pt: 'Urgência', es: 'Urgencia' },
        { s: '.lon-services .lon-service-card:nth-child(3) .lon-service-chip', en: 'Mental Health', pt: 'Saúde Mental', es: 'Salud Mental' },
        { s: '.lon-services .lon-service-card:nth-child(4) .lon-service-chip', en: 'Follow-up', pt: 'Seguimento', es: 'Seguimiento' },
        { s: '.lon-services .lon-service-card:nth-child(5) .lon-service-chip', en: 'Traveler', pt: 'Viajante', es: 'Viajero' },
        { s: '.lon-services .lon-service-card:nth-child(6) .lon-service-chip', en: 'Traveler — 2 people', pt: 'Viajante 2 pessoas', es: 'Viajero — 2 personas' },
        { s: '.lon-services .lon-service-card:nth-child(7) .lon-service-chip', en: 'Longevity', pt: 'Longevidade', es: 'Longevidad' },

        /* ── Service names ── */
        { s: '.lon-services .lon-service-card:nth-child(1) h3', en: 'General Medicine Consultation / Check-Up', pt: 'Consulta Clínica Geral / Check Up', es: 'Consulta de Medicina General / Chequeo' },
        { s: '.lon-services .lon-service-card:nth-child(2) h3', en: 'Urgent Medical Consultation (Adults)', pt: 'Consulta Médica Urgente (Adultos)', es: 'Consulta Médica Urgente (Adultos)' },
        { s: '.lon-services .lon-service-card:nth-child(3) h3', en: 'Adult Mental Health Consultation', pt: 'Consulta de Saúde Mental Adultos', es: 'Consulta de Salud Mental Adultos' },
        { s: '.lon-services .lon-service-card:nth-child(4) h3', en: 'Medical Treatment Renewal', pt: 'Renovação de Tratamento Médico', es: 'Renovación de Tratamiento Médico' },
        { s: '.lon-services .lon-service-card:nth-child(5) h3', en: "Traveler's Consultation", pt: 'Consulta do Viajante', es: 'Consulta del Viajero' },
        { s: '.lon-services .lon-service-card:nth-child(6) h3', en: "Traveler's Consultation — 2 people", pt: 'Consulta do Viajante 2 pessoas', es: 'Consulta del Viajero — 2 personas' },
        { s: '.lon-services .lon-service-card:nth-child(7) h3', en: 'Longevity & Preventive Health Consultation', pt: 'Consulta de Longevidade e Saúde Preventiva', es: 'Consulta de Longevidad y Salud Preventiva' },

        /* ── Book buttons ── */
        { s: '.lon-service-card .lon-btn-soft', en: 'Book', pt: 'Marcar', es: 'Reservar' },

        /* ── CTA card ── */
        { s: '.lon-consult-cta-copy h2', en: 'Not sure which consultation to choose?', pt: 'Não sabe qual consulta deve escolher?', es: '¿No sabe qué consulta elegir?' },
        { s: '.lon-consult-cta-copy p', en: 'Our team helps identify the right option for your case and schedules everything in a few minutes.', pt: 'A nossa equipa ajuda a identificar a opção certa para o seu caso e agenda tudo consigo em poucos minutos.', es: 'Nuestro equipo le ayuda a identificar la opción correcta para su caso y lo programa todo en pocos minutos.' },
        { s: '.lon-consult-cta-copy .lon-btn-dark', en: 'Talk to the team', pt: 'Falar com a equipa', es: 'Hablar con el equipo' },

        /* ── Contact section ── */
        { s: '.lon-contact-copy h2', en: 'Contact', pt: 'Contato', es: 'Contacto' },
        { s: '.lon-contact-copy p', en: 'Send us a message and we will reply as soon as possible.', pt: 'Envie a sua mensagem e responderemos com a maior brevidade possível.', es: 'Envíenos un mensaje y le responderemos lo antes posible.' },
        { s: '#contact-name', a: 'placeholder', en: 'Your name', pt: 'O seu nome', es: 'Su nombre' },
        { s: '#contact-email', a: 'placeholder', en: 'Your email', pt: 'O seu email', es: 'Su email' },
        { s: '#contact-phone', a: 'placeholder', en: 'Phone number', pt: 'Número de telefone', es: 'Número de teléfono' },
        { s: '#contact-message', a: 'placeholder', en: 'Write your message', pt: 'Escreva a sua mensagem', es: 'Escriba su mensaje' },
        { s: '#lonContactForm button[type="submit"]', en: 'Send message', pt: 'Enviar mensagem', es: 'Enviar mensaje' },

        /* ── Footer ── */
        { s: '.lon-footer-brand > p', en: 'Your doctor. Online. Always.', pt: 'O seu médico. Online. Sempre.', es: 'Su médico. Online. Siempre.' },
        { s: '.lon-footer-col:nth-child(2) h4', en: 'Services', pt: 'Serviços', es: 'Servicios' },
        { s: '.lon-footer-col:nth-child(3) h4', en: 'Clinic', pt: 'Clínica', es: 'Clínica' },
        { s: '.lon-footer-col:nth-child(4) h4', en: 'Support', pt: 'Apoio', es: 'Apoyo' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/urgente"]', en: 'Urgent Consultation', pt: 'Consulta de Urgência', es: 'Consulta de Urgencia' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/clinica-geral"]', en: 'General Medicine', pt: 'Clínica Geral', es: 'Medicina General' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/travel"]', en: "Traveler's Consultation", pt: 'Consulta do Viajante', es: 'Consulta del Viajero' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/saude-mental"]', en: 'Mental Health', pt: 'Saúde Mental', es: 'Salud Mental' },
        { s: '.lon-footer-col:nth-child(2) a[href="/marcar/longevidade"]', en: 'Longevity', pt: 'Longevidade', es: 'Longevidad' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=sobre-nos"]', en: 'About us', pt: 'Sobre nós', es: 'Sobre nosotros' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=parcerias"]', en: 'Partnerships', pt: 'Parcerias', es: 'Asociaciones' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=registo-medico"]', en: 'Medical records', pt: 'Registo médico', es: 'Registro médico' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=contato"]', en: 'Contact', pt: 'Contato', es: 'Contacto' },
        { s: '.lon-footer-col:nth-child(3) a[href="/info.html?page=trabalhe-connosco"]', en: 'Work with us', pt: 'Trabalhe connosco', es: 'Trabaje con nosotros' },
        { s: '.lon-footer-col:nth-child(4) a[href="/faq"]', en: 'FAQs', pt: 'Perguntas frequentes', es: 'Preguntas frecuentes' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=como-funciona"]', en: 'How it works', pt: 'Como funciona', es: 'Cómo funciona' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=seguranca-dados"]', en: 'Data security', pt: 'Segurança dos dados', es: 'Seguridad de datos' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=acessibilidade"]', en: 'Accessibility', pt: 'Acessibilidade', es: 'Accesibilidad' },
        { s: '.lon-footer-col:nth-child(4) a[href="/info.html?page=reclamacoes"]', en: 'Complaints', pt: 'Reclamações', es: 'Reclamaciones' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=termos-condicoes"]', en: 'Terms & conditions', pt: 'Termos e condições', es: 'Términos y condiciones' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=politica-privacidade"]', en: 'Privacy policy', pt: 'Política de privacidade', es: 'Política de privacidad' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=cookies"]', en: 'Cookies', pt: 'Cookies', es: 'Cookies' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=politica-nao-discriminacao"]', en: 'Non-discrimination policy', pt: 'Política de não discriminação', es: 'Política de no discriminación' },
        { s: '.lon-footer-legal-links a[href="/info.html?page=livro-reclamacoes"]', en: 'Complaints book', pt: 'Livro de reclamações', es: 'Libro de reclamaciones' },
        { s: '.lon-footer-bottom p', en: '\u00A9 2026 Lon Clinic \u00B7 Portugal', pt: '\u00A9 2026 Lon Clinic \u00B7 Portugal', es: '\u00A9 2026 Lon Clinic \u00B7 Portugal' },
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
        { s: '.progress-step[data-step="1"] .progress-label', en: 'Schedule', pt: 'Agendar', es: 'Horario' },
        { s: '.progress-step[data-step="2"] .progress-label', en: 'Details', pt: 'Dados', es: 'Datos' },
        { s: '.progress-step[data-step="3"] .progress-label', en: 'Payment', pt: 'Pagamento', es: 'Pago' },
        { s: '.progress-step[data-step="4"] .progress-label', en: 'Confirmed', pt: 'Confirmado', es: 'Confirmado' },

        /* ── Step 1: Schedule ── */
        { s: '#step-1 .step-title', en: 'Choose date & time', pt: 'Escolha data e hora', es: 'Elija fecha y hora' },
        { s: '#step-1 .step-desc', en: 'Select a convenient time for your video consultation.', pt: 'Selecione um horário conveniente para a sua consulta por vídeo.', es: 'Seleccione una hora conveniente para su consulta por vídeo.' },
        { s: '.timezone-info span', en: 'Times shown in your local timezone', pt: 'Horários apresentados no seu fuso horário local', es: 'Horarios mostrados en su zona horaria local' },
        { s: '#back-1', en: 'Back', pt: 'Voltar', es: 'Atrás' },
        { s: '#next-1', en: 'Continue to details', pt: 'Continuar para dados', es: 'Continuar a datos' },

        /* ── Step 2: Details ── */
        { s: '#step-2 .step-title', en: 'Your details', pt: 'Os seus dados', es: 'Sus datos' },
        { s: '#step-2 .step-desc', en: 'Please provide your information so we can prepare for your consultation.', pt: 'Por favor forneça as suas informações para que possamos preparar a sua consulta.', es: 'Por favor proporcione sus datos para que podamos preparar su consulta.' },
        { s: 'label[for="firstName"]', en: 'First name *', pt: 'Primeiro nome *', es: 'Nombre *' },
        { s: '#firstName', a: 'placeholder', en: 'John', pt: 'João', es: 'Juan' },
        { s: '#firstName ~ .form-error', en: 'Please enter your first name', pt: 'Por favor introduza o seu primeiro nome', es: 'Por favor introduzca su nombre' },
        { s: 'label[for="lastName"]', en: 'Last name *', pt: 'Apelido *', es: 'Apellido *' },
        { s: '#lastName', a: 'placeholder', en: 'Doe', pt: 'Silva', es: 'García' },
        { s: '#lastName ~ .form-error', en: 'Please enter your last name', pt: 'Por favor introduza o seu apelido', es: 'Por favor introduzca su apellido' },
        { s: 'label[for="email"]', en: 'Email address *', pt: 'Endereço de email *', es: 'Correo electrónico *' },
        { s: '#email', a: 'placeholder', en: 'john@example.com', pt: 'joao@exemplo.com', es: 'juan@ejemplo.com' },
        { s: '#email ~ .form-error', en: 'Please enter a valid email address', pt: 'Por favor introduza um endereço de email válido', es: 'Por favor introduzca un correo electrónico válido' },
        { s: 'label[for="phone"]', en: 'Phone number *', pt: 'Número de telefone *', es: 'Número de teléfono *' },
        { s: '#phone', a: 'placeholder', en: '+351 928 372 775', pt: '+351 928 372 775', es: '+34 600 000 000' },
        { s: '#phone ~ .form-error', en: 'Please enter your phone number', pt: 'Por favor introduza o seu número de telefone', es: 'Por favor introduzca su número de teléfono' },
        { s: 'label[for="dob"]', en: 'Date of birth *', pt: 'Data de nascimento *', es: 'Fecha de nacimiento *' },
        { s: '#dob ~ .form-error', en: 'Please enter your date of birth', pt: 'Por favor introduza a sua data de nascimento', es: 'Por favor introduzca su fecha de nacimiento' },
        { s: 'label[for="country"]', en: 'Country of residence *', pt: 'País de residência *', es: 'País de residencia *' },
        { s: '#country option[value=""]', en: 'Select your country', pt: 'Selecione o seu país', es: 'Seleccione su país' },
        { s: '#country ~ .form-error', en: 'Please select your country', pt: 'Por favor selecione o seu país', es: 'Por favor seleccione su país' },
        { s: '.form-section-title', en: 'Health background', pt: 'Historial de saúde', es: 'Historial de salud' },
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
        { s: '#consent ~ .checkbox-text', en: 'I consent to my health information being securely processed for the purpose of this consultation. <a href="#" style="color: var(--accent);">Privacy Policy</a>', pt: 'Autorizo o tratamento seguro das minhas informações de saúde para efeitos desta consulta. <a href="#" style="color: var(--accent);">Política de Privacidade</a>', es: 'Consiento que mi información de salud sea procesada de forma segura para los fines de esta consulta. <a href="#" style="color: var(--accent);">Política de Privacidad</a>', h: true },
        { s: '#terms ~ .checkbox-text', en: 'I agree to the <a href="#" style="color: var(--accent);">Terms of Service</a> and understand this is a private medical consultation.', pt: 'Concordo com os <a href="#" style="color: var(--accent);">Termos de Serviço</a> e compreendo que esta é uma consulta médica privada.', es: 'Acepto los <a href="#" style="color: var(--accent);">Términos de Servicio</a> y entiendo que esta es una consulta médica privada.', h: true },
        { s: '.form-checkbox-group:nth-child(12) .form-error', en: 'You must consent to proceed', pt: 'Deve consentir para prosseguir', es: 'Debe dar su consentimiento para continuar' },
        { s: '.form-checkbox-group:nth-child(13) .form-error', en: 'You must agree to the terms', pt: 'Deve concordar com os termos', es: 'Debe aceptar los términos' },
        { s: '#back-2', en: 'Back', pt: 'Voltar', es: 'Atrás' },
        { s: '#next-2', en: 'Continue to payment', pt: 'Continuar para pagamento', es: 'Continuar al pago' },

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
        { s: '#step-4 .step-title', en: 'Booking confirmed!', pt: 'Marcação confirmada!', es: '¡Reserva confirmada!' },
        { s: '#step-4 .step-desc', en: 'Your consultation has been successfully scheduled. A confirmation email has been sent to <strong id="confirmEmail">your email</strong>.', pt: 'A sua consulta foi agendada com sucesso. Um email de confirmação foi enviado para <strong id="confirmEmail">o seu email</strong>.', es: 'Su consulta ha sido programada con éxito. Se ha enviado un email de confirmación a <strong id="confirmEmail">su email</strong>.', h: true },
        { s: '.confirmation-card .confirmation-row:nth-child(1) .confirmation-label', en: 'Service', pt: 'Serviço', es: 'Servicio' },
        { s: '.confirmation-card .confirmation-row:nth-child(2) .confirmation-label', en: 'Date & Time', pt: 'Data e Hora', es: 'Fecha y Hora' },
        { s: '.confirmation-card .confirmation-row:nth-child(3) .confirmation-label', en: 'Format', pt: 'Formato', es: 'Formato' },
        { s: '.confirmation-card .confirmation-row:nth-child(3) .confirmation-value', en: 'Secure video call', pt: 'Videochamada segura', es: 'Videollamada segura' },
        { s: '.confirmation-card .confirmation-row:nth-child(4) .confirmation-label', en: 'Amount paid', pt: 'Valor pago', es: 'Importe pagado' },
        { s: '.confirmation-card .confirmation-row:nth-child(5) .confirmation-label', en: 'Booking reference', pt: 'Referência da marcação', es: 'Referencia de reserva' },
        { s: '.confirmation-next-steps h3', en: 'What happens next', pt: 'Próximos passos', es: 'Qué ocurre a continuación' },
        { s: '.next-step-item:nth-child(1) strong', en: 'Check your email', pt: 'Verifique o seu email', es: 'Revise su email' },
        { s: '.next-step-item:nth-child(1) p', en: 'You\'ll receive a confirmation with your video link and preparation instructions.', pt: 'Receberá uma confirmação com o link de vídeo e instruções de preparação.', es: 'Recibirá una confirmación con su enlace de vídeo e instrucciones de preparación.' },
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

        /* ── Nav (marcar uses /#... links) ── */
        { s: '.lon-nav-links a[href="/#inicio"], .lon-mobile-menu a[href="/#inicio"]', en: 'Home', pt: 'Início', es: 'Inicio' },
        { s: '.lon-nav-links a[href="/#platform"], .lon-mobile-menu a[href="/#platform"]', en: 'Platform', pt: 'Plataforma', es: 'Plataforma' },
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Services', pt: 'Serviços', es: 'Servicios' },
        { s: '.lon-nav-links a[href="/#contacto"], .lon-mobile-menu a[href="/#contacto"]', en: 'Contact', pt: 'Contato', es: 'Contacto' },
        { s: '.lon-nav-actions .lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions .lon-btn-primary[href="/#servicos"]', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },

        /* ── Error ── */
        { s: '#marcarError .marcar-error', en: 'Consultation type not found. Choose a service on the <a href="/#servicos">homepage</a>.', pt: 'Tipo de consulta não encontrado. Escolha um serviço na <a href="/#servicos">página inicial</a>.', es: 'Tipo de consulta no encontrado. Elija un servicio en la <a href="/#servicos">página de inicio</a>.', h: true },

        /* ── Back link ── */
        { s: '.marcar-back', en: '\u2190 Back to services', pt: '\u2190 Voltar aos serviços', es: '\u2190 Volver a los servicios' },

        /* ── Service meta ── */
        { s: '.marcar-meta span:nth-child(2)', en: 'Video call', pt: 'Videochamada', es: 'Videollamada' },
        { s: '.marcar-desc p', en: 'What is included:', pt: 'O que inclui:', es: 'Qué incluye:' },

        /* ── Schedule section ── */
        { s: '#marcarScheduleTitle', en: 'Date and time', pt: 'Data e hora', es: 'Fecha y hora' },
        { s: '.marcar-sub', en: 'Choose the day and time for your online consultation.', pt: 'Escolha o dia e o horário da sua consulta online.', es: 'Elija el día y la hora de su consulta online.' },
        { s: '#marcarCalPrev', a: 'aria-label', en: 'Previous month', pt: 'Mês anterior', es: 'Mes anterior' },
        { s: '#marcarCalNext', a: 'aria-label', en: 'Next month', pt: 'Mês seguinte', es: 'Mes siguiente' },

        /* ── Timezone note (text only via span) ── */
        { s: '.marcar-tz-text', en: 'Times shown in your device\'s local timezone', pt: 'Horários no fuso local do seu dispositivo', es: 'Horarios en la zona horaria local de su dispositivo' },

        /* ── Actions ── */
        { s: '.marcar-actions .lon-btn-ghost', en: 'Cancel', pt: 'Cancelar', es: 'Cancelar' },
        { s: '#marcarContinue', en: 'Continue to details and payment', pt: 'Continuar para dados e pagamento', es: 'Continuar a datos y pago' },
    ];

    /* ═══════════════════════════
       INFO PAGE
    ═══════════════════════════ */
    const INFO = [
        { s: 'title', en: 'Information | Lon Clinic', pt: 'Informação | Lon Clinic', es: 'Información | Lon Clinic', special: 'title' },
        { s: '.lon-nav-links a[href="/#inicio"], .lon-mobile-menu a[href="/#inicio"]', en: 'Home', pt: 'Início', es: 'Inicio' },
        { s: '.lon-nav-links a[href="/#platform"], .lon-mobile-menu a[href="/#platform"]', en: 'Platform', pt: 'Plataforma', es: 'Plataforma' },
        { s: '.lon-nav-links a[href="/#servicos"], .lon-mobile-menu a[href="/#servicos"]', en: 'Services', pt: 'Serviços', es: 'Servicios' },
        { s: '.lon-nav-links a[href="/#contacto"], .lon-mobile-menu a[href="/#contacto"]', en: 'Contact', pt: 'Contato', es: 'Contacto' },
        { s: '.lon-nav-actions .lon-btn-ghost[href="/patient-portal"]', en: 'Login', pt: 'Login', es: 'Acceder' },
        { s: '.lon-nav-actions .lon-btn-primary[href="/#servicos"]', en: 'Book consultation', pt: 'Marcar consulta', es: 'Reservar consulta' },
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
            loading: 'A carregar horários…',
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
            loading: 'Cargando horarios disponibles…',
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

    function getEntries() {
        const map = { index: INDEX, travel: TRAVEL, book: BOOK, marcar: MARCAR, info: INFO };
        const pageEntries = map[PAGE] || [];
        const commonEntries = (PAGE !== 'book') ? COMMON : [];
        // LON_NAV only needed for longevity travel/book pages (lon-nav with /#... links)
        const lonNav = (PAGE === 'travel' || PAGE === 'book') && document.getElementById('lonNav') ? LON_NAV : [];
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
    }

    /* ══════════════════════════════════════════
       TOGGLE UI
    ══════════════════════════════════════════ */
    function bindLangToggleClick(el) {
        el.addEventListener('click', (e) => {
            const btn = e.target.closest('.lang-btn');
            if (!btn) return;
            const lang = btn.dataset.lang;
            if (lang && lang !== currentLang) setLang(lang);
        });
    }

    function createToggleHTML() {
        return `<div class="lang-toggle" role="group" aria-label="Language selector">
            <button type="button" class="lang-btn${currentLang === 'en' ? ' active' : ''}" data-lang="en" aria-pressed="${currentLang === 'en'}">EN</button>
            <button type="button" class="lang-btn${currentLang === 'pt' ? ' active' : ''}" data-lang="pt" aria-pressed="${currentLang === 'pt'}">PT</button>
            <button type="button" class="lang-btn${currentLang === 'es' ? ' active' : ''}" data-lang="es" aria-pressed="${currentLang === 'es'}">ES</button>
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

        // Lon mobile drawer
        const lonMobileMenu = document.getElementById('lonMobileMenu');
        if (lonMobileMenu && !mobileContent) {
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
