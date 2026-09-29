import React, { useState } from 'react';
import { ShoppingBag, MapPin, Store, CheckCircle2, Sparkles, Search } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const ShopLocHero: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [likes, setLikes] = useState<number>(0);

  const features: Feature[] = [
    {
      title: 'Commerces de proximité',
      description: 'Découvrez les artisans et boutiques locales autour de vous.',
      icon: <Store className="w-6 h-6 text-indigo-600" />,
    },
    {
      title: 'Géolocalisation précise',
      description: 'Trouvez facilement les commerces partenaires sur la carte.',
      icon: <MapPin className="w-6 h-6 text-emerald-600" />,
    },
    {
      title: 'Fidélité & Récompenses',
      description: 'Cumulez des points et profitez d’avantages exclusifs.',
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium mb-4">
          <ShoppingBag className="w-4 h-4" />
          <span>ShopLoc — Plateforme Locale & Connectée</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Vos commerçants locaux à portée de clic
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Projet initialisé avec <strong>Astro</strong>, <strong>React</strong>,{' '}
          <strong>Tailwind CSS</strong>, <strong>Lucide React</strong> et{' '}
          <strong>TypeScript</strong>.
        </p>
      </header>

      {/* Interactive Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 mb-10">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un commerce, un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={() => setLikes((prev) => prev + 1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Soutenir ({likes})</span>
          </button>
        </div>
        {searchQuery && (
          <p className="mt-3 text-sm text-slate-500">
            Recherche active : <span className="font-semibold text-slate-700">{searchQuery}</span>
          </p>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((item, index) => (
          <div
            key={index}
            className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-3 bg-slate-50 rounded-xl w-fit mb-4">{item.icon}</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
