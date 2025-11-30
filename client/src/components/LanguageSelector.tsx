import { ChevronDown } from 'lucide-react';

export type Language = 'javascript' | 'python' | 'sql';

interface LanguageSelectorProps {
  value: Language;
  onChange: (language: Language) => void;
}

const LANGUAGES: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'python', label: 'Python', icon: 'PY' },
  { value: 'sql', label: 'SQL', icon: 'SQL' },
];

/**
 * Language selector dropdown component.
 * 
 * Features:
 * - Dropdown to select between JavaScript, Python, and SQL
 * - Visual indicator showing current language
 * - Changes Monaco editor syntax highlighting when switched
 */
export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const currentLanguage = LANGUAGES.find((l) => l.value === value);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="appearance-none bg-secondary hover:bg-accent text-secondary-foreground px-3 py-2 pr-8 rounded-md text-sm font-medium cursor-pointer transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
