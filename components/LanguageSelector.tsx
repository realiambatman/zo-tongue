import React from 'react';
import { SupportedLanguage } from '../types';
import { LANGUAGE_OPTIONS } from '../constants';

interface LanguageSelectorProps {
  selected: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
  label?: string;
  exclude?: SupportedLanguage;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  selected, 
  onChange, 
  label, 
  exclude 
}) => {
  return (
    <div className="relative">
      {label && (
        <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value as SupportedLanguage)}
          className="block w-full pl-4 pr-10 py-3 text-sm font-medium text-ink bg-slate-50 border border-slate-200 rounded-xl appearance-none cursor-pointer transition-all duration-300 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {LANGUAGE_OPTIONS.filter(l => l !== exclude).map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};
