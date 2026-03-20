import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lab Studio Members',
    short_name: 'Lab Studio',
    description: 'Members-only training, nutrition, recovery, and coaching dashboard for Lab Studio.',
    start_url: '/members',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
