import {
  Bike,
  Car,
  Coffee,
  Flame,
  Map,
  Mountain,
  Sparkles,
  Utensils,
  WashingMachine,
  Waves,
} from 'lucide-react';

function normalizeServiceName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();
}

/** Pick a familiar line icon for the public service label. */
export function getServiceIcon(name) {
  const label = normalizeServiceName(name);

  if (/bua sang|an sang|breakfast|cafe|ca phe|coffee|do uong|nuoc uong/.test(label)) return Coffee;
  if (/bua an|suat an|mon an|thuc an|nha hang|dining|meal|food/.test(label)) return Utensils;
  if (/dua don|san bay|taxi|xe|chuyen xe|transport|transfer|parking/.test(label)) return Car;
  if (/giat|ui|laundry/.test(label)) return WashingMachine;
  if (/tour|tham quan|huong dan|trai nghiem|du lich/.test(label)) return Map;
  if (/leo nui|trekking|camp|cam trai/.test(label)) return Mountain;
  if (/be boi|ho boi|swim/.test(label)) return Waves;
  if (/xe dap|bicycle|bike/.test(label)) return Bike;
  if (/bbq|nuong|campfire/.test(label)) return Flame;

  return Sparkles;
}
