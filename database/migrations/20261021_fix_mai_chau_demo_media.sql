-- Synchronize Mai Chau demo media with the real photo files under storage/uploads.
-- Adds the missing room 102 cover and a real room photo for room ID 26 (room 201).
START TRANSACTION;
UPDATE media
SET mime_type = 'image/webp',
    size_bytes = CASE url
        WHEN '/files/homestays/mai-chau-cover.webp' THEN 127230
        WHEN '/files/homestays/mai-chau-2.webp' THEN 277038
        WHEN '/files/homestays/mai-chau-3.webp' THEN 31666
        WHEN '/files/homestays/mai-chau-4.webp' THEN 293932
        WHEN '/files/rooms/room-101-1.webp' THEN 118750
        WHEN '/files/rooms/room-101-2.webp' THEN 277038
        WHEN '/files/rooms/room-101-3.webp' THEN 111116
        WHEN '/files/rooms/room-102-1.webp' THEN 144134
        WHEN '/files/rooms/room-102-2.webp' THEN 127230
        WHEN '/files/rooms/room-102-3.webp' THEN 130794
        WHEN '/files/rooms/room-103-1.webp' THEN 232668
        WHEN '/files/rooms/room-103-2.webp' THEN 188354
        WHEN '/files/rooms/room-103-3.webp' THEN 70032
        WHEN '/files/rooms/room-104-1.webp' THEN 263144
        WHEN '/files/rooms/room-104-2.webp' THEN 293932
        WHEN '/files/rooms/room-104-3.webp' THEN 311646
        WHEN '/files/rooms/room-105-1.webp' THEN 226092
        WHEN '/files/rooms/room-105-2.webp' THEN 144988
        WHEN '/files/rooms/room-105-3.webp' THEN 90418
        WHEN '/files/rooms/room-201-demo.webp' THEN 118750
        ELSE size_bytes
    END
WHERE homestay_id = 1
  AND owner_type IN ('HOMESTAY', 'ROOM')
  AND url IN (
    '/files/homestays/mai-chau-cover.webp',
    '/files/homestays/mai-chau-2.webp',
    '/files/homestays/mai-chau-3.webp',
    '/files/homestays/mai-chau-4.webp',
    '/files/rooms/room-101-1.webp',
    '/files/rooms/room-101-2.webp',
    '/files/rooms/room-101-3.webp',
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
    '/files/rooms/room-201-demo.webp'
  );
INSERT INTO media (homestay_id, owner_type, owner_id, url, mime_type, size_bytes, caption, sort_order, uploaded_by)
SELECT 1, 'ROOM', 2, '/files/rooms/room-102-1.webp', 'image/webp', 144134, 'Phòng ngủ', 0, 3
WHERE NOT EXISTS (SELECT 1 FROM media WHERE owner_type = 'ROOM' AND owner_id = 2 AND sort_order = 0);
INSERT INTO media (homestay_id, owner_type, owner_id, url, mime_type, size_bytes, caption, sort_order, uploaded_by)
SELECT 1, 'ROOM', 26, '/files/rooms/room-201-demo.webp', 'image/webp', 118750, 'Ảnh phòng demo', 0, 3
WHERE NOT EXISTS (SELECT 1 FROM media WHERE owner_type = 'ROOM' AND owner_id = 26 AND sort_order = 0);
COMMIT;
