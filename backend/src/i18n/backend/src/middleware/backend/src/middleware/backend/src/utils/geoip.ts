import geoip from 'geoip-lite';

export function detectLocation(ip: string) {
  const geo = geoip.lookup(ip);
  return geo ? geo.country : 'US';
}
