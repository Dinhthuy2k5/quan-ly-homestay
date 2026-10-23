import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ImagePlus, LoaderCircle, Trash2, Upload, Video, X } from 'lucide-react';
import { fileUrl } from '../../../lib/api/client';
import { deleteManagerMediaApi, uploadManagerMediaApi } from '../api';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

function mediaErrorMessage(error) {
  const code = error.response?.data?.error?.code;
  if (code === 'FILE_TOO_LARGE') return 'Tệp vượt quá giới hạn 5 MB.';
  if (code === 'UNSUPPORTED_MEDIA_TYPE') return 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc video MP4.';
  return error.response?.data?.error?.message || 'Không thể thực hiện thao tác với tệp.';
}

export default function MediaManager({ ownerType, ownerId, media = [], onChange }) {
  const inputRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Modal xác nhận xóa
  const [deletingMedia, setDeletingMedia] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    if (!deletingMedia) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deleting) {
        setDeletingMedia(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingMedia, deleting]);

  const addFiles = (files) => {
    setError('');
    const accepted = [];
    for (const file of Array.from(files || [])) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError(`${file.name}: định dạng không được hỗ trợ.`);
      } else if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: tệp vượt quá giới hạn 5 MB.`);
      } else {
        accepted.push({ key: `${file.name}-${file.lastModified}-${Math.random()}`, file, caption: '' });
      }
    }
    if (accepted.length) setQueue((current) => [...current, ...accepted]);
  };

  const uploadQueue = async () => {
    if (!ownerId || !queue.length) return;
    setBusy(true);
    setError('');
    let nextMedia = [...media];
    for (const item of queue) {
      try {
        const uploaded = await uploadManagerMediaApi({
          ownerType,
          ownerId,
          file: item.file,
          caption: item.caption.trim() || undefined,
          sortOrder: nextMedia.length,
        });
        nextMedia = [...nextMedia, uploaded];
        onChange(nextMedia);
        setQueue((current) => current.filter(({ key }) => key !== item.key));
      } catch (uploadError) {
        setError(mediaErrorMessage(uploadError));
        break;
      }
    }
    setBusy(false);
  };

  const confirmDeleteMedia = async () => {
    if (!deletingMedia) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteManagerMediaApi(deletingMedia.id);
      onChange(media.filter((entry) => entry.id !== deletingMedia.id));
      setDeletingMedia(null);
    } catch (err) {
      setDeleteError(mediaErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)]" aria-labelledby={`media-heading-${ownerType}-${ownerId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`media-heading-${ownerType}-${ownerId}`} className="text-lg font-semibold text-[var(--color-ink)]">Ảnh và video</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">JPG, PNG, WEBP hoặc MP4 · tối đa 5 MB mỗi tệp. Ảnh đầu tiên được dùng làm ảnh bìa.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors">
          <ImagePlus aria-hidden="true" className="h-4 w-4" /> Chọn tệp
        </button>
      </div>

      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
        className={`mt-4 rounded-[var(--radius-md)] border border-dashed p-5 text-center text-sm ${dragging ? 'border-[var(--color-ink)] bg-[var(--color-surface-soft)]' : 'border-[var(--color-border-strong)] text-[var(--color-muted)]'}`}
      >
        Kéo ảnh/video vào đây hoặc chọn tệp từ thiết bị.
      </div>

      {error && <p role="alert" className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {queue.length > 0 && (
        <div className="mt-4 space-y-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Tệp chờ tải lên ({queue.length})</h3>
          {queue.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-body)]">{item.file.name}</span>
              <input aria-label={`Chú thích ${item.file.name}`} maxLength={255} value={item.caption} onChange={(event) => setQueue((current) => current.map((entry) => entry.key === item.key ? { ...entry, caption: event.target.value } : entry))} placeholder="Chú thích (không bắt buộc)" className="min-h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-sm sm:w-64" />
              <button type="button" disabled={busy} onClick={() => setQueue((current) => current.filter(({ key }) => key !== item.key))} className="min-h-10 px-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-danger)]">Bỏ</button>
            </div>
          ))}
          <button type="button" disabled={busy} onClick={uploadQueue} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition-colors">
            {busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Upload aria-hidden="true" className="h-4 w-4" />}
            {busy ? 'Đang tải lên…' : 'Tải lên'}
          </button>
        </div>
      )}

      {media.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--color-muted)]">Chưa có ảnh hoặc video.</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((item, index) => (
            <li key={item.id || item.url} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <div className="relative aspect-[4/3] bg-[var(--color-surface-soft)]">
                {item.mimeType?.startsWith('video/') ? (
                  <video src={fileUrl(item.url)} controls className="h-full w-full object-cover" aria-label={item.caption || `Video ${index + 1}`} />
                ) : (
                  <img src={fileUrl(item.url)} alt={item.caption || `Ảnh ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                )}
                {item.mimeType?.startsWith('video/') && <Video aria-hidden="true" className="pointer-events-none absolute left-2 top-2 h-5 w-5 text-white drop-shadow" />}
                {index === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]">Ảnh bìa</span>}
              </div>
              <div className="flex items-center gap-2 p-3">
                <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-body)]">{item.caption || 'Chưa có chú thích'}</p>
                <button
                  type="button"
                  disabled={busy || !item.id}
                  onClick={() => {
                    setDeleteError('');
                    setDeletingMedia(item);
                  }}
                  aria-label={`Xóa ${item.caption || 'tệp media'}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-50 transition-colors"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal xác nhận xóa Media đồng bộ giao diện toàn hệ thống */}
      {deletingMedia && (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeletingMedia(null);
          }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-media-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-media-title" className="text-lg font-bold text-[var(--color-ink)]">
                  Xóa tệp media?
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Bạn có chắc chắn muốn xóa tệp này khỏi thư viện không? Hành động này không thể hoàn tác.
                </p>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingMedia(null)}
                aria-label="Đóng"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Xem trước tệp chuẩn bị xóa */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
              <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                {deletingMedia.mimeType?.startsWith('video/') ? (
                  <video src={fileUrl(deletingMedia.url)} className="h-full w-full object-cover" />
                ) : (
                  <img src={fileUrl(deletingMedia.url)} alt={deletingMedia.caption || 'Xem trước'} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold text-[var(--color-ink)] truncate">
                  {deletingMedia.caption || 'Không có chú thích'}
                </p>
                <p className="text-[var(--color-muted)] mt-0.5 truncate">
                  {deletingMedia.mimeType || 'Tệp hình ảnh'}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingMedia(null)}
                className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteMedia}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {deleting ? (
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
    </section>
  );
}
