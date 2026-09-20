import HeroFullscreen from '@/components/modules/HeroFullscreen';
import NeedCard from '@/components/modules/NeedCard';
import TestimonialVisual from '@/components/modules/TestimonialVisual';
import FeatureBlock from '@/components/modules/FeatureBlock';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section - FULLSCREEN */}
      <HeroFullscreen
        eyebrow="Clínica certificada pela ERS · nº 45.475"
        title="Modern Healthcare,"
        titleItalic="Built Around People"
        description="Medicina, nutrição e psicologia integradas. Diga-nos o que precisa. Nós ajudamos a encontrar o cuidado certo — sem sair de casa."
        backgroundImage="/image/hero-fullscreen.webp"
        primaryCTA={{ text: "Marcar consulta", href: "/marcar" }}
        secondaryCTA={{ text: "Ajude-me a escolher", href: "/quizzes" }}
      />

      {/* Needs Section - MODERN GRID */}
      <section className="py-32 bg-white">
        <div class="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-[var(--text)] mb-6 tracking-[-0.03em]">
              Diga-nos o que precisa
            </h2>
            <p className="text-2xl text-[var(--text-muted)] m-0 max-w-[700px] mx-auto">
              Comece pela sua necessidade — encontramos o caminho mais simples.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <NeedCard
              imageSrc="/image/consulta-clinica-geral.webp"
              imageAlt="Consulta médica"
              title="Preciso de falar com um médico"
              description="Sintomas, dúvidas, medicação, exames ou acompanhamento."
              href="/longevidade"
            />
            
            <NeedCard
              imageSrc="/image/psi-choice-individual.webp"
              imageAlt="Terapia psicologia"
              title="Sinto-me triste ou ansioso"
              description="Ansiedade, stress, burnout ou a vontade de falar com alguém."
              href="/psicologia"
            />
            
            <NeedCard
              imageSrc="/image/travel-clinic-mountain-bg-v2.png"
              imageAlt="Medicina do viajante"
              title="Vou viajar"
              description="Vacinação, prevenção e riscos associados ao destino."
              href="/travel-clinic"
            />
            
            <NeedCard
              imageSrc="/image/nutricao-alimentos.webp"
              imageAlt="Nutrição e alimentação"
              title="Quero comer melhor"
              description="Perder peso ou criar hábitos mais saudáveis, com acompanhamento."
              href="/nutricao"
            />
            
            <NeedCard
              imageSrc="/image/consulta-urgente.webp"
              imageAlt="Consulta urgente"
              title="Preciso de ser visto rapidamente"
              description="Avaliação médica rápida, para situações que não são emergência."
              href="/urgent-care"
            />
            
            <NeedCard
              imageSrc="/image/consulta-telemedicina-mesa.webp"
              imageAlt="Testes e questionários"
              title="Não sei o que preciso"
              description="Faça um teste rápido e descubra o caminho certo."
              href="/quizzes"
              highlight
            />
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-15 bg-[var(--bg-alt)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '✓', text: 'Médicos inscritos na Ordem dos Médicos' },
              { icon: '✓', text: 'Nutricionistas e Psicólogos nas respetivas Ordens' },
              { icon: '🌍', text: 'Consultas em português, inglês e espanhol' },
              { icon: '💻', text: 'Sem sala de espera, sem deslocação' }
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-4 text-left">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl bg-white rounded-xl border border-[var(--border)]">
                  {badge.icon}
                </div>
                <p className="text-[15px] font-medium text-[var(--text)] m-0 leading-snug">
                  {badge.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-12 tracking-tight">
            Ser ouvido faz diferença
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <TestimonialVisual
              avatarSrc="/image/hero-run.webp"
              avatarAlt="Paciente"
              stars={5}
              text="A doutora que me atendeu era super simpática, muito clara na abordagem do tema e esclareceu-me todas as dúvidas. Sem dúvida voltarei a contactar-vos."
              author="Paciente verificada"
              role="Junho de 2026"
            />
            
            <TestimonialVisual
              avatarSrc="/image/hero-bay.webp"
              avatarAlt="Miguel"
              stars={5}
              text="Consegui marcar a consulta para o próprio dia e, no final, tive também a prescrição das vacinas de que precisava. Muito simpática, atenciosa e profissional."
              author="Miguel"
              role="Via Trustpilot · Setembro de 2026"
            />
          </div>

          <div className="text-center">
            <Link
              href="https://pt.trustpilot.com/review/lonclinic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-[var(--primary)] no-underline hover:text-[var(--primary-dark)] hover:underline transition-colors"
            >
              Ver todas as avaliações no Trustpilot →
            </Link>
          </div>
        </div>
      </section>

      {/* Why LON Clinic */}
      <section className="py-20 bg-[var(--bg-alt)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-16 tracking-tight">
            Uma clínica online, com relação humana
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <FeatureBlock
              icon="✓"
              title="Profissionais em quem pode confiar"
              description="Qualificados e inscritos nas respetivas Ordens."
            />
            
            <FeatureBlock
              icon="📖"
              title="Uma história, não apenas uma consulta"
              description="Conhecer o contexto permite um acompanhamento mais consistente."
            />
            
            <FeatureBlock
              icon="🔄"
              title="Continuidade dos cuidados"
              description="Quando volta, o acompanhamento continua — sem recomeçar do zero."
            />
            
            <FeatureBlock
              icon="🏥"
              title="Várias áreas de saúde"
              description="Medicina, saúde mental e nutrição no mesmo espaço."
            />
            
            <FeatureBlock
              icon="💻"
              title="Sem deslocações"
              description="Computador, tablet ou smartphone, onde quer que esteja."
            />
            
            <FeatureBlock
              icon="👤"
              title="Cuidado personalizado"
              description="Cada consulta parte da situação concreta de cada pessoa."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-25 text-center bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-4 tracking-tight">
            Quando precisar, estamos aqui
          </h2>
          <p className="text-lg text-[var(--text-muted)] mb-10">
            Uma dúvida de saúde, um sintoma ou simplesmente a vontade de cuidar melhor de si.
          </p>
          
          <div className="flex flex-col items-center gap-5">
            <Link
              href="/marcar"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--primary)] rounded-[10px] shadow-[0_4px_12px_rgba(240,148,88,0.3)] hover:bg-[var(--primary-dark)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(240,148,88,0.4)] transition-all duration-200 no-underline"
            >
              Marcar consulta
            </Link>
            
            <p className="text-base font-medium text-[var(--primary)] m-0">
              Não sabe por onde começar?{' '}
              <Link href="/quizzes" className="hover:underline">
                Fale com a nossa equipa →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
