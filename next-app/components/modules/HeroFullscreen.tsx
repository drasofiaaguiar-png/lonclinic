import Link from 'next/link';

interface HeroFullscreenProps {
  eyebrow?: string;
  title: string;
  titleItalic?: string;
  description: string;
  backgroundImage: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
}

export default function HeroFullscreen({
  eyebrow,
  title,
  titleItalic,
  description,
  backgroundImage,
  primaryCTA,
  secondaryCTA
}: HeroFullscreenProps) {
  return (
    <section className="relative h-[100vh] lg:h-[110vh] flex items-end -mt-[100px] pt-[100px]">
      {/* Background Image - extends behind navbar */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>
      
      {/* Content - aligned to bottom */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">
          {/* Left: Main Title */}
          <div>
            {eyebrow && (
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="text-white/95 text-xs font-semibold uppercase tracking-[0.15em]">
                  {eyebrow}
                </span>
              </div>
            )}
            
            <h1 className="text-white leading-none">
              <span className="block text-[clamp(3.5rem,9vw,8rem)] font-extrabold leading-[0.9] tracking-[-0.04em] mb-2">
                {title}
              </span>
              {titleItalic && (
                <span className="block text-[clamp(3.5rem,9vw,8rem)] font-light italic leading-[0.9] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                  {titleItalic}
                </span>
              )}
            </h1>
          </div>
          
          {/* Right: Description + CTA */}
          <div className="flex flex-col gap-6 lg:items-end lg:text-right max-lg:items-start max-lg:text-left">
            <p className="text-white/95 text-[17px] leading-relaxed max-w-[480px] font-light">
              {description}
            </p>
            
            <div className="flex flex-wrap gap-4 max-lg:flex-col max-lg:w-full">
              <Link
                href={primaryCTA.href}
                className="group inline-flex items-center justify-center gap-3 px-9 py-4 text-[15px] font-bold text-[#1C1710] bg-[#C8FF6D] rounded-full hover:bg-[#b8ef5d] shadow-[0_10px_40px_rgba(200,255,109,0.3)] hover:shadow-[0_20px_60px_rgba(200,255,109,0.4)] transition-all duration-300 no-underline"
              >
                {primaryCTA.text}
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 20 20" 
                  fill="none"
                  className="transition-transform group-hover:translate-x-1"
                >
                  <path 
                    d="M4 10h12m0 0l-4-4m4 4l-4 4" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              
              {secondaryCTA && (
                <Link
                  href={secondaryCTA.href}
                  className="inline-flex items-center justify-center px-9 py-4 text-[15px] font-semibold text-white bg-white/15 backdrop-blur-md border border-white/40 rounded-full hover:bg-white/25 hover:border-white/60 transition-all duration-300 no-underline"
                >
                  {secondaryCTA.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator - centered at bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
          className="text-white/70"
        >
          <path 
            d="M12 5v14m0 0l-7-7m7 7l7-7" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}
