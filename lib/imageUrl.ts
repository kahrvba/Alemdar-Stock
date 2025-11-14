export const getImageUrl = (filename: string | null, section: string): string => {
  if (!filename) {
    return '/placeholder.jpg';
  }

  // If it's already a full URL (from Vercel Blob), return it directly
  if (filename.startsWith('http')) {
    return filename;
  }

  // For any remaining legacy images, map to their old paths
  // This can be removed once you're sure all images are migrated
  const pathMap: Record<'arduino' | 'main-part' | 'side-leds', string> = {
    arduino: '/uploads/',
    'main-part': '/uploads2/',
    'side-leds': '/uploads3/'
  };

  const safeSection = (section as 'arduino' | 'main-part' | 'side-leds') in pathMap ? (section as 'arduino' | 'main-part' | 'side-leds') : 'arduino';

  return `${pathMap[safeSection]}${filename}`;
};