import Link from 'next/link';

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlighted?: boolean;
}

export default function PricingCard({
  title,
  price,
  period,
  description,
  features,
  ctaText,
  ctaHref,
  highlighted = false
}: PricingCardProps) {
  return (
    <div className={`
      bg-white border-2 rounded-[var(--radius-lg)] p-8 flex flex-col
      transition-all duration-300
      ${highlighted ? 'border-[var(--primary)] shadow-[0_8px_24px_rgba(240,148,88,0.15)] scale-105' : 'border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md'}
    `}>
      {highlighted && (
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[var(--primary)] bg-orange-50 px-3 py-1 rounded-full mb-4 self-start">
          Mais popular
        </span>
      )}
      
      <h3 className="text-xl font-bold text-[var(--text)] mb-2">
        {title}
      </h3>
      
      <div className="mb-4">
        <span className="text-4xl font-bold text-[var(--text)]">{price}</span>
        <span className="text-base text-[var(--text-muted)] ml-2">{period}</span>
      </div>
      
      <p className="text-[15px] text-[var(--text-muted)] mb-6">
        {description}
      </p>
      
      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-[15px] text-[var(--text)]">
            <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      <Link
        href={ctaHref}
        className={`
          block text-center py-3 px-6 rounded-lg font-semibold transition-all no-underline
          ${highlighted 
            ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(240,148,88,0.3)]' 
            : 'bg-white border-2 border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:bg-orange-50'
          }
        `}
      >
        {ctaText}
      </Link>
    </div>
  );
}
