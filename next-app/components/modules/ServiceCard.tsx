import Link from 'next/link';
import Image from 'next/image';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: string;
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
  icon,
  imageSrc,
  imageAlt,
  primaryCTA,
  secondaryCTA,
  bgColor = '#F3EDE5'
}: ServiceCardProps) {
  return (
    <div 
      className="relative rounded-[32px] overflow-hidden h-[480px] flex flex-col justify-between p-8"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>

      {/* Icon Badge */}
      <div className="relative z-10 w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">
        {icon}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-[32px] font-bold text-[#1C1710] mb-3 leading-tight">
          {title}
        </h3>
        <p className="text-[#1C1710]/70 text-[15px] leading-relaxed mb-6 max-w-[280px]">
          {description}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryCTA.href}
            className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-semibold text-white bg-[#1C1710] rounded-full hover:bg-[#1C1710]/90 transition-all duration-200 no-underline"
          >
            {primaryCTA.text}
          </Link>
          
          {secondaryCTA && (
            <Link
              href={secondaryCTA.href}
              className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-semibold text-[#1C1710] bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all duration-200 no-underline"
            >
              {secondaryCTA.text}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
