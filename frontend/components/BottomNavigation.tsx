'use client';

import { Activity, GitBranch, Grid3X3, Map } from 'lucide-react';
import { sectionNavigation, useActiveSection } from './sectionNavigation';

const navigationIcons = {
  'operations-summary': Activity,
  'heatmap-panel': Grid3X3,
  'map-panel': Map,
  'selected-route-section': GitBranch,
};

export function BottomNavigation() {
  const { activeSection, navigateTo } = useActiveSection();

  return <nav className="bottom-nav" aria-label="Мобильная навигация">{sectionNavigation.map(({ id, label }) => {
    const Icon = navigationIcons[id];
    return <a className={activeSection === id ? 'active' : ''} href={`#${id}`} key={id} aria-current={activeSection === id ? 'location' : undefined} onClick={() => navigateTo(id)}><Icon size={20} aria-hidden="true" />{label}</a>;
  })}</nav>;
}
