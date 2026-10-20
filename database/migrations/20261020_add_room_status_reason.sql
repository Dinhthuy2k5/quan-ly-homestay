-- Lưu lý do thay đổi trạng thái gần nhất do Manager nhập (API-MGR-07).
ALTER TABLE rooms
  ADD COLUMN status_reason VARCHAR(255) NULL AFTER status;
