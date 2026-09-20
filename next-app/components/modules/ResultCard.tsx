import Image from 'next/image';
import Link from 'next/link';

interface ResultCardProps {
  beforeWeight: string;
  afterWeight: string;
  name: string;
  timeframe: string;
  imageSrc: string;
  imageAlt: string;
  productName?: string;
}

export default function ResultCard({
  beforeWeight,
  afterWeight,
  name,
  timeframe,
  imageSrc,
  imageAlt,
  productName = "Programa Integrado"
}: ResultCardProps) {
  return (
    <div className="group relative bg-[#3F5952] rounded-[32px] p-8 text-white overflow-hidden">
      {/* Circular Image Container */}
      <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden bg-[#2F4942]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="192px"
        />
      </div>

      {/* Results */}
      <div className="text-center mb-6">
        <p className="text-[#A8C4B5] text-sm font-medium mb-2">{name}</p>
        <p className="text-3xl font-bold mb-1">{beforeWeight} → {afterWeight}</p>
        <p className="text-[#A8C4B5] text-sm">{timeframe}</p>
      </div>

      {/* Product Badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs">
          📊
        </div>
        <span className="text-sm text-[#A8C4B5]">{productName}</span>
      </div>

      {/* CTA */}
      <Link
        href="/nutricao"
        className="block w-full text-center px-6 py-3 bg-white text-[#1C1710] rounded-full font-semibold hover:bg-white/95 transition-all no-underline"
      >
        Saber mais
      </Link>
    </div>
  );
}
