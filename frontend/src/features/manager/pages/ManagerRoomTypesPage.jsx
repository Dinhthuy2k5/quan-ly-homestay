import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Edit3, LoaderCircle, Plus, Tags, Trash2, X } from 'lucide-react';
import {
  createManagerRoomTypeApi,
  deleteManagerRoomTypeApi,
  getManagerRoomTypesApi,
  updateManagerRoomTypeApi,
} from '../api';

function requestMessage(error) {
  const code = error.response?.data?.error?.code;
  if (code === 'ROOM_TYPE_NAME_EXISTS') return 'Tên loại phòng này đã được sử dụng.';
  if (code === 'ROOM_TYPE_IN_USE') return 'Không thể xóa loại phòng đang được phòng sử dụng.';
  return error.response?.data?.error?.message || 'Không thể hoàn tất thao tác.';
}

export default function ManagerRoomTypesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState(null);
  const [actionError, setActionError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadRoomTypes = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;
    getManagerRoomTypesApi()
      .then((data) => {
        if (!active) return;
        setItems(data || []);
        setLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(requestMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setActionError('');
    setModalOpen(true);
  };

  const openEdit = (roomType) => {
    setEditing(roomType);
    setForm({ name: roomType.name || '', description: roomType.description || '' });
    setActionError('');
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = { name: form.name.trim(), description: form.description.trim() || null };
    if (!payload.name) {
      setActionError('Tên loại phòng không được để trống.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const saved = editing
        ? await updateManagerRoomTypeApi(editing.id, payload)
        : await createManagerRoomTypeApi(payload);
      setItems((current) => editing
        ? current.map((item) => item.id === saved.id ? saved : item).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        : [...current, saved].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      setModalOpen(false);
    } catch (error) {
      setActionError(requestMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = (roomType) => {
    setActionError('');
    setConfirmDeleteType(roomType);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteType) return;
    setDeletingId(confirmDeleteType.id);
    setActionError('');
    try {
      await deleteManagerRoomTypeApi(confirmDeleteType.id);
      setItems((current) => current.filter((item) => item.id !== confirmDeleteType.id));
      setConfirmDeleteType(null);
    } catch (error) {
      setActionError(requestMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-muted)]">Cấu hình danh mục dùng khi tạo và cập nhật phòng.</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">Loại phòng</h2>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">
          <Plus aria-hidden="true" className="h-4 w-4" /> Thêm loại phòng
        </button>
      </header>

      {actionError && <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{actionError}</div>}
      {loading ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-10 text-center text-sm text-[var(--color-muted)]">Đang tải loại phòng…</div>
      ) : loadError ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-white p-6 text-sm text-[var(--color-danger)]">
          <p>{loadError}</p><button type="button" onClick={loadRoomTypes} className="mt-3 font-semibold underline">Tải lại</button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white px-6 py-12 text-center">
          <Tags aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
          <p className="mt-3 font-semibold text-[var(--color-ink)]">Chưa có loại phòng</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Tạo danh mục đầu tiên để phân loại phòng của homestay.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-[var(--color-surface-soft)] text-xs font-semibold uppercase text-[var(--color-muted)]">
                <tr><th scope="col" className="px-5 py-3">Tên loại phòng</th><th scope="col" className="px-5 py-3">Mô tả</th><th scope="col" className="px-5 py-3 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((roomType) => (
                  <tr key={roomType.id}>
                    <td className="px-5 py-4 font-semibold text-[var(--color-ink)]">{roomType.name}</td>
                    <td className="max-w-xl px-5 py-4 text-[var(--color-body)]">{roomType.description || <span className="text-[var(--color-muted)]">Chưa có mô tả</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(roomType)} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-surface-soft)]"><Edit3 aria-hidden="true" className="h-4 w-4" />Sửa</button>
                        <button type="button" disabled={deletingId === roomType.id} onClick={() => remove(roomType)} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" />Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }} className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/45 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="room-type-modal-title" className="w-full max-w-lg rounded-[var(--radius-lg)] bg-white p-6 shadow-[var(--shadow-2)]">
            <h3 id="room-type-modal-title" className="text-xl font-semibold text-[var(--color-ink)]">{editing ? 'Chỉnh sửa loại phòng' : 'Thêm loại phòng'}</h3>
            <form onSubmit={save} className="mt-5 space-y-4">
              <div>
                <label htmlFor="room-type-name" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">Tên loại phòng <span className="text-[var(--color-danger)]">*</span></label>
                <input id="room-type-name" required maxLength={100} autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]" />
              </div>
              <div>
                <label htmlFor="room-type-description" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">Mô tả</label>
                <textarea id="room-type-description" maxLength={255} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]" />
                <p className="mt-1 text-right text-xs text-[var(--color-muted)]">{form.description.length}/255</p>
              </div>
              {actionError && <p role="alert" className="rounded-[var(--radius-sm)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{actionError}</p>}
              <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]">Hủy</button>
                <button type="submit" disabled={saving} className="min-h-11 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu loại phòng'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal xác nhận xóa loại phòng */}
      {confirmDeleteType && (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingId) setConfirmDeleteType(null);
          }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-room-type-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-room-type-title" className="text-lg font-bold text-[var(--color-ink)]">
                  Xóa loại phòng?
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Bạn có chắc chắn muốn xóa loại phòng <strong className="text-[var(--color-ink)]">"{confirmDeleteType.name}"</strong>? Chỉ xóa được khi chưa có phòng nào sử dụng.
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setConfirmDeleteType(null)}
                aria-label="Đóng"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setConfirmDeleteType(null)}
                className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={confirmDelete}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {deletingId ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Đang xóa…</span>
                  </>
                ) : (
                  <span>Xác nhận xóa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
