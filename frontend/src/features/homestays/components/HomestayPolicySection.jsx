import React from 'react';
import {
  Clock,
  CreditCard,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building,
  Info,
  CalendarCheck,
} from 'lucide-react';

/**
 * Component hiển thị thông tin Chính sách & Quy định lưu trú của homestay.
 * Dùng chung cho cả màn hình chi tiết của khách hàng (HomestayDetailPage)
 * và màn hình quản lý của quản lý cơ sở (ManagerHomestayPage).
 */
export function HomestayPolicySection({
  policies,
  loading = false,
  error = '',
  title = 'Chính sách & Quy định lưu trú',
  isManagerView = false,
  className = '',
}) {
  if (loading) {
    return (
      <section aria-labelledby="policy-title" className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 id="policy-title" className="text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-labelledby="policy-title" className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 id="policy-title" className="text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p>{error || 'Chưa thể tải chính sách của homestay. Vui lòng thử lại sau.'}</p>
        </div>
      </section>
    );
  }

  if (!policies) return null;

  const { bookingPolicy, paymentPolicy, stayPolicy, cancellationPolicy } = policies;

  return (
    <section id="policies" aria-labelledby="policy-title" className={`space-y-6 scroll-mt-28 ${className}`}>
      <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <FileText className="h-6 w-6 text-[var(--color-primary)]" />
          <h2 id="policy-title" className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h2>
        </div>
        <p className="text-xs text-[var(--color-muted)] sm:text-sm">
          {isManagerView
            ? 'Quy định và chính sách đang áp dụng thống nhất cho toàn cơ sở'
            : 'Vui lòng đọc kỹ các quy định trước khi đặt phòng'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Card 1: Giờ nhận & Trả phòng */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)]">
          <div>
            <div className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Thời gian nhận & trả phòng</h3>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Nhận phòng</span>
                <p className="mt-1 text-lg font-bold text-[var(--color-ink)]">
                  từ {stayPolicy?.checkInTime || '11:00'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">trở đi vào ngày check-in</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Trả phòng</span>
                <p className="mt-1 text-lg font-bold text-[var(--color-ink)]">
                  trước {stayPolicy?.checkOutDeadline || '08:00'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">sáng ngày check-out</p>
              </div>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3">
            <Info className="h-4 w-4 shrink-0 text-blue-500" />
            <span>Liên hệ hotline của homestay nếu bạn có nhu cầu check-in sớm hoặc check-out trễ.</span>
          </p>
        </div>

        {/* Card 2: Đặt cọc & Thanh toán */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)]">
          <div>
            <div className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Đặt phòng & Thanh toán cọc</h3>
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-[var(--color-muted)]">Tỷ lệ đặt cọc bắt buộc</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs sm:text-sm">
                  {paymentPolicy?.depositPercent ?? 30}% tổng tiền phòng
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-[var(--color-muted)]">Thời hạn nộp chứng từ cọc</span>
                <span className="font-semibold text-[var(--color-ink)]">
                  Trong vòng {paymentPolicy?.holdHours ?? 24} giờ
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-[var(--color-muted)]">Số đêm lưu trú cho phép</span>
                <span className="font-semibold text-[var(--color-ink)]">
                  {bookingPolicy?.minNights ?? 1} - {bookingPolicy?.maxNights ?? 30} đêm
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-muted)]">Hạn điều chỉnh đơn đặt</span>
                <span className="font-semibold text-[var(--color-ink)]">
                  Trước tối thiểu {bookingPolicy?.adjustMinDaysBefore ?? 3} ngày
                </span>
              </div>
            </div>
          </div>

          {paymentPolicy?.bankName && (
            <div className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-2.5 text-xs text-[var(--color-body)]">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900 mb-0.5">
                <Building className="h-3.5 w-3.5" />
                <span>{paymentPolicy.bankName}</span>
              </div>
              <p>STK: <strong className="font-mono text-emerald-800">{paymentPolicy.bankAccountNumber}</strong> · {paymentPolicy.bankAccountHolder}</p>
            </div>
          )}
        </div>

        {/* Card 3: Chính sách Hủy phòng & Hoàn tiền */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)]">
          <div>
            <div className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Chính sách hủy phòng & Hoàn cọc</h3>
            </div>

            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {cancellationPolicy?.generalPolicyDescription ||
                'Tỷ lệ hoàn tiền cọc phụ thuộc vào số ngày hủy trước thời điểm nhận phòng.'}
            </p>

            <div className="mt-3.5 space-y-2">
              {cancellationPolicy?.refundRules?.map((rule) => {
                const isFull = rule.refundPercent === 100;
                const isPartial = rule.refundPercent > 0 && rule.refundPercent < 100;

                return (
                  <div
                    key={rule.daysBeforeCheckIn}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 text-xs sm:text-sm"
                  >
                    <span className="font-medium text-[var(--color-body)]">
                      {rule.daysBeforeCheckIn > 0
                        ? `Hủy trước ≥ ${rule.daysBeforeCheckIn} ngày`
                        : 'Hủy sát ngày / Không đến'}
                    </span>
                    <span
                      className={`font-semibold px-2.5 py-0.5 rounded-full text-xs ${
                        isFull
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPartial
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Hoàn {rule.refundPercent}% cọc
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3">
            <Info className="h-4 w-4 shrink-0 text-purple-500" />
            <span>Tiền hoàn lại sẽ được kế toán xử lý chuyển khoản sau khi yêu cầu hủy được xác nhận.</span>
          </p>
        </div>

        {/* Card 4: Nội quy lưu trú */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)]">
          <div>
            <div className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Nội quy & Quy tắc lưu trú</h3>
            </div>

            <ul className="mt-3.5 space-y-2 text-xs sm:text-sm text-[var(--color-body)]">
              {(stayPolicy?.houseRules || []).map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3">
            <CalendarCheck className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Kính mong quý khách tuân thủ nội quy để đảm bảo kỳ nghỉ an toàn và trọn vẹn.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export default HomestayPolicySection;
