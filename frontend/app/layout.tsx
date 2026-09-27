import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Поток — прогноз пассажиропотока',
  description: 'Городской сервис прогноза загрузки трамвайных маршрутов.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Поток — прогноз городского транспорта',
    description: 'Карта загрузки, пики пассажиропотока и оперативные рекомендации.',
    locale: 'ru_RU',
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#202124', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
