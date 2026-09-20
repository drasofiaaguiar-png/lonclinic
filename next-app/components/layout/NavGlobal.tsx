'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function NavGlobal() {
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSpecialtiesOpen, setMobileSpecialtiesOpen] = useState(false);

  const specialties = [
    {
      href: '/longevidade',
      icon: '⚡',
      title: 'Medicina de Longevidade',
      description: 'Prevenção e biomarcadores'
    },
    {
      href: '/travel-clinic',
      icon: '✈️',
      title: 'Medicina do Viajante',
      description: 'Vacinas e consulta pré-viagem'
    },
    {
      href: '/urgent-care',
      icon: '🚨',
      title: 'Consulta Urgente',
      description: 'Resposta rápida, ainda hoje'
    },
    {
      href: '/psicologia',
      icon: '🧠',
      title: 'Psicologia',
      description: 'Terapia individual e de casal'
    },
    {
      href: '/nutricao',
      icon: '💚',
      title: 'Nutrição',
      description: 'Acompanhamento contínuo'
    }
  ];

  return (
    <>
      {/* Skip to content */}
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[var(--primary)] text-white px-4 py-2 rounded-lg z-50">
        Saltar para o conteúdo
      </a>

      {/* Desktop/Mobile Nav */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[var(--border)] z-40">
        <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-[var(--text)] no-underline hover:text-[var(--primary)] transition-colors">
            <span className="font-bold">lon clinic</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {/* Especialidades Mega Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                onMouseEnter={() => setMegaMenuOpen(true)}
                className="flex items-center gap-2 text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors cursor-pointer bg-transparent border-none"
              >
                Especialidades
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={`transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`}>
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Mega Menu Dropdown */}
              {megaMenuOpen && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white border border-[var(--border)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-6 w-[560px] grid grid-cols-2 gap-3"
                  onMouseLeave={() => setMegaMenuOpen(false)}
                >
                  {specialties.map((specialty) => (
                    <Link
                      key={specialty.href}
                      href={specialty.href}
                      className="flex items-start gap-3 p-4 rounded-xl hover:bg-orange-50 transition-colors no-underline group"
                      onClick={() => setMegaMenuOpen(false)}
                    >
                      <span className="text-2xl">{specialty.icon}</span>
                      <div>
                        <div className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors mb-1">
                          {specialty.title}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {specialty.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/quizzes" className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline">
              Testes
            </Link>
            
            <Link href="/magazine" className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline">
              Magazine
            </Link>
            
            <Link href="/equipa" className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline">
              Equipa
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/patient-portal" className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline">
              Login
            </Link>
            
            <Link
              href="/marcar"
              className="inline-flex items-center justify-center px-6 py-2.5 text-[15px] font-semibold text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-dark)] transition-all hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(240,148,88,0.3)] no-underline"
            >
              Marcar consulta
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex flex-col gap-1.5 w-7 h-7 justify-center bg-transparent border-none cursor-pointer p-0"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <span className={`block w-full h-0.5 bg-[var(--text)] transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-full h-0.5 bg-[var(--text)] transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-full h-0.5 bg-[var(--text)] transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-[var(--border)] max-h-[calc(100vh-72px)] overflow-y-auto">
            <div className="p-6 flex flex-col gap-4">
              {/* Especialidades Mobile */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileSpecialtiesOpen(!mobileSpecialtiesOpen)}
                  className="flex items-center justify-between w-full text-[15px] font-medium text-[var(--text)] bg-transparent border-none cursor-pointer p-0 mb-3"
                >
                  Especialidades
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={`transition-transform ${mobileSpecialtiesOpen ? 'rotate-180' : ''}`}>
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                {mobileSpecialtiesOpen && (
                  <div className="flex flex-col gap-2 pl-4">
                    {specialties.map((specialty) => (
                      <Link
                        key={specialty.href}
                        href={specialty.href}
                        className="flex items-center gap-2 text-[15px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors no-underline py-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileSpecialtiesOpen(false);
                        }}
                      >
                        <span>{specialty.icon}</span>
                        {specialty.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/quizzes"
                className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testes
              </Link>
              
              <Link
                href="/magazine"
                className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Magazine
              </Link>
              
              <Link
                href="/equipa"
                className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Equipa
              </Link>
              
              <Link
                href="/patient-portal"
                className="text-[15px] font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 z-40">
        <Link
          href="/marcar"
          className="block text-center w-full px-6 py-3 text-[15px] font-semibold text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-dark)] transition-colors no-underline"
        >
          Marcar consulta
        </Link>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[72px]" />
    </>
  );
}
