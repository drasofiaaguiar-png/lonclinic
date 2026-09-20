import HeroFullscreen from '@/components/modules/HeroFullscreen';
import ServiceCard from '@/components/modules/ServiceCard';
import ConditionCard from '@/components/modules/ConditionCard';
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

      {/* Services Section - MODERN CARDS */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-[#1C1710] mb-4 tracking-[-0.02em]">
              Os nossos serviços <span className="text-[var(--primary)]">mais procurados</span>
            </h2>
            <p className="text-xl text-[#1C1710]/60 max-w-[700px] mx-auto leading-relaxed">
              Cuidados de saúde integrados, online e acessíveis para o que realmente precisa.
            </p>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              title="Consultas Médicas"
              description="Medicina de longevidade e cuidados preventivos com foco na sua saúde a longo prazo."
              imageSrc="/image/consulta-clinica-geral.webp"
              imageAlt="Consulta médica online"
              primaryCTA={{ text: "Marcar consulta", href: "/longevidade" }}
              secondaryCTA={{ text: "Saber mais", href: "/longevidade" }}
              bgColor="#F3EDE5"
            />
            
            <ServiceCard
              title="Psicologia"
              description="Terapia individual e de casal para ansiedade, burnout e bem-estar emocional."
              imageSrc="/image/psi-choice-individual.webp"
              imageAlt="Terapia psicologia online"
              primaryCTA={{ text: "Marcar consulta", href: "/psicologia" }}
              secondaryCTA={{ text: "Saber mais", href: "/psicologia" }}
              bgColor="#E8F1F5"
            />
            
            <ServiceCard
              title="Nutrição"
              description="Acompanhamento nutricional contínuo adaptado aos seus objetivos e fase de vida."
              imageSrc="/image/nutricao-alimentos.webp"
              imageAlt="Nutrição e alimentação saudável"
              primaryCTA={{ text: "Marcar consulta", href: "/nutricao" }}
              secondaryCTA={{ text: "Saber mais", href: "/nutricao" }}
              bgColor="#F0F8ED"
            />
          </div>
        </div>
      </section>

      {/* Conditions Section - HORIZONTAL CARDS */}
      <section className="py-24 lg:py-32 bg-[#FDFCFB]">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Section Header */}
          <div className="mb-16">
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-[#1C1710] mb-4 tracking-[-0.02em] max-w-[800px]">
              A LON Clinic é o seu parceiro na <span className="text-[var(--primary)]">saúde, força e vitalidade</span>
            </h2>
          </div>

          {/* Conditions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ConditionCard
              title="Medicina Funcional"
              imageSrc="/image/consulta-clinica-geral.webp"
              imageAlt="Medicina funcional"
              href="/longevidade"
              bgColor="#E8E3DA"
            />
            
            <ConditionCard
              title="Perda de Peso"
              imageSrc="/image/nutricao-alimentos.webp"
              imageAlt="Perda de peso"
              href="/nutricao"
              bgColor="#E8F1E8"
            />
            
            <ConditionCard
              title="Saúde Intestinal"
              imageSrc="/image/consulta-telemedicina-mesa.webp"
              imageAlt="Saúde intestinal"
              href="/nutricao"
              bgColor="#F5E8DC"
            />
            
            <ConditionCard
              title="Ansiedade"
              imageSrc="/image/psi-choice-individual.webp"
              imageAlt="Ansiedade"
              href="/psicologia"
              bgColor="#D9E8F5"
            />
            
            <ConditionCard
              title="Tristeza"
              imageSrc="/image/hero-run.webp"
              imageAlt="Tristeza"
              href="/psicologia"
              bgColor="#E8D9F5"
            />
            
            <ConditionCard
              title="Inflamação"
              imageSrc="/image/hero-bay.webp"
              imageAlt="Inflamação"
              href="/longevidade"
              bgColor="#F5D9D9"
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
