interface FeatureBlockProps {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureBlock({ icon, title, description }: FeatureBlockProps) {
  return (
    <div className="flex flex-col gap-[var(--space-md)] text-left">
      <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-orange-50 flex items-center justify-center text-[28px]">
        {icon}
      </div>
      
      <h3 className="text-[18px] font-semibold text-[var(--text)] m-0 leading-snug">
        {title}
      </h3>
      
      <p className="text-[15px] text-[var(--text-muted)] leading-relaxed m-0">
        {description}
      </p>
    </div>
  );
}
