import Image from 'next/image';
import Link from 'next/link';

interface HeroSplitProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
}

export default function HeroSplit({
  eyebrow,
  title,
  subtitle,
  imageSrc,
  imageAlt,
  primaryCTA,
  secondaryCTA
}: HeroSplitProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[700px] py-20 max-lg:min-h-0 max-lg:py-16">
      <div className="flex flex-col gap-8 max-lg:text-center">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <div className="w-8 h-[2px] bg-[var(--primary)]" />
            {eyebrow}
          </div>
        )}
        
        <h1 className="text-[clamp(3rem,6vw,5.5rem)] font-extrabold text-[var(--text)] leading-[1.05] tracking-[-0.03em] m-0">
          {title}
        </h1>
        
        <p className="text-xl text-[var(--text-muted)] leading-relaxed m-0 max-w-[540px] max-lg:mx-auto">
          {subtitle}
        </p>
        
        <div className="flex gap-4 max-lg:flex-col max-lg:items-center">
          <Link
            href={primaryCTA.href}
            className="group inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-white bg-[var(--primary)] rounded-2xl hover:bg-[var(--primary-dark)] shadow-[0_10px_40px_rgba(240,148,88,0.3)] hover:shadow-[0_20px_60px_rgba(240,148,88,0.4)] hover:-translate-y-1 transition-all duration-300 no-underline"
          >
            {primaryCTA.text}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform group-hover:translate-x-1">
              <path d="M4 10h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          
          {secondaryCTA && (
            <Link
              href={secondaryCTA.href}
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-[var(--text)] bg-white border-3 border-[var(--border)] rounded-2xl hover:border-[var(--primary)] hover:bg-orange-50 transition-all duration-300 no-underline"
            >
              {secondaryCTA.text}
            </Link>
          )}
        </div>
      </div>
      
      <div className="relative w-full h-full min-h-[600px] rounded-[2.5rem] overflow-hidden shadow-premium max-lg:min-h-[500px] max-lg:order-first">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
