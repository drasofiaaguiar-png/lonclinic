import Image from 'next/image';
import Link from 'next/link';

const services = [
  {
    title: "Medicina",
    description: "Medicina de longevidade e consultas urgentes online com acompanhamento certificado.",
    price: "Desde 39€",
    href: "/longevidade",
    icon: "💊",
    tone: "bg-blue-100",
  },
  {
    title: "Psicologia",
    description: "Um espaço seguro para cuidar da sua saúde emocional, ao seu ritmo.",
    price: "Desde 56€",
    href: "/psicologia",
    icon: "✨",
    tone: "bg-orange-100",
  },
  {
    title: "Nutrição",
    description: "Planos alimentares realistas, personalizados para a sua vida.",
    price: "Desde 45€",
    href: "/nutricao",
    icon: "🥗",
    tone: "bg-green-100",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white">
      <main id="conteudo-principal">
        {/* Hero Section - MODERN */}
        <section id="inicio" className="relative min-h-screen">
          <Image 
            className="absolute inset-0 h-full w-full object-cover object-center" 
            src="/image/hero-run.webp" 
            alt="Vista costeira junto ao mar" 
            fill
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-blue-500/10" />
          
          <div className="relative z-10 flex min-h-screen flex-col justify-center px-5 py-24 md:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Left: Text Content */}
                <div className="text-white">
                  <h1 className="font-extrabold leading-[1.1]" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 'clamp(2.75rem, 7vw, 5.5rem)', color: '#ffffff' }}>
                    Na LON Clinic, a sua saúde{' '}
                    <span style={{ color: '#dc2626' }}>é mais do que um sintoma.</span>
                  </h1>
                  
                  <p className="mt-6 text-lg md:text-xl leading-relaxed text-white font-medium" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                    Clínica médica registada na Entidade Reguladora de Saúde. 100% Online.
                  </p>
                  
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link 
                      href="/marcar" 
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:bg-red-700 hover:scale-105"
                      style={{ fontFamily: "'Open Sans', sans-serif" }}
                    >
                      Marcar consulta
                      <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link 
                      href="#especialidades" 
                      className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/20 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/30"
                      style={{ fontFamily: "'Open Sans', sans-serif" }}
                    >
                      Ver especialidades
                    </Link>
                  </div>
                </div>

                {/* Right: Floating Badges */}
                <div className="hidden lg:flex flex-col items-end gap-6 pr-8">
                  <div 
                    className="rounded-full bg-blue-500/90 px-8 py-4 text-white font-bold text-lg shadow-2xl backdrop-blur-sm animate-float"
                    style={{ fontFamily: "'Open Sans', sans-serif", animation: 'float 3s ease-in-out infinite' }}
                  >
                    Saúde Mental
                  </div>
                  
                  <div 
                    className="rounded-full bg-blue-500/90 px-8 py-4 text-white font-bold text-lg shadow-2xl backdrop-blur-sm mr-12 animate-float"
                    style={{ fontFamily: "'Open Sans', sans-serif", animationDelay: '0.5s', animation: 'float 3s ease-in-out infinite 0.5s' }}
                  >
                    Saúde Metabólica
                  </div>
                  
                  <div 
                    className="rounded-full bg-blue-500/90 px-8 py-4 text-white font-bold text-lg shadow-2xl backdrop-blur-sm animate-float"
                    style={{ fontFamily: "'Open Sans', sans-serif", animationDelay: '1s', animation: 'float 3s ease-in-out infinite 1s' }}
                  >
                    Nutrição
                  </div>
                  
                  <div 
                    className="rounded-full bg-blue-500/90 px-8 py-4 text-white font-bold text-lg shadow-2xl backdrop-blur-sm mr-24 animate-float"
                    style={{ fontFamily: "'Open Sans', sans-serif", animationDelay: '1.5s', animation: 'float 3s ease-in-out infinite 1.5s' }}
                  >
                    Saúde Cardiovascular
                  </div>
                  
                  <div 
                    className="rounded-full bg-blue-500/90 px-8 py-4 text-white font-bold text-lg shadow-2xl backdrop-blur-sm mr-8 animate-float"
                    style={{ fontFamily: "'Open Sans', sans-serif", animationDelay: '2s', animation: 'float 3s ease-in-out infinite 2s' }}
                  >
                    Microbioma
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section - MODERN */}
        <section id="especialidades" className="px-5 py-20 md:px-8 md:py-28 bg-gray-50">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Especialidades</p>
                <h2 className="mt-3 text-4xl font-extrabold leading-tight text-gray-900 md:text-6xl">
                  Como se sente hoje?
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-gray-600">
                Escolha a área que melhor descreve o seu momento. Nós ajudamos a encontrar o profissional certo.
              </p>
            </div>
            
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {services.map(({ title, description, price, icon, tone, href }) => (
                <Link 
                  key={title}
                  href={href}
                  className="group flex min-h-80 flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl md:p-7"
                >
                  <div>
                    <div className={`flex size-14 items-center justify-center rounded-2xl text-2xl ${tone}`}>
                      {icon}
                    </div>
                    <h3 className="mt-8 text-2xl font-bold text-gray-900">{title}</h3>
                    <p className="mt-3 leading-relaxed text-gray-600">{description}</p>
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5">
                    <span className="text-sm font-bold text-gray-900">{price}</span>
                    <span className="flex size-10 items-center justify-center rounded-full bg-orange-500 text-white transition-transform group-hover:translate-x-1">
                      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="px-5 py-20 md:px-8 md:py-28 bg-gray-900 text-white">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Cuidado sem distância</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
                A excelência clínica portuguesa, onde quer que esteja.
              </h2>
            </div>
            <div className="grid gap-3">
              {["Profissionais certificados", "Consultas sem pressa", "Acompanhamento contínuo"].map((item, index) => (
                <div className="flex items-center gap-5 border-b border-white/20 py-5" key={item}>
                  <span className="text-sm font-bold text-orange-400">0{index + 1}</span>
                  <p className="text-lg font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-5 py-20 md:px-8 md:py-28 bg-white">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Testemunhos</p>
              <h2 className="mt-4 text-4xl font-extrabold text-gray-900 md:text-5xl">
                Ser ouvido faz diferença
              </h2>
              <p className="mt-4 text-gray-600">Clientes reais verificados pelo Trustpilot</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2">
              <blockquote className="rounded-3xl border border-gray-200 bg-gray-50 p-8">
                <p className="text-lg leading-relaxed text-gray-700">
                  "A doutora que me atendeu era super simpática, muito clara na abordagem do tema e esclareceu-me todas as dúvidas. Sem dúvida voltarei a contactar-vos."
                </p>
                <footer className="mt-6 text-sm font-medium text-gray-500">
                  Paciente verificada · Junho de 2026
                </footer>
              </blockquote>
              
              <blockquote className="rounded-3xl border border-gray-200 bg-gray-50 p-8">
                <p className="text-lg leading-relaxed text-gray-700">
                  "Consegui marcar a consulta para o próprio dia e, no final, tive também a prescrição das vacinas de que precisava. Muito simpática, atenciosa e profissional."
                </p>
                <footer className="mt-6 text-sm font-medium text-gray-500">
                  Miguel, via Trustpilot · Setembro de 2026
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 py-20 md:px-8 md:py-28 bg-orange-500 text-white text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-extrabold md:text-6xl">
              Quando precisar, estamos aqui
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-white/90">
              Uma dúvida de saúde, um sintoma ou simplesmente a vontade de cuidar melhor de si.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link 
                href="/marcar" 
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-orange-600 shadow-lg transition-transform hover:scale-105"
              >
                Marcar consulta
                <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link 
                href="/patient-portal" 
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Fale com a nossa equipa →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
