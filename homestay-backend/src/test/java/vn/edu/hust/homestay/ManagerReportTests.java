package vn.edu.hust.homestay;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.entity.BookingRoom;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomRepository;
import vn.edu.hust.homestay.expense.entity.Expense;
import vn.edu.hust.homestay.expense.entity.ExpenseCategory;
import vn.edu.hust.homestay.expense.repository.ExpenseCategoryRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseRepository;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class ManagerReportTests {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomTypeRepository roomTypeRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomRepository bookingRoomRepository;
    @Autowired private BookingRoomNightRepository bookingRoomNightRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private ExpenseCategoryRepository expenseCategoryRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;
    private User manager;
    private User otherManager;
    private User customer;
    private String managerToken;
    private String otherManagerToken;
    private String customerToken;
    private List<Room> activeRooms;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        manager = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        otherManager = userRepository.findByEmail("manager.mocchau@homestay.vn").orElseThrow();
        customer = userRepository.findByEmail("an.nguyen@example.com")
                .orElseGet(() -> userRepository.findByEmail("customer@gmail.com").orElseThrow());
        managerToken = jwtService.generateAccessToken(manager);
        otherManagerToken = jwtService.generateAccessToken(otherManager);
        customerToken = jwtService.generateAccessToken(customer);
        activeRooms = roomRepository.findByHomestayIdAndStatus(manager.getHomestayId(), RoomStatus.ACTIVE);
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: báo cáo đếm đúng booking và room-night theo kỳ, homestay và trạng thái")
    void overviewCountsOnlyReportableBookingsAndNightsInRange() throws Exception {
        if (activeRooms.size() < 4) throw new AssertionError("Test fixture cần ít nhất 4 phòng ACTIVE");
        LocalDate fromDate = LocalDate.of(2042, 4, 10);
        LocalDate toDate = LocalDate.of(2042, 4, 11);

        createBookingWithNights(activeRooms.get(0), "OVERLAP", BookingStatus.CONFIRMED,
                fromDate.minusDays(1), toDate.plusDays(1));
        createBookingWithNights(activeRooms.get(1), "CHECKED-IN", BookingStatus.CHECKED_IN,
                fromDate, fromDate.plusDays(1));
        createBookingWithNights(activeRooms.get(2), "CHECKED-OUT", BookingStatus.CHECKED_OUT,
                toDate, toDate.plusDays(1));
        createBookingWithNights(activeRooms.get(3), "PENDING", BookingStatus.PENDING_APPROVAL,
                fromDate, fromDate.plusDays(1));
        createBookingWithNights(activeRooms.get(3), "CHECKOUT-ON-START", BookingStatus.CONFIRMED,
                fromDate.minusDays(2), fromDate);

        long activeRoomCount = roomRepository.countByHomestayIdAndStatus(manager.getHomestayId(), RoomStatus.ACTIVE);
        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.fromDate", is(fromDate.toString())))
                .andExpect(jsonPath("$.data.toDate", is(toDate.toString())))
                .andExpect(jsonPath("$.data.bookingCount", is(3)))
                .andExpect(jsonPath("$.data.checkIns", is(2)))
                .andExpect(jsonPath("$.data.checkOuts", is(2)))
                .andExpect(jsonPath("$.data.activeRooms", is((int) activeRoomCount)))
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(4)));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: mặc định từ đầu tháng đến hôm nay theo giờ Việt Nam")
    void overviewDefaultsToCurrentMonthToToday() throws Exception {
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fromDate", is(today.withDayOfMonth(1).toString())))
                .andExpect(jsonPath("$.data.toDate", is(today.toString())));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: ngày không hợp lệ trả INVALID_DATE_RANGE")
    void invalidDateRangeIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", "2042-04-12")
                        .param("toDate", "2042-04-10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", "10/04/2042"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: báo cáo bị giới hạn vào homestay của Manager")
    void reportIsScopedToAuthenticatedManagersHomestay() throws Exception {
        if (activeRooms.isEmpty()) throw new AssertionError("Test fixture cần phòng ACTIVE");
        LocalDate fromDate = LocalDate.of(2043, 8, 10);
        LocalDate toDate = fromDate.plusDays(1);
        createBookingWithNights(activeRooms.get(0), "SCOPE", BookingStatus.CONFIRMED, fromDate, toDate);

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + otherManagerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingCount", is(0)))
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(0)));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: Manager chưa được gán cơ sở và Customer bị từ chối")
    void rejectsUnassignedManagerAndCustomer() throws Exception {
        User unassignedManager = new User();
        unassignedManager.setEmail("report-unassigned-" + UUID.randomUUID() + "@homestay.test");
        unassignedManager.setPasswordHash("test-only");
        unassignedManager.setFullName("Manager chưa gán");
        unassignedManager.setPhone("099" + UUID.randomUUID().toString().replace("-", "").substring(0, 7));
        unassignedManager.setRole(Role.MANAGER);
        unassignedManager.setStatus(UserStatus.ACTIVE);
        unassignedManager = userRepository.saveAndFlush(unassignedManager);

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + jwtService.generateAccessToken(unassignedManager)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-REPORT-MGR-02: tổng hợp thực thu ròng, chi phí, lợi nhuận và phân nhóm theo danh mục/phương thức")
    void financeSummarizesConfirmedReceiptsRefundsActiveExpensesAndBreakdowns() throws Exception {
        if (activeRooms.isEmpty()) throw new AssertionError("Test fixture cần phòng ACTIVE");
        LocalDate fromDate = LocalDate.of(2044, 5, 10);
        LocalDate toDate = LocalDate.of(2044, 5, 12);

        Booking booking = createBookingWithNights(activeRooms.get(0), "FIN", BookingStatus.CHECKED_OUT, fromDate, toDate);

        // Confirmed payments within Asia/Ho_Chi_Minh bounds (stored in UTC)
        createPayment(booking, Payment.PaymentType.DEPOSIT, 500_000L, Payment.PaymentMethod.BANK_TRANSFER,
                Payment.PaymentStatus.CONFIRMED, LocalDateTime.of(2044, 5, 10, 16, 30)); // 23:30 +07:00 on 10/05
        createPayment(booking, Payment.PaymentType.PAYMENT, 1_000_000L, Payment.PaymentMethod.CASH,
                Payment.PaymentStatus.CONFIRMED, LocalDateTime.of(2044, 5, 12, 16, 45)); // 23:45 +07:00 on 12/05
        createPayment(booking, Payment.PaymentType.REFUND, 200_000L, Payment.PaymentMethod.BANK_TRANSFER,
                Payment.PaymentStatus.CONFIRMED, LocalDateTime.of(2044, 5, 11, 5, 0));

        // Excluded payments: PENDING, REJECTED, and out-of-range (+07:00 next day 00:15 = 17:15 UTC on 12/05)
        createPayment(booking, Payment.PaymentType.DEPOSIT, 300_000L, Payment.PaymentMethod.CASH,
                Payment.PaymentStatus.PENDING, null);
        createPayment(booking, Payment.PaymentType.PAYMENT, 400_000L, Payment.PaymentMethod.BANK_TRANSFER,
                Payment.PaymentStatus.REJECTED, null);
        createPayment(booking, Payment.PaymentType.PAYMENT, 999_000L, Payment.PaymentMethod.CASH,
                Payment.PaymentStatus.CONFIRMED, LocalDateTime.of(2044, 5, 12, 17, 15));

        ExpenseCategory catElectricity = createExpenseCategory(manager.getHomestayId(), "Điện nước test " + UUID.randomUUID());
        ExpenseCategory catMaintenance = createExpenseCategory(manager.getHomestayId(), "Bảo trì test " + UUID.randomUUID());

        createExpense(catElectricity, 250_000L, fromDate, Expense.PaymentMethod.CASH, false);
        createExpense(catElectricity, 150_000L, toDate, Expense.PaymentMethod.BANK_TRANSFER, false);
        createExpense(catMaintenance, 100_000L, fromDate.plusDays(1), Expense.PaymentMethod.CARD, false);
        // Excluded: cancelled expense & out-of-range expense
        createExpense(catMaintenance, 700_000L, fromDate, Expense.PaymentMethod.CASH, true);
        createExpense(catElectricity, 600_000L, toDate.plusDays(1), Expense.PaymentMethod.CASH, false);

        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.fromDate", is(fromDate.toString())))
                .andExpect(jsonPath("$.data.toDate", is(toDate.toString())))
                .andExpect(jsonPath("$.data.grossReceipts", is(1_500_000)))
                .andExpect(jsonPath("$.data.depositReceipts", is(500_000)))
                .andExpect(jsonPath("$.data.settlementReceipts", is(1_000_000)))
                .andExpect(jsonPath("$.data.refunds", is(200_000)))
                .andExpect(jsonPath("$.data.revenue", is(1_300_000)))
                .andExpect(jsonPath("$.data.expense", is(500_000)))
                .andExpect(jsonPath("$.data.profit", is(800_000)))
                .andExpect(jsonPath("$.data.receiptCount", is(2)))
                .andExpect(jsonPath("$.data.refundCount", is(1)))
                .andExpect(jsonPath("$.data.expenseCount", is(3)))
                .andExpect(jsonPath("$.data.expensesByCategory", hasSize(2)))
                .andExpect(jsonPath("$.data.expensesByCategory[0].categoryId", is(catElectricity.getId().intValue())))
                .andExpect(jsonPath("$.data.expensesByCategory[0].totalAmount", is(400_000)))
                .andExpect(jsonPath("$.data.expensesByCategory[0].expenseCount", is(2)))
                .andExpect(jsonPath("$.data.expensesByCategory[1].categoryId", is(catMaintenance.getId().intValue())))
                .andExpect(jsonPath("$.data.expensesByCategory[1].totalAmount", is(100_000)))
                .andExpect(jsonPath("$.data.byPaymentMethod", hasSize(2)))
                .andExpect(jsonPath("$.data.byPaymentMethod[0].paymentMethod", is("CASH")))
                .andExpect(jsonPath("$.data.byPaymentMethod[0].grossReceipts", is(1_000_000)))
                .andExpect(jsonPath("$.data.byPaymentMethod[0].refunds", is(0)))
                .andExpect(jsonPath("$.data.byPaymentMethod[0].netRevenue", is(1_000_000)))
                .andExpect(jsonPath("$.data.byPaymentMethod[1].paymentMethod", is("BANK_TRANSFER")))
                .andExpect(jsonPath("$.data.byPaymentMethod[1].grossReceipts", is(500_000)))
                .andExpect(jsonPath("$.data.byPaymentMethod[1].refunds", is(200_000)))
                .andExpect(jsonPath("$.data.byPaymentMethod[1].netRevenue", is(300_000)));

        // Lọc theo phương thức CASH
        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString())
                        .param("paymentMethod", "CASH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentMethod", is("CASH")))
                .andExpect(jsonPath("$.data.revenue", is(1_000_000)))
                .andExpect(jsonPath("$.data.expense", is(250_000)))
                .andExpect(jsonPath("$.data.profit", is(750_000)))
                .andExpect(jsonPath("$.data.byPaymentMethod", hasSize(1)));

        // Lọc theo danh mục chi phí
        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString())
                        .param("categoryId", catMaintenance.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categoryId", is(catMaintenance.getId().intValue())))
                .andExpect(jsonPath("$.data.revenue", is(1_300_000)))
                .andExpect(jsonPath("$.data.expense", is(100_000)))
                .andExpect(jsonPath("$.data.profit", is(1_200_000)))
                .andExpect(jsonPath("$.data.expensesByCategory", hasSize(1)));

        // Manager cơ sở khác không thấy dữ liệu cơ sở này
        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + otherManagerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revenue", is(0)))
                .andExpect(jsonPath("$.data.expense", is(0)))
                .andExpect(jsonPath("$.data.profit", is(0)));
    }

    @Test
    @DisplayName("API-REPORT-MGR-02: từ chối tham số không hợp lệ, danh mục khác cơ sở và quyền Customer")
    void financeValidatesFiltersAndScope() throws Exception {
        ExpenseCategory otherHomestayCategory = createExpenseCategory(
                otherManager.getHomestayId(), "Danh mục cơ sở khác " + UUID.randomUUID());

        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("paymentMethod", "CRYPTO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_PAYMENT_METHOD")));

        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("categoryId", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_CATEGORY_ID")));

        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("categoryId", otherHomestayCategory.getId().toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("EXPENSE_CATEGORY_NOT_FOUND")));

        mockMvc.perform(get("/api/v1/manager/reports/finance")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-REPORT-MGR-03: tính công suất phòng theo kỳ, theo từng phòng, theo từng ngày và lọc loại phòng")
    void occupancyCalculatesRatesByRoomAndByDate() throws Exception {
        if (activeRooms.size() < 2) throw new AssertionError("Test fixture cần ít nhất 2 phòng ACTIVE");
        LocalDate fromDate = LocalDate.of(2045, 6, 10);
        LocalDate toDate = LocalDate.of(2045, 6, 12); // 3 ngày (10, 11, 12)

        Room firstRoom = activeRooms.get(0);
        Room secondRoom = activeRooms.get(1);

        // Phòng 1: 2 đêm (10, 11) CONFIRMED; Phòng 2: 1 đêm (11) PENDING_APPROVAL (không được tính)
        createBookingWithNights(firstRoom, "OCC-1", BookingStatus.CONFIRMED, fromDate, fromDate.plusDays(2));
        createBookingWithNights(secondRoom, "OCC-PENDING", BookingStatus.PENDING_APPROVAL, fromDate.plusDays(1), fromDate.plusDays(2));

        long activeRoomCount = activeRooms.size();
        long expectedCapacity = activeRoomCount * 3L;
        double expectedRate = Math.round((2.0 * 1000.0) / expectedCapacity) / 10.0;

        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.fromDate", is(fromDate.toString())))
                .andExpect(jsonPath("$.data.toDate", is(toDate.toString())))
                .andExpect(jsonPath("$.data.periodDays", is(3)))
                .andExpect(jsonPath("$.data.activeRooms", is((int) activeRoomCount)))
                .andExpect(jsonPath("$.data.capacityRoomNights", is((int) expectedCapacity)))
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(2)))
                .andExpect(jsonPath("$.data.vacantRoomNights", is((int) (expectedCapacity - 2))))
                .andExpect(jsonPath("$.data.occupancyRate", is(expectedRate)))
                .andExpect(jsonPath("$.data.byRoom", hasSize((int) activeRoomCount)))
                .andExpect(jsonPath("$.data.byRoom[0].roomId", is(firstRoom.getId().intValue())))
                .andExpect(jsonPath("$.data.byRoom[0].occupiedNights", is(2)))
                .andExpect(jsonPath("$.data.byRoom[0].vacantNights", is(1)))
                .andExpect(jsonPath("$.data.byRoom[0].bookedRoomValue", is(200_000)))
                .andExpect(jsonPath("$.data.byDate", hasSize(3)))
                .andExpect(jsonPath("$.data.byDate[0].stayDate", is(fromDate.toString())))
                .andExpect(jsonPath("$.data.byDate[0].occupiedRooms", is(1)))
                .andExpect(jsonPath("$.data.byDate[1].stayDate", is(fromDate.plusDays(1).toString())))
                .andExpect(jsonPath("$.data.byDate[1].occupiedRooms", is(1)))
                .andExpect(jsonPath("$.data.byDate[2].stayDate", is(toDate.toString())))
                .andExpect(jsonPath("$.data.byDate[2].occupiedRooms", is(0)));

        // Lọc theo roomTypeId của phòng 1
        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString())
                        .param("roomTypeId", firstRoom.getRoomTypeId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomTypeId", is(firstRoom.getRoomTypeId().intValue())))
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(2)));

        // Manager cơ sở khác không thấy dữ liệu cơ sở này
        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + otherManagerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(0)));
    }

    @Test
    @DisplayName("API-REPORT-MGR-03: từ chối roomTypeId không thuộc cơ sở, khoảng ngày > 366 ngày và quyền Customer")
    void occupancyValidatesFiltersAndScope() throws Exception {
        RoomType otherRoomType = roomTypeRepository.findByHomestayIdOrderByNameAsc(otherManager.getHomestayId())
                .stream()
                .findFirst()
                .orElseThrow();

        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("roomTypeId", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_ROOM_TYPE_ID")));

        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("roomTypeId", otherRoomType.getId().toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("ROOM_TYPE_NOT_FOUND")));

        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", "2045-01-01")
                        .param("toDate", "2046-12-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        mockMvc.perform(get("/api/v1/manager/reports/occupancy")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    private Payment createPayment(
            Booking booking,
            Payment.PaymentType type,
            long amount,
            Payment.PaymentMethod method,
            Payment.PaymentStatus status,
            LocalDateTime confirmedAtUtc
    ) {
        Payment payment = new Payment();
        payment.setBookingId(booking.getId());
        payment.setHomestayId(booking.getHomestayId());
        payment.setType(type);
        payment.setAmount(amount);
        payment.setMethod(method);
        payment.setStatus(status);
        payment.setCreatedBy(manager.getId());
        if (status == Payment.PaymentStatus.CONFIRMED) {
            payment.setConfirmedBy(manager.getId());
            payment.setConfirmedAt(confirmedAtUtc);
        } else if (status == Payment.PaymentStatus.REJECTED) {
            payment.setRejectionReason("Test rejected");
        }
        return paymentRepository.saveAndFlush(payment);
    }

    private ExpenseCategory createExpenseCategory(Long homestayId, String name) {
        ExpenseCategory category = new ExpenseCategory();
        category.setHomestayId(homestayId);
        category.setName(name);
        return expenseCategoryRepository.saveAndFlush(category);
    }

    private Expense createExpense(
            ExpenseCategory category,
            long amount,
            LocalDate expenseDate,
            Expense.PaymentMethod method,
            boolean cancelled
    ) {
        Expense expense = new Expense();
        expense.setHomestayId(category.getHomestayId());
        expense.setCategoryId(category.getId());
        expense.setAmount(amount);
        expense.setExpenseDate(expenseDate);
        expense.setDescription("Finance report test");
        expense.setDocumentType(Expense.DocumentType.RECEIPT);
        expense.setPaymentMethod(method);
        expense.setProofUrl("/uploads/expenses/test-proof.jpg");
        expense.setCreatedBy(manager.getId());
        if (cancelled) {
            expense.setCancelledAt(LocalDateTime.now(ZoneOffset.UTC));
            expense.setCancelledBy(manager.getId());
            expense.setCancellationReason("Cancelled in test");
        }
        return expenseRepository.saveAndFlush(expense);
    }

    private Booking createBookingWithNights(
            Room room, String suffix, BookingStatus status, LocalDate checkIn, LocalDate checkOut
    ) {
        Booking booking = new Booking();
        booking.setCode("RPT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8));
        booking.setHomestayId(manager.getHomestayId());
        booking.setContactName("Report test");
        booking.setContactPhone("0900000000");
        booking.setCheckInDate(checkIn);
        booking.setCheckOutDate(checkOut);
        booking.setGuestCount((short) 1);
        booking.setStatus(status);
        booking.setRoomTotalPrice(100_000L);
        booking.setDepositAmount(30_000L);
        booking.setHoldExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(1));
        booking.setCreatedBy(manager.getId());
        booking.setPolicySnapshot("{}");
        if (status == BookingStatus.CONFIRMED || status == BookingStatus.CHECKED_IN || status == BookingStatus.CHECKED_OUT) {
            booking.setApprovedBy(manager.getId());
            booking.setApprovedAt(Instant.now());
        }
        Booking saved = bookingRepository.saveAndFlush(booking);
        bookingRoomRepository.saveAndFlush(new BookingRoom(saved.getId(), manager.getHomestayId(), room.getId()));
        for (LocalDate stayDate = checkIn; stayDate.isBefore(checkOut); stayDate = stayDate.plusDays(1)) {
            bookingRoomNightRepository.saveAndFlush(new BookingRoomNight(
                    room.getId(), stayDate, saved.getId(), manager.getHomestayId(), 100_000L, "BASE"));
        }
        return saved;
    }
}
