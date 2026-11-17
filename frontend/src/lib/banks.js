let memoryBanksCache = null;

export const FALLBACK_BANKS = [
  { code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
  { code: 'CTG', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam' },
  { code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'VBA', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
  { code: 'MB', shortName: 'MB Bank', name: 'Ngân hàng TMCP Quân đội' },
  { code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'VIB', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { code: 'HDB', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
  { code: 'SHB', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'SSB', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
  { code: 'MSB', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'OCB', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
  { code: 'LPB', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
  { code: 'EIB', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
  { code: 'BAB', shortName: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á' },
  { code: 'NAB', shortName: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á' },
  { code: 'PVB', shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam' },
  { code: 'BVB', shortName: 'BaoViet Bank', name: 'Ngân hàng TMCP Bảo Việt' },
  { code: 'VAB', shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á' },
  { code: 'KLB', shortName: 'Kienlongbank', name: 'Ngân hàng TMCP Kiên Long' },
  { code: 'SGB', shortName: 'Saigonbank', name: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: 'PGB', shortName: 'PGBank', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển' },
  { code: 'SHBVN', shortName: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
  { code: 'WRB', shortName: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam' },
];

/**
 * Tải danh mục các ngân hàng Việt Nam từ API VietQR (chuẩn NAPAS liên ngân hàng).
 * Tự động cache vào sessionStorage và fallback về danh sách chuẩn khi mất kết nối.
 */
export async function fetchSupportedBanks() {
  if (memoryBanksCache && memoryBanksCache.length > 0) {
    return memoryBanksCache;
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const cached = window.sessionStorage.getItem('homestay_supported_banks');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryBanksCache = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore parse error
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.vietqr.io/v2/banks', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const banks = json.data.map((item) => ({
          code: item.code || '',
          shortName: item.shortName || item.code || '',
          name: item.name || '',
          bin: item.bin || '',
          logo: item.logo || '',
        }));
        memoryBanksCache = banks;
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem('homestay_supported_banks', JSON.stringify(banks));
          } catch {
            // ignore storage error
          }
        }
        return banks;
      }
    }
  } catch (err) {
    console.warn('Không thể tải danh sách ngân hàng từ VietQR, sử dụng danh sách dự phòng:', err.message);
  }

  memoryBanksCache = FALLBACK_BANKS;
  return FALLBACK_BANKS;
}
