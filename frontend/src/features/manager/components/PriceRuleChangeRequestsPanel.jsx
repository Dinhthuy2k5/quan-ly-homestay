import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getManagerPriceRuleChangeRequestsApi } from '../api';
import { formatDateTime } from '../../../lib/format';
import {
  PRICE_REQUEST_STATUS_META,
  PRICE_REQUEST_TYPE_META,
  PRICE_RULE_TYPE_META,
  formatPriceRuleValue,
} from '../../../lib/pricing';

function buildProposalMeta(request, roomsMap) {
  const rule = request.proposedRule;
  const isBase = rule?.ruleType === 'BASE';
  const ruleTypeMeta = isBase ? PRICE_RULE_TYPE_META.BASE : PRICE_RULE_TYPE_META.ADJUSTMENT;

  if (request.requestType === 'DEACTIVATE') {
    const scope = rule?.roomId
      ? roomsMap[rule.roomId] || `Phòng #${rule.roomId}`
      : 'Toàn cơ sở';
    return {
      ruleTypeMeta,
      title: rule?.name || `Quy tắc #${request.targetRuleId}`,
      detail: `${scope} • Ngừng áp dụng quy tắc`,
    };
  }

  if (!rule || typeof rule !== 'object') {
    return {
      ruleTypeMeta: null,
      title: 'Không có thông tin đề xuất',
      detail: '',
    };
  }

  const scope = rule.roomId ? roomsMap[rule.roomId] || `Phòng #${rule.roomId}` : 'Toàn cơ sở';
  const title = rule.name || ruleTypeMeta.label;
  const value = formatPriceRuleValue(rule);
  return {
    ruleTypeMeta,
    title,
    detail: value ? `${scope} • ${value}` : scope,
  };
}

export default function PriceRuleChangeRequestsPanel({ reloadKey = 0, roomsMap = {} }) {
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
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Theo dõi trạng thái đề xuất thêm mới, cập nhật hoặc ngừng áp dụng gửi Giám đốc phê duyệt.
          </p>
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
            <option value="PENDING_APPROVAL">{PRICE_REQUEST_STATUS_META.PENDING_APPROVAL.label}</option>
            <option value="APPROVED">{PRICE_REQUEST_STATUS_META.APPROVED.label}</option>
            <option value="REJECTED">{PRICE_REQUEST_STATUS_META.REJECTED.label}</option>
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
              ) : items.map((request) => {
                const typeMeta = PRICE_REQUEST_TYPE_META[request.requestType] || {
                  label: request.requestType,
                  badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
                };
                const statusMeta = PRICE_REQUEST_STATUS_META[request.status] || {
                  label: request.status,
                  badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
                };
                const proposal = buildProposalMeta(request, roomsMap);

                return (
                  <tr key={request.id} className="align-top hover:bg-gray-50/70">
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="font-mono text-xs font-bold text-gray-900">#{request.id}</span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeMeta.badgeClass}`}
                        >
                          {typeMeta.label}
                        </span>
                        {request.targetRuleId && (
                          <span className="text-xs text-gray-500">Quy tắc gốc #{request.targetRuleId}</span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[380px] px-4 py-4 text-gray-700">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {proposal.ruleTypeMeta && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${proposal.ruleTypeMeta.badgeClass}`}
                          >
                            {proposal.ruleTypeMeta.label}
                          </span>
                        )}
                        <span className="font-semibold text-gray-900">{proposal.title}</span>
                      </div>
                      {proposal.detail && (
                        <p className="mt-1 text-xs text-gray-600 tabular-nums">{proposal.detail}</p>
                      )}
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <p className="mt-1.5 text-xs text-rose-700">Lý do từ chối: {request.rejectionReason}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600 tabular-nums">
                      {formatDateTime(request.requestedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
