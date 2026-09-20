import Link from 'next/link';
import Image from 'next/image';

interface ServiceCardProps {
  title: string;
  description: string;
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
  bgColor?: string;
}

export default function ServiceCard({
  title,
  description,
  imageSrc,
  imageAlt,
  primaryCTA,
  secondaryCTA,
  bgColor = '#F3EDE5'
}: ServiceCardProps) {
  return (
    <div 
      className="group relative rounded-[32px] overflow-hidden h-[480px] flex flex-col justify-end"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {/* Dark gradient overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Glassmorphic Content Container */}
      <div className="relative z-10 m-6 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:bg-white/15 group-hover:backdrop-blur-2xl">
        <h3 className="text-[28px] font-bold text-white mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-white/90 text-[15px] leading-relaxed mb-5">
          {description}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryCTA.href}
            className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-semibold text-[#1C1710] bg-white rounded-full hover:bg-white/95 transition-all duration-200 shadow-md no-underline"
          >
            {primaryCTA.text}
          </Link>
          
          {secondaryCTA && (
            <Link
              href={secondaryCTA.href}
              className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-semibold text-white bg-white/20 backdrop-blur-sm border border-white/30 rounded-full hover:bg-white/30 transition-all duration-200 no-underline"
            >
              {secondaryCTA.text}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
