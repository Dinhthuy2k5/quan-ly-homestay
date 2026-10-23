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

  // Internet & Workspace
  if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet') || lower.includes('mạng') || lower.includes('workspace') || lower.includes('bàn làm việc') || lower.includes('desk') || lower.includes('laptop')) {
    return { icon: lower.includes('workspace') || lower.includes('bàn') || lower.includes('desk') ? Laptop : Wifi, label, category: 'Không gian làm việc' };
  }

  // Bathroom
  if (lower.includes('hair dryer') || lower.includes('máy sấy tóc')) return { icon: Wind, label, category: 'Phòng tắm' };
  if (lower.includes('shampoo') || lower.includes('conditioner') || lower.includes('soap') || lower.includes('dầu gội') || lower.includes('dầu xả') || lower.includes('xà phòng') || lower.includes('sữa tắm')) {
    return { icon: SoapDispenserDroplet, label, category: 'Phòng tắm' };
  }
  if (lower.includes('hot water') || lower.includes('nước nóng') || lower.includes('bình nóng lạnh')) return { icon: ShowerHead, label, category: 'Phòng tắm' };
  if (lower.includes('bathtub') || lower.includes('bồn tắm')) return { icon: Bath, label, category: 'Phòng tắm' };
  if (lower.includes('shower') || lower.includes('vòi sen') || lower.includes('tắm')) return { icon: ShowerHead, label, category: 'Phòng tắm' };

  // Bedroom & Laundry
  if (lower.includes('washer') || lower.includes('máy giặt')) return { icon: WashingMachine, label, category: 'Phòng ngủ và phòng giặt' };
  if (lower.includes('dryer') || lower.includes('máy sấy quần áo')) return { icon: WashingMachine, label, category: 'Phòng ngủ và phòng giặt' };
  if (lower.includes('hanger') || lower.includes('móc treo') || lower.includes('tủ quần áo') || lower.includes('wardrobe') || lower.includes('closet')) return { icon: Shirt, label, category: 'Phòng ngủ và phòng giặt' };
  if (lower.includes('iron') || lower.includes('bàn là')) return { icon: Shirt, label, category: 'Phòng ngủ và phòng giặt' };
  if (lower.includes('linen') || lower.includes('bed') || lower.includes('pillow') || lower.includes('blanket') || lower.includes('ga trải giường') || lower.includes('gối') || lower.includes('chăn')) {
    return { icon: BedDouble, label, category: 'Phòng ngủ và phòng giặt' };
  }
  if (lower.includes('towel') || lower.includes('khăn') || lower.includes('essential')) return { icon: Sparkles, label, category: 'Những điều cần thiết' };

  // Heating & Cooling
  if (lower.includes('air conditioning') || lower.includes('điều hòa') || lower.includes('máy lạnh') || lower.includes('a/c') || lower.includes('ac')) return { icon: AirVent, label, category: 'Điều hòa và sưởi' };
  if (lower.includes('heat') || lower.includes('sưởi')) return { icon: Heater, label, category: 'Điều hòa và sưởi' };
  if (lower.includes('fan') || lower.includes('quạt')) return { icon: Fan, label, category: 'Điều hòa và sưởi' };

  // Entertainment
  if (lower.includes('tv') || lower.includes('tivi') || lower.includes('netflix') || lower.includes('disney') || lower.includes('apple tv') || lower.includes('truyền hình')) return { icon: Tv, label, category: 'Giải trí' };
  if (lower.includes('speaker') || lower.includes('loa') || lower.includes('sound')) return { icon: Speaker, label, category: 'Giải trí' };
  if (lower.includes('game')) return { icon: Gamepad2, label, category: 'Giải trí' };

  // Safety
  if (lower.includes('camera') || lower.includes('cctv')) return { icon: ShieldCheck, label, category: 'An toàn' };
  if (lower.includes('smoke alarm') || lower.includes('carbon monoxide') || lower.includes('báo khói')) return { icon: ShieldCheck, label, category: 'An toàn' };
  if (lower.includes('fire extinguisher') || lower.includes('chữa cháy')) return { icon: ShieldCheck, label, category: 'An toàn' };
  if (lower.includes('first aid') || lower.includes('sơ cứu')) return { icon: ShieldCheck, label, category: 'An toàn' };
  if (lower.includes('lock') || lower.includes('khóa')) return { icon: LockKeyhole, label, category: 'An toàn' };

  // Kitchen & Dining
  if (lower.includes('kitchen') || lower.includes('bếp') || lower.includes('nấu') || lower.includes('cooking') || lower.includes('stove')) return { icon: CookingPot, label, category: 'Nhà bếp và ăn uống' };
  if (lower.includes('refrigerator') || lower.includes('fridge') || lower.includes('tủ lạnh')) return { icon: Refrigerator, label, category: 'Nhà bếp và ăn uống' };
  if (lower.includes('microwave') || lower.includes('lò vi sóng')) return { icon: Microwave, label, category: 'Nhà bếp và ăn uống' };
  if (lower.includes('coffee') || lower.includes('cà phê') || lower.includes('kettle') || lower.includes('siêu tốc')) return { icon: Coffee, label, category: 'Nhà bếp và ăn uống' };
  if (lower.includes('dish') || lower.includes('bát đĩa') || lower.includes('utensil') || lower.includes('bàn ăn') || lower.includes('dining')) return { icon: Utensils, label, category: 'Nhà bếp và ăn uống' };

  // Outdoor & Views
  if (lower.includes('balcony') || lower.includes('ban công') || lower.includes('view') || lower.includes('núi') || lower.includes('hồ')) return { icon: Mountain, label, category: 'Không gian ngoài trời' };
  if (lower.includes('garden') || lower.includes('vườn') || lower.includes('patio') || lower.includes('sân hiên')) return { icon: Trees, label, category: 'Không gian ngoài trời' };
  if (lower.includes('pool') || lower.includes('hồ bơi') || lower.includes('bể bơi')) return { icon: Waves, label, category: 'Không gian ngoài trời' };
  if (lower.includes('bbq') || lower.includes('nướng')) return { icon: Flame, label, category: 'Không gian ngoài trời' };

  // Parking & Facilities
  if (lower.includes('parking') || lower.includes('đỗ xe') || lower.includes('bãi xe') || lower.includes('ô tô') || lower.includes('ev charger')) return { icon: Car, label, category: 'Đỗ xe và tiện ích' };
  if (lower.includes('bike') || lower.includes('xe đạp')) return { icon: Bike, label, category: 'Đỗ xe và tiện ích' };
  if (lower.includes('luggage') || lower.includes('hành lý')) return { icon: Luggage, label, category: 'Không gian làm việc' };

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
