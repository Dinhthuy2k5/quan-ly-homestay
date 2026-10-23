-- Restore the Vietnamese captions returned for room 1 (room-101) in API-MGR-05/06.
-- The API/JDBC already use UTF-8; these values were stored with mojibake in MySQL.
UPDATE media
SET caption = CASE url
    WHEN '/files/rooms/room-101-1.webp' THEN 'Phòng ngủ'
    WHEN '/files/rooms/room-101-2.webp' THEN 'View từ phòng'
    WHEN '/files/rooms/room-101-3.webp' THEN 'Phòng tắm'
    ELSE caption
END
WHERE owner_type = 'ROOM'
  AND owner_id = 1
  AND url IN (
      '/files/rooms/room-101-1.webp',
      '/files/rooms/room-101-2.webp',
      '/files/rooms/room-101-3.webp'
  );
