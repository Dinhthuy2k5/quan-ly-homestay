package vn.edu.hust.homestay.room.repository;

/** Thống kê số lượng phòng theo từng homestay (tổng phòng và số phòng ACTIVE). */
public interface HomestayRoomCountProjection {
    Long getHomestayId();
    Long getTotalRooms();
    Long getActiveRooms();
}
