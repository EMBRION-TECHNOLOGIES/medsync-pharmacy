import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'MedsyncPharmacy/1.0 (https://github.com/medsync; contact@terasync.ng)';

/**
 * Proxy reverse geocoding through Nominatim.
 * Fixes "Failed to fetch" from direct browser calls: CORS, User-Agent policy, rate limiting.
 * Usage: GET /api/geocode/reverse?lat=9.0579&lon=7.4951
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { success: false, error: 'Missing lat or lon query parameters' },
        { status: 400 }
      );
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lat or lon' },
        { status: 400 }
      );
    }

    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${latNum}&lon=${lonNum}&addressdetails=1&zoom=16`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { success: false, error: `Nominatim error: ${response.status}`, details: text },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Reverse geocode failed';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
