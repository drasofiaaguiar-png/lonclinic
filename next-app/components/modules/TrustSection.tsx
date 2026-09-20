import Image from 'next/image';

interface TrustFeature {
  title: string;
  description: string;
}

interface TrustSectionProps {
  features: TrustFeature[];
}

export default function TrustSection({ features }: TrustSectionProps) {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/image/hero-run.webp"
          alt="LON Clinic confiança"
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        {/* Blue overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6d8997]/95 to-[#537284]/95" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-white mb-4 tracking-[-0.03em]">
            Uma clínica online, <br />com relação humana
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 shadow-lg"
            >
              <h3 className="text-white text-xl font-bold mb-3 leading-tight">
                {feature.title}
              </h3>
              <p className="text-white/90 text-[15px] leading-relaxed font-light">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
