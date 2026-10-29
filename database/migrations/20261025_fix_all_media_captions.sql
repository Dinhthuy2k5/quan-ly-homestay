-- Khôi phục toàn bộ chú thích (caption) tiếng Việt có dấu chuẩn UTF-8 trong bảng media.
-- Khắc phục tình trạng lỗi font (mojibake) do import file seed sai bảng mã trước đây.
START TRANSACTION;

UPDATE media
SET caption = CASE url
    -- Homestay Mai Châu (Room 102 - 105)
    WHEN '/files/rooms/room-102-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-102-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-102-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-103-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-103-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-103-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-104-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-104-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-104-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-105-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-105-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-105-3.webp' THEN 'Góc nghỉ'

    -- Homestay Mộc Châu (Room 201 - 204)
    WHEN '/files/rooms/room-201-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-201-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-201-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-202-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-202-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-202-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-203-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-203-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-203-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-204-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-204-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-204-3.webp' THEN 'Góc nghỉ'

    -- Homestay Sa Pa (Room 301 - 303)
    WHEN '/files/rooms/room-301-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-301-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-301-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-302-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-302-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-302-3.webp' THEN 'Phòng tắm'
    WHEN '/files/rooms/room-303-1.webp' THEN 'Phòng ngủ'

    -- Dịch vụ các homestay
    WHEN '/files/services/breakfast.webp' THEN 'Bữa sáng'
    WHEN '/files/services/motorbike-rental.webp' THEN 'Thuê xe máy'
    WHEN '/files/services/bbq.webp' THEN 'BBQ tối'
    WHEN '/files/services/laundry.webp' THEN 'Giặt ủi'
    WHEN '/files/services/breakfast-moc-chau.webp' THEN 'Bữa sáng'
    WHEN '/files/services/tea-time.webp' THEN 'Trà chiều đồi chè'
    WHEN '/files/services/bicycle-rental.webp' THEN 'Thuê xe đạp'
    WHEN '/files/services/breakfast-sa-pa.webp' THEN 'Bữa sáng'
    WHEN '/files/services/trekking-guide.webp' THEN 'Hướng dẫn viên trekking'
    ELSE caption
END
WHERE url IN (
    '/files/rooms/room-102-1.webp',
    '/files/rooms/room-102-2.webp',
    '/files/rooms/room-102-3.webp',
    '/files/rooms/room-103-1.webp',
    '/files/rooms/room-103-2.webp',
    '/files/rooms/room-103-3.webp',
    '/files/rooms/room-104-1.webp',
    '/files/rooms/room-104-2.webp',
    '/files/rooms/room-104-3.webp',
    '/files/rooms/room-105-1.webp',
    '/files/rooms/room-105-2.webp',
    '/files/rooms/room-105-3.webp',
    '/files/rooms/room-201-1.webp',
    '/files/rooms/room-201-2.webp',
    '/files/rooms/room-201-3.webp',
    '/files/rooms/room-202-1.webp',
    '/files/rooms/room-202-2.webp',
    '/files/rooms/room-202-3.webp',
    '/files/rooms/room-203-1.webp',
    '/files/rooms/room-203-2.webp',
    '/files/rooms/room-203-3.webp',
    '/files/rooms/room-204-1.webp',
    '/files/rooms/room-204-2.webp',
    '/files/rooms/room-204-3.webp',
    '/files/rooms/room-301-1.webp',
    '/files/rooms/room-301-2.webp',
    '/files/rooms/room-301-3.webp',
    '/files/rooms/room-302-1.webp',
    '/files/rooms/room-302-2.webp',
    '/files/rooms/room-302-3.webp',
    '/files/rooms/room-303-1.webp',
    '/files/services/breakfast.webp',
    '/files/services/motorbike-rental.webp',
    '/files/services/bbq.webp',
    '/files/services/laundry.webp',
    '/files/services/breakfast-moc-chau.webp',
    '/files/services/tea-time.webp',
    '/files/services/bicycle-rental.webp',
    '/files/services/breakfast-sa-pa.webp',
    '/files/services/trekking-guide.webp'
);

COMMIT;
