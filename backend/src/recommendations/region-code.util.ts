/**
 * Country name → ISO 3166-1 alpha-2 lookup used to bias Google Places Text
 * Search results toward the correct country (the `regionCode` request field).
 * Keys are lowercase; common aliases are included alongside the canonical name.
 */
const COUNTRY_NAME_TO_REGION_CODE: Record<string, string> = {
  israel: 'IL',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  netherlands: 'NL',
  holland: 'NL',
  belgium: 'BE',
  switzerland: 'CH',
  austria: 'AT',
  portugal: 'PT',
  ireland: 'IE',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  iceland: 'IS',
  poland: 'PL',
  'czech republic': 'CZ',
  czechia: 'CZ',
  slovakia: 'SK',
  slovenia: 'SI',
  croatia: 'HR',
  greece: 'GR',
  turkey: 'TR',
  cyprus: 'CY',
  romania: 'RO',
  bulgaria: 'BG',
  hungary: 'HU',
  ukraine: 'UA',
  russia: 'RU',
  'united arab emirates': 'AE',
  uae: 'AE',
  'saudi arabia': 'SA',
  qatar: 'QA',
  kuwait: 'KW',
  bahrain: 'BH',
  jordan: 'JO',
  egypt: 'EG',
  morocco: 'MA',
  'south africa': 'ZA',
  india: 'IN',
  japan: 'JP',
  china: 'CN',
  'south korea': 'KR',
  korea: 'KR',
  singapore: 'SG',
  thailand: 'TH',
  vietnam: 'VN',
  indonesia: 'ID',
  malaysia: 'MY',
  philippines: 'PH',
  brazil: 'BR',
  mexico: 'MX',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  peru: 'PE',
  'new zealand': 'NZ',
};

export function inferRegionCode(country?: string | null): string | undefined {
  if (!country) return undefined;
  return COUNTRY_NAME_TO_REGION_CODE[country.trim().toLowerCase()];
}

const DISTINCTIVE_COUNTRY_NAMES = Object.keys(COUNTRY_NAME_TO_REGION_CODE).filter((name) => name.length >= 4);

export function mentionsDifferentCountry(address: string, targetCountry?: string | null): boolean {
  if (!targetCountry) return false;
  const lowerAddress = address.toLowerCase();
  const lowerTarget = targetCountry.trim().toLowerCase();

  return DISTINCTIVE_COUNTRY_NAMES.some(
    (name) => name !== lowerTarget && !lowerTarget.includes(name) && lowerAddress.includes(name),
  );
}