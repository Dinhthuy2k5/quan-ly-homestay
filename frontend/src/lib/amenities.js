import {
  AirVent, Armchair, Bath, BedDouble, Bike, BriefcaseBusiness, Car, Coffee,
  CookingPot, Droplets, Fan, Flame, Gamepad2, Heater, Laptop,
  LockKeyhole, Microwave, Mountain, Refrigerator, ShieldCheck, Shirt,
  ShowerHead, Snowflake, SoapDispenserDroplet, Sparkles, Speaker, Tv,
  Utensils, WashingMachine, Waves, Wifi, Wind, Wine, Trees, KeyRound,
  Luggage, CircleHelp,
} from 'lucide-react';

export const AMENITY_CATEGORIES = [
  { name: 'Phòng tắm', items: [['Máy sấy tóc', Wind], ['Dầu gội đầu', SoapDispenserDroplet], ['Dầu xả', SoapDispenserDroplet], ['Xà phòng tắm', SoapDispenserDroplet], ['Nước nóng', ShowerHead], ['Sữa tắm', SoapDispenserDroplet], ['Bồn tắm', Bath], ['Vòi sen ngoài trời', ShowerHead]] },
  { name: 'Phòng ngủ và phòng giặt', items: [['Máy giặt miễn phí', WashingMachine], ['Máy sấy quần áo', WashingMachine], ['Móc treo', Shirt], ['Ga trải giường', BedDouble], ['Bàn là', Shirt], ['Tủ quần áo', Shirt], ['Màn che tối', Wind], ['Giá phơi quần áo', Shirt]] },
  { name: 'Những điều cần thiết', items: [['Khăn tắm và ga trải giường', Sparkles], ['Giấy vệ sinh', Sparkles], ['Két an toàn', LockKeyhole]] },
  { name: 'Nhà bếp và ăn uống', items: [['Tủ lạnh', Refrigerator], ['Lò vi sóng', Microwave], ['Bếp nấu riêng', CookingPot], ['Đồ dùng nấu ăn', Utensils], ['Ấm siêu tốc', Coffee], ['Máy pha cà phê', Coffee], ['Bộ bát đĩa và dao kéo', Utensils], ['Ly rượu vang', Wine], ['Bàn ăn', Utensils], ['Nước uống', Droplets]] },
  { name: 'Giải trí', items: [['Smart TV', Tv], ['TV truyền hình cáp', Tv], ['Loa Bluetooth', Speaker], ['Máy chơi game', Gamepad2]] },
  { name: 'Điều hòa và sưởi', items: [['Điều hòa 2 chiều', AirVent], ['Điều hòa', AirVent], ['Quạt điện', Fan], ['Máy sưởi', Heater], ['Chăn điện', Snowflake]] },
  { name: 'Không gian ngoài trời', items: [['Ban công', Mountain], ['Sân hiên', Armchair], ['Vườn', Trees], ['Hồ bơi', Waves], ['Bếp nướng BBQ', Flame], ['Khu vực ăn uống ngoài trời', Utensils]] },
  { name: 'Đỗ xe và tiện ích', items: [['Chỗ đỗ xe miễn phí trong khuôn viên', Car], ['Chỗ đỗ xe miễn phí trên đường', Car], ['Sạc xe điện', Car], ['Xe đạp', Bike], ['Lối vào riêng', KeyRound]] },
  { name: 'An toàn', items: [['Bình chữa cháy', ShieldCheck], ['Bộ sơ cứu', ShieldCheck], ['Máy báo khói', ShieldCheck], ['Khóa cửa phòng ngủ', LockKeyhole]] },
  { name: 'Không gian làm việc', items: [['Bàn làm việc', Laptop], ['Wifi tốc độ cao', Wifi], ['Wifi', Wifi], ['Không gian để hành lý', Luggage], ['Khu vực để hành lý', BriefcaseBusiness]] },
];

const amenityMeta = new Map();
for (const category of AMENITY_CATEGORIES) {
  for (const [name, icon] of category.items) {
    if (!amenityMeta.has(name.toLocaleLowerCase('vi'))) amenityMeta.set(name.toLocaleLowerCase('vi'), { icon, category: category.name });
  }
}

export function getAmenityMeta(name) {
  const label = String(name || '').trim();
  const exact = amenityMeta.get(label.toLocaleLowerCase('vi'));
  if (exact) return { ...exact, label };
  const lower = label.toLocaleLowerCase('vi');
  if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet') || lower.includes('mạng')) return { icon: Wifi, label, category: 'Không gian làm việc' };
  if (lower.includes('điều hòa') || lower.includes('máy lạnh')) return { icon: AirVent, label, category: 'Điều hòa và sưởi' };
  if (lower.includes('bình nóng lạnh') || lower.includes('tắm') || lower.includes('dầu gội') || lower.includes('nước nóng')) return { icon: Bath, label, category: 'Phòng tắm' };
  if (lower.includes('máy sấy')) return { icon: Wind, label, category: lower.includes('quần áo') ? 'Phòng ngủ và phòng giặt' : 'Phòng tắm' };
  if (lower.includes('tủ lạnh')) return { icon: Refrigerator, label, category: 'Nhà bếp và ăn uống' };
  if (lower.includes('tv') || lower.includes('tivi') || lower.includes('truyền hình')) return { icon: Tv, label, category: 'Giải trí' };
  if (lower.includes('bếp') || lower.includes('nấu')) return { icon: CookingPot, label, category: 'Nhà bếp và ăn uống' };
  if (lower.includes('bàn làm việc')) return { icon: Laptop, label, category: 'Không gian làm việc' };
  if (lower.includes('móc treo') || lower.includes('quần áo')) return { icon: Shirt, label, category: 'Phòng ngủ và phòng giặt' };
  if (lower.includes('ban công') || lower.includes('view') || lower.includes('núi') || lower.includes('hồ')) return { icon: Mountain, label, category: 'Không gian ngoài trời' };
  if (lower.includes('đỗ xe') || lower.includes('bãi xe') || lower.includes('ô tô')) return { icon: Car, label, category: 'Đỗ xe và tiện ích' };
  if (lower.includes('hồ bơi') || lower.includes('bể bơi')) return { icon: Waves, label, category: 'Không gian ngoài trời' };
  if (lower.includes('nước')) return { icon: Droplets, label, category: 'Nhà bếp và ăn uống' };
  return { icon: CircleHelp, label: label || 'Tiện nghi khác', category: 'Khác' };
}

export function groupAmenities(amenities = []) {
  const groups = new Map();
  for (const item of amenities) {
    const meta = getAmenityMeta(item);
    if (!groups.has(meta.category)) groups.set(meta.category, []);
    groups.get(meta.category).push({ ...meta, name: item });
  }
  return AMENITY_CATEGORIES.filter((category) => groups.has(category.name))
    .map((category) => ({ name: category.name, items: groups.get(category.name) }))
    .concat(groups.has('Khác') ? [{ name: 'Khác', items: groups.get('Khác') }] : []);
}
