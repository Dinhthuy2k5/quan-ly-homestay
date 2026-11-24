package vn.edu.hust.homestay.common.constant;

/**
 * File cấu hình tập trung toàn bộ các giới hạn kiểm tra dữ liệu (validation limits)
 * dùng chung cho DTO (@Size, @Min, @Max), Controller và Service toàn backend.
 *
 * Mọi giá trị đều là hằng số biên dịch (compile-time constant) để có thể dùng trực tiếp
 * trong cả Jakarta Validation annotations lẫn logic kiểm tra nghiệp vụ ở tầng Service.
 */
public final class ValidationConstants {

    private ValidationConstants() {}

    // --- XÁC THỰC & TÀI KHOẢN ---
    public static final int PASSWORD_MIN_LENGTH = 8;

    // --- HOMESTAY & PHÒNG ---
    public static final int HOMESTAY_NAME_MAX_LENGTH = 150;
    public static final int HOMESTAY_ADDRESS_MAX_LENGTH = 255;

    public static final int ROOM_NAME_MAX_LENGTH = 100;
    public static final int ROOM_TYPE_NAME_MAX_LENGTH = 100;
    public static final int ROOM_TYPE_DESCRIPTION_MAX_LENGTH = 255;
    public static final int ROOM_STATUS_REASON_MAX_LENGTH = 255;
    public static final int ROOM_MAX_GUESTS_MIN = 1;
    public static final int ROOM_MAX_GUESTS_MAX = 50;

    // --- QUY TẮC GIÁ ---
    public static final int PRICE_RULE_NAME_MAX_LENGTH = 100;

    // --- DỊCH VỤ & ĐẶT DỊCH VỤ ---
    public static final int SERVICE_CATEGORY_NAME_MAX_LENGTH = 100;
    public static final int SERVICE_NAME_MAX_LENGTH = 150;
    public static final int SERVICE_UNIT_MAX_LENGTH = 30;
    public static final int SERVICE_DESCRIPTION_MAX_LENGTH = 255;
    public static final long SERVICE_UNIT_PRICE_MIN = 0L;
    public static final long SERVICE_UNIT_PRICE_MAX = 1_000_000_000L; // 1 tỷ VND
    public static final int BOOKING_SERVICE_QUANTITY_MIN = 1;
    public static final int BOOKING_SERVICE_QUANTITY_MAX = 100;
    public static final int BOOKING_SERVICE_NOTE_MAX_LENGTH = 255;

    // --- ĐƠN ĐẶT PHÒNG (BOOKING) ---
    public static final int CONTACT_NAME_MAX_LENGTH = 100;
    public static final int CONTACT_EMAIL_MAX_LENGTH = 150;
    public static final int BOOKING_GUEST_COUNT_MIN = 1;
    public static final int BOOKING_GUEST_COUNT_MAX = 50;
    public static final int BOOKING_NOTE_MAX_LENGTH = 500;
    public static final int BOOKING_ADJUST_REASON_MAX_LENGTH = 500;
    public static final int BOOKING_CANCEL_REASON_MAX_LENGTH = 255;
    // Dành chỗ cho tiền tố nguồn hủy ("Quản lý hủy: " / "Khách yêu cầu: ") trong cột 255 ký tự
    public static final int MANAGER_CANCEL_REASON_MAX_LENGTH = 239;
    public static final int CHECK_IN_NOTE_MAX_LENGTH = 255;
    public static final int CHECK_OUT_NOTE_MAX_LENGTH = 255;

    // --- THANH TOÁN, ĐẶT CỌC & HOÀN TIỀN ---
    public static final long PAYMENT_AMOUNT_MIN = 1L;
    public static final int PAYMENT_REFERENCE_CODE_MAX_LENGTH = 100;
    public static final int PAYMENT_NOTE_MAX_LENGTH = 255;
    public static final int DEPOSIT_REVIEW_REASON_MAX_LENGTH = 255;
    public static final int BANK_NAME_MAX_LENGTH = 100;
    public static final int BANK_ACCOUNT_NUMBER_MAX_LENGTH = 20;
    public static final int BANK_ACCOUNT_HOLDER_MAX_LENGTH = 50;

    // --- CHI PHÍ VẬN HÀNH (EXPENSE) ---
    public static final int EXPENSE_CATEGORY_NAME_MAX_LENGTH = 100;
    public static final int EXPENSE_DESCRIPTION_MAX_LENGTH = 255;
    public static final int EXPENSE_SUPPLIER_NAME_MAX_LENGTH = 150;
    public static final int EXPENSE_DOCUMENT_NUMBER_MAX_LENGTH = 100;
    public static final int EXPENSE_TRANSACTION_REFERENCE_MAX_LENGTH = 100;
    public static final int EXPENSE_CANCEL_REASON_MAX_LENGTH = 500;

    // --- TỆP ĐÍNH KÈM & MEDIA ---
    public static final long MAX_UPLOAD_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB
    public static final int MEDIA_CAPTION_MAX_LENGTH = 255;
    public static final int MEDIA_MAX_HOMESTAY_FILES = 20;
    public static final int MEDIA_MAX_ROOM_FILES = 12;
    public static final int MEDIA_MAX_SERVICE_FILES = 10;

    // --- PHÂN TRANG & TRA CỨU PHÒNG TRỐNG ---
    public static final int MIN_PAGE_SIZE = 1;
    public static final int MAX_PAGE_SIZE = 100;
    public static final long AVAILABILITY_MAX_RANGE_DAYS = 367L;
}
