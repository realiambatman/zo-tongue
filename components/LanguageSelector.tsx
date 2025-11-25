import React, { Fragment } from 'react';
import { SupportedLanguage } from '../types';
import { LANGUAGE_OPTIONS } from '../constants';

interface LanguageSelectorProps {
  selected: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
  label?: string;
  exclude?: SupportedLanguage;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onChange, label, exclude }) => {
  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value as SupportedLanguage)}
          className="block w-full pl-3 pr-10 py-2.5 text-base border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-lg shadow-sm appearance-none cursor-pointer transition-all duration-200 hover:border-brand-300"
        >
          {LANGUAGE_OPTIONS.filter(l => l !== exclude).map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};