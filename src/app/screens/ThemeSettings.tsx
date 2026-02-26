import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useT } from '../i18n/I18nContext';
import { ThemeConfigurator } from '../components/ThemeConfigurator';
import { StaggerContainer, StaggerItem } from '../components/SharedComponents';

export function ThemeSettings() {
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <div className="bg-transparent min-h-screen w-full overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-secondary active:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} className="text-foreground" strokeWidth={2} />
          </button>
          <h1 className="text-xl font-black text-foreground">{t.settings.sectionTheme}</h1>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-4 py-5">
        <StaggerItem>
          <ThemeConfigurator />
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
