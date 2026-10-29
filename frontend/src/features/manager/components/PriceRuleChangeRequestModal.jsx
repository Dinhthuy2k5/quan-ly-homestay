import React, { useState } from 'react';
import {
  AlertCircle,
  FileQuestion,
  HelpCircle,
  LoaderCircle,
  MinusCircle,
  PlusCircle,
  X,
} from 'lucide-react';
import { createPriceRuleChangeRequestApi } from '../api';
import { formatVnd } from '../../../lib/format';

const WEEKDAY_OPTIONS = [
  { key: 'MON', label: 'T2' },
  { key: 'TUE', label: 'T3' },
  { key: 'WED', label: 'T4' },
  { key: 'THU', label: 'T5' },
  { key: 'FRI', label: 'T6' },
  { key: 'SAT', label: 'T7' },
  { key: 'SUN', label: 'CN' },
];

function mapErrorMessage(error) {
  const code = error.response?.data?.error?.code;
  if (code === 'PRICE_REQUEST_ALREADY_PENDING') {
    return 'Đang có một yêu cầu thay đổi cho quy tắc này đang chờ Giám đốc duyệt. Vui lòng đợi Giám đốc phê duyệt trước khi gửi yêu cầu mới.';
  }
  if (code === 'HOMESTAY_SCOPE_VIOLATION') {
    return 'Bạn không có quyền thao tác trên phòng hoặc quy tắc của homestay khác.';
  }
  if (code === 'PRICE_RULE_CONFLICT') {
    return error.response?.data?.error?.message || 'Xung đột quy tắc giá. Không thể ngừng giá cơ sở duy nhất của phòng.';
  }
  if (code === 'PRICE_RULE_NOT_FOUND') {
    return 'Không tìm thấy quy tắc giá cần thao tác.';
  }
  if (code === 'INVALID_PRICE_RULE') {
    return error.response?.data?.error?.message || 'Thông tin quy tắc giá không hợp lệ.';
  }
  return error.response?.data?.error?.message || 'Không thể gửi đề xuất thay đổi giá. Vui lòng thử lại sau.';
}

export default function PriceRuleChangeRequestModal({
  isOpen,
  onClose,
  onSuccess,
  rooms = [],
  activeRules = [],
  initialMode = 'CREATE',
  initialTargetRule = null,
}) {
  const [requestType, setRequestType] = useState(initialMode);
  const [targetRuleId, setTargetRuleId] = useState(
    initialTargetRule?.id ? String(initialTargetRule.id) : (activeRules[0]?.id ? String(activeRules[0].id) : '')
  );
  const [ruleType, setRuleType] = useState(initialTargetRule?.ruleType || 'BASE');

  // Form fields for proposed rule
  const [roomId, setRoomId] = useState(
    initialTargetRule?.roomId ? String(initialTargetRule.roomId) : (rooms[0]?.id ? String(rooms[0].id) : '')
  );
  const [name, setName] = useState(initialTargetRule?.name || '');
  const [basePrice, setBasePrice] = useState(
    initialTargetRule?.basePrice != null ? String(initialTargetRule.basePrice) : ''
  );
  const [adjustType, setAdjustType] = useState(initialTargetRule?.adjustType || 'PERCENT');
  const [adjustValue, setAdjustValue] = useState(
    initialTargetRule?.adjustValue != null ? String(initialTargetRule.adjustValue) : ''
  );
  const [weekdays, setWeekdays] = useState(() => {
    if (!initialTargetRule?.weekdays) return [];
    if (Array.isArray(initialTargetRule.weekdays)) return initialTargetRule.weekdays;
    return String(initialTargetRule.weekdays)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  });
  const [startDate, setStartDate] = useState(initialTargetRule?.startDate || '');
  const [endDate, setEndDate] = useState(initialTargetRule?.endDate || '');
  const [priority, setPriority] = useState(initialTargetRule?.priority ?? 0);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Switch tabs (CREATE, UPDATE, DEACTIVATE)
  const switchRequestType = (type) => {
    setRequestType(type);
    setFormError('');
    if (type === 'CREATE') {
      setTargetRuleId('');
      setRuleType('BASE');
      setRoomId(rooms.length > 0 ? String(rooms[0].id) : '');
      setName('');
      setBasePrice('');
      setAdjustType('PERCENT');
      setAdjustValue('');
      setWeekdays([]);
      setStartDate('');
      setEndDate('');
      setPriority(0);
    } else {
      const target = initialTargetRule || activeRules[0];
      if (target) {
        handleTargetRuleChange(String(target.id));
      }
    }
  };

  // When targetRuleId is chosen in dropdown during UPDATE mode
  const handleTargetRuleChange = (selectedId) => {
    setTargetRuleId(selectedId);
    setFormError('');
    const found = activeRules.find((r) => String(r.id) === String(selectedId));
    if (found) {
      setRuleType(found.ruleType || 'BASE');
      setRoomId(found.roomId ? String(found.roomId) : '');
      setName(found.name || '');
      setBasePrice(found.basePrice != null ? String(found.basePrice) : '');
      setAdjustType(found.adjustType || 'PERCENT');
      setAdjustValue(found.adjustValue != null ? String(found.adjustValue) : '');

      let parsedWeekdays = [];
      if (Array.isArray(found.weekdays)) {
        parsedWeekdays = found.weekdays;
      } else if (found.weekdays) {
        parsedWeekdays = String(found.weekdays)
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
      }
      setWeekdays(parsedWeekdays);
      setStartDate(found.startDate || '');
      setEndDate(found.endDate || '');
      setPriority(found.priority ?? 0);
    }
  };

  const toggleWeekday = (dayKey) => {
    setWeekdays((current) =>
      current.includes(dayKey) ? current.filter((d) => d !== dayKey) : [...current, dayKey]
    );
  };

  const selectAllDays = () => setWeekdays([]);
  const selectWeekend = () => setWeekdays(['FRI', 'SAT', 'SUN']);

  const selectedTargetRule = activeRules.find((r) => String(r.id) === String(targetRuleId)) || initialTargetRule;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side validations
    if (requestType === 'CREATE') {
      if (ruleType === 'BASE') {
        if (!roomId) {
          setFormError('Vui lòng chọn phòng áp dụng giá cơ bản.');
          return;
        }
        const parsedBase = Number(basePrice);
        if (Number.isNaN(parsedBase) || parsedBase <= 0) {
          setFormError('Giá cơ bản phòng phải là số nguyên dương lớn hơn 0 VNĐ.');
          return;
        }
      } else {
        // ADJUSTMENT
        if (!name.trim()) {
          setFormError('Vui lòng nhập tên quy tắc điều chỉnh giá.');
          return;
        }
        const parsedVal = Number(adjustValue);
        if (Number.isNaN(parsedVal) || parsedVal === 0) {
          setFormError('Giá trị điều chỉnh phải khác 0.');
          return;
        }
        if (adjustType === 'PERCENT') {
          if (parsedVal < -99 || parsedVal > 500) {
            setFormError('Tỷ lệ phần trăm điều chỉnh phải từ -99% đến +500%. Nếu muốn ấn định giá tiền (VNĐ), hãy chọn Kiểu điều chỉnh là "Giá ấn định cố định (VNĐ / đêm)".');
            return;
          }
        }
        if (adjustType === 'FIXED_PRICE' && parsedVal <= 0) {
          setFormError('Giá ấn định cố định phải lớn hơn 0 VNĐ.');
          return;
        }
      }
    }

    if (requestType === 'UPDATE') {
      if (!targetRuleId) {
        setFormError('Vui lòng chọn quy tắc giá cần cập nhật.');
        return;
      }
      if (ruleType === 'BASE') {
        const parsedBase = Number(basePrice);
        if (Number.isNaN(parsedBase) || parsedBase <= 0) {
          setFormError('Giá cơ bản mới phải là số nguyên dương lớn hơn 0 VNĐ.');
          return;
        }
      } else {
        if (!name.trim()) {
          setFormError('Vui lòng nhập tên quy tắc điều chỉnh giá.');
          return;
        }
        const parsedVal = Number(adjustValue);
        if (Number.isNaN(parsedVal) || parsedVal === 0) {
          setFormError('Giá trị điều chỉnh phải khác 0.');
          return;
        }
        if (adjustType === 'PERCENT') {
          if (parsedVal < -99 || parsedVal > 500) {
            setFormError('Tỷ lệ phần trăm điều chỉnh phải từ -99% đến +500%. Nếu muốn ấn định giá tiền (VNĐ), hãy chọn Kiểu điều chỉnh là "Giá ấn định cố định (VNĐ / đêm)".');
            return;
          }
        }
        if (adjustType === 'FIXED_PRICE' && parsedVal <= 0) {
          setFormError('Giá ấn định cố định phải lớn hơn 0 VNĐ.');
          return;
        }
      }
    }

    if (requestType === 'DEACTIVATE') {
      if (!targetRuleId) {
        setFormError('Vui lòng chọn quy tắc cần ngừng áp dụng.');
        return;
      }
    }

    // Date validations
    if (requestType !== 'DEACTIVATE' && ruleType === 'ADJUSTMENT' && startDate && endDate) {
      if (startDate > endDate) {
        setFormError('Ngày bắt đầu không được sau ngày kết thúc.');
        return;
      }
    }

    // Build payload
    let proposedRule = null;
    if (requestType === 'CREATE' || requestType === 'UPDATE') {
      if (ruleType === 'BASE') {
        proposedRule = {
          ruleType: 'BASE',
          roomId: Number(roomId),
          basePrice: Math.round(Number(basePrice)),
          name: name.trim() || undefined,
        };
      } else {
        proposedRule = {
          ruleType: 'ADJUSTMENT',
          roomId: roomId ? Number(roomId) : null,
          name: name.trim(),
          adjustType,
          adjustValue: Math.round(Number(adjustValue)),
          weekdays: weekdays.length > 0 ? weekdays : null,
          startDate: startDate || null,
          endDate: endDate || null,
          priority: Number(priority) || 0,
        };
      }
    }

    const payload = {
      requestType,
      targetRuleId: requestType === 'CREATE' ? null : Number(targetRuleId),
      proposedRule,
    };

    setSubmitting(true);
    try {
      const result = await createPriceRuleChangeRequestApi(payload);
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setFormError(mapErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-request-modal-title"
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              {requestType === 'CREATE' ? (
                <PlusCircle className="h-6 w-6" />
              ) : requestType === 'UPDATE' ? (
                <FileQuestion className="h-6 w-6" />
              ) : (
                <MinusCircle className="h-6 w-6 text-rose-600" />
              )}
            </div>
            <div>
              <h3 id="price-request-modal-title" className="text-lg font-bold text-[var(--color-ink)]">
                {requestType === 'CREATE' && 'Gửi đề xuất thêm quy tắc giá'}
                {requestType === 'UPDATE' && 'Gửi đề xuất sửa quy tắc giá'}
                {requestType === 'DEACTIVATE' && 'Gửi đề xuất ngừng quy tắc giá'}
              </h3>
              <p className="text-xs text-[var(--color-muted)]">
                Yêu cầu sẽ được chuyển đến Giám đốc xét duyệt trước khi có hiệu lực trong hệ thống.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab chuyển loại yêu cầu (CREATE / UPDATE / DEACTIVATE) khi không gán cứng */}
        {!initialTargetRule && (
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold text-gray-600">
            <button
              type="button"
              onClick={() => switchRequestType('CREATE')}
              className={`flex-1 rounded-lg py-2 transition-all ${requestType === 'CREATE' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
                }`}
            >
              Thêm mới
            </button>
            <button
              type="button"
              onClick={() => switchRequestType('UPDATE')}
              className={`flex-1 rounded-lg py-2 transition-all ${requestType === 'UPDATE' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
                }`}
            >
              Sửa quy tắc
            </button>
            <button
              type="button"
              onClick={() => switchRequestType('DEACTIVATE')}
              className={`flex-1 rounded-lg py-2 transition-all ${requestType === 'DEACTIVATE' ? 'bg-white text-rose-700 shadow-sm' : 'hover:text-gray-900'
                }`}
            >
              Ngừng áp dụng
            </button>
          </div>
        )}

        {/* Thông báo lỗi */}
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target rule selector if UPDATE or DEACTIVATE and not locked */}
          {requestType !== 'CREATE' && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
              <label htmlFor="target-rule-select" className="text-xs font-semibold text-gray-700 block">
                Quy tắc giá mục tiêu (đang hoạt động)
              </label>
              {initialTargetRule ? (
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">{initialTargetRule.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({initialTargetRule.ruleType === 'BASE' ? 'Giá cơ bản' : 'Điều chỉnh'})
                    </span>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Đang áp dụng
                  </span>
                </div>
              ) : (
                <select
                  id="target-rule-select"
                  value={targetRuleId}
                  onChange={(e) => handleTargetRuleChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900"
                >
                  <option value="">-- Chọn quy tắc muốn thao tác --</option>
                  {activeRules.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} - {r.name} ({r.ruleType === 'BASE' ? 'Giá cơ bản' : 'Điều chỉnh'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* DEACTIVATE Warning */}
          {requestType === 'DEACTIVATE' && selectedTargetRule && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                <HelpCircle className="h-4 w-4" /> Xác nhận gửi đề xuất ngừng áp dụng:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Quy tắc: <strong>{selectedTargetRule.name}</strong></li>
                <li>
                  Phạm vi: {selectedTargetRule.roomId ? `Phòng #${selectedTargetRule.roomId}` : 'Toàn cơ sở homestay'}
                </li>
                <li>
                  Giá trị hiện tại:{' '}
                  {selectedTargetRule.ruleType === 'BASE'
                    ? `${formatVnd(selectedTargetRule.basePrice)} / đêm`
                    : selectedTargetRule.adjustType === 'PERCENT'
                      ? `${selectedTargetRule.adjustValue > 0 ? '+' : ''}${selectedTargetRule.adjustValue}%`
                      : `${formatVnd(selectedTargetRule.adjustValue)} / đêm`}
                </li>
              </ul>
              <p className="text-amber-700 pt-1">
                Khi Giám đốc phê duyệt, quy tắc sẽ chuyển sang trạng thái <strong>Ngừng áp dụng (INACTIVE)</strong>.
              </p>
            </div>
          )}

          {/* CREATE & UPDATE Forms */}
          {requestType !== 'DEACTIVATE' && (
            <>
              {/* Loại quy tắc (chỉ cho phép chọn khi CREATE) */}
              {requestType === 'CREATE' && (
                <div>
                  <span className="text-xs font-semibold text-gray-700 block mb-1.5">Loại quy tắc</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRuleType('BASE')}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${ruleType === 'BASE'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                    >
                      <span className="text-sm font-bold text-gray-900">1. Giá cơ bản (BASE)</span>
                      <span className="text-xs text-gray-500 mt-0.5">Giá chuẩn mỗi đêm cho 1 phòng cụ thể</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('ADJUSTMENT')}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${ruleType === 'ADJUSTMENT'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                    >
                      <span className="text-sm font-bold text-gray-900">2. Điều chỉnh giá (ADJUSTMENT)</span>
                      <span className="text-xs text-gray-500 mt-0.5">Phụ thu cuối tuần, lễ tết, giảm giá</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tên quy tắc */}
              <div>
                <label htmlFor="price-rule-name-input" className="text-xs font-semibold text-gray-700 block mb-1">
                  Tên quy tắc {ruleType === 'ADJUSTMENT' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  id="price-rule-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    ruleType === 'BASE' ? 'Ví dụ: Giá tiêu chuẩn ngày thường' : 'Ví dụ: Phụ thu cuối tuần hè'
                  }
                  className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              {/* Phạm vi áp dụng (Phòng) */}
              <div>
                <label htmlFor="price-rule-room-select" className="text-xs font-semibold text-gray-700 block mb-1">
                  Phạm vi áp dụng {ruleType === 'BASE' && <span className="text-rose-500">* (Bắt buộc với giá cơ bản)</span>}
                </label>
                <select
                  id="price-rule-room-select"
                  value={roomId}
                  disabled={requestType === 'UPDATE' && ruleType === 'BASE'}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {ruleType === 'ADJUSTMENT' && <option value="">Toàn cơ sở homestay (Tất cả các phòng)</option>}
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Phòng: {room.name} (#{room.id})
                    </option>
                  ))}
                </select>
                {requestType === 'UPDATE' && ruleType === 'BASE' && (
                  <p className="mt-1 text-xs text-gray-500">Giá cơ bản gắn liền với phòng, không thể đổi phòng khi sửa.</p>
                )}
              </div>

              {/* Field: BASE PRICE */}
              {ruleType === 'BASE' && (
                <div>
                  <label htmlFor="price-rule-base-price-input" className="text-xs font-semibold text-gray-700 block mb-1">
                    Giá cơ bản mỗi đêm (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="price-rule-base-price-input"
                      type="number"
                      min="0"
                      step="1000"
                      value={basePrice}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="Ví dụ: 800000"
                      className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 pr-16 focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">VNĐ</span>
                  </div>
                  {basePrice && Number(basePrice) > 0 && (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      Hiển thị: {formatVnd(Number(basePrice))} / đêm
                    </p>
                  )}
                </div>
              )}

              {/* Fields: ADJUSTMENT */}
              {ruleType === 'ADJUSTMENT' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="price-rule-adjust-type-select" className="text-xs font-semibold text-gray-700 block mb-1">Kiểu điều chỉnh</label>
                      <select
                        id="price-rule-adjust-type-select"
                        value={adjustType}
                        onChange={(e) => {
                          setAdjustType(e.target.value);
                          setFormError('');
                        }}
                        className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900"
                      >
                        <option value="PERCENT">Tỷ lệ phần trăm (% so với giá cơ sở)</option>
                        <option value="FIXED_PRICE">Giá ấn định cố định (VNĐ / đêm)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="price-rule-adjust-val-input" className="text-xs font-semibold text-gray-700 block mb-1">
                        Giá trị điều chỉnh <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="price-rule-adjust-val-input"
                          type="number"
                          min={adjustType === 'PERCENT' ? '-99' : '0'}
                          max={adjustType === 'PERCENT' ? '500' : undefined}
                          step={adjustType === 'PERCENT' ? '1' : '1000'}
                          value={adjustValue}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => setAdjustValue(e.target.value)}
                          placeholder={adjustType === 'PERCENT' ? 'Ví dụ: 20 (tăng 20%) hoặc -10' : 'Ví dụ: 950000'}
                          className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 pr-14 focus:border-[var(--color-primary)] focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">
                          {adjustType === 'PERCENT' ? '%' : 'VNĐ'}
                        </span>
                      </div>
                      {adjustValue && (
                        <p className="mt-1 text-xs font-medium text-emerald-600">
                          {adjustType === 'PERCENT'
                            ? `${Number(adjustValue) > 0 ? '+' : ''}${adjustValue}% so với giá cơ bản`
                            : `Giá ấn định: ${formatVnd(Number(adjustValue))} / đêm`}
                        </p>
                      )}
                      {adjustType === 'PERCENT' && Number(adjustValue) > 500 && (
                        <p className="mt-1 text-xs font-semibold text-amber-600">
                          ⚠️ Bạn đang chọn "Tỷ lệ phần trăm (%)" nhưng nhập số lớn ({adjustValue}%). Nếu bạn muốn ấn định giá tiền (ví dụ {formatVnd(Number(adjustValue))}), vui lòng chọn Kiểu điều chỉnh là "Giá ấn định cố định (VNĐ / đêm)".
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ngày trong tuần */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700 block">Thứ áp dụng trong tuần</span>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAllDays}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Cả tuần
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={selectWeekend}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Cuối tuần (T6–CN)
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const active = weekdays.includes(day.key);
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => toggleWeekday(day.key)}
                            className={`h-9 rounded-lg text-xs font-semibold transition-all ${active
                              ? 'bg-[var(--color-primary)] text-white shadow-sm'
                              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {weekdays.length === 0
                        ? 'Đang áp dụng: Tất cả các ngày trong tuần'
                        : `Đang chọn: ${weekdays.join(', ')}`}
                    </p>
                  </div>

                  {/* Khoảng ngày hiệu lực */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="price-rule-start-date-input" className="text-xs font-semibold text-gray-700 block mb-1">Từ ngày (bắt đầu)</label>
                      <input
                        id="price-rule-start-date-input"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="price-rule-end-date-input" className="text-xs font-semibold text-gray-700 block mb-1">Đến ngày (kết thúc)</label>
                      <input
                        id="price-rule-end-date-input"
                        type="date"
                        min={startDate || undefined}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Độ ưu tiên */}
                  <div>
                    <label htmlFor="price-rule-priority-input" className="text-xs font-semibold text-gray-700 block mb-1">
                      Mức độ ưu tiên (Priority)
                    </label>
                    <input
                      id="price-rule-priority-input"
                      type="number"
                      min="0"
                      max="1000"
                      value={priority}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Khi có nhiều quy tắc trùng ngày, quy tắc có độ ưu tiên cao hơn sẽ được áp dụng trước.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="min-h-10 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-colors ${requestType === 'DEACTIVATE'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[var(--color-primary)] hover:opacity-95'
                }`}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang gửi đề xuất…</span>
                </>
              ) : requestType === 'DEACTIVATE' ? (
                'Gửi đề xuất ngừng'
              ) : (
                'Gửi đề xuất tới Giám đốc'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
