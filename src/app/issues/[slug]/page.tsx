import { permanentRedirect } from 'next/navigation';
import { brand } from '@/config/brand';

export const dynamic = 'force-dynamic';

export default async function IssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  await params;
  permanentRedirect(brand.substackUrl);
}
