/**
 * Standard Area / Village Dropdown List for BurKIt SmartCity
 */
export const BURKIT_AREAS = [
  'அண்ணா நகர் (Anna Nagar)',
  'அரியகுளம் (Ariyakulam)',
  'அவனப்பேரி (Avanaperi)',
  'உடையார்குளம் (Udayarkulam)',
  'கீழப்பாட்டம் (Keezhapattam)',
  'கொம்பந்தனூர் (Kombanthanur)',
  'திருத்து (Thiruthu)',
  'நடுவக்குறிச்சி (Naduvakkurichi)',
  'நொச்சிக்குளம் (Nochikkulam)',
  'பர்கிட் மாநகரம் (Burkitmanagaram)',
  'மருதூர் (Maruthur)',
  'மேலகுளம் (Melakulam)',
  'MGR நகர் (MGR Nagar)',
  'வகைக்குளம் (Vagaikkulam)',
];

/**
 * Helper to match an item's location/village string against a selected area filter.
 * Supports exact match, Tamil substring match, or English substring match.
 */
export function matchArea(itemLocation, selectedArea) {
  if (!selectedArea || selectedArea === 'All' || selectedArea === 'All Areas') return true;
  if (!itemLocation) return false;
  const loc = String(itemLocation).toLowerCase();
  const sel = String(selectedArea).toLowerCase();

  const engMatch = sel.match(/\(([^)]+)\)/);
  const engName = engMatch ? engMatch[1].trim() : '';
  const tamName = sel.replace(/\([^)]+\)/, '').trim();

  if (loc.includes(sel)) return true;
  if (engName && loc.includes(engName)) return true;
  if (tamName && loc.includes(tamName)) return true;
  return false;
}
