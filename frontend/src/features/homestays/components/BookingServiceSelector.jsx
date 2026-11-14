import React, { useEffect, useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { fetchHomestayServices } from '../api';
import { formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

function dayBefore(dateKey) {
  if (!dateKey) return undefined;
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Optional service lines submitted atomically with API-CUS-01. */
export default function BookingServiceSelector({ homestayId, rooms, checkInDate, checkOutDate, value, onChange }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHomestayServices(homestayId)
      .then((items) => { if (active) setCatalog(items); })
      .catch((err) => { if (active) setError(getErrorMessage(err) || 'Không thể tải dịch vụ.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [homestayId]);

  const addLine = () => {
    if (!catalog.length || !rooms.length) return;
    const item = catalog[0];
    onChange([...value, {
      serviceId: String(item.id),
      roomId: String(rooms[0].id),
      quantity: '1',
      serviceDate: '',
      note: '',
    }]);
  };
  const updateLine = (index, patch) => onChange(value.map((line, i) => i === index ? { ...line, ...patch } : line));

  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><Sparkles className="h-4 w-4 text-[var(--color-primary)]" />Dịch vụ tùy chọn</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Đăng ký ngay cùng booking; chỉ tính phí khi homestay xác nhận đã sử dụng.</p>
        </div>
        <button type="button" onClick={addLine} disabled={loading || !catalog.length} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--color-surface-soft)] disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Thêm dịch vụ</button>
      </div>
      {loading && <p className="text-xs text-[var(--color-muted)]">Đang tải danh mục…</p>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {!loading && !error && catalog.length === 0 && <p className="text-xs text-[var(--color-muted)]">Homestay chưa có dịch vụ để đăng ký.</p>}
      {value.map((line, index) => {
        const service = catalog.find((item) => String(item.id) === line.serviceId) || catalog[0];
        return (
          <div key={`${index}-${line.serviceId}`} className="grid gap-3 rounded-lg bg-[var(--color-surface-soft)] p-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[var(--color-body)]">Dịch vụ
              <select value={line.serviceId} onChange={(e) => updateLine(index, { serviceId: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm">
                {catalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatVnd(item.unitPrice)} / {item.unit}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--color-body)]">Dành cho phòng
              <select value={line.roomId} onChange={(e) => updateLine(index, { roomId: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm">
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--color-body)]">Số lượng{service?.unit ? ` (${service.unit})` : ''}
              <input type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-[var(--color-body)]">Ngày sử dụng (tùy chọn)
              <input type="date" min={checkInDate} max={dayBefore(checkOutDate)} value={line.serviceDate} onChange={(e) => updateLine(index, { serviceDate: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-[var(--color-body)] sm:col-span-2">Ghi chú (tùy chọn)
              <input maxLength="255" value={line.note} onChange={(e) => updateLine(index, { note: e.target.value })} placeholder="Ví dụ: ăn chay, phục vụ lúc 19 giờ" className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm" />
            </label>
            <p className="text-xs text-[var(--color-muted)] sm:col-span-2">Đơn giá tại thời điểm đăng ký: {formatVnd(service?.unitPrice || 0)} / {service?.unit || 'đơn vị'}</p>
            <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-rose-700 hover:underline sm:col-span-2"><Trash2 className="h-3.5 w-3.5" />Bỏ dịch vụ này</button>
          </div>
        );
      })}
    </section>
  );
}
