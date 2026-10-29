import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getManagerPriceRuleChangeRequestsApi } from '../api';
import { formatDateTime, formatVnd } from '../../../lib/format';

const REQUEST_TYPE_LABELS = {
  CREATE: 'Thêm mới quy tắc giá',
  UPDATE: 'Sửa quy tắc giá',
  DEACTIVATE: 'Ngừng quy tắc giá',
};

const STATUS_LABELS = {
  PENDING_APPROVAL: 'Chờ Giám đốc duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

function describeProposal(request) {
  if (request.requestType === 'DEACTIVATE') {
    return request.proposedRule?.name || `Quy tắc #${request.targetRuleId}`;
  }

  const rule = request.proposedRule;
  if (!rule || typeof rule !== 'object') return 'Không có thông tin đề xuất';

  const scope = rule.roomId ? `Phòng #${rule.roomId}` : 'Toàn homestay';
  if (rule.ruleType === 'BASE') {
    return `${rule.name || 'Giá cơ bản'} • ${scope} • ${formatVnd(rule.basePrice)} / đêm`;
  }

  const value = rule.adjustType === 'PERCENT'
    ? `${Number(rule.adjustValue) > 0 ? '+' : ''}${rule.adjustValue}%`
    : `${formatVnd(rule.adjustValue)} / đêm`;
  return `${rule.name || 'Điều chỉnh giá'} • ${scope} • ${value}`;
}

function statusClass(status) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-800';
}

export default function PriceRuleChangeRequestsPanel({ reloadKey = 0 }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    getManagerPriceRuleChangeRequestsApi({ status: status || undefined, page, size: 10 })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setMeta(result.meta);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setItems([]);
        setMeta({ page: 0, size: 10, totalElements: 0, totalPages: 0 });
        setError(requestError.response?.data?.error?.message || 'Không thể tải lịch sử yêu cầu thay đổi giá.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [status, page, reloadKey, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const pageLabel = meta.totalPages === 0 ? '0 / 0' : `${meta.page + 1} / ${meta.totalPages}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-ink)]">Yêu cầu thay đổi giá</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Theo dõi trạng thái đề xuất gửi Giám đốc phê duyệt.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="price-request-status-filter" className="sr-only">Lọc trạng thái yêu cầu</label>
          <select
            id="price-request-status-filter"
            value={status}
            onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(0); }}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" /> Làm mới
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex items-start gap-2.5 px-5 py-8 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Yêu cầu</th>
                <th className="px-4 py-3">Nội dung đề xuất</th>
                <th className="px-4 py-3">Thời gian gửi</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && items.length === 0 ? (
                <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500">Đang tải yêu cầu…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500">Chưa có yêu cầu thay đổi giá nào.</td></tr>
              ) : items.map((request) => (
                <tr key={request.id} className="align-top hover:bg-gray-50/70">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">{REQUEST_TYPE_LABELS[request.requestType] || request.requestType}</p>
                    <p className="mt-1 text-xs text-gray-500">Mã yêu cầu #{request.id}</p>
                    {request.targetRuleId && <p className="mt-1 text-xs text-gray-500">Quy tắc gốc #{request.targetRuleId}</p>}
                  </td>
                  <td className="max-w-[360px] px-4 py-4 text-gray-700">
                    <p>{describeProposal(request)}</p>
                    {request.status === 'REJECTED' && request.rejectionReason && (
                      <p className="mt-1 text-xs text-rose-700">Lý do từ chối: {request.rejectionReason}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-600">{formatDateTime(request.requestedAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                      {STATUS_LABELS[request.status] || request.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
        <span>{meta.totalElements} yêu cầu • Trang {pageLabel}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.max(0, current - 1)); }} disabled={loading || page <= 0} aria-label="Trang trước" className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 disabled:opacity-40">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { setLoading(true); setPage((current) => current + 1); }} disabled={loading || meta.totalPages === 0 || page >= meta.totalPages - 1} aria-label="Trang sau" className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 disabled:opacity-40">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  );
}
