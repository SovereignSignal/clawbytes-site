import { permanentRedirect } from 'next/navigation';
import { brand } from '@/config/brand';

export const dynamic = 'force-dynamic';

export default function IssuesPage(): never {
  permanentRedirect(brand.substackUrl);
}
