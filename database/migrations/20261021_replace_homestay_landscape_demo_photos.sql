-- Replace landscape-only homestay demo media with real accommodation photographs.
-- These are stock photos and are not claimed to depict the named real-world properties.
START TRANSACTION;
UPDATE media
SET mime_type = 'image/webp',
    size_bytes = CASE url
        WHEN '/files/homestays/mai-chau-cover.webp' THEN 458484
        WHEN '/files/homestays/mai-chau-2.webp' THEN 199822
        WHEN '/files/homestays/mai-chau-3.webp' THEN 263144
        WHEN '/files/homestays/mai-chau-4.webp' THEN 166764
        WHEN '/files/homestays/moc-chau-cover.webp' THEN 262668
        WHEN '/files/homestays/moc-chau-2.webp' THEN 226092
        WHEN '/files/homestays/moc-chau-3.webp' THEN 112074
        WHEN '/files/homestays/moc-chau-4.webp' THEN 168642
        WHEN '/files/homestays/sa-pa-cover.webp' THEN 191512
        WHEN '/files/homestays/sa-pa-2.webp' THEN 144134
        WHEN '/files/homestays/sa-pa-3.webp' THEN 199828
        WHEN '/files/homestays/sa-pa-4.webp' THEN 118750
        ELSE size_bytes
    END,
    caption = CASE url
        WHEN '/files/homestays/mai-chau-cover.webp' THEN 'Ngôi nhà lưu trú giữa khu vườn'
        WHEN '/files/homestays/mai-chau-2.webp' THEN 'Phòng ngủ phong cách gỗ'
        WHEN '/files/homestays/mai-chau-3.webp' THEN 'Không gian phòng nghỉ'
        WHEN '/files/homestays/mai-chau-4.webp' THEN 'Phòng nghỉ có cửa sổ lớn'
        WHEN '/files/homestays/moc-chau-cover.webp' THEN 'Bungalow gỗ cạnh hồ bơi'
        WHEN '/files/homestays/moc-chau-2.webp' THEN 'Phòng nghỉ tiện nghi'
        WHEN '/files/homestays/moc-chau-3.webp' THEN 'Không gian sinh hoạt chung'
        WHEN '/files/homestays/moc-chau-4.webp' THEN 'Phòng khách homestay'
        WHEN '/files/homestays/sa-pa-cover.webp' THEN 'Khu lưu trú có hồ bơi'
        WHEN '/files/homestays/sa-pa-2.webp' THEN 'Phòng nghỉ sáng màu'
        WHEN '/files/homestays/sa-pa-3.webp' THEN 'Không gian sinh hoạt rộng'
        WHEN '/files/homestays/sa-pa-4.webp' THEN 'Phòng nghỉ có cửa sổ lớn'
        ELSE caption
    END
WHERE owner_type = 'HOMESTAY'
  AND owner_id IN (1, 2, 3)
  AND url IN (
    '/files/homestays/mai-chau-cover.webp', '/files/homestays/mai-chau-2.webp',
    '/files/homestays/mai-chau-3.webp', '/files/homestays/mai-chau-4.webp',
    '/files/homestays/moc-chau-cover.webp', '/files/homestays/moc-chau-2.webp',
    '/files/homestays/moc-chau-3.webp', '/files/homestays/moc-chau-4.webp',
    '/files/homestays/sa-pa-cover.webp', '/files/homestays/sa-pa-2.webp',
    '/files/homestays/sa-pa-3.webp', '/files/homestays/sa-pa-4.webp'
  );
COMMIT;
