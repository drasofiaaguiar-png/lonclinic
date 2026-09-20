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
    <section className="relative min-h-screen flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">
          {/* Left: Main Title */}
          <div>
            {eyebrow && (
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-white" />
                <span className="text-white/90 text-sm font-medium uppercase tracking-wider">
                  {eyebrow}
                </span>
              </div>
            )}
            
            <h1 className="text-white">
              <span className="block text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.03em] mb-2">
                {title}
              </span>
              {titleItalic && (
                <span className="block text-[clamp(3rem,8vw,7rem)] font-light italic leading-[0.95] tracking-[-0.01em]" style={{ fontFamily: 'Georgia, serif' }}>
                  {titleItalic}
                </span>
              )}
            </h1>
          </div>
          
          {/* Right: Description + CTA */}
          <div className="flex flex-col gap-8 lg:items-end lg:text-right max-lg:items-start max-lg:text-left">
            <p className="text-white/95 text-lg leading-relaxed max-w-[500px]">
              {description}
            </p>
            
            <div className="flex flex-wrap gap-4 max-lg:flex-col max-lg:w-full">
              <Link
                href={primaryCTA.href}
                className="group inline-flex items-center justify-center gap-3 px-10 py-5 text-base font-bold text-[#1C1710] bg-[#C8FF6D] rounded-full hover:bg-[#b8ef5d] shadow-[0_10px_40px_rgba(200,255,109,0.3)] hover:shadow-[0_20px_60px_rgba(200,255,109,0.4)] transition-all duration-300 no-underline"
              >
                {primaryCTA.text}
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 20 20" 
                  fill="none"
                  className="transition-transform group-hover:translate-x-1"
                >
                  <path 
                    d="M4 10h12m0 0l-4-4m4 4l-4 4" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              
              {secondaryCTA && (
                <Link
                  href={secondaryCTA.href}
                  className="inline-flex items-center justify-center px-10 py-5 text-base font-bold text-white bg-white/10 backdrop-blur-md border-2 border-white/30 rounded-full hover:bg-white/20 hover:border-white/50 transition-all duration-300 no-underline"
                >
                  {secondaryCTA.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
          className="text-white/60"
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
