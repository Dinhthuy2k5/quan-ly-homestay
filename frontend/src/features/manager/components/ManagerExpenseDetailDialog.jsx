import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileText, Pencil, Save, Ban, Upload, X } from 'lucide-react';
import { cancelManagerExpenseApi, updateManagerExpenseApi } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatDateTime, formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const PAYMENT_LABELS = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  OTHER: 'Khác',
};

const DOCUMENT_LABELS = {
  INVOICE: 'Hóa đơn',
  RECEIPT: 'Biên nhận',
  BANK_TRANSFER_CONFIRMATION: 'Xác nhận chuyển khoản',
  OTHER: 'Khác',
};

const INPUT_CLASS = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)] focus:ring-2 focus:ring-gray-200';
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PROOF_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

function toEditForm(expense) {
  return {
    categoryId: String(expense.categoryId ?? ''),
    amount: String(expense.amount ?? ''),
    expenseDate: expense.expenseDate || '',
    description: expense.description || '',
    supplierName: expense.supplierName || '',
    documentType: expense.documentType || '',
    documentNumber: expense.documentNumber || '',
    documentDate: expense.documentDate || '',
    transactionReference: expense.transactionReference || '',
    paymentMethod: expense.paymentMethod || '',
  };
}

function validateProofFile(file) {
  if (!file) return '';
  if (file.size > MAX_PROOF_SIZE) return 'Tệp chứng từ không được vượt quá 5 MB.';
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  if (!ALLOWED_PROOF_TYPES.includes(file.type) && !ALLOWED_PROOF_EXTENSIONS.includes(extension)) {
    return 'Chỉ chấp nhận chứng từ PDF, JPG, PNG hoặc WEBP.';
  }
  return '';
}

function ExpenseField({ label, children, wide = false }) {
  return (
    <label className={`block space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-semibold text-[var(--color-body)]">{label}</span>
      {children}
    </label>
  );
}

export default function ManagerExpenseDetailDialog({ expense, categories, onClose, onSaved, onCancelled }) {
  const dialogRef = useRef(null);
  const proofInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toEditForm(expense));
  const [proofFile, setProofFile] = useState(null);
  const [proofError, setProofError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const handleClose = () => {
    if (editing) {
      const changed = JSON.stringify(form) !== JSON.stringify(toEditForm(expense)) || Boolean(proofFile);
      if (changed && !window.confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?')) return;
    }
    onClose();
  };
  const handleCloseRef = useRef(handleClose);
  const confirmDeleteRef = useRef(confirmDelete);
  handleCloseRef.current = handleClose;
  confirmDeleteRef.current = confirmDelete;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const focusableSelector = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    dialog?.querySelector(focusableSelector)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmDeleteRef.current) setConfirmDelete(false);
        else handleCloseRef.current();
      } else if (event.key === 'Tab' && dialog) {
        const focusable = [...dialog.querySelectorAll(focusableSelector)];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const beginEditing = () => {
    setForm(toEditForm(expense));
    setProofFile(null);
    setProofError('');
    setError('');
    setConfirmDelete(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(toEditForm(expense));
    setProofFile(null);
    setProofError('');
    setError('');
    setEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.categoryId || !form.expenseDate || !form.documentType || (!expense.proofUrl && !proofFile)
      || !/^\d+$/.test(form.amount.trim()) || BigInt(form.amount.trim() || '0') <= 0n) {
      setError('Vui lòng chọn danh mục, ngày, loại chứng từ, đính kèm tệp nếu khoản cũ đang thiếu và nhập số tiền nguyên dương.');
      return;
    }
    if (BigInt(form.amount.trim()) > 9223372036854775807n) {
      setError('Số tiền vượt quá giới hạn lưu trữ.');
      return;
    }
    if (proofError) {
      setError(proofError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updatedExpense = await updateManagerExpenseApi(expense.id, form, proofFile);
      setEditing(false);
      setProofFile(null);
      onSaved(updatedExpense);
    } catch (err) {
      setError(getErrorMessage(err) || 'Không thể lưu thay đổi khoản chi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cancellationReason.trim()) {
      setError('Vui lòng nhập lý do hủy khoản chi.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await cancelManagerExpenseApi(expense.id, cancellationReason.trim());
      onCancelled();
    } catch (err) {
      setError(getErrorMessage(err) || 'Không thể xóa khoản chi.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const detailRows = [
    ['Ngày phát sinh', formatDate(expense.expenseDate)],
    ['Danh mục', expense.categoryName || '—'],
    ['Nhà cung cấp', expense.supplierName || 'Chưa cung cấp'],
    ['Phương thức thanh toán', PAYMENT_LABELS[expense.paymentMethod] || 'Chưa xác định'],
    ['Loại chứng từ', DOCUMENT_LABELS[expense.documentType] || 'Chưa xác định'],
    ['Số chứng từ', expense.documentNumber || '—'],
    ['Ngày chứng từ', formatDate(expense.documentDate) || '—'],
    ['Mã giao dịch', expense.transactionReference || '—'],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}
    >
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="expense-detail-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Khoản chi #{expense.id}</p>
            <h2 id="expense-detail-title" className="mt-1 text-xl font-bold text-[var(--color-ink)]">{expense.description || expense.categoryName || 'Chi phí vận hành'}</h2>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--color-ink)]">{formatVnd(expense.amount)}</p>
            {expense.cancelledAt && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">Đã hủy lúc {formatDateTime(expense.cancelledAt)} bởi {expense.cancelledByName || (expense.cancelledBy ? 'quản lý (không còn tên tài khoản)' : 'quản lý')}: {expense.cancellationReason}</p>}
          </div>
          <button type="button" onClick={handleClose} aria-label="Đóng chi tiết" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><X className="h-4 w-4" /></button>
        </header>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {editing ? (
          <form onSubmit={handleSave} className="mt-5 space-y-5">
            <section>
              <h3 className="mb-3 text-sm font-bold text-[var(--color-ink)]">Thông tin khoản chi</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ExpenseField label="Danh mục *"><select className={INPUT_CLASS} name="categoryId" value={form.categoryId} onChange={updateField} required><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></ExpenseField>
                <ExpenseField label="Số tiền (₫) *"><input className={INPUT_CLASS} type="number" min="1" step="1" name="amount" value={form.amount} onChange={updateField} required /></ExpenseField>
                <ExpenseField label="Ngày phát sinh *"><input className={INPUT_CLASS} type="date" name="expenseDate" value={form.expenseDate} onChange={updateField} required /></ExpenseField>
                <ExpenseField label="Nhà cung cấp"><input className={INPUT_CLASS} maxLength={150} name="supplierName" value={form.supplierName} onChange={updateField} placeholder="Tên đơn vị hoặc người nhận tiền" /></ExpenseField>
                <ExpenseField label="Mô tả"><input className={INPUT_CLASS} maxLength={255} name="description" value={form.description} onChange={updateField} placeholder="Nội dung khoản chi" /></ExpenseField>
                <ExpenseField label="Phương thức thanh toán"><select className={INPUT_CLASS} name="paymentMethod" value={form.paymentMethod} onChange={updateField}><option value="">Chưa xác định</option><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CARD">Thẻ</option><option value="OTHER">Khác</option></select></ExpenseField>
              </div>
            </section>

            <section className="border-t border-[var(--color-border)] pt-4">
              <h3 className="mb-3 text-sm font-bold text-[var(--color-ink)]">Chứng từ và giao dịch <span className="font-normal text-rose-700">(bắt buộc)</span></h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ExpenseField label="Loại chứng từ *"><select className={INPUT_CLASS} name="documentType" value={form.documentType} onChange={updateField} required><option value="">Chọn loại chứng từ</option><option value="INVOICE">Hóa đơn</option><option value="RECEIPT">Biên nhận</option><option value="BANK_TRANSFER_CONFIRMATION">Xác nhận chuyển khoản</option><option value="OTHER">Khác</option></select></ExpenseField>
                <ExpenseField label="Số chứng từ"><input className={INPUT_CLASS} maxLength={100} name="documentNumber" value={form.documentNumber} onChange={updateField} /></ExpenseField>
                <ExpenseField label="Ngày chứng từ"><input className={INPUT_CLASS} type="date" name="documentDate" value={form.documentDate} onChange={updateField} /></ExpenseField>
                <ExpenseField label="Mã giao dịch"><input className={INPUT_CLASS} maxLength={100} name="transactionReference" value={form.transactionReference} onChange={updateField} /></ExpenseField>
                <div className="sm:col-span-2">
                  <ExpenseField label={`Tệp chứng từ ${expense.proofUrl ? '' : '*'}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <input ref={proofInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] || null; setProofFile(file); setProofError(validateProofFile(file)); setError(''); event.target.value = ''; }} />
                      <button type="button" onClick={() => proofInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"><Upload className="h-4 w-4" /> Chọn tệp mới</button>
                      <span className="text-xs text-[var(--color-muted)]">{expense.proofUrl ? 'Tệp hiện có được giữ nếu không chọn tệp mới.' : 'Khoản chi cũ chưa có tệp chứng từ; cần bổ sung để lưu thay đổi.'}</span>
                    </div>
                    {proofFile && <p className="mt-2 text-sm text-[var(--color-body)]">{proofFile.name} · {(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                    {proofError && <p role="alert" className="mt-1 text-xs text-rose-700">{proofError}</p>}
                  </ExpenseField>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
              <button type="button" onClick={cancelEditing} disabled={saving} className="min-h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]">Hủy chỉnh sửa</button>
              <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </form>
        ) : (
          <>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {detailRows.map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-[var(--color-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--color-ink)]">{value}</dd></div>)}
            </dl>
            {expense.proofUrl && <a href={fileUrl(expense.proofUrl)} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"><FileText className="h-4 w-4 text-[var(--color-primary)]" /> Mở chứng từ đính kèm</a>}

            {confirmDelete ? (
              <div role="alertdialog" aria-labelledby="delete-expense-title" aria-describedby="delete-expense-description" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" /><div className="flex-1"><h3 id="delete-expense-title" className="font-bold text-rose-900">Hủy khoản chi này?</h3><p id="delete-expense-description" className="mt-1 text-sm text-rose-800">Khoản chi sẽ được giữ trong sổ và lưu lý do hủy vào nhật ký.</p><textarea value={cancellationReason} onChange={(event) => { setCancellationReason(event.target.value); setError(''); }} maxLength={500} rows={3} required placeholder="Nhập lý do hủy khoản chi" className={`${INPUT_CLASS} mt-3`} /></div></div>
                <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="min-h-10 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-900">Giữ lại</button><button type="button" onClick={handleDelete} disabled={deleting || !cancellationReason.trim()} className="min-h-10 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white disabled:opacity-50">{deleting ? 'Đang hủy…' : 'Hủy khoản chi'}</button></div>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-[var(--color-border)] pt-4">
                {!expense.cancelledAt && <button type="button" onClick={() => { setCancellationReason(''); setConfirmDelete(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Ban className="h-4 w-4" /> Hủy khoản chi</button>}
                {!expense.cancelledAt && <button type="button" onClick={beginEditing} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-ink)] px-4 text-sm font-bold text-white hover:bg-black"><Pencil className="h-4 w-4" /> Chỉnh sửa</button>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
