export const getOptimizedUrl = (url: string | null | undefined, width = 400): string => {
  if (!url) return '';
  if (url.includes('cloudinary.com') && !url.includes('/upload/q_auto')) {
    return url.replace('/upload/', `/upload/q_auto,f_auto,w_${width}/`);
  }
  return url;
};

export const getFullQualityUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.includes('cloudinary.com') && !url.includes('/upload/q_auto')) {
    return url.replace('/upload/', '/upload/q_auto,f_auto/');
  }
  return url;
};
