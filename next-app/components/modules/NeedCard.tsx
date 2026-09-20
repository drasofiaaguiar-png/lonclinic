import Image from 'next/image';
import Link from 'next/link';

interface NeedCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  href: string;
  highlight?: boolean;
}

export default function NeedCard({
  imageSrc,
  imageAlt,
  title,
  description,
  href,
  highlight = false
}: NeedCardProps) {
  return (
    <Link
      href={href}
      className={`
        group relative block overflow-hidden rounded-3xl h-[500px]
        transition-all duration-500 ease-out
        hover:scale-[1.02] hover:shadow-premium
        ${highlight ? 'ring-4 ring-[var(--primary)] ring-offset-4' : ''}
      `}
    >
      {/* Image with parallax effect */}
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        {/* Gradient overlay - stronger */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>
      
      {/* Content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white transform transition-all duration-500 group-hover:translate-y-[-8px]">
        <h3 className="text-2xl font-bold mb-3 leading-tight">
          {title}
        </h3>
        <p className="text-white/90 text-base leading-relaxed mb-4 opacity-90 group-hover:opacity-100 transition-opacity">
          {description}
        </p>
        
        {/* Arrow indicator */}
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
          <span>Saber mais</span>
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none"
            className="transition-transform duration-300 group-hover:translate-x-2"
          >
            <path 
              d="M4 10h12m0 0l-5-5m5 5l-5 5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      
      {highlight && (
        <div className="absolute top-6 right-6">
          <span className="inline-block bg-[var(--primary)] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
            Popular
          </span>
        </div>
      )}
    </Link>
  );
}
