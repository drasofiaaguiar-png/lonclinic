import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="lon-landing lon-home">
      <main id="conteudo-principal">
        {/* Hero Section - OLD DESIGN */}
        <section className="dr-hero" id="inicio">
          <picture>
            <source media="(max-width: 939px)" srcSet="/image/hero-bay.webp" width={768} height={1024} />
            <Image 
              className="dr-hero-bg" 
              src="/image/hero-run.webp" 
              alt="Vista costeira junto ao mar" 
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          </picture>
          <div className="dr-hero-scrim" aria-hidden="true"></div>
          <div className="dr-hero-stage">
            <div className="dr-hero-content">
              <p className="dr-badge">
                <span className="dr-badge-dot" aria-hidden="true"></span>
                Clínica certificada pela ERS · nº 45.475
              </p>
              <h1>
                <span className="dr-hero-title-line">Clínica Médica Online</span>
              </h1>
              <p className="dr-lead">
                Medicina, nutrição e psicologia integradas.<br />
                Diga-nos o que precisa. Nós ajudamos a encontrar o cuidado certo — sem sair de casa.
              </p>
              <div className="dr-cta-row">
                <Link href="/marcar" className="lon-btn lon-btn-dark" data-cta="book">
                  <span className="lon-btn-label">Marcar consulta</span>
                  <svg className="lon-btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17L17 7"/><path d="M8 7h9v9"/>
                  </svg>
                </Link>
                <Link href="/quizzes" className="lon-btn lon-btn-ghost">
                  Ajude-me a escolher
                </Link>
              </div>
              <p className="dr-hero-meta">Consulta online · Sem deslocações · Onde quer que esteja</p>
            </div>
            <div className="dr-hero-dock">
              <section className="dr-hero-glass lon-trust-strip" aria-label="Destaques de confiança da clínica">
                <ul className="dr-trust-list">
                  <li>Médicos inscritos na Ordem dos Médicos</li>
                  <li>Nutricionistas e Psicólogos nas respetivas Ordens</li>
                  <li>Consultas em português, inglês e espanhol</li>
                  <li>Sem sala de espera, sem deslocação</li>
                </ul>
              </section>
            </div>
          </div>
        </section>

        {/* Services Section - OLD DESIGN with NEW CONTENT */}
        <section className="lon-services" id="servicos" aria-labelledby="lon-need-title">
          <div className="lon-container">
            <header className="lon-need-header">
              <p className="lon-need-kicker">Diga-nos o que precisa</p>
              <h2 id="lon-need-title">Comece pela sua necessidade</h2>
              <p className="lon-need-lead">Nem sempre é fácil saber que profissional deve consultar. Encontre o caminho mais simples para cuidar da sua saúde.</p>
            </header>

            <div className="lon-need-sections">
              {/* Consultas Médicas */}
              <article className="lon-need-block" id="lon-need-medico">
                <header className="lon-need-copy">
                  <span className="lon-need-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.8 16.4A6 6 0 0 1 6 7h.1a6 6 0 0 1 11.8 0H18a6 6 0 0 1 1.2 9.4"/><path d="M12 12v9"/><path d="M8 17h8"/>
                    </svg>
                  </span>
                  <h3>Preciso de falar com um médico</h3>
                  <p className="lon-need-desc">Sintomas, dúvidas, medicação, exames ou acompanhamento.</p>
                </header>
                <div className="lon-need-offers">
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/consulta-clinica-geral.webp" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Medicina de Longevidade</h4>
                      <p className="lon-need-offer-price">39 € · 30 min</p>
                      <Link href="/longevidade" className="lon-btn lon-btn-dark lon-btn-sm">Ver mais</Link>
                    </div>
                  </article>
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/consulta-telemedicina.webp" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Consulta Médica Urgente</h4>
                      <p className="lon-need-offer-price">39 €</p>
                      <Link href="/urgent-care" className="lon-btn lon-btn-dark lon-btn-sm">Ver mais</Link>
                    </div>
                  </article>
                </div>
              </article>

              {/* Psicologia */}
              <article className="lon-need-block" id="lon-need-psico">
                <header className="lon-need-copy">
                  <span className="lon-need-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
                    </svg>
                  </span>
                  <h3>Sinto-me triste ou ansioso</h3>
                  <p className="lon-need-desc">Ansiedade, stress, burnout ou a vontade de falar com alguém.</p>
                </header>
                <div className="lon-need-offers">
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/guide/blog/sinais-de-burnout-no-trabalho-remoto-destaque.webp" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Consulta de Psicologia</h4>
                      <p className="lon-need-offer-price">56 € · 45 min</p>
                      <Link href="/psicologia" className="lon-btn lon-btn-dark lon-btn-sm">Ver mais</Link>
                    </div>
                  </article>
                </div>
              </article>

              {/* Nutrição */}
              <article className="lon-need-block" id="lon-need-nutricao">
                <header className="lon-need-copy">
                  <span className="lon-need-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                    </svg>
                  </span>
                  <h3>Quero comer melhor</h3>
                  <p className="lon-need-desc">Perder peso ou criar hábitos mais saudáveis, com acompanhamento.</p>
                </header>
                <div className="lon-need-offers">
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/nutricao-consulta.webp" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Consulta de Nutrição</h4>
                      <p className="lon-need-offer-price">45 € · 30 min</p>
                      <Link href="/nutricao" className="lon-btn lon-btn-dark lon-btn-sm">Ver mais</Link>
                    </div>
                  </article>
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/nutricao-emagrecimento.webp" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Programa Integrado</h4>
                      <p className="lon-need-offer-price">490 € · 6 meses</p>
                      <p className="lon-need-offer-desc">Médico + nutrição</p>
                      <Link href="/nutricao#programa" className="lon-btn lon-btn-dark lon-btn-sm">Ver mais</Link>
                    </div>
                  </article>
                </div>
              </article>

              {/* Medicina do Viajante */}
              <article className="lon-need-block" id="lon-need-viagem">
                <header className="lon-need-copy">
                  <span className="lon-need-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                    </svg>
                  </span>
                  <h3>Vou viajar</h3>
                  <p className="lon-need-desc">Vacinação, prevenção e riscos associados ao destino.</p>
                </header>
                <div className="lon-need-offers">
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/travel-clinic-mountain-bg.jpg" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Consulta do Viajante</h4>
                      <p className="lon-need-offer-price">39 €</p>
                      <Link href="/travel" className="lon-btn lon-btn-dark lon-btn-sm">Ver mais</Link>
                    </div>
                  </article>
                </div>
              </article>

              {/* Quiz */}
              <article className="lon-need-block" id="lon-need-quiz">
                <header className="lon-need-copy">
                  <span className="lon-need-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
                    </svg>
                  </span>
                  <h3>Não sei o que preciso</h3>
                  <p className="lon-need-desc">Faça um teste rápido e descubra o caminho certo.</p>
                </header>
                <div className="lon-need-offers">
                  <article className="lon-need-offer">
                    <Image className="lon-need-offer-img" src="/image/hero-bay.webp" alt="" width={800} height={800} />
                    <div className="lon-need-offer-body">
                      <h4>Teste de Burnout</h4>
                      <p className="lon-need-offer-desc">5 minutos · resultado imediato</p>
                      <Link href="/quizzes" className="lon-btn lon-btn-dark lon-btn-sm">Fazer teste</Link>
                    </div>
                  </article>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Testimonials - OLD DESIGN */}
        <section className="lon-social-proof" aria-labelledby="lon-testimonials-title">
          <div className="lon-container">
            <header className="lon-section-header">
              <h2 id="lon-testimonials-title">Ser ouvido faz diferença</h2>
              <p className="lon-section-lead">Clientes reais verificados pelo Trustpilot</p>
            </header>
            <div className="lon-testimonials">
              <blockquote className="lon-testimonial">
                <p>"A doutora que me atendeu era super simpática, muito clara na abordagem do tema e esclareceu-me todas as dúvidas. Sem dúvida voltarei a contactar-vos."</p>
                <footer>
                  <cite>Paciente verificada · Junho de 2026</cite>
                </footer>
              </blockquote>
              <blockquote className="lon-testimonial">
                <p>"Consegui marcar a consulta para o próprio dia e, no final, tive também a prescrição das vacinas de que precisava. Muito simpática, atenciosa e profissional."</p>
                <footer>
                  <cite>Miguel, via Trustpilot · Setembro de 2026</cite>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Why LON - OLD DESIGN with NEW CONTENT */}
        <section className="lon-why" aria-labelledby="lon-why-title">
          <div className="lon-container">
            <header className="lon-section-header">
              <h2 id="lon-why-title">Uma clínica online, com relação humana</h2>
            </header>
            <div className="lon-features">
              <article className="lon-feature">
                <h3>Profissionais em quem pode confiar</h3>
                <p>Qualificados e inscritos nas respetivas Ordens.</p>
              </article>
              <article className="lon-feature">
                <h3>Uma história, não apenas uma consulta</h3>
                <p>Conhecer o contexto permite um acompanhamento mais consistente.</p>
              </article>
              <article className="lon-feature">
                <h3>Continuidade dos cuidados</h3>
                <p>Quando volta, o acompanhamento continua — sem recomeçar do zero.</p>
              </article>
              <article className="lon-feature">
                <h3>Várias áreas de saúde</h3>
                <p>Medicina, saúde mental e nutrição no mesmo espaço.</p>
              </article>
              <article className="lon-feature">
                <h3>Sem deslocações</h3>
                <p>Computador, tablet ou smartphone, onde quer que esteja.</p>
              </article>
              <article className="lon-feature">
                <h3>Cuidado personalizado</h3>
                <p>Cada consulta parte da situação concreta de cada pessoa.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Final CTA - OLD DESIGN */}
        <section className="lon-cta-final" aria-labelledby="lon-cta-title">
          <div className="lon-container">
            <h2 id="lon-cta-title">Quando precisar, estamos aqui</h2>
            <p className="lon-cta-lead">Uma dúvida de saúde, um sintoma ou simplesmente a vontade de cuidar melhor de si.</p>
            <div className="lon-cta-actions">
              <Link href="/marcar" className="lon-btn lon-btn-dark lon-btn-lg">
                Marcar consulta
              </Link>
              <Link href="/patient-portal" className="lon-btn lon-btn-ghost lon-btn-lg">
                Fale com a nossa equipa →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
