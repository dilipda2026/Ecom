import { NextResponse } from 'next/server';
import { getPublicMenu } from '@/features/menu/actions';

export async function GET() {
  const res = await getPublicMenu();
  return NextResponse.json(res, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
