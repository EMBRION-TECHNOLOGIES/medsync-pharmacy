import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, sessionToken } = await request.json();

    if (!query || query.length < 3) {
      return NextResponse.json(
        { success: true, data: { suggestions: [] } },
        { status: 200 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Google Maps API key not configured' },
        },
        { status: 500 }
      );
    }

    // Call Google Places Autocomplete API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(query)}` +
        `&sessiontoken=${sessionToken}` +
        `&components=country:ng` +
        `&key=${apiKey}`
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: { message: `Google API error: ${response.statusText}` },
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Google Places API access denied. Check API key configuration.',
          },
        },
        { status: 403 }
      );
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        {
          success: false,
          error: { message: data.status },
        },
        { status: 400 }
      );
    }

    const suggestions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
    }));

    return NextResponse.json(
      {
        success: true,
        data: { suggestions },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Autocomplete API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
