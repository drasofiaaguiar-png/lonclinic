import type { Metadata } from "next";
import NavGlobal from "@/components/layout/NavGlobal";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clínica Médica Online | Lon Clinic",
  description: "Medicina, nutrição e psicologia integradas. Diga-nos o que precisa, nós ajudamos a encontrar o cuidado certo — sem sair de casa.",
  keywords: "telemedicina portugal, consultas médicas online, clínica online portugal, médico online, psicologia online, nutrição online",
  robots: "index,follow,max-image-preview:large",
  openGraph: {
    type: "website",
    url: "https://www.lonclinic.com/",
    title: "Clínica Médica Online | Lon Clinic",
    description: "Medicina, nutrição e psicologia integradas. Diga-nos o que precisa, nós ajudamos a encontrar o cuidado certo.",
    images: [
      {
        url: "https://www.lonclinic.com/image/consulta-telemedicina-mesa.webp",
        width: 1200,
        height: 630,
        alt: "Lon Clinic - Telemedicina em Portugal"
      }
    ],
    locale: "pt_PT",
    siteName: "Lon Clinic"
  },
  twitter: {
    card: "summary_large_image",
    title: "Clínica Médica Online | Lon Clinic",
    description: "Medicina, nutrição e psicologia integradas. Diga-nos o que precisa.",
    images: ["https://www.lonclinic.com/image/consulta-telemedicina-mesa.webp"]
  },
  alternates: {
    canonical: "https://www.lonclinic.com/",
    languages: {
      'pt-PT': "https://www.lonclinic.com/"
    }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="canonical" href="https://www.lonclinic.com/" />
        <meta name="theme-color" content="#F09458" />
      </head>
      <body className="antialiased">
        <NavGlobal />
        {children}
        <Footer />
      </body>
    </html>
  );
}
