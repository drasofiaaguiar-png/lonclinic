import Image from 'next/image';
import Link from 'next/link';

interface TransformationSectionProps {
  bgColor?: string;
}

export default function TransformationSection({ bgColor = '#E8D5C4' }: TransformationSectionProps) {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: bgColor }}>
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-[#1C1710] mb-6 tracking-[-0.02em]">
            Transformações inspiradoras de <span className="text-[#C97A54]">pessoas reais como você</span>
          </h2>
        </div>

        {/* Transformation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Large Transformation Card */}
          <div className="relative bg-[#C4A892] rounded-[32px] p-8 lg:p-12 overflow-hidden min-h-[500px] flex flex-col justify-between">
            {/* Before/After Labels */}
            <div className="flex justify-between items-start mb-8">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-white/90 text-sm font-medium">Antes</p>
                <p className="text-white text-2xl font-bold">95 kg</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-white/90 text-sm font-medium">Depois</p>
                <p className="text-white text-2xl font-bold">77 kg</p>
              </div>
            </div>

            {/* Central Image */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full overflow-hidden border-4 border-white/30">
              <Image
                src="/image/hero-run.webp"
                alt="Transformação"
                fill
                className="object-cover"
                sizes="256px"
              />
            </div>

            {/* Bottom Info */}
            <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white text-xl">
                  📊
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Resultado</p>
                  <p className="text-white/90 text-xs">Perdeu 18 kg</p>
                </div>
              </div>
              <p className="text-white/90 text-sm leading-relaxed mb-4">
                "Transformei completamente minha relação com a comida. O acompanhamento foi essencial."
              </p>
              <div className="flex items-center justify-between">
                <p className="text-white text-xs">Sofia, 34 anos · 6 meses</p>
                <Link
                  href="/nutricao"
                  className="text-white text-sm font-semibold hover:underline no-underline"
                >
                  Ver história →
                </Link>
              </div>
            </div>
          </div>

          {/* Small Cards Grid */}
          <div className="grid grid-cols-1 gap-8">
            {/* Weight Calculator Card */}
            <div className="bg-white rounded-[24px] p-8 shadow-lg">
              <p className="text-[#1C1710]/60 text-sm font-medium mb-2">Seu peso inicial:</p>
              <p className="text-[#C97A54] text-5xl font-bold mb-4">85 kg</p>
              <div className="h-2 bg-[#F3EDE5] rounded-full mb-3">
                <div className="h-2 bg-[#C97A54] rounded-full" style={{ width: '60%' }}></div>
              </div>
              <p className="text-[#1C1710]/60 text-sm mb-4">Você pode perder:</p>
              <p className="text-[#1C1710] text-4xl font-bold mb-6">-17 kg</p>
              <Link
                href="/nutricao"
                className="block w-full text-center px-6 py-3 bg-[#C97A54] text-white rounded-full font-semibold hover:bg-[#B86A44] transition-all no-underline"
              >
                Começar agora
              </Link>
            </div>

            {/* Before/After Photo Card */}
            <div className="relative bg-[#B8A598] rounded-[24px] overflow-hidden h-[280px]">
              <Image
                src="/image/hero-bay.webp"
                alt="Transformação"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                <p className="text-white text-sm font-semibold">↓ 12 kg</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
