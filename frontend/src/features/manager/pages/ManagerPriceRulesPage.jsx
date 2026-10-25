import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BadgeDollarSign, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getManagerPriceRulesApi, getManagerRoomsApi } from '../api';
import { formatVnd } from '../../../lib/format';

function describeRule(rule) {
  if (rule.ruleType === 'BASE') {
    return rule.basePrice == null ? 'Chưa có giá' : `${formatVnd(rule.basePrice)} / đêm`;
  }
  if (rule.adjustType === 'PERCENT') {
    const value = Number(rule.adjustValue || 0);
    return `${value > 0 ? '+' : ''}${value}% so với giá cơ bản`;
  }
  return `Giá cuối ${formatVnd(rule.adjustValue || 0)} / đêm`;
}

function dateRange(rule) {
  if (!rule.startDate && !rule.endDate) return 'Không giới hạn ngày';
  return `${rule.startDate || 'Không giới hạn'} – ${rule.endDate || 'Không giới hạn'}`;
}

const WEEKDAY_NAMES = {
  // Chuẩn 3 ký tự (SET trong MySQL: 'MON','TUE','WED','THU','FRI','SAT','SUN')
  MON: 'Thứ 2',
  TUE: 'Thứ 3',
  WED: 'Thứ 4',
  THU: 'Thứ 5',
  FRI: 'Thứ 6',
  SAT: 'Thứ 7',
  SUN: 'Chủ Nhật',
  // Chuẩn tên tiếng Anh đầy đủ
  MONDAY: 'Thứ 2',
  TUESDAY: 'Thứ 3',
  WEDNESDAY: 'Thứ 4',
  THURSDAY: 'Thứ 5',
  FRIDAY: 'Thứ 6',
  SATURDAY: 'Thứ 7',
  SUNDAY: 'Chủ Nhật',
};

function formatWeekdays(weekdays) {
  if (!weekdays || (Array.isArray(weekdays) && weekdays.length === 0)) return 'Mọi ngày';
  const list = Array.isArray(weekdays) ? weekdays : String(weekdays).split(',');
  const formatted = list
    .map((day) => String(day).trim())
    .filter(Boolean)
    .map((day) => WEEKDAY_NAMES[day.toUpperCase()] || day);
  return formatted.length > 0 ? formatted.join(', ') : 'Mọi ngày';
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

  const pageLabel = meta.totalPages === 0 ? '0 / 0' : `${meta.page + 1} / ${meta.totalPages}`;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
            <BadgeDollarSign aria-hidden="true" className="h-4 w-4" />
            Giá đã được Giám đốc phê duyệt
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">Quy tắc giá</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Chỉ xem quy tắc đang áp dụng hoặc đã được duyệt. Manager gửi đề xuất thay đổi ở API riêng.</p>
        </div>
        <button
          type="button"
          onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" /> Làm mới
        </button>
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
            <option value="BASE">Giá cơ bản</option>
            <option value="ADJUSTMENT">Điều chỉnh giá</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Trạng thái
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900">
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="INACTIVE">Ngừng áp dụng</option>
            <option value="EXPIRED">Đã hết hạn</option>
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
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Quy tắc</th>
                  <th className="px-4 py-3">Phạm vi</th>
                  <th className="px-4 py-3">Giá / điều chỉnh</th>
                  <th className="px-4 py-3">Ngày áp dụng</th>
                  <th className="px-4 py-3">Thứ trong tuần</th>
                  <th className="px-4 py-3">Ưu tiên</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && items.length === 0 && (
                  <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">Đang tải quy tắc giá…</td></tr>
                )}
                {items.map((rule) => (
                  <tr key={rule.id} className="align-top hover:bg-gray-50/70">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{rule.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{rule.ruleType === 'BASE' ? 'Giá cơ bản' : 'Điều chỉnh'}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{rule.roomId == null ? 'Toàn homestay' : (roomsMap[rule.roomId] || `Phòng #${rule.roomId}`)}</td>
                    <td className="px-4 py-4 font-medium text-gray-900">{describeRule(rule)}</td>
                    <td className="px-4 py-4 text-gray-700">{dateRange(rule)}</td>
                    <td className="px-4 py-4 text-gray-700">{formatWeekdays(rule.weekdays)}</td>
                    <td className="px-4 py-4 text-gray-700">{rule.priority ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${rule.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : rule.status === 'EXPIRED' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {rule.status === 'ACTIVE' ? 'Đang áp dụng' : rule.status === 'EXPIRED' ? 'Đã hết hạn' : 'Ngừng áp dụng'}
                      </span>
                    </td>
                  </tr>
                ))}
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
    </section>
  );
}
