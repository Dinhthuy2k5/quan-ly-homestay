import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  UserCog,
  UserMinus,
  UserX,
  X,
} from 'lucide-react';
import { assignHomestayManagerApi, getDirectorManagersApi } from '../api';
import { getErrorMessage } from '../../../lib/errors';

/**
 * Hộp thoại gán, thay thế hoặc gỡ Manager phụ trách cơ sở homestay (API-DIR-HS-03).
 * - Gán / thay thế: PUT /api/v1/director/homestays/{homestayId}/manager { managerId }
 * - Gỡ phân công: PUT /api/v1/director/homestays/{homestayId}/manager { managerId: null }
 */
export function HomestayManagerModal({ homestay, onClose, onUpdated }) {
  const currentManager = homestay?.manager || null;

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [confirmUnassign, setConfirmUnassign] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchManagers() {
      setLoading(true);
      setLoadError('');
      try {
        const list = await getDirectorManagersApi({ signal });
        if (!signal.aborted) {
          setManagers(list);
        }
      } catch (err) {
        if (!signal.aborted) {
          setLoadError(getErrorMessage(err) || 'Không thể tải danh sách quản lý.');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchManagers();
    return () => controller.abort();
  }, [reloadTick]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const filteredManagers = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return managers.filter((item) => {
      if (onlyUnassigned && item.homestayId !== null) {
        return false;
      }
      if (!kw) return true;
      return (
        (item.fullName || '').toLowerCase().includes(kw) ||
        (item.email || '').toLowerCase().includes(kw) ||
        (item.phone || '').toLowerCase().includes(kw) ||
        (item.homestayName || '').toLowerCase().includes(kw)
      );
    });
  }, [managers, searchKeyword, onlyUnassigned]);

  const selectedManager = useMemo(
    () => managers.find((item) => item.id === selectedManagerId) || null,
    [managers, selectedManagerId]
  );

  if (!homestay) return null;

  const isReplacing = Boolean(
    currentManager && selectedManager && selectedManager.id !== currentManager.id
  );
  const canSubmitAssign = Boolean(
    selectedManager &&
      selectedManager.status === 'ACTIVE' &&
      selectedManager.homestayId === null &&
      selectedManager.id !== currentManager?.id &&
      !submitting
  );

  const handleAssignSubmit = async () => {
    if (!canSubmitAssign) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await assignHomestayManagerApi(homestay.id, selectedManager.id);
      onUpdated?.(result, isReplacing ? 'replace' : 'assign', homestay);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignConfirm = async () => {
    if (!currentManager || submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await assignHomestayManagerApi(homestay.id, null);
      onUpdated?.(result, 'unassign', homestay);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,60)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-assign-manager-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-2)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <UserCog className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="director-assign-manager-title" className="truncate text-lg font-bold text-[var(--color-ink)]">
                Phân công Quản lý cơ sở
              </h2>
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                #{homestay.id} · {homestay.name} ({homestay.province})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Hiện trạng quản lý */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Quản lý hiện tại của cơ sở
              </span>

              {currentManager && !confirmUnassign && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmUnassign(true);
                    setSubmitError('');
                  }}
                  disabled={submitting}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Gỡ quản lý</span>
                </button>
              )}
            </div>

            {currentManager ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-bold text-[var(--color-ink)]">
                    {currentManager.fullName}
                  </span>
                  {currentManager.status === 'LOCKED' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      <span>Tài khoản đang bị khóa</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-body)]">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                    <span>{currentManager.email}</span>
                  </span>
                  {currentManager.phone && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Phone className="h-3.5 w-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                      <span>{currentManager.phone}</span>
                    </span>
                  )}
                </div>

                {confirmUnassign && (
                  <div className="rounded-xl border border-rose-200 bg-white p-3 space-y-2.5">
                    <p className="text-xs leading-relaxed text-rose-800">
                      Xác nhận gỡ <strong>{currentManager.fullName}</strong> khỏi cơ sở{' '}
                      <strong>{homestay.name}</strong>? Quyền truy cập vận hành cơ sở của tài khoản này sẽ bị thu hồi ngay lập tức.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmUnassign(false)}
                        disabled={submitting}
                        className="min-h-8 rounded-lg border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleUnassignConfirm}
                        disabled={submitting}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                      >
                        <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{submitting ? 'Đang gỡ...' : 'Xác nhận gỡ'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <UserX className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Cơ sở này hiện chưa có Quản lý phụ trách. Chọn một tài khoản bên dưới để phân công.</span>
              </div>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-3.5 text-sm text-[var(--color-danger)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Bộ lọc danh sách Manager */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative flex-1">
                <span className="sr-only">Tìm kiếm tài khoản quản lý</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo tên, email, SĐT hoặc cơ sở..."
                  className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-body)] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  onChange={(e) => setOnlyUnassigned(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border-strong)] accent-[var(--color-primary)]"
                />
                <span>Chỉ hiện chưa phân công</span>
              </label>
            </div>

            {loadError ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-3.5 text-xs text-[var(--color-danger)]">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {loadError}
                </span>
                <button
                  type="button"
                  onClick={() => setReloadTick((v) => v + 1)}
                  className="inline-flex items-center gap-1 font-semibold underline cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thử lại</span>
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
                ))}
              </div>
            ) : filteredManagers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 px-4 py-8 text-center text-xs text-[var(--color-muted)]">
                {managers.length === 0
                  ? 'Hệ thống chưa có tài khoản Quản lý (MANAGER) nào. Admin cần tạo tài khoản nội bộ trước.'
                  : 'Không tìm thấy tài khoản Quản lý phù hợp bộ lọc.'}
              </div>
            ) : (
              <ul
                className="max-h-72 space-y-2 overflow-y-auto pr-1"
                role="radiogroup"
                aria-label="Danh sách tài khoản Quản lý"
              >
                {filteredManagers.map((item) => {
                  const isCurrentForThisHs = item.homestayId === homestay.id;
                  const isAssignedElsewhere = item.homestayId !== null && !isCurrentForThisHs;
                  const isLocked = item.status !== 'ACTIVE';
                  const selectable = !isCurrentForThisHs && !isAssignedElsewhere && !isLocked;
                  const isSelected = selectedManagerId === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={!selectable || submitting}
                        onClick={() => {
                          if (!selectable) return;
                          setSelectedManagerId(item.id);
                          setConfirmUnassign(false);
                          setSubmitError('');
                        }}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 ring-1 ring-[var(--color-primary)]'
                            : selectable
                              ? 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-soft)]/50 cursor-pointer'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-soft)]/60 opacity-75 cursor-not-allowed'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[var(--color-ink)]">
                              {item.fullName}
                            </span>

                            {isCurrentForThisHs ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                Đang phụ trách cơ sở này
                              </span>
                            ) : isLocked ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                <span>Đã khóa</span>
                              </span>
                            ) : isAssignedElsewhere ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                <Building2 className="h-3 w-3" aria-hidden="true" />
                                <span>Đang quản lý: {item.homestayName || `#${item.homestayId}`}</span>
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                Sẵn sàng phân công
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted)]">
                            <span>{item.email}</span>
                            {item.phone && <span className="font-mono">{item.phone}</span>}
                          </div>

                          {isAssignedElsewhere && (
                            <p className="text-[11px] text-[var(--color-muted)]">
                              Mỗi quản lý chỉ phụ trách 1 cơ sở — hãy gỡ phân công ở cơ sở kia trước nếu muốn điều chuyển.
                            </p>
                          )}
                        </div>

                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                              : 'border-[var(--color-border-strong)] bg-white'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Ghi chú khi thay thế trực tiếp M1 -> M2 */}
          {isReplacing && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>
                Khi xác nhận, hệ thống sẽ tự động gỡ <strong>{currentManager.fullName}</strong> và gán{' '}
                <strong>{selectedManager.fullName}</strong> phụ trách <strong>{homestay.name}</strong> trong cùng một giao dịch.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleAssignSubmit}
            disabled={!canSubmitAssign}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {submitting
                ? 'Đang lưu...'
                : isReplacing
                  ? 'Thay đổi quản lý'
                  : 'Xác nhận phân công'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomestayManagerModal;
