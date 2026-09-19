import Link from 'next/link';
import PricingCard from '@/components/modules/PricingCard';
import TestimonialVisual from '@/components/modules/TestimonialVisual';
import FAQItem from '@/components/modules/FAQItem';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Psicologia online — psicólogos OPP | Lon Clinic',
  description: 'Conta-nos o que precisa. Encontramos o psicólogo certo. Consultas online, em português, sem lista de espera. Não resultou? Muda de psicólogo quando quiser.',
  openGraph: {
    title: 'Psicologia online — psicólogos OPP | Lon Clinic',
    description: 'Conta-nos o que precisa. Encontramos o psicólogo certo. Não resultou? Muda de psicólogo quando quiser, sem custos extra.',
    url: 'https://www.lonclinic.com/psicologia',
    type: 'website',
    images: [{ url: 'https://www.lonclinic.com/image/image3.webp' }]
  }
};

export default function PsicologiaPage() {
  const faqs = [
    {
      question: 'Quem são os psicólogos?',
      answer: 'Trabalhamos com psicólogos qualificados e inscritos na Ordem dos Psicólogos Portugueses. Pode escolher o seu psicólogo com base no perfil e área de especialização, ou deixar que a nossa equipa faça a atribuição, de acordo com as suas respostas à triagem. Se mais tarde sentir que outro profissional faz mais sentido, pode sempre pedir uma mudança.'
    },
    {
      question: 'Como sei se a LON Clinic é para mim?',
      answer: 'A LON Clinic foi pensada para quem procura acompanhamento psicológico contínuo, e não apenas uma sessão pontual. Se valoriza ter uma sessão de vídeo todas as semanas com o mesmo psicólogo, este formato pode ser uma boa opção. Se estiver em risco imediato ou numa situação de emergência, deve contactar primeiro os serviços de emergência adequados.'
    },
    {
      question: 'Quanto custa?',
      answer: 'Acompanhamento semanal individual: 56€/semana, cobrado mensalmente (224€). Terapia de casal semanal: 65€/semana, cobrado mensalmente (260€). Sessão pontual sem compromisso semanal: individual 60€, casal 75€.'
    },
    {
      question: 'Quanto tempo até me ser atribuído um psicólogo?',
      answer: 'Depois de completar a triagem, pode escolher diretamente o psicólogo que preferir, ou pedir à nossa equipa para fazer a atribuição mais adequada ao seu perfil. Normalmente, o processo fica concluído nos dias úteis seguintes e avisamos assim que estiver pronto.'
    },
    {
      question: 'O acompanhamento online substitui a terapia presencial?',
      answer: 'Para muitas pessoas, sim. O acompanhamento online é uma alternativa séria e eficaz, conduzida com o mesmo rigor clínico. No entanto, não substitui cuidados de emergência nem situações em que seja necessária uma avaliação presencial urgente.'
    },
    {
      question: 'Durante quanto tempo posso usar a LON Clinic?',
      answer: 'Pode manter o acompanhamento durante o tempo que fizer sentido. Existe um compromisso mínimo de 1 mês e, a partir daí, pode continuar ou cancelar a qualquer momento, sem fidelização.'
    }
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#9BB1BC] to-[#537284] text-white pt-20 pb-24">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="flex items-center gap-2 text-white/90 text-sm mb-6">
            <span>★★★★★</span>
            <span>5.0 · psicólogos inscritos na OPP</span>
          </div>
          
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-tight mb-6 max-w-[800px]">
            Conta-nos o que precisa.<br />Encontramos o psicólogo certo.
          </h1>
          
          <p className="text-xl text-white/90 leading-relaxed mb-10 max-w-[700px]">
            Consultas online, em português, sem lista de espera. Não resultou? Muda de psicólogo quando quiser, sem custos extra.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-8">
            <Link
              href="/marcar/psicologia-mensal"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-[#537284] bg-white rounded-lg hover:bg-gray-50 transition-all no-underline shadow-lg hover:-translate-y-0.5"
            >
              Apoio individual
            </Link>
            <Link
              href="/marcar/terapia-casal"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/20 border-2 border-white rounded-lg hover:bg-white/30 transition-all no-underline backdrop-blur-sm"
            >
              Apoio para casal
            </Link>
          </div>
          
          <p className="text-sm text-white/80">
            Se está em crise, ligue <a href="tel:112" className="underline text-white font-semibold">112</a> ou SNS 24 · <a href="tel:808242424" className="underline text-white font-semibold">808 24 24 24</a>
          </p>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-16">
            Como funciona
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                number: '1',
                title: 'Conte-nos o que precisa',
                description: 'Uma triagem breve, menos de 10 minutos, para perceber o que procura.'
              },
              {
                number: '2',
                title: 'Sugerimos 2 a 3 psicólogos',
                description: 'Com base no seu perfil e nos horários que servem.'
              },
              {
                number: '3',
                title: 'Escolhe e marca',
                description: 'Não resultou? Muda de psicólogo sem custos extra.'
              },
              {
                number: '4',
                title: 'A sua sessão',
                description: 'Videochamada semanal, no seu horário, com o mesmo psicólogo.'
              }
            ].map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#9BB1BC] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-3">
                  {step.title}
                </h3>
                <p className="text-[15px] text-[var(--text-muted)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-[var(--bg-alt)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-4">
            Um plano que cresce consigo
          </h2>
          <p className="text-center text-lg text-[var(--text-muted)] mb-12 max-w-[600px] mx-auto">
            56€ por semana, sempre. Mude de psicólogo quando quiser, sem custos extra.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto">
            <PricingCard
              title="Sessão pontual"
              price="60€"
              period="por sessão"
              description="Para quem quer experimentar antes de se comprometer."
              features={[
                'Uma sessão individual de 50 minutos',
                'Videochamada online',
                'Sem compromisso de continuidade'
              ]}
              ctaText="Marcar sessão"
              ctaHref="/marcar/psicologia-pontual"
            />
            
            <PricingCard
              title="Acompanhamento individual"
              price="224€"
              period="/mês"
              description="Sessões semanais com o mesmo psicólogo."
              features={[
                '4 sessões por mês (56€/semana)',
                'Videochamada todas as semanas',
                'Mude de psicólogo quando quiser',
                'Cancele a qualquer momento após 1 mês'
              ]}
              ctaText="Começar acompanhamento"
              ctaHref="/marcar/psicologia-mensal"
              highlighted
            />
            
            <PricingCard
              title="Terapia de casal"
              price="260€"
              period="/mês"
              description="Sessões semanais para o casal."
              features={[
                '4 sessões por mês (65€/semana)',
                'Videochamada em conjunto',
                'Mesmo terapeuta todas as semanas',
                'Sessão pontual: 75€'
              ]}
              ctaText="Marcar casal"
              ctaHref="/marcar/terapia-casal"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-12">
            O que dizem os nossos pacientes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <TestimonialVisual
              avatarSrc="/image/hero-run.webp"
              avatarAlt="Paciente"
              stars={5}
              text="Finalmente consegui encontrar um psicólogo que me compreende. O facto de poder mudar sem custos extra deu-me a liberdade de encontrar a pessoa certa."
              author="Paciente verificada"
              role="Setembro de 2026"
            />
            
            <TestimonialVisual
              avatarSrc="/image/hero-bay.webp"
              avatarAlt="Paciente"
              stars={5}
              text="As sessões online são surpreendentemente eficazes. Consigo falar de casa, no meu espaço, e isso faz toda a diferença."
              author="Paciente verificado"
              role="Agosto de 2026"
            />
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="py-12 bg-[var(--bg-alt)]">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[#9BB1BC] mb-2">100%</div>
              <div className="text-sm text-[var(--text-muted)]">Online, sem deslocações</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#9BB1BC] mb-2">56€</div>
              <div className="text-sm text-[var(--text-muted)]">Por semana, sempre</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#9BB1BC] mb-2">OPP</div>
              <div className="text-sm text-[var(--text-muted)]">Psicólogos certificados</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-[800px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-12">
            Perguntas frequentes
          </h2>
          
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-6">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Areas/Queixas */}
      <section className="py-20 bg-[var(--bg-alt)]">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-center text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-12">
            Áreas de acompanhamento
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { text: 'Burnout', href: '/burnout' },
              { text: 'Ansiedade no trabalho', href: '/ansiedade-no-trabalho' },
              { text: 'Ataques de pânico', href: '/ataques-de-panico' },
              { text: 'Terapia de casal', href: '/terapia-de-casal' },
              { text: 'Depressão', href: '/depressao' },
              { text: 'Gestão de stress', href: '/stress' },
              { text: 'Autoestima', href: '/autoestima' },
              { text: 'Luto', href: '/luto' }
            ].map((area) => (
              <Link
                key={area.href}
                href={area.href}
                className="block px-4 py-3 bg-white border border-[var(--border)] rounded-lg text-center text-[15px] text-[var(--text)] hover:border-[#9BB1BC] hover:bg-[#f0f4f6] transition-colors no-underline"
              >
                {area.text}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-[700px] mx-auto px-6">
          <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[var(--text)] mb-6">
            Pronto para começar?
          </h2>
          <p className="text-lg text-[var(--text-muted)] mb-10">
            Conte-nos o que precisa. Encontramos o psicólogo certo para si.
          </p>
          
          <Link
            href="/marcar/psicologia-mensal"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[#9BB1BC] rounded-lg hover:bg-[#537284] transition-all no-underline shadow-lg hover:-translate-y-0.5"
          >
            Começar acompanhamento
          </Link>
        </div>
      </section>
    </main>
  );
}
