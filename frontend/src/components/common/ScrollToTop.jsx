import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tự động cuộn trang về đầu màn hình (top: 0) mỗi khi chuyển trang trong ứng dụng.
 * Nếu đường dẫn có chứa hash (#overview, #amenities...) thì ưu tiên cuộn tới phần tử đó.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Cuộn về đỉnh trang ngay lập tức
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname, search, hash]);

  return null;
}

export default ScrollToTop;
