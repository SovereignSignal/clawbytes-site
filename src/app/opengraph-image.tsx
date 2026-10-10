import { ogAlt, ogContentType, ogImage, ogSize } from '@/lib/og-card';

export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage();
}
