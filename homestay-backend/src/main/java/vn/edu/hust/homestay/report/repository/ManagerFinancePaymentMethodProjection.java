package vn.edu.hust.homestay.report.repository;

public interface ManagerFinancePaymentMethodProjection {
    String getPaymentMethod();
    Long getGrossReceipts();
    Long getDepositReceipts();
    Long getSettlementReceipts();
    Long getRefunds();
    Long getReceiptCount();
    Long getRefundCount();
}
