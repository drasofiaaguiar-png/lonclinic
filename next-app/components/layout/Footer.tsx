import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-12 bg-slate-900 text-slate-200">
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <p className="text-[15px] leading-relaxed mb-4">
          <strong className="text-lg font-bold block mb-2 text-white">
            LON Clinic
          </strong>
          <a 
            href="mailto:info@lonclinic.com" 
            className="text-slate-200 no-underline hover:text-[var(--primary)] transition-colors"
          >
            info@lonclinic.com
          </a>
          {' · '}
          <a 
            href="tel:+351928372775" 
            className="text-slate-200 no-underline hover:text-[var(--primary)] transition-colors"
          >
            (+351) 928 372 775
          </a>
        </p>
        
        <p className="text-[13px] text-slate-400 m-0 leading-relaxed">
          Nº de Registo ERS: 45475
          <br />
          © {new Date().getFullYear()} LON Clinic · Portugal
        </p>
      </div>
    </footer>
  );
}
