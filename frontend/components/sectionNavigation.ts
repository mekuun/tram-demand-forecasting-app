'use client';

import { useEffect, useRef, useState } from 'react';

export const sectionNavigation = [
  { id: 'operations-summary', label: 'Сводка' },
  { id: 'map-panel', label: 'Карта' },
  { id: 'heatmap-panel', label: 'Теплокарта' },
  { id: 'selected-route-section', label: 'Ветка' },
] as const;

export type SectionId = (typeof sectionNavigation)[number]['id'];

export function useActiveSection() {
  const [activeSection, setActiveSection] = useState<SectionId>('operations-summary');
  const navigationLock = useRef<{ id: SectionId; expiresAt: number } | null>(null);

  useEffect(() => {
    let frame = 0;

    function updateActiveSection() {
      const marker = 112;
      const locked = navigationLock.current;

      if (locked) {
        const target = document.getElementById(locked.id);
        const reachedTarget = target ? Math.abs(target.getBoundingClientRect().top - 96) < 24 : true;
        if (!reachedTarget && performance.now() < locked.expiresAt) {
          setActiveSection(locked.id);
          return;
        }
        navigationLock.current = null;
      }

      let current: SectionId = sectionNavigation[0].id;

      for (const item of sectionNavigation) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= marker) current = item.id;
      }

      setActiveSection(current);
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveSection);
    }

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  function navigateTo(sectionId: SectionId) {
    navigationLock.current = { id: sectionId, expiresAt: performance.now() + 900 };
    setActiveSection(sectionId);
  }

  return { activeSection, navigateTo };
}
