import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { placeId, sessionToken } = await request.json();

    if (!placeId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Place ID is required' },
        },
        { status: 400 }
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

    // Call Google Places Details API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&sessiontoken=${sessionToken}` +
        `&fields=geometry,address_component,formatted_address,name` +
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

    if (data.status !== 'OK') {
      return NextResponse.json(
        {
          success: false,
          error: { message: data.status },
        },
        { status: 400 }
      );
    }

    const result = data.result;
    const loc = result.geometry.location;
    const comps = result.address_components;

    const get = (type: string) =>
      comps.find((c: any) => c.types.includes(type))?.long_name || null;

    const normalizedAddress = {
      formattedAddress: result.formatted_address,
      name: result.name,
      street: get('route'),
      streetNumber: get('street_number'),
      city: get('locality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      country: get('country'),
      postalCode: get('postal_code'),
      latitude: loc.lat,
      longitude: loc.lng,
    };

    return NextResponse.json(
      {
        success: true,
        data: { address: normalizedAddress },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Place details API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
