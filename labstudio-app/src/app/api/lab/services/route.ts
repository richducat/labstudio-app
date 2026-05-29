import { NextResponse } from 'next/server';
import { LAB_LOCATION, LAB_SERVICES, LAB_TIME_GROUPS } from '@/lib/lab-services';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    location: LAB_LOCATION,
    services: LAB_SERVICES,
    timeGroups: LAB_TIME_GROUPS,
  });
}
