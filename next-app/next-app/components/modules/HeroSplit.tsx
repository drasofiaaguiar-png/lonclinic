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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-xl)] items-center min-h-[600px] py-[var(--space-xl)] max-md:min-h-0 max-md:py-[var(--space-lg)]">
      <div className="flex flex-col gap-[var(--space-md)]">
        {eyebrow && (
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[var(--primary)] m-0">
            {eyebrow}
          </p>
        )}
        
        <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-[var(--text)] leading-tight m-0">
          {title}
        </h1>
        
        <p className="text-xl text-[var(--text-muted)] leading-relaxed m-0">
          {subtitle}
        </p>
        
        <div className="flex gap-4 mt-4 max-md:flex-col">
          <Link
            href={primaryCTA.href}
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--primary)] rounded-[10px] shadow-[0_4px_12px_rgba(240,148,88,0.3)] hover:bg-[var(--primary-dark)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(240,148,88,0.4)] transition-all duration-200 no-underline"
          >
            {primaryCTA.text}
          </Link>
          
          {secondaryCTA && (
            <Link
              href={secondaryCTA.href}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-[var(--text)] bg-white border-2 border-[var(--border)] rounded-[10px] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-orange-50 transition-all duration-200 no-underline"
            >
              {secondaryCTA.text}
            </Link>
          )}
        </div>
      </div>
      
      <div className="relative w-full h-full min-h-[500px] rounded-[var(--radius-xl)] overflow-hidden max-md:min-h-[400px] max-md:order-first">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
