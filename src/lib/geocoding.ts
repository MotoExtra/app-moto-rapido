export interface GeocodingResult {
  lat: number;
  lng: number;
}

export interface StructuredAddress {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
}

/**
 * Geocode using structured parameters (preferred - much higher accuracy with Nominatim)
 */
export async function geocodeStructured({ rua, numero, bairro, cidade }: StructuredAddress): Promise<GeocodingResult | null> {
  try {
    const street = numero ? `${rua} ${numero}` : rua;
    const params = new URLSearchParams({
      format: 'json',
      street,
      city: cidade,
      state: 'Espírito Santo',
      country: 'Brazil',
      limit: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }

    // Fallback: try without number
    if (numero) {
      const fallbackParams = new URLSearchParams({
        format: 'json',
        street: rua,
        city: cidade,
        state: 'Espírito Santo',
        country: 'Brazil',
        limit: '1',
      });
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${fallbackParams.toString()}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          return { lat: parseFloat(fallbackData[0].lat), lng: parseFloat(fallbackData[0].lon) };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    return null;
  }
}

/**
 * Geocode using free-text query (legacy fallback)
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    // Try structured parsing first: "Rua X, 123 - Bairro, Cidade, ES, Brasil"
    const match = address.match(/^(.+?),\s*(\d+[A-Za-z]*)\s*-\s*(.+?),\s*(.+?)(?:,\s*ES)?(?:,\s*Brasil)?$/i);
    if (match) {
      const result = await geocodeStructured({
        rua: match[1].trim(),
        numero: match[2].trim(),
        bairro: match[3].trim(),
        cidade: match[4].trim(),
      });
      if (result) return result;
    }

    // Final fallback: free-text query
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }

    return null;
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    return null;
  }
}
