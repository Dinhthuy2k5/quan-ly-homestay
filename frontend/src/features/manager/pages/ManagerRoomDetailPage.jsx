import React, { useEffect, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Edit,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  Sparkles,
  ShieldCheck,
  Building2,
  X,
  Plus,
  Clock
} from 'lucide-react';
import {
  getRoomDetailApi,
  updateRoomApi,
  updateRoomStatusApi,
  getManagerRoomTypesApi
} from '../api';
import { AirbnbAmenityList } from '../components/AmenityIcon';
import { AmenityPicker } from '../components/AmenityPicker';
import StatusBadge from '../../../components/ui/StatusBadge';
import { formatVnd, formatDate } from '../../../lib/format';

export function ManagerRoomDetailPage() {
  const { roomId } = useParams();
  const { homestay } = useOutletContext() || {};

  const [room, setRoom] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toasts
  const [toast, setToast] = useState({ type: '', message: '' });

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    roomTypeId: '',
    name: '',
    maxGuests: 2,
    description: '',
    amenities: []
  });
  const [newAmenityInput, setNewAmenityInput] = useState('');

  // Status form state
  const [statusForm, setStatusForm] = useState({
    status: 'ACTIVE',
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchDetail() {
      try {
        const data = await getRoomDetailApi(roomId);
        if (!active) return;
        setRoom(data);
        setEditForm({
          roomTypeId: data.roomTypeId ? String(data.roomTypeId) : '',
          name: data.name || '',
          maxGuests: data.maxGuests || 2,
          description: data.description || '',
          amenities: data.amenities || []
        });
        setStatusForm({
          status: data.status || 'ACTIVE',
          reason: ''
        });
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.error?.message || 'Không thể tải thông tin chi tiết phòng.');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDetail();

    getManagerRoomTypesApi()
      .then((types) => {
        if (active) setRoomTypes(types || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [roomId]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: '', message: '' }), 4000);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError('');
      const updated = await updateRoomApi(roomId, {
        roomTypeId: Number(editForm.roomTypeId),
        name: editForm.name.trim(),
        maxGuests: Number(editForm.maxGuests),
        description: editForm.description.trim(),
        amenities: editForm.amenities
      });
      setRoom((prev) => ({ ...prev, ...updated }));
      setEditModalOpen(false);
      showToast('success', `Đã cập nhật thông tin phòng "${updated.name}" thành công!`);
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Không thể cập nhật phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError('');
      const updated = await updateRoomStatusApi(roomId, {
        status: statusForm.status,
        reason: statusForm.reason.trim() || undefined
      });
      setRoom((prev) => ({ ...prev, status: updated.status }));
      setStatusModalOpen(false);
      showToast('success', `Đã cập nhật trạng thái phòng thành ${updated.status}!`);
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Không thể đổi trạng thái phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  const addCustomAmenity = () => {
    if (!newAmenityInput.trim()) return;
    const trimmed = newAmenityInput.trim();
    if (!editForm.amenities.includes(trimmed)) {
      setEditForm((prev) => ({
        ...prev,
        amenities: [...prev.amenities, trimmed]
      }));
    }
    setNewAmenityInput('');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Đang tải thông tin phòng...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-600 mb-2" />
        <h3 className="text-lg font-bold">Không thể hiển thị phòng</h3>
        <p className="mt-1 text-sm">{error || 'Phòng không tồn tại hoặc đã bị xóa.'}</p>
        <Link
          to="/manager/rooms"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách phòng</span>
        </Link>
      </div>
    );
  }

  // Chuẩn bị danh sách ảnh media
  const mediaList = room.media && room.media.length > 0 ? room.media : [
    { url: `/files/rooms/room-${room.id}-1.webp`, caption: 'Phòng ngủ chính' },
    { url: `/files/rooms/room-${room.id}-2.webp`, caption: 'Tầm nhìn từ phòng' },
    { url: `/files/rooms/room-${room.id}-3.webp`, caption: 'Phòng tắm tiện nghi' }
  ];

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4 py-4 space-y-6">
      {/* Toast thông báo */}
      {toast.message && (
        <div
          className={`fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/manager/rooms"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-black transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại tất cả phòng</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setEditModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Edit className="h-4 w-4 text-gray-600" />
            <span>Chỉnh sửa phòng</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalError('');
              setStatusModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors shadow-sm"
          >
            <PowerOff className="h-4 w-4 text-amber-400" />
            <span>Đổi trạng thái</span>
          </button>
        </div>
      </div>

      {/* Header phong cách Airbnb */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
          {room.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600">
          <StatusBadge type="room" status={room.status} />
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-gray-800">{room.roomTypeName || 'Loại phòng tiêu chuẩn'}</span>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span>Tối đa {room.maxGuests} khách</span>
          </div>
          {homestay && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{homestay.name} ({homestay.province})</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Airbnb 5-Photo Gallery Grid */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[320px] sm:h-[420px] lg:h-[480px]">
          {/* Main big image on the left (spanning 2 columns) */}
          <div className="md:col-span-2 relative h-full overflow-hidden group cursor-pointer" onClick={() => setGalleryModalOpen(true)}>
            <img
              src={mediaList[0]?.url}
              alt={mediaList[0]?.caption || room.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';
              }}
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
          </div>

          {/* Right smaller photos (2 columns x 2 rows) */}
          <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-full">
            {[1, 2, 3, 4].map((idx) => {
              const photo = mediaList[idx] || mediaList[idx % mediaList.length];
              return (
                <div
                  key={idx}
                  className="relative h-full overflow-hidden group cursor-pointer"
                  onClick={() => setGalleryModalOpen(true)}
                >
                  <img
                    src={photo?.url}
                    alt={photo?.caption || `${room.name} ảnh ${idx + 1}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nút xem toàn bộ ảnh */}
        <button
          type="button"
          onClick={() => setGalleryModalOpen(true)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-xs font-bold text-gray-900 backdrop-blur-md shadow-md hover:bg-white transition-all"
        >
          <span>Xem tất cả {mediaList.length} ảnh</span>
        </button>
      </div>

      {/* Main Content Layout (Left 65%, Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-4">
        {/* Left Column (Thông tin phòng chi tiết) */}
        <div className="lg:col-span-2 space-y-8 divide-y divide-gray-200">
          {/* Thông tin phòng & Người quản lý */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {room.roomTypeName || 'Phòng Homestay'} tại {homestay?.name || 'Cơ sở'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Sức chứa tối đa: <span className="font-semibold text-gray-900">{room.maxGuests} người lớn</span> •{' '}
                  {room.amenities?.length || 0} tiện nghi được cung cấp
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center font-bold text-lg shadow-inner">
                {room.name.replace(/[^0-9]/g, '') || 'R'}
              </div>
            </div>

            {/* Highlights phong cách Airbnb */}
            <div className="mt-6 space-y-4 pt-4">
              <div className="flex items-start gap-4">
                <ShieldCheck className="h-6 w-6 text-gray-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Cơ sở vật chất được xác minh</h4>
                  <p className="text-xs text-gray-500">Phòng được trang bị đồng bộ theo tiêu chuẩn của chuỗi homestay.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Sparkles className="h-6 w-6 text-gray-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Không gian nghỉ dưỡng yên tĩnh</h4>
                  <p className="text-xs text-gray-500">Thiết kế thoáng đãng, đón ánh sáng tự nhiên và view núi rừng trong lành.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-gray-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Quy trình đón tiếp chu đáo</h4>
                  <p className="text-xs text-gray-500">Quản lý cơ sở hỗ trợ check-in nhanh chóng và tư vấn trải nghiệm địa phương.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Giới thiệu về phòng này */}
          <div className="pt-8 space-y-3">
            <h3 className="text-xl font-bold text-gray-900">Giới thiệu về chỗ ở này</h3>
            <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {room.description || 'Chưa có mô tả chi tiết cho phòng này. Bấm vào nút "Chỉnh sửa phòng" để bổ sung thông tin giới thiệu hấp dẫn cho du khách.'}
            </div>
          </div>

          {/* Danh mục Tiện nghi phong cách Airbnb */}
          <div className="pt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Nơi này có những gì</h3>
              <span className="text-xs font-semibold text-gray-500">
                {room.amenities?.length || 0} tiện nghi
              </span>
            </div>
            <AirbnbAmenityList amenities={room.amenities} />
          </div>

          {/* Thông tin hồ sơ hệ thống */}
          <div className="pt-8 space-y-3">
            <h3 className="text-base font-bold text-gray-900">Thông tin kỹ thuật & Nhật ký</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="font-semibold text-gray-800">Mã định danh phòng:</span> #{room.id}
              </div>
              <div>
                <span className="font-semibold text-gray-800">Cơ sở homestay:</span> #{room.homestayId} ({homestay?.name || 'N/A'})
              </div>
              <div>
                <span className="font-semibold text-gray-800">Thời điểm khởi tạo:</span> {formatDate(room.createdAt)}
              </div>
              <div>
                <span className="font-semibold text-gray-800">Cập nhật lần cuối:</span> {formatDate(room.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Management Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl space-y-6">
            <div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {room.basePrice == null ? 'Chưa thiết lập giá' : formatVnd(room.basePrice)}
                  </span>
                  {room.basePrice != null && <span className="text-sm text-gray-500 font-normal"> / đêm</span>}
                </div>
                <StatusBadge type="room" status={room.status} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{room.basePrice == null ? 'Chưa có giá cơ bản được thiết lập.' : 'Giá cơ bản áp dụng cho ngày thường'}</p>
            </div>

            {/* Thông tin vắn tắt */}
            <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 text-xs">
              <div className="p-3">
                <span className="font-semibold uppercase tracking-wider text-gray-500 block text-[10px]">Loại phòng</span>
                <span className="font-bold text-gray-800 text-sm mt-0.5 block">{room.roomTypeName}</span>
              </div>
              <div className="p-3">
                <span className="font-semibold uppercase tracking-wider text-gray-500 block text-[10px]">Sức chứa</span>
                <span className="font-bold text-gray-800 text-sm mt-0.5 block">{room.maxGuests} khách tối đa</span>
              </div>
              <div className="p-3">
                <span className="font-semibold uppercase tracking-wider text-gray-500 block text-[10px]">Trạng thái kinh doanh</span>
                <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                  {room.status === 'ACTIVE' && 'Đang nhận đặt phòng trực tuyến'}
                  {room.status === 'LOCKED' && 'Tạm dừng đón khách (Đang bảo trì)'}
                  {room.status === 'INACTIVE' && 'Ngừng khai thác dài hạn'}
                </span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setModalError('');
                  setEditModalOpen(true);
                }}
                className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] transition-all shadow-md active:scale-[0.98]"
              >
                Chỉnh sửa thông tin phòng
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalError('');
                  setStatusModalOpen(true);
                }}
                className="w-full rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                Khóa / Mở hoạt động phòng
              </button>
            </div>

            {/* Liên hệ homestay */}
            {homestay && (
              <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">{homestay.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>Hotline: {homestay.hotlinePhone || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{homestay.address}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CHỈNH SỬA PHÒNG (API-MGR-06) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
              <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa thông tin phòng</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 flex shrink-0 items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:mx-7">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tên / Số phòng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Loại phòng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.roomTypeId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, roomTypeId: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none bg-white"
                  >
                    <option value="">-- Chọn loại phòng --</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Sức chứa tối đa (người lớn) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={editForm.maxGuests}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, maxGuests: e.target.value }))}
                  className="w-full sm:w-1/2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lưu ý: Không thể giảm số khách xuống dưới sức chứa của các đơn đặt phòng trong tương lai.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mô tả chi tiết phòng
                </label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  placeholder="Giới thiệu view phòng, giường ngủ, nội thất..."
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Tiện nghi phòng</h4>
                <p className="mb-3 mt-1 text-xs text-gray-500">Tìm và chọn các tiện nghi đang có tại phòng.</p>
                <AmenityPicker value={editForm.amenities} onChange={(amenities) => setEditForm((prev) => ({ ...prev, amenities }))} />

                {/* Thêm tiện nghi tùy chỉnh */}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newAmenityInput}
                    onChange={(e) => setNewAmenityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                    placeholder="Nhập tiện nghi khác..."
                    className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomAmenity}
                    className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐỔI TRẠNG THÁI (API-MGR-07) */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <PowerOff className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold text-gray-900">Đổi trạng thái phòng</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="mt-5 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-800 mb-2">Chọn trạng thái hoạt động</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={statusForm.status === 'ACTIVE'}
                      onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-emerald-800">Mở hoạt động (ACTIVE)</span>
                      <p className="text-xs text-gray-500">Phòng sẵn sàng đón khách đặt</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-amber-50/50">
                    <input
                      type="radio"
                      name="status"
                      value="LOCKED"
                      checked={statusForm.status === 'LOCKED'}
                      onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-amber-800">Tạm khóa phòng (LOCKED)</span>
                      <p className="text-xs text-gray-500">Tạm dừng nhận khách để dọn dẹp, sửa chữa</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="status"
                      value="INACTIVE"
                      checked={statusForm.status === 'INACTIVE'}
                      onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Ngừng kinh doanh (INACTIVE)</span>
                      <p className="text-xs text-gray-500">Ngừng khai thác phòng dài hạn</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Lý do thay đổi trạng thái
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ví dụ: Thay điều hòa, bảo trì định kỳ..."
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
                >
                  {submitting ? 'Đang cập nhật...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM BỘ SƯU TẬP ẢNH */}
      {galleryModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Hình ảnh chỗ ở ({mediaList.length} ảnh)</h3>
              <button
                type="button"
                onClick={() => setGalleryModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mediaList.map((m, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={m.url}
                      alt={m.caption || `Ảnh ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {m.caption && <p className="text-xs text-gray-600 font-medium text-center">{m.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerRoomDetailPage;
