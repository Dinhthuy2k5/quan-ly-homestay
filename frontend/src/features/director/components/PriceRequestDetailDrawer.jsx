import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  User as UserIcon,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { getDirectorPriceRequestDetailApi } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { getAmenityMeta } from '../../../lib/amenities';
import { getErrorMessage } from '../../../lib/errors';
import { formatDate, formatDateTime, formatVnd } from '../../../lib/format';
import {
  PRICE_REQUEST_STATUS_META,
  PRICE_REQUEST_TYPE_META,
  PRICE_RULE_STATUS_META,
  PRICE_RULE_TYPE_META,
  formatPriceRuleValue,
  formatWeekdaysShort,
} from '../../../lib/pricing';
import { ROOM_STATUS } from '../../../lib/status';

const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const PERCENT_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const ROOM_STATUS_BADGE_CLASS = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  LOCKED: 'border-amber-200 bg-amber-50 text-amber-800',
  INACTIVE: 'border-rose-200 bg-rose-50 text-rose-800',
};

function formatSignedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${PERCENT_FORMAT.format(num)}%`;
}

function formatSignedVnd(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '';
  const num = Math.round(Number(amount));
  if (num === 0) return '0 ₫';
  const sign = num > 0 ? '+' : '-';
  return `${sign}${formatVnd(Math.abs(num))}`;
}

function formatDateRangeText(startDate, endDate) {
  if (!startDate && !endDate) return 'Không giới hạn ngày';
  return `${startDate ? formatDate(startDate) : 'Không giới hạn'} → ${
    endDate ? formatDate(endDate) : 'Không giới hạn'
  }`;
}

function formatPriceRangeText(minPrice, maxPrice) {
  if (minPrice == null && maxPrice == null) return 'Chưa có dữ liệu';
  if (minPrice != null && maxPrice != null && minPrice !== maxPrice) {
    return `${formatVnd(minPrice)} – ${formatVnd(maxPrice)}`;
  }
  return formatVnd(minPrice ?? maxPrice);
}

function getDeltaBadgeClass(deltaPercent) {
  if (deltaPercent === null || deltaPercent === undefined || Number.isNaN(Number(deltaPercent))) {
    return 'border-gray-200 bg-gray-100 text-gray-700';
  }
  const num = Number(deltaPercent);
  const abs = Math.abs(num);
  if (abs >= 50) return 'border-rose-200 bg-rose-50 text-rose-800';
  if (abs >= 30) return 'border-amber-200 bg-amber-50 text-amber-800';
  if (num > 0) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (num < 0) return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-gray-200 bg-gray-100 text-gray-700';
}

function formatScopeLabel(rule, fallbackRoomName) {
  if (!rule) return '—';
  if (rule.roomId == null) return 'Toàn cơ sở';
  return fallbackRoomName || `Phòng #${rule.roomId}`;
}

/**
 * Xây dựng các dòng thuộc tính so sánh Trước → Sau (cho PENDING_APPROVAL có quy tắc hiện hành)
 * hoặc bảng thuộc tính chi tiết của quy tắc đề xuất.
 */
function buildDiffRows(detail) {
  const current = detail.currentRule;
  const proposed = detail.proposedRule && typeof detail.proposedRule === 'object' ? detail.proposedRule : null;
  const effectiveRuleType = proposed?.ruleType || current?.ruleType;
  const isBase = effectiveRuleType === 'BASE';
  const changedSet = new Set(detail.priceComparison?.changedFields || []);

  const currentScopeName =
    current?.roomId != null && current.roomId === detail.roomId ? detail.roomName : null;
  const proposedScopeName =
    proposed?.roomId != null && proposed.roomId === detail.roomId ? detail.roomName : null;

  if (detail.requestType === 'DEACTIVATE') {
    const rows = [
      {
        label: 'Loại quy tắc',
        currentVal: (PRICE_RULE_TYPE_META[current?.ruleType] || PRICE_RULE_TYPE_META.ADJUSTMENT).label,
        proposedVal: (PRICE_RULE_TYPE_META[current?.ruleType] || PRICE_RULE_TYPE_META.ADJUSTMENT).label,
        changed: false,
      },
      {
        label: 'Tên quy tắc',
        currentVal: current?.name || proposed?.name || `Quy tắc #${detail.targetRuleId}`,
        proposedVal: current?.name || proposed?.name || `Quy tắc #${detail.targetRuleId}`,
        changed: false,
      },
      {
        label: 'Phạm vi áp dụng',
        currentVal: formatScopeLabel(current || proposed, detail.roomName),
        proposedVal: formatScopeLabel(current || proposed, detail.roomName),
        changed: false,
      },
      {
        label: 'Mức giá áp dụng',
        currentVal: current ? formatPriceRuleValue(current) : '—',
        proposedVal: 'Ngừng áp dụng',
        changed: true,
      },
      {
        label: 'Trạng thái quy tắc',
        currentVal: (PRICE_RULE_STATUS_META[current?.status] || PRICE_RULE_STATUS_META.ACTIVE).label,
        proposedVal: PRICE_RULE_STATUS_META.INACTIVE.label,
        changed: true,
      },
    ];
    if (!isBase && current) {
      rows.push(
        {
          label: 'Thứ áp dụng',
          currentVal: formatWeekdaysShort(current.weekdays, 'Cả tuần'),
          proposedVal: '—',
          changed: false,
        },
        {
          label: 'Thời gian hiệu lực',
          currentVal: formatDateRangeText(current.startDate, current.endDate),
          proposedVal: '—',
          changed: false,
        },
        {
          label: 'Độ ưu tiên',
          currentVal: current.priority != null ? String(current.priority) : '0',
          proposedVal: '—',
          changed: false,
        }
      );
    }
    return rows;
  }

  const rows = [
    {
      label: 'Loại quy tắc',
      currentVal: current ? (PRICE_RULE_TYPE_META[current.ruleType] || PRICE_RULE_TYPE_META.ADJUSTMENT).label : '—',
      proposedVal: (PRICE_RULE_TYPE_META[effectiveRuleType] || PRICE_RULE_TYPE_META.ADJUSTMENT).label,
      changed: false,
    },
    {
      label: 'Tên quy tắc',
      currentVal: current?.name || '—',
      proposedVal: proposed?.name || (PRICE_RULE_TYPE_META[effectiveRuleType] || PRICE_RULE_TYPE_META.ADJUSTMENT).label,
      changed: detail.requestType === 'UPDATE' ? changedSet.has('name') : Boolean(current && current.name !== proposed?.name),
    },
    {
      label: 'Phạm vi áp dụng',
      currentVal: current ? formatScopeLabel(current, currentScopeName) : '—',
      proposedVal: proposed ? formatScopeLabel(proposed, proposedScopeName) : '—',
      changed: detail.requestType === 'UPDATE' && changedSet.has('roomId'),
    },
    {
      label: isBase ? 'Giá cơ bản' : 'Mức giá điều chỉnh',
      currentVal: current ? formatPriceRuleValue(current) : 'Chưa thiết lập',
      proposedVal: proposed ? formatPriceRuleValue(proposed) : '—',
      changed: isBase
        ? detail.requestType === 'CREATE'
          ? Boolean(current && current.basePrice !== proposed?.basePrice)
          : changedSet.has('basePrice')
        : detail.requestType === 'UPDATE'
          ? changedSet.has('adjustType') || changedSet.has('adjustValue')
          : false,
    },
  ];

  if (!isBase) {
    rows.push(
      {
        label: 'Thứ áp dụng',
        currentVal: current ? formatWeekdaysShort(current.weekdays, 'Cả tuần') : '—',
        proposedVal: formatWeekdaysShort(proposed?.weekdays, 'Cả tuần'),
        changed: detail.requestType === 'UPDATE' && changedSet.has('weekdays'),
      },
      {
        label: 'Thời gian hiệu lực',
        currentVal: current ? formatDateRangeText(current.startDate, current.endDate) : '—',
        proposedVal: formatDateRangeText(proposed?.startDate, proposed?.endDate),
        changed: detail.requestType === 'UPDATE' && changedSet.has('dateRange'),
      },
      {
        label: 'Độ ưu tiên',
        currentVal: current?.priority != null ? String(current.priority) : '—',
        proposedVal: proposed?.priority != null ? String(proposed.priority) : '0',
        changed: detail.requestType === 'UPDATE' && changedSet.has('priority'),
      }
    );
  }

  return rows;
}

/**
 * Ngăn kéo trượt ngang bên phải hiển thị chi tiết yêu cầu phê duyệt quy tắc giá (API-DIR-PRICE-02).
 * Giữ nguyên ngữ cảnh hàng đợi phía sau, chỉ đọc dữ liệu (chưa gắn nút Phê duyệt / Từ chối của API-DIR-PRICE-03/04).
 */
export function PriceRequestDetailDrawer({ requestId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Đóng bằng phím Escape và khóa cuộn nền khi mở Drawer
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Gọi API-DIR-PRICE-02 lấy chi tiết yêu cầu
  useEffect(() => {
    if (!requestId) return;
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchDetail() {
      setLoading(true);
      setError('');
      try {
        const data = await getDirectorPriceRequestDetailApi(requestId, { signal });
        if (!signal.aborted) {
          setDetail(data);
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(getErrorMessage(err) || 'Không thể tải chi tiết yêu cầu phê duyệt giá.');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDetail();
    return () => controller.abort();
  }, [requestId, reloadTick]);

  const typeMeta = detail
    ? PRICE_REQUEST_TYPE_META[detail.requestType] || {
        label: detail.requestType,
        badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
      }
    : null;
  const statusMeta = detail
    ? PRICE_REQUEST_STATUS_META[detail.status] || {
        label: detail.status,
        badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
      }
    : null;
  const effectiveRuleType = detail?.proposedRule?.ruleType || detail?.currentRule?.ruleType;
  const ruleTypeMeta = effectiveRuleType
    ? PRICE_RULE_TYPE_META[effectiveRuleType] || PRICE_RULE_TYPE_META.ADJUSTMENT
    : null;
  const showBeforeAfterColumns = Boolean(
    detail && detail.status === 'PENDING_APPROVAL' && detail.currentRule
  );
  const diffRows = detail ? buildDiffRows(detail) : [];
  const cmp = detail?.priceComparison || null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[var(--z-modal)] flex justify-end bg-black/40 backdrop-blur-[2px]"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-request-detail-title"
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
      >
        {/* ── Sticky Header ── */}
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="price-request-detail-title"
                className="font-mono text-base font-extrabold text-[var(--color-ink)]"
              >
                Yêu cầu #{requestId}
              </h2>
              {typeMeta && (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeMeta.badgeClass}`}
                >
                  {typeMeta.label}
                </span>
              )}
              {ruleTypeMeta && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${ruleTypeMeta.badgeClass}`}
                >
                  {ruleTypeMeta.label}
                </span>
              )}
              {statusMeta && (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
              )}
            </div>

            {detail && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink)]">
                  <Building2 className="h-3.5 w-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                  <span>{detail.homestayName || `Homestay #${detail.homestayId}`}</span>
                </span>
                {detail.homestayProvince && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    <span>{detail.homestayProvince}</span>
                  </span>
                )}
                {detail.targetRuleId && (
                  <span>· Quy tắc gốc #{detail.targetRuleId}</span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết yêu cầu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
              <div className="h-44 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
              <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
              <div className="h-52 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <p>{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setReloadTick((v) => v + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : detail ? (
            <>
              {/* ── Thông tin người gửi & trạng thái phê duyệt ── */}
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 p-4 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Người gửi đề xuất
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-ink)]">
                    <UserIcon className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
                    <span>{detail.requestedByName || `Quản lý #${detail.requestedBy}`}</span>
                  </p>
                  <div className="space-y-0.5 text-xs text-[var(--color-muted)]">
                    {detail.requestedByEmail && (
                      <p className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{detail.requestedByEmail}</span>
                      </p>
                    )}
                    {detail.requestedByPhone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{detail.requestedByPhone}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 pt-0.5 tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Gửi lúc: {formatDateTime(detail.requestedAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 p-4 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Trạng thái xử lý
                  </p>
                  {detail.status === 'PENDING_APPROVAL' ? (
                    <div className="space-y-1 text-xs text-amber-800">
                      <p className="inline-flex items-center gap-1.5 text-sm font-bold">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        <span>Đang chờ Giám đốc phê duyệt</span>
                      </p>
                      <p className="text-[var(--color-muted)]">
                        Đề xuất này chưa tác động lên bảng giá chính thức của cơ sở.
                      </p>
                    </div>
                  ) : detail.status === 'APPROVED' ? (
                    <div className="space-y-1 text-xs text-[var(--color-muted)]">
                      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Đã phê duyệt &amp; áp dụng</span>
                      </p>
                      <p>
                        Người duyệt:{' '}
                        <strong className="text-[var(--color-ink)]">
                          {detail.reviewedByName || `Giám đốc #${detail.reviewedBy}`}
                        </strong>
                      </p>
                      {detail.reviewedAt && (
                        <p className="tabular-nums">Thời điểm: {formatDateTime(detail.reviewedAt)}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-[var(--color-muted)]">
                      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Đã từ chối</span>
                      </p>
                      <p>
                        Người xử lý:{' '}
                        <strong className="text-[var(--color-ink)]">
                          {detail.reviewedByName || `Giám đốc #${detail.reviewedBy}`}
                        </strong>
                      </p>
                      {detail.reviewedAt && (
                        <p className="tabular-nums">Thời điểm: {formatDateTime(detail.reviewedAt)}</p>
                      )}
                      {detail.rejectionReason && (
                        <p className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-rose-800">
                          <strong>Lý do:</strong> {detail.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ── Khối 1: So sánh thay đổi (Trước → Sau) ── */}
              <section className="space-y-3" aria-labelledby="detail-diff-heading">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="detail-diff-heading" className="text-sm font-bold text-[var(--color-ink)]">
                    1. {showBeforeAfterColumns ? 'So sánh thay đổi (Trước → Sau)' : 'Nội dung quy tắc đề xuất'}
                  </h3>
                  {cmp?.replacesActiveBaseRule && detail.currentRule && (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                      Sẽ tự thay thế giá cơ bản #{detail.currentRule.id}
                    </span>
                  )}
                </div>

                {/* Banner nổi bật mức chênh lệch giá (chỉ khi PENDING_APPROVAL có dữ liệu so sánh) */}
                {cmp && (cmp.currentAmount != null || cmp.proposedAmount != null || cmp.projectedMinPrice != null) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 px-4 py-3 tabular-nums">
                    {cmp.currentAmount != null && cmp.proposedAmount != null ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-muted)] line-through">
                          {formatVnd(cmp.currentAmount)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
                        <span className="text-lg font-extrabold text-[var(--color-primary)]">
                          {formatVnd(cmp.proposedAmount)} / đêm
                        </span>
                      </div>
                    ) : cmp.projectedMinPrice != null ? (
                      <div className="text-sm">
                        <span className="text-[var(--color-muted)]">Giá bán dự kiến toàn cơ sở: </span>
                        <strong className="text-base font-extrabold text-[var(--color-primary)]">
                          {formatPriceRangeText(cmp.projectedMinPrice, cmp.projectedMaxPrice)} / đêm
                        </strong>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <span className="text-[var(--color-muted)]">Mức giá đề xuất: </span>
                        <strong className="text-base font-extrabold text-[var(--color-primary)]">
                          {formatVnd(cmp.proposedAmount)} / đêm
                        </strong>
                      </div>
                    )}

                    {cmp.deltaPercent != null && (
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${getDeltaBadgeClass(
                          cmp.deltaPercent
                        )}`}
                      >
                        {formatSignedPercent(cmp.deltaPercent)}
                        {cmp.deltaAmount != null && cmp.deltaAmount !== 0
                          ? ` (${formatSignedVnd(cmp.deltaAmount)})`
                          : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Bảng thuộc tính Trước → Sau */}
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        <th className="py-2.5 pl-4 pr-3 w-[30%]">Thuộc tính</th>
                        {showBeforeAfterColumns ? (
                          <>
                            <th className="py-2.5 px-3 w-[35%]">
                              Đang áp dụng (#{detail.currentRule.id})
                            </th>
                            <th className="py-2.5 pl-3 pr-4 w-[35%]">Đề xuất mới</th>
                          </>
                        ) : (
                          <th className="py-2.5 pl-3 pr-4">Giá trị đề xuất</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {diffRows.map((item) => (
                        <tr
                          key={item.label}
                          className={item.changed ? 'bg-violet-50/45' : 'bg-white'}
                        >
                          <td className="py-2.5 pl-4 pr-3 font-semibold text-[var(--color-muted)]">
                            {item.label}
                          </td>
                          {showBeforeAfterColumns ? (
                            <>
                              <td
                                className={`py-2.5 px-3 tabular-nums ${
                                  item.changed
                                    ? 'text-[var(--color-muted)] line-through'
                                    : 'text-[var(--color-body)]'
                                }`}
                              >
                                {item.currentVal}
                              </td>
                              <td
                                className={`py-2.5 pl-3 pr-4 tabular-nums ${
                                  item.changed
                                    ? 'font-bold text-[var(--color-ink)]'
                                    : 'text-[var(--color-body)]'
                                }`}
                              >
                                {item.proposedVal}
                              </td>
                            </>
                          ) : (
                            <td className="py-2.5 pl-3 pr-4 font-semibold text-[var(--color-ink)] tabular-nums">
                              {item.proposedVal}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {detail.status === 'APPROVED' && detail.currentRule && (
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Lưu ý: Yêu cầu này đã được phê duyệt nên quy tắc gốc #{detail.currentRule.id} trên hệ thống hiện đang mang trạng thái{' '}
                    <strong>
                      {(PRICE_RULE_STATUS_META[detail.currentRule.status] || PRICE_RULE_STATUS_META.ACTIVE).label}
                    </strong>
                    .
                  </p>
                )}
              </section>

              {/* ── Khối 2: Hồ sơ Phòng & Mặt bằng giá HOẶC Phạm vi Toàn cơ sở ── */}
              {detail.roomDetail && (
                <section className="space-y-3" aria-labelledby="detail-room-heading">
                  <h3 id="detail-room-heading" className="text-sm font-bold text-[var(--color-ink)]">
                    2. Hồ sơ phòng bị tác động &amp; mặt bằng giá tham chiếu
                  </h3>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {/* Ảnh đại diện phòng */}
                      <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] sm:w-36">
                        {detail.roomDetail.coverImageUrl ? (
                          <img
                            src={fileUrl(detail.roomDetail.coverImageUrl)}
                            alt={detail.roomDetail.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[var(--color-muted)]">
                            <BedDouble className="h-8 w-8 opacity-50" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {/* Thông tin chính của phòng */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-[var(--color-ink)]">
                            {detail.roomDetail.name}
                          </h4>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              ROOM_STATUS_BADGE_CLASS[detail.roomDetail.status] ||
                              'border-gray-200 bg-gray-100 text-gray-700'
                            }`}
                          >
                            {ROOM_STATUS[detail.roomDetail.status]?.label || detail.roomDetail.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-body)]">
                          {detail.roomDetail.roomTypeName && (
                            <span>
                              Hạng phòng: <strong className="text-[var(--color-ink)]">{detail.roomDetail.roomTypeName}</strong>
                            </span>
                          )}
                          {detail.roomDetail.maxGuests != null && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Users className="h-3.5 w-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                              <span>Tối đa {detail.roomDetail.maxGuests} khách</span>
                            </span>
                          )}
                          <span className="tabular-nums">
                            Giá cơ bản hiện tại:{' '}
                            <strong className="text-[var(--color-ink)]">
                              {detail.roomDetail.currentBasePrice != null
                                ? `${formatVnd(detail.roomDetail.currentBasePrice)} / đêm`
                                : 'Chưa thiết lập'}
                            </strong>
                          </span>
                        </div>

                        {detail.roomDetail.statusReason && (
                          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                            Lý do trạng thái phòng: {detail.roomDetail.statusReason}
                          </p>
                        )}

                        {detail.roomDetail.description && (
                          <p className="text-xs leading-relaxed text-[var(--color-muted)] line-clamp-3">
                            {detail.roomDetail.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tiện nghi phòng */}
                    {Array.isArray(detail.roomDetail.amenities) && detail.roomDetail.amenities.length > 0 && (
                      <div className="space-y-1.5 border-t border-[var(--color-border)] pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                          Tiện nghi phòng
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.roomDetail.amenities.map((amenityKey) => {
                            const meta = getAmenityMeta(amenityKey);
                            const Icon = meta.icon;
                            return (
                              <span
                                key={amenityKey}
                                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-body)]"
                              >
                                <Icon className="h-3 w-3 text-[var(--color-muted)] shrink-0" aria-hidden="true" />
                                <span>{meta.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mặt bằng giá tham chiếu các phòng khác cùng hạng / cùng cơ sở */}
                    {(detail.roomDetail.sameTypeBenchmark || detail.roomDetail.homestayBenchmark) && (
                      <div className="grid gap-2.5 border-t border-[var(--color-border)] pt-3 sm:grid-cols-2">
                        {detail.roomDetail.sameTypeBenchmark && (
                          <div className="rounded-xl bg-[var(--color-surface-soft)]/70 p-3 text-xs space-y-1 tabular-nums">
                            <p className="font-semibold text-[var(--color-muted)]">
                              Các phòng cùng hạng {detail.roomDetail.roomTypeName} (
                              {detail.roomDetail.sameTypeBenchmark.roomCount} phòng khác)
                            </p>
                            <p className="font-bold text-[var(--color-ink)]">
                              {formatPriceRangeText(
                                detail.roomDetail.sameTypeBenchmark.minBasePrice,
                                detail.roomDetail.sameTypeBenchmark.maxBasePrice
                              )}{' '}
                              / đêm
                            </p>
                            <p className="text-[11px] text-[var(--color-muted)]">
                              Trung bình: {formatVnd(detail.roomDetail.sameTypeBenchmark.avgBasePrice)} / đêm
                            </p>
                          </div>
                        )}

                        {detail.roomDetail.homestayBenchmark && (
                          <div className="rounded-xl bg-[var(--color-surface-soft)]/70 p-3 text-xs space-y-1 tabular-nums">
                            <p className="font-semibold text-[var(--color-muted)]">
                              Các phòng khác cùng cơ sở ({detail.roomDetail.homestayBenchmark.roomCount} phòng)
                            </p>
                            <p className="font-bold text-[var(--color-ink)]">
                              {formatPriceRangeText(
                                detail.roomDetail.homestayBenchmark.minBasePrice,
                                detail.roomDetail.homestayBenchmark.maxBasePrice
                              )}{' '}
                              / đêm
                            </p>
                            <p className="text-[11px] text-[var(--color-muted)]">
                              Trung bình: {formatVnd(detail.roomDetail.homestayBenchmark.avgBasePrice)} / đêm
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {detail.homestayScopeDetail && (
                <section className="space-y-3" aria-labelledby="detail-scope-heading">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id="detail-scope-heading" className="text-sm font-bold text-[var(--color-ink)]">
                      2. Phạm vi toàn cơ sở ({NUM_FORMAT.format(detail.homestayScopeDetail.activeRoomCount)}/
                      {NUM_FORMAT.format(detail.homestayScopeDetail.totalRoomCount)} phòng đang nhận đặt)
                    </h3>
                    {detail.homestayScopeDetail.minBasePrice != null && (
                      <span className="text-xs text-[var(--color-muted)] tabular-nums">
                        Giá cơ bản:{' '}
                        <strong className="text-[var(--color-ink)]">
                          {formatPriceRangeText(
                            detail.homestayScopeDetail.minBasePrice,
                            detail.homestayScopeDetail.maxBasePrice
                          )}
                        </strong>
                      </span>
                    )}
                  </div>

                  {detail.homestayScopeDetail.affectedRooms.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-xs text-[var(--color-muted)]">
                      Cơ sở hiện chưa có phòng nào đang ở trạng thái nhận đặt.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            <th className="py-2.5 pl-4 pr-3">Phòng</th>
                            <th className="py-2.5 px-3">Hạng phòng</th>
                            <th className="py-2.5 px-3 text-right">Giá cơ bản</th>
                            {detail.status === 'PENDING_APPROVAL' && (
                              <th className="py-2.5 pl-3 pr-4 text-right">Giá dự kiến</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                          {detail.homestayScopeDetail.affectedRooms.map((rm) => (
                            <tr key={rm.roomId} className="bg-white">
                              <td className="py-2.5 pl-4 pr-3 font-semibold text-[var(--color-ink)]">
                                {rm.roomName}
                                {rm.maxGuests != null && (
                                  <span className="ml-1.5 font-normal text-[var(--color-muted)]">
                                    ({rm.maxGuests} khách)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--color-body)]">
                                {rm.roomTypeName || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-[var(--color-body)]">
                                {rm.currentBasePrice != null ? formatVnd(rm.currentBasePrice) : 'Chưa có giá'}
                              </td>
                              {detail.status === 'PENDING_APPROVAL' && (
                                <td className="py-2.5 pl-3 pr-4 text-right font-bold tabular-nums text-[var(--color-primary)]">
                                  {rm.projectedPrice != null ? formatVnd(rm.projectedPrice) : '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* ── Khối 3: Các quy tắc đang áp dụng tại phạm vi này ── */}
              <section className="space-y-3" aria-labelledby="detail-active-rules-heading">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
                  <h3 id="detail-active-rules-heading" className="text-sm font-bold text-[var(--color-ink)]">
                    3. Quy tắc giá đang áp dụng ({detail.activeRules?.length || 0})
                  </h3>
                </div>

                {!detail.activeRules || detail.activeRules.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-xs text-[var(--color-muted)]">
                    Hiện chưa có quy tắc giá nào đang áp dụng trong phạm vi này.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.activeRules.map((rule) => {
                      const rtMeta =
                        PRICE_RULE_TYPE_META[rule.ruleType] || PRICE_RULE_TYPE_META.ADJUSTMENT;
                      return (
                        <div
                          key={rule.id}
                          className={`rounded-xl border p-3 text-xs ${
                            rule.isTargetRule
                              ? 'border-violet-300 bg-violet-50/45'
                              : 'border-[var(--color-border)] bg-white'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${rtMeta.badgeClass}`}
                              >
                                {rtMeta.label}
                              </span>
                              <span className="font-bold text-[var(--color-ink)]">{rule.name}</span>
                              <span className="font-mono text-[11px] text-[var(--color-muted)]">
                                #{rule.id}
                              </span>
                              {rule.isTargetRule && (
                                <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                  Quy tắc mục tiêu
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[var(--color-ink)] tabular-nums">
                              {formatPriceRuleValue(rule)}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted)]">
                            <span>Phạm vi: {rule.roomId == null ? 'Toàn cơ sở' : rule.roomName || `Phòng #${rule.roomId}`}</span>
                            {rule.ruleType === 'ADJUSTMENT' && (
                              <>
                                <span>Thứ: {formatWeekdaysShort(rule.weekdays, 'Cả tuần')}</span>
                                <span>Hiệu lực: {formatDateRangeText(rule.startDate, rule.endDate)}</span>
                                <span className="tabular-nums">Ưu tiên: {rule.priority ?? 0}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        {/* ── Sticky Footer ── */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 px-6 py-3.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Chỉ áp dụng cho báo giá và đơn đặt mới; không đổi giá booking đã chốt.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] cursor-pointer"
          >
            Đóng
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default PriceRequestDetailDrawer;
