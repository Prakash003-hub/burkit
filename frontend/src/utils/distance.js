// Haversine formula to calculate distance between two coordinates in kilometers
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const p1 = Number(lat1);
  const l1 = Number(lon1);
  const p2 = Number(lat2);
  const l2 = Number(lon2);

  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) return null;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(p2 - p1);
  const dLon = toRad(l2 - l1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1)) * Math.cos(toRad(p2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

export function formatDistance(km) {
  if (km === null || km === undefined) return '';
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km} km away`;
}

export function getGoogleMapsDirectionsUrl(destLat, destLng, originLat, originLng) {
  if (originLat && originLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
}
