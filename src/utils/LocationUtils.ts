export class LocationUtils {
  private static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const dLat = LocationUtils.toRadians(lat2 - lat1);
    const dLon = LocationUtils.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(LocationUtils.toRadians(lat1)) *
        Math.cos(LocationUtils.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return LocationUtils.EARTH_RADIUS_KM * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if coordinates are within bounds
   */
  static isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Get bounding box for a given center point and radius
   */
  static getBoundingBox(
    centerLat: number,
    centerLon: number,
    radiusKm: number,
  ): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    const latDelta =
      (radiusKm / LocationUtils.EARTH_RADIUS_KM) * (180 / Math.PI);
    const lonDelta =
      (radiusKm /
        (LocationUtils.EARTH_RADIUS_KM *
          Math.cos(LocationUtils.toRadians(centerLat)))) *
      (180 / Math.PI);

    return {
      minLat: centerLat - latDelta,
      maxLat: centerLat + latDelta,
      minLon: centerLon - lonDelta,
      maxLon: centerLon + lonDelta,
    };
  }

  /**
   * Check if a point is within a given radius of another point
   */
  static isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusKm: number,
  ): boolean {
    const distance = LocationUtils.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusKm;
  }

  /**
   * Get SQL query fragment for distance calculation
   */
  static getDistanceSQL(centerLat: number, centerLon: number): string {
    return `
      (6371 * acos(
        cos(radians(${centerLat})) * cos(radians(latitude))
        * cos(radians(longitude) - radians(${centerLon}))
        + sin(radians(${centerLat})) * sin(radians(latitude))
      ))
    `;
  }

  /**
   * Parse coordinates from string
   */
  static parseCoordinates(
    coordString: string,
  ): { latitude: number; longitude: number } | null {
    const coords = coordString
      .split(",")
      .map((s) => Number.parseFloat(s.trim()));
    if (coords.length === 2 && coords.every((c) => !isNaN(c))) {
      const [latitude, longitude] = coords;
      if (LocationUtils.isValidCoordinate(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
    return null;
  }

  /**
   * Format coordinates for display
   */
  static formatCoordinates(
    latitude: number,
    longitude: number,
    precision = 6,
  ): string {
    return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
  }

  /**
   * Get approximate address from coordinates (placeholder for geocoding service)
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    // TODO: Integrate with geocoding service (Google Maps, Mapbox, etc.)
    return `Coordinates: ${LocationUtils.formatCoordinates(latitude, longitude)}`;
  }

  /**
   * Get coordinates from address (placeholder for geocoding service)
   */
  static async geocode(
    address: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    // TODO: Integrate with geocoding service
    return null;
  }
}
