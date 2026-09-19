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
        block bg-white border-2 rounded-[var(--radius-lg)] p-7 no-underline 
        text-[var(--text)] transition-all duration-300 flex flex-col items-start
        hover:border-[var(--primary)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        ${highlight ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-[var(--primary)]' : 'border-[var(--border)]'}
      `}
    >
      <div className="w-full h-[200px] rounded-xl overflow-hidden mb-5">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={400}
          height={300}
          className="w-full h-full object-cover"
        />
      </div>
      
      <h3 className="text-xl font-semibold text-[var(--text)] m-0 mb-3 leading-snug">
        {title}
      </h3>
      
      <p className="text-[15px] text-[var(--text-muted)] m-0 leading-relaxed">
        {description}
      </p>
    </Link>
  );
}
