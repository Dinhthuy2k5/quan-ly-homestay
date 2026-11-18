import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Plus,
  Tag,
  Tags,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  createManagerServiceCategoryApi,
  deleteManagerServiceCategoryApi,
  getManagerServiceCategoriesApi,
  updateManagerServiceCategoryApi,
} from '../api';
import { getErrorMessage } from '../../../lib/errors';

// ─── Inline validation ───────────────────────────────────────────────────────
function validateName(name) {
  if (!name || !name.trim()) return 'Tên danh mục không được để trống';
  if (name.trim().length > 100) return 'Tên danh mục không được vượt quá 100 ký tự';
  return '';
}

// ─── CategoryFormInline ───────────────────────────────────────────────────────
function CategoryFormInline({ initialName = '', onSave, onCancel, autoFocus = true }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateName(name);
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      await onSave(name.trim());
    } catch (apiErr) {
      setError(getErrorMessage(apiErr));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <div className="flex-1">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          maxLength={100}
          placeholder="Tên danh mục (vd: Ăn uống, Giải trí...)"
          className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)] transition-colors ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
          }`}
          disabled={submitting}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shrink-0"
      >
        {submitting ? 'Đang lưu…' : 'Lưu'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
      >
        Hủy
      </button>
    </form>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ category, onConfirm, onCancel, submitting, error }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-cat-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100">
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h4 id="delete-cat-title" className="text-base font-bold text-[var(--color-ink)]">
              Xóa danh mục dịch vụ?
            </h4>
            <p className="mt-1 text-sm text-[var(--color-body)]">
              Danh mục{' '}
              <strong className="text-[var(--color-ink)]">"{category.name}"</strong>{' '}
              sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
          >
            Không, giữ lại
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Đang xóa…' : 'Xóa danh mục'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManagerServiceCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Thêm mới inline
  const [addingNew, setAddingNew] = useState(false);

  // Sửa inline theo id
  const [editingId, setEditingId] = useState(null);

  // Xóa confirm modal
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Success toast
  const [toast, setToast] = useState('');

  // Load categories
  const loadCategories = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getManagerServiceCategoriesApi();
      setCategories(data || []);
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'Không thể tải danh mục dịch vụ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Toast tự ẩn sau 3.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateSave = async (name) => {
    await createManagerServiceCategoryApi(name);
    setAddingNew(false);
    setToast(`Đã tạo danh mục "${name}"`);
    await loadCategories();
  };

  const handleUpdateSave = async (name) => {
    await updateManagerServiceCategoryApi(editingId, name);
    const oldCat = categories.find((c) => c.id === editingId);
    setEditingId(null);
    setToast(`Đã đổi tên danh mục thành "${name}"`);
    await loadCategories();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await deleteManagerServiceCategoryApi(deletingCategory.id);
      const name = deletingCategory.name;
      setDeletingCategory(null);
      setDeleteSubmitting(false);
      setToast(`Đã xóa danh mục "${name}"`);
      await loadCategories();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleteSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
            <Link to="/manager/services" className="hover:text-[var(--color-primary)] transition-colors">
              Dịch vụ
            </Link>
            <span>/</span>
            <span className="text-[var(--color-primary)]">Danh mục</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Tags className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Danh mục dịch vụ
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Phân loại dịch vụ theo nhóm để dễ quản lý và tra cứu.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/manager/services"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Về dịch vụ
          </Link>
          <button
            type="button"
            onClick={() => { setAddingNew(true); setEditingId(null); }}
            disabled={addingNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Thêm danh mục
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast('')}
            className="ml-3 text-emerald-600 hover:text-emerald-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-muted)]">Tổng danh mục</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Tags className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{categories.length}</span>
            <span className="text-xs text-[var(--color-muted)]">danh mục</span>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Danh sách danh mục
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            {categories.length} danh mục · sắp xếp A → Z
          </span>
        </div>

        {/* Add new inline row */}
        {addingNew && (
          <div className="border-b border-[var(--color-border)] px-5 py-3.5 bg-sky-50/60">
            <CategoryFormInline
              initialName=""
              onSave={handleCreateSave}
              onCancel={() => setAddingNew(false)}
            />
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="px-5 py-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">
            {loadError}{' '}
            <button
              type="button"
              onClick={loadCategories}
              className="font-semibold underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="divide-y divide-[var(--color-border)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-gray-200" />
                  <div className="h-4 w-40 rounded bg-gray-200" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-14 rounded-lg bg-gray-200" />
                  <div className="h-7 w-14 rounded-lg bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !loadError && categories.length === 0 && !addingNew && (
          <div className="py-16 text-center text-sm text-[var(--color-muted)]">
            <Tags className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-[var(--color-ink)]">Chưa có danh mục nào</p>
            <p className="mt-1">Nhấn "Thêm danh mục" để bắt đầu phân loại dịch vụ.</p>
          </div>
        )}

        {/* Category list */}
        {!loading && categories.length > 0 && (
          <ul className="divide-y divide-[var(--color-border)]">
            {categories.map((cat) => (
              <li key={cat.id}>
                {/* Edit mode */}
                {editingId === cat.id ? (
                  <div className="px-5 py-3.5 bg-amber-50/50">
                    <CategoryFormInline
                      initialName={cat.name}
                      onSave={handleUpdateSave}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[var(--color-surface-soft)] transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium text-sm text-[var(--color-ink)] truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-[var(--color-muted)] font-mono shrink-0">
                        #{cat.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setEditingId(cat.id); setAddingNew(false); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shadow-sm"
                      >
                        <Pencil className="h-3 w-3" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeletingCategory(cat); setDeleteError(''); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shadow-sm"
                      >
                        <Trash2 className="h-3 w-3" />
                        Xóa
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete modal */}
      {deletingCategory && (
        <DeleteConfirmModal
          category={deletingCategory}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeletingCategory(null); setDeleteError(''); setDeleteSubmitting(false); }}
          submitting={deleteSubmitting}
          error={deleteError}
        />
      )}
    </div>
  );
}
