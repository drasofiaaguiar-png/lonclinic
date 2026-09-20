import Link from 'next/link';
import Image from 'next/image';

interface ConditionCardProps {
  title: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  bgColor?: string;
}

export default function ConditionCard({
  title,
  imageSrc,
  imageAlt,
  href,
  bgColor = '#E8E3DA'
}: ConditionCardProps) {
  return (
    <Link 
      href={href}
      className="group relative block rounded-[24px] overflow-hidden flex-shrink-0 w-[280px] h-[280px] no-underline"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover object-center transition-transform duration-700 group-hover:scale-110"
          sizes="280px"
        />
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/5" />
      </div>

      {/* Label Badge - Bottom Left */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="px-5 py-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
          <span className="text-white text-[14px] font-semibold">
            {title}
          </span>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 z-[1]" />
    </Link>
  );
}
