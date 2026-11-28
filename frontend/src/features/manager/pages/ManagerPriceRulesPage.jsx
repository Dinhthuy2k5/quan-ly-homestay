import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeDollarSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  PowerOff,
  RefreshCw,
} from 'lucide-react';
import { getManagerPriceRulesApi, getManagerRoomsApi } from '../api';
import { formatDate } from '../../../lib/format';
import {
  PRICE_REQUEST_TYPE_META,
  PRICE_RULE_STATUS_META,
  PRICE_RULE_TYPE_META,
  formatPriceRuleValue,
  formatWeekdaysShort,
} from '../../../lib/pricing';
import PriceRuleChangeRequestModal from '../components/PriceRuleChangeRequestModal';
import PriceRuleChangeRequestsPanel from '../components/PriceRuleChangeRequestsPanel';

function dateRange(rule) {
  if (!rule.startDate && !rule.endDate) return 'Không giới hạn ngày';
  return `${rule.startDate ? formatDate(rule.startDate) : 'Không giới hạn'} – ${
    rule.endDate ? formatDate(rule.endDate) : 'Không giới hạn'
  }`;
}

function errorMessage(error) {
  const code = error.response?.data?.error?.code;
  if (code === 'HOMESTAY_SCOPE_VIOLATION') return 'Bạn không có quyền xem quy tắc của phòng thuộc cơ sở khác.';
  if (code === 'ROOM_NOT_FOUND') return 'Không tìm thấy phòng đã chọn.';
  if (code === 'INVALID_PRICE_RULE') return error.response?.data?.error?.message || 'Khoảng ngày lọc không hợp lệ.';
  return error.response?.data?.error?.message || 'Không thể tải quy tắc giá.';
}

export default function ManagerPriceRulesPage() {
  const [filters, setFilters] = useState({ roomId: '', ruleType: '', status: '', fromDate: '', toDate: '' });
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Modal đề xuất thay đổi giá (API-PRICE-03)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE');
  const [selectedRule, setSelectedRule] = useState(null);
  const [modalSession, setModalSession] = useState(0);

  // Toast thông báo phản hồi
  const [toast, setToast] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => setToast({ type: '', message: '' }), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    getManagerRoomsApi({ size: 100 })
      .then((res) => {
        if (active && res?.items) setRooms(res.items);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const roomsMap = useMemo(() => {
    const map = {};
    rooms.forEach((room) => {
      if (room?.id) map[room.id] = room.name;
    });
    return map;
  }, [rooms]);

  const activeRules = useMemo(() => items.filter((r) => r.status === 'ACTIVE'), [items]);

  useEffect(() => {
    let active = true;
    getManagerPriceRulesApi({
      ...filters,
      status: filters.status || undefined,
      page,
      size: 20,
    })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setMeta(result.meta);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setItems([]);
        setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filters, page, reloadKey]);

  const updateFilter = (key, value) => {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const changePage = (update) => {
    setLoading(true);
    setPage(update);
  };

  const openModal = (mode, rule = null) => {
    setModalMode(mode);
    setSelectedRule(rule);
    setModalSession((s) => s + 1);
    setModalOpen(true);
  };

  const handleRequestSuccess = (createdRequest) => {
    const typeLabel = (
      PRICE_REQUEST_TYPE_META[createdRequest?.requestType]?.label || 'thay đổi'
    ).toLowerCase();
    setToast({
      type: 'success',
      message: `Đã gửi đề xuất ${typeLabel} quy tắc giá thành công! Yêu cầu đang chờ Giám đốc phê duyệt.`,
    });
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const pageLabel = meta.totalPages === 0 ? '0 / 0' : `${meta.page + 1} / ${meta.totalPages}`;

  return (
    <section className="space-y-5">
      {/* Toast thông báo */}
      {toast.message && (
        <div
          className={`fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-[var(--shadow-2)] transition-all ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
            <BadgeDollarSign aria-hidden="true" className="h-4 w-4" />
            Giá đã được Giám đốc phê duyệt
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">Quy tắc giá</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Xem các quy tắc giá đang áp dụng. Quản lý có thể gửi đề xuất thêm mới, cập nhật hoặc ngừng áp dụng để Giám đốc phê duyệt.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={() => openModal('CREATE')}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> Gửi đề xuất giá
          </button>
          <button
            type="button"
            onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" /> Làm mới
          </button>
        </div>
      </header>

      <form
        onSubmit={(event) => { event.preventDefault(); setPage(0); }}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="text-xs font-semibold text-gray-600">
          Tên phòng
          <select
            value={filters.roomId}
            onChange={(event) => updateFilter('roomId', event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900"
          >
            <option value="">Tất cả phòng</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Loại quy tắc
          <select value={filters.ruleType} onChange={(event) => updateFilter('ruleType', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900">
            <option value="">Tất cả</option>
            <option value="BASE">{PRICE_RULE_TYPE_META.BASE.label}</option>
            <option value="ADJUSTMENT">{PRICE_RULE_TYPE_META.ADJUSTMENT.label}</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Trạng thái
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900">
            <option value="">Tất cả</option>
            <option value="ACTIVE">{PRICE_RULE_STATUS_META.ACTIVE.label}</option>
            <option value="INACTIVE">{PRICE_RULE_STATUS_META.INACTIVE.label}</option>
            <option value="EXPIRED">{PRICE_RULE_STATUS_META.EXPIRED.label}</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Từ ngày
          <input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal text-gray-900" />
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Đến ngày
          <input type="date" min={filters.fromDate || undefined} value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal text-gray-900" />
        </label>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <BadgeDollarSign aria-hidden="true" className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="mt-3 font-semibold text-gray-900">Không có quy tắc giá phù hợp</h3>
          <p className="mt-1 text-sm text-gray-500">Thử thay đổi bộ lọc hoặc kiểm tra lại các đề xuất giá đã được duyệt.</p>
        </div>
      )}

      {(loading || items.length > 0) && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Quy tắc</th>
                  <th className="px-4 py-3">Phạm vi</th>
                  <th className="px-4 py-3">Mức giá áp dụng</th>
                  <th className="px-4 py-3">Ngày áp dụng</th>
                  <th className="px-4 py-3">Thứ trong tuần</th>
                  <th className="px-4 py-3">Ưu tiên</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Đề xuất thay đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && items.length === 0 && (
                  <tr><td colSpan="8" className="px-4 py-10 text-center text-gray-500">Đang tải quy tắc giá…</td></tr>
                )}
                {items.map((rule) => {
                  const ruleTypeMeta =
                    PRICE_RULE_TYPE_META[rule.ruleType] || PRICE_RULE_TYPE_META.ADJUSTMENT;
                  const ruleStatusMeta =
                    PRICE_RULE_STATUS_META[rule.status] || PRICE_RULE_STATUS_META.INACTIVE;
                  return (
                  <tr key={rule.id} className="align-top hover:bg-gray-50/70">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{rule.name}</div>
                      <span
                        className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${ruleTypeMeta.badgeClass}`}
                      >
                        {ruleTypeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{rule.roomId == null ? 'Toàn cơ sở' : (roomsMap[rule.roomId] || `Phòng #${rule.roomId}`)}</td>
                    <td className="px-4 py-4 font-medium text-gray-900 tabular-nums">{formatPriceRuleValue(rule)}</td>
                    <td className="px-4 py-4 text-gray-700 tabular-nums">{dateRange(rule)}</td>
                    <td className="px-4 py-4 text-gray-700">{formatWeekdaysShort(rule.weekdays, 'Cả tuần')}</td>
                    <td className="px-4 py-4 text-gray-700 tabular-nums">{rule.priority ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ruleStatusMeta.badgeClass}`}>
                        {ruleStatusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {rule.status === 'ACTIVE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openModal('UPDATE', rule)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors shadow-2xs"
                            title="Gửi đề xuất cập nhật quy tắc giá này"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-gray-500" />
                            Cập nhật
                          </button>
                          {rule.ruleType !== 'BASE' && (
                            <button
                              type="button"
                              onClick={() => openModal('DEACTIVATE', rule)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                              title="Gửi đề xuất ngừng áp dụng quy tắc giá này"
                            >
                              <PowerOff className="h-3.5 w-3.5 text-rose-600" />
                              Ngừng áp dụng
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <span>{meta.totalElements} quy tắc • Trang {pageLabel}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => changePage((current) => Math.max(0, current - 1))} disabled={loading || page <= 0} aria-label="Trang trước" className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 disabled:opacity-40">
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => changePage((current) => current + 1)} disabled={loading || meta.totalPages === 0 || page >= meta.totalPages - 1} aria-label="Trang sau" className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 disabled:opacity-40">
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </div>
      )}

      <PriceRuleChangeRequestsPanel reloadKey={reloadKey} roomsMap={roomsMap} />

      {/* Modal đề xuất thay đổi giá */}
      {modalOpen && (
        <PriceRuleChangeRequestModal
          key={`${modalMode}-${selectedRule?.id || 'new'}-${modalSession}`}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleRequestSuccess}
          rooms={rooms}
          activeRules={activeRules}
          initialMode={modalMode}
          initialTargetRule={selectedRule}
        />
      )}
    </section>
  );
}
