import { useState } from 'react';
import { Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import {
  createManagerExpenseCategoryApi,
  deleteManagerExpenseCategoryApi,
  updateManagerExpenseCategoryApi,
} from '../api';
import { getErrorMessage } from '../../../lib/errors';

const INPUT_CLASS = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]';

export default function ManagerExpenseCategoriesDialog({ categories, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setName('');
    setEditingId(null);
    setError('');
  };

  const beginEdit = (category) => {
    setEditingId(category.id);
    setName(category.name);
    setError('');
    setSuccess('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError('Vui lòng nhập tên danh mục.');
    if (trimmedName.length > 100) return setError('Tên danh mục tối đa 100 ký tự.');
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = editingId
        ? await updateManagerExpenseCategoryApi(editingId, trimmedName)
        : await createManagerExpenseCategoryApi(trimmedName);
      onChanged((current) => {
        const next = editingId
          ? current.map((category) => category.id === editingId ? saved : category)
          : [...current, saved];
        return next.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      });
      setSuccess(editingId ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục mới.');
      resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError) || 'Không thể lưu danh mục.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Xóa danh mục “${category.name}”? Chỉ danh mục chưa được khoản chi nào sử dụng mới xóa được.`)) return;
    setDeletingId(category.id);
    setError('');
    setSuccess('');
    try {
      await deleteManagerExpenseCategoryApi(category.id);
      onChanged((current) => current.filter((item) => item.id !== category.id));
      if (editingId === category.id) resetForm();
      setSuccess('Đã xóa danh mục.');
    } catch (requestError) {
      setError(getErrorMessage(requestError) || 'Không thể xóa danh mục. Nếu đã được khoản chi sử dụng, danh mục cần được giữ lại.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="expense-categories-title" className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Receipt className="h-5 w-5" /></span>
            <div>
              <h2 id="expense-categories-title" className="text-lg font-bold text-[var(--color-ink)]">Danh mục chi phí</h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">Danh mục đang được khoản chi sử dụng không thể xóa.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-muted)] hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <form onSubmit={submit} className="h-fit rounded-xl border border-[var(--color-border)] bg-gray-50/70 p-4">
            <h3 className="font-bold text-[var(--color-ink)]">{editingId ? 'Đổi tên danh mục' : 'Thêm danh mục'}</h3>
            <label htmlFor="expense-category-name" className="mt-4 block text-sm font-semibold text-[var(--color-body)]">Tên danh mục <span className="text-rose-600">*</span></label>
            <input id="expense-category-name" className={`${INPUT_CLASS} mt-1.5`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Ví dụ: Điện nước" autoFocus />
            {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
            {success && <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm danh mục'}</button>
              {editingId && <button type="button" onClick={resetForm} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-[var(--color-body)] hover:bg-gray-100">Hủy sửa</button>}
            </div>
          </form>

          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-bold text-[var(--color-ink)]">{categories.length} danh mục</h3>
            {categories.length ? (
              <ul className="max-h-[min(55vh,440px)] divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)]">
                {categories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <span className="min-w-0 break-words text-sm font-medium text-[var(--color-ink)]">{category.name}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => beginEdit(category)} aria-label={`Sửa ${category.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-body)] hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => remove(category)} disabled={deletingId === category.id} aria-label={`Xóa ${category.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center text-sm text-[var(--color-muted)]">Chưa có danh mục chi phí.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
