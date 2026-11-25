import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileText, Receipt, Upload, X } from 'lucide-react';
import { createManagerExpenseApi, getManagerExpenseCategoriesApi } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

// Nhãn tiếng Việt tương ứng với các enum loại chứng từ từ backend
const DOCUMENT_LABELS = {
  INVOICE: 'Hóa đơn',
  RECEIPT: 'Biên nhận',
  BANK_TRANSFER_CONFIRMATION: 'Xác nhận chuyển khoản',
  OTHER: 'Khác',
};

function todayLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function initialForm(categoryId = '') {
  return {
    categoryId,
    amount: '',
    expenseDate: todayLocalDate(),
    description: '',
    supplierName: '',
    // Mặc định chọn loại chứng từ đầu tiên ("Hóa đơn") để đồng bộ với dropdown bắt buộc
    documentType: 'INVOICE',
    documentNumber: '',
    documentDate: '',
    transactionReference: '',
    // Mặc định chọn phương thức đầu tiên ("Tiền mặt") để đồng bộ với dropdown
    paymentMethod: 'CASH',
  };
}

function validateFile(file) {
  if (!file) return '';
  if (file.size > MAX_FILE_SIZE) return 'Tệp chứng từ không được vượt quá 5 MB.';
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return 'Chỉ chấp nhận chứng từ PDF, JPG, PNG hoặc WEBP.';
  }
  return '';
}

function validateForm(form, file) {
  const errors = {};
  if (!form.categoryId) errors.categoryId = 'Vui lòng chọn danh mục chi phí.';
  if (!/^\d+$/.test(form.amount) || BigInt(form.amount || '0') <= 0n) {
    errors.amount = 'Số tiền phải là số nguyên dương.';
  } else if (BigInt(form.amount) > 9223372036854775807n) {
    errors.amount = 'Số tiền vượt quá giới hạn lưu trữ.';
  }
  if (!form.expenseDate) errors.expenseDate = 'Vui lòng chọn ngày phát sinh.';
  if (form.description.length > 255) errors.description = 'Mô tả tối đa 255 ký tự.';
  if (form.supplierName.length > 150) errors.supplierName = 'Nhà cung cấp tối đa 150 ký tự.';
  if (form.documentNumber.length > 100) errors.documentNumber = 'Số chứng từ tối đa 100 ký tự.';
  if (form.transactionReference.length > 100) errors.transactionReference = 'Mã giao dịch tối đa 100 ký tự.';
  if (!form.documentType) errors.documentType = 'Vui lòng chọn loại chứng từ.';
  if (!file) errors.proofFile = 'Vui lòng tải lên hóa đơn, biên nhận hoặc chứng từ giao dịch.';
  if (file) {
    const fileError = validateFile(file);
    if (fileError) errors.proofFile = fileError;
  }
  return errors;
}

function Field({ label, required = false, error, children }) {
  const fieldId = useId();
  const hasLabelableControl = ['input', 'select', 'textarea'].includes(children?.type);
  return (
    <div className="space-y-1.5">
      <label htmlFor={hasLabelableControl ? fieldId : undefined} className="block text-sm font-semibold text-[var(--color-ink)]">
        {label}{required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {hasLabelableControl
        ? React.cloneElement(children, { id: fieldId, 'aria-invalid': error ? 'true' : undefined })
        : children}
      {error && <p id={`${fieldId}-error`} className="text-xs text-rose-700" role="alert">{error}</p>}
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]';

export default function ManagerExpensesPage() {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [form, setForm] = useState(initialForm());
  const [proofFile, setProofFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdExpense, setCreatedExpense] = useState(null);
  const fileInputId = useId();

  useEffect(() => {
    let active = true;
    getManagerExpenseCategoriesApi()
      .then((data) => {
        if (!active) return;
        setCategories(data);
        if (data.length) setForm((current) => ({ ...current, categoryId: current.categoryId || String(data[0].id) }));
      })
      .catch((error) => {
        if (active) setCategoryError(getErrorMessage(error) || 'Không thể tải danh mục chi phí.');
      })
      .finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setErrors((current) => ({ ...current, proofFile: validateFile(selected) }));
    setProofFile(selected);
    setSubmitError('');
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateForm(form, proofFile);
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createManagerExpenseApi({
        ...form,
        amount: form.amount.trim(),
      }, proofFile);
      setCreatedExpense(result);
      setForm(initialForm(categories[0]?.id ? String(categories[0].id) : ''));
      setProofFile(null);
      setErrors({});
    } catch (error) {
      setSubmitError(getErrorMessage(error) || 'Không thể ghi nhận khoản chi. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdExpense) {
    return (
      <section className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
            <div>
              <h1 className="text-lg font-bold">Đã ghi nhận khoản chi</h1>
              <p className="mt-1 text-sm">Khoản chi #{createdExpense.id} đã được lưu cho homestay của bạn.</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)]">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-[var(--color-muted)]">Danh mục</dt><dd className="mt-1 font-semibold text-[var(--color-ink)]">{createdExpense.categoryName || 'Chưa phân loại'}</dd></div>
            <div><dt className="text-xs text-[var(--color-muted)]">Số tiền</dt><dd className="mt-1 font-bold text-[var(--color-ink)]">{formatVnd(createdExpense.amount)}</dd></div>
            <div><dt className="text-xs text-[var(--color-muted)]">Ngày phát sinh</dt><dd className="mt-1 font-semibold text-[var(--color-ink)]">{formatDate(createdExpense.expenseDate)}</dd></div>
            <div><dt className="text-xs text-[var(--color-muted)]">Nhà cung cấp</dt><dd className="mt-1 font-semibold text-[var(--color-ink)]">{createdExpense.supplierName || 'Chưa cung cấp'}</dd></div>
            <div><dt className="text-xs text-[var(--color-muted)]">Loại chứng từ</dt><dd className="mt-1 font-semibold text-[var(--color-ink)]">{DOCUMENT_LABELS[createdExpense.documentType] || createdExpense.documentType || 'Chưa xác định'}</dd></div>
            <div><dt className="text-xs text-[var(--color-muted)]">Số chứng từ</dt><dd className="mt-1 font-semibold text-[var(--color-ink)]">{createdExpense.documentNumber || 'Chưa cung cấp'}</dd></div>
          </dl>
          {createdExpense.proofUrl && (
            <a href={fileUrl(createdExpense.proofUrl)} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]">
              <FileText className="h-4 w-4" /> Xem chứng từ đã tải lên
            </a>
          )}
          <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-4">
            <Link to="/manager/expenses" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]">Danh sách chi phí</Link>
            <button type="button" onClick={() => setCreatedExpense(null)} className="min-h-11 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]">
              Ghi nhận khoản chi khác
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Ghi nhận khoản chi</h1>
            <p className="mt-1 text-sm text-[var(--color-body)]">Lưu chi phí vận hành và chứng từ để tiện tra cứu, đối chiếu, báo cáo.</p>
          </div>
        </div>
        <Link to="/manager/expenses" className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]">Quay lại danh sách</Link>
      </header>

      {categoryError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{categoryError}</div>}
      {submitError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{submitError}</div>}

      {!categoriesLoading && !categoryError && categories.length === 0 && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Homestay chưa có danh mục chi phí. Cần tạo danh mục trước khi ghi nhận khoản chi (CRUD danh mục thuộc API-EXP-05).
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] sm:p-6">
          <div className="mb-5 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-ink)]">Thông tin khoản chi</h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Các trường có dấu * là bắt buộc.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Danh mục chi phí" required error={errors.categoryId}>
              <select name="categoryId" value={form.categoryId} onChange={updateField} disabled={categoriesLoading || !categories.length} className={inputClass}>
                {/* Chỉ hiển thị option trạng thái khi đang tải hoặc chưa có danh mục trong DB */}
                {categoriesLoading ? (
                  <option value="">Đang tải danh mục…</option>
                ) : categories.length === 0 ? (
                  <option value="">Chưa có danh mục</option>
                ) : (
                  categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)
                )}
              </select>
            </Field>
            <Field label="Số tiền (₫)" required error={errors.amount}>
              <input name="amount" type="number" min="1" step="1" inputMode="numeric" value={form.amount} onChange={updateField} placeholder="Ví dụ: 1500000" className={inputClass} />
            </Field>
            <Field label="Ngày phát sinh" required error={errors.expenseDate}>
              <input name="expenseDate" type="date" value={form.expenseDate} onChange={updateField} className={inputClass} />
            </Field>
            <Field label="Mô tả" error={errors.description}>
              <input name="description" maxLength={255} value={form.description} onChange={updateField} placeholder="Ví dụ: Tiền điện tháng 9" className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] sm:p-6">
          <div className="mb-5 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-ink)]">Chứng từ và giao dịch <span className="font-normal text-rose-700"></span></h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Mỗi khoản chi mới phải có loại chứng từ và tệp hóa đơn, biên nhận hoặc xác nhận giao dịch (tối đa 5 MB).</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nhà cung cấp" error={errors.supplierName}>
              <input name="supplierName" maxLength={150} value={form.supplierName} onChange={updateField} placeholder="Tên đơn vị hoặc người nhận tiền" className={inputClass} />
            </Field>
            <Field label="Loại chứng từ" required error={errors.documentType}>
              <select name="documentType" value={form.documentType} onChange={updateField} className={inputClass}>
                <option value="INVOICE">Hóa đơn</option>
                <option value="RECEIPT">Biên nhận</option>
                <option value="BANK_TRANSFER_CONFIRMATION">Xác nhận chuyển khoản</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Số chứng từ" error={errors.documentNumber}>
              <input name="documentNumber" maxLength={100} value={form.documentNumber} onChange={updateField} placeholder="Ví dụ: HD-00125" className={inputClass} />
            </Field>
            <Field label="Ngày chứng từ">
              <input name="documentDate" type="date" value={form.documentDate} onChange={updateField} className={inputClass} />
            </Field>
            <Field label="Mã giao dịch" error={errors.transactionReference}>
              <input name="transactionReference" maxLength={100} value={form.transactionReference} onChange={updateField} placeholder="Ví dụ: FT2601001" className={inputClass} />
            </Field>
            <Field label="Phương thức thanh toán">
              <select name="paymentMethod" value={form.paymentMethod} onChange={updateField} className={inputClass}>
                <option value="CASH">Tiền mặt</option>
                <option value="BANK_TRANSFER">Chuyển khoản</option>
                <option value="CARD">Thẻ</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tệp chứng từ" required error={errors.proofFile}>
                <input id={fileInputId} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} className="sr-only" />
                {proofFile ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--color-ink)]">{proofFile.name}</p><p className="text-xs text-[var(--color-muted)]">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                    </div>
                    <button type="button" onClick={() => setProofFile(null)} aria-label="Bỏ tệp chứng từ" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><X className="h-4 w-4" />Bỏ tệp</button>
                  </div>
                ) : (
                  <label htmlFor={fileInputId} className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-4 text-sm font-semibold text-[var(--color-body)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]">
                    <Upload className="h-5 w-5 text-[var(--color-primary)]" /> Chọn tệp PDF, JPG, PNG hoặc WEBP
                  </label>
                )}
              </Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || categoriesLoading || !categories.length} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">
            <Receipt className="h-4 w-4" />{submitting ? 'Đang ghi nhận…' : 'Ghi nhận khoản chi'}
          </button>
        </div>
      </form>
    </div>
  );
}
