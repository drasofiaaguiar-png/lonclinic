import Image from 'next/image';

interface TestimonialVisualProps {
  avatarSrc: string;
  avatarAlt: string;
  stars: number;
  text: string;
  author: string;
  role: string;
}

export default function TestimonialVisual({
  avatarSrc,
  avatarAlt,
  stars,
  text,
  author,
  role
}: TestimonialVisualProps) {
  return (
    <div className="bg-white rounded-[var(--radius-lg)] p-[var(--space-lg)] shadow-sm grid grid-cols-[80px_1fr] gap-[var(--space-md)] items-start">
      <div className="w-20 h-20 rounded-full overflow-hidden">
        <Image
          src={avatarSrc}
          alt={avatarAlt}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1">
        <div className="text-amber-500 text-base mb-2">
          {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
        </div>
        
        <p className="text-[15px] leading-relaxed text-slate-700 mb-3">
          "{text}"
        </p>
        
        <p className="text-[13px] font-semibold text-slate-600 mb-0.5">
          {author}
        </p>
        <p className="text-[12px] text-slate-400 m-0">
          {role}
        </p>
      </div>
    </div>
  );
}
