import Image from 'next/image';
import Link from 'next/link';

interface PhotoCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function PhotoCard({ imageSrc, imageAlt, title, subtitle, href }: PhotoCardProps) {
  return (
    <Link 
      href={href}
      className="relative block rounded-[var(--radius-lg)] overflow-hidden aspect-[4/5] shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover"
      />
      
      <div className="absolute bottom-0 left-0 right-0 p-[var(--space-lg)] bg-gradient-to-t from-black/70 to-transparent text-white">
        <h3 className="text-2xl font-bold m-0 mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-[15px] opacity-90 m-0">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
