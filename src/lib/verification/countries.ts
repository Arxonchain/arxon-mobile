export type CountryOption = { code: string; name: string; dial: string };

export const COUNTRIES: CountryOption[] = [
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'CM', name: 'Cameroon', dial: '+237' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'TZ', name: 'Tanzania', dial: '+255' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'UG', name: 'Uganda', dial: '+256' },
  { code: 'ET', name: 'Ethiopia', dial: '+251' },
  { code: 'SN', name: 'Senegal', dial: '+221' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225' },
  { code: 'RW', name: 'Rwanda', dial: '+250' },
  { code: 'ZM', name: 'Zambia', dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'RU', name: 'Russia', dial: '+7' },
  { code: 'OTHER', name: 'Other', dial: '+' },
];

export function countryByCode(code: string | null | undefined) {
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

export function toE164(dial: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, '');
  const dialDigits = dial.replace(/\D/g, '');
  if (!digits) return '';
  return `+${dialDigits}${digits}`;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
