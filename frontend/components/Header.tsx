'use client';

import { Activity, GitBranch, Grid3X3, Map } from 'lucide-react';
import { sectionNavigation, useActiveSection } from './sectionNavigation';

const navigationIcons = {
  'operations-summary': Activity,
  'heatmap-panel': Grid3X3,
  'map-panel': Map,
  'selected-route-section': GitBranch,
};

export function Header() {
  const { activeSection, navigateTo } = useActiveSection();

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#dashboard" aria-label="Поток, главная">
          <span className="brand-logo" aria-hidden="true" />
          <span><strong>Поток</strong><small>Центр управления</small></span>
        </a>
        <nav className="main-nav" aria-label="Основная навигация">
          {sectionNavigation.map(({ id, label }) => {
            const Icon = navigationIcons[id];
            return <a className={activeSection === id ? 'active' : ''} href={`#${id}`} key={id} aria-current={activeSection === id ? 'location' : undefined} onClick={() => navigateTo(id)}><Icon size={18} aria-hidden="true" />{label}</a>;
          })}
        </nav>
      </div>
    </header>
  );
}
