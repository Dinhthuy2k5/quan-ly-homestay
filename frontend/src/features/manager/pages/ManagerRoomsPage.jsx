import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BedDouble,
  Plus,
  Search,
  Users,
  Edit,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  List
} from 'lucide-react';
import {
  getManagerRoomsApi,
  createRoomApi,
  getRoomDetailApi,
  updateRoomApi,
  updateRoomStatusApi,
  getManagerRoomTypesApi
} from '../api';
import { AmenityBadge } from '../components/AmenityIcon';
import { AmenityPicker } from '../components/AmenityPicker';
import StatusBadge from '../../../components/ui/StatusBadge';
import { formatVnd } from '../../../lib/format';
import { fileUrl } from '../../../lib/api/client';

function RoomCoverImage({ room, className }) {
  const [failed, setFailed] = useState(false);
  const src = fileUrl(room.coverImageUrl);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-gray-100 text-gray-400 ${className}`} aria-label={`Chưa có ảnh cho ${room.name}`}>
        <BedDouble aria-hidden="true" className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={room.name}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function ManagerRoomsPage() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, size: 12, totalElements: 0, totalPages: 1 });

  // View mode: 'grid' (Airbnb style) or 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Filter state
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');

  // Alerts
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    roomTypeId: '',
    name: '',
    maxGuests: 2,
    description: '',
    amenities: ['Wifi tốc độ cao', 'Điều hòa 2 chiều']
  });
  const [createMediaFiles, setCreateMediaFiles] = useState([]);

  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editForm, setEditForm] = useState({
    roomTypeId: '',
    name: '',
    maxGuests: 2,
    description: '',
    amenities: []
  });

  const [statusTargetRoom, setStatusTargetRoom] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: 'LOCKED',
    reason: ''
  });

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    getManagerRoomTypesApi()
      .then((types) => {
        if (active) setRoomTypes(types || []);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getManagerRoomsApi({
      status: filterStatus || undefined,
      roomTypeId: filterRoomType ? Number(filterRoomType) : undefined,
      keyword: activeKeyword || undefined,
      page: currentPage,
      size: 12
    })
      .then((data) => {
        if (!active) return;
        setRooms(data.items || []);
        if (data.meta) {
          setPagination(data.meta);
        }
      })
      .catch((err) => {
        if (!active) return;
        setErrorToast(err.response?.data?.error?.message || 'Không thể tải danh sách phòng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterStatus, filterRoomType, activeKeyword, currentPage, reloadTrigger]);

  const showSuccess = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveKeyword(searchKeyword.trim());
    setCurrentPage(0);
  };

  const closeCreateModal = () => {
    if (modalSubmitting) return;
    setCreateMediaFiles([]);
    setModalError('');
    setCreateModalOpen(false);
  };

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterRoomType('');
    setSearchKeyword('');
    setActiveKeyword('');
    setCurrentPage(0);
  };

  const addCustomAmenity = (isEdit = false) => {
    if (!customAmenityInput.trim()) return;
    const item = customAmenityInput.trim();
    if (isEdit) {
      if (!editForm.amenities.includes(item)) {
        setEditForm((prev) => ({ ...prev, amenities: [...prev.amenities, item] }));
      }
    } else {
      if (!createForm.amenities.includes(item)) {
        setCreateForm((prev) => ({ ...prev, amenities: [...prev.amenities, item] }));
      }
    }
    setCustomAmenityInput('');
  };

  // API-MGR-04: Tạo phòng mới
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await createRoomApi({
        roomTypeId: Number(createForm.roomTypeId),
        name: createForm.name.trim(),
        maxGuests: Number(createForm.maxGuests),
        description: createForm.description.trim(),
        amenities: createForm.amenities,
        files: createMediaFiles
      });
      setCreateModalOpen(false);
      showSuccess(`Đã tạo mới phòng "${createForm.name}" thành công!`);
      setCreateForm({
        roomTypeId: roomTypes[0]?.id ? String(roomTypes[0].id) : '',
        name: '',
        maxGuests: 2,
        description: '',
        amenities: ['Wifi tốc độ cao', 'Điều hòa 2 chiều']
      });
      setCreateMediaFiles([]);
      setCurrentPage(0);
      setReloadTrigger((k) => k + 1);
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Không thể tạo phòng mới.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Mở modal sửa phòng
  const handleOpenEdit = async (e, roomId) => {
    e.stopPropagation();
    try {
      setModalError('');
      setEditingRoomId(roomId);
      const detail = await getRoomDetailApi(roomId);
      setEditForm({
        roomTypeId: detail.roomTypeId ? String(detail.roomTypeId) : '',
        name: detail.name || '',
        maxGuests: detail.maxGuests || 2,
        description: detail.description || '',
        amenities: detail.amenities || []
      });
      setEditModalOpen(true);
    } catch (err) {
      setErrorToast(err.response?.data?.error?.message || 'Không thể lấy thông tin phòng để sửa.');
    }
  };

  // API-MGR-06: Sửa phòng
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await updateRoomApi(editingRoomId, {
        roomTypeId: Number(editForm.roomTypeId),
        name: editForm.name.trim(),
        maxGuests: Number(editForm.maxGuests),
        description: editForm.description.trim(),
        amenities: editForm.amenities
      });
      setEditModalOpen(false);
      showSuccess(`Đã cập nhật phòng "${editForm.name}" thành công!`);
      setReloadTrigger((k) => k + 1);
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Không thể cập nhật thông tin phòng.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Mở modal đổi trạng thái
  const handleOpenStatus = (e, room) => {
    e.stopPropagation();
    setStatusTargetRoom(room);
    setStatusForm({
      status: room.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
      reason: room.statusReason || ''
    });
    setModalError('');
    setStatusModalOpen(true);
  };

  // API-MGR-07: Đổi trạng thái
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusTargetRoom) return;
    try {
      setModalSubmitting(true);
      setModalError('');
      await updateRoomStatusApi(statusTargetRoom.id, {
        status: statusForm.status,
        reason: statusForm.reason.trim() || undefined
      });
      setStatusModalOpen(false);
      const statusText = statusForm.status === 'ACTIVE' ? 'Mở hoạt động' : statusForm.status === 'LOCKED' ? 'Tạm khóa' : 'Ngừng kinh doanh';
      showSuccess(`Đã chuyển trạng thái phòng "${statusTargetRoom.name}" sang "${statusText}"!`);
      setReloadTrigger((k) => k + 1);
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Không thể thay đổi trạng thái phòng.');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl transition-all">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Top Header & Search Bar (Phong cách Airbnb) */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Quản lý danh sách phòng
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Tổng số <span className="font-bold text-gray-900">{pagination.totalElements}</span> phòng đang được cấu hình tại cơ sở homestay.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
                title="Dạng lưới phong cách Airbnb"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Lưới </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
                title="Dạng danh sách bảng"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Bảng</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setModalError('');
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-primary-hover)] transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm phòng mới</span>
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm và bộ lọc tròn kiểu Airbnb */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên phòng, mô tả (nhấn Enter)..."
              className="w-full rounded-full border border-gray-300 pl-11 pr-4 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black shadow-sm transition-all"
            />
          </form>

          {/* Lọc Trạng thái */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(0);
            }}
            className="rounded-full border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white shadow-sm focus:border-black focus:outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
            <option value="LOCKED">Tạm khóa (LOCKED)</option>
            <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
          </select>

          {/* Lọc Loại phòng */}
          <select
            value={filterRoomType}
            onChange={(e) => {
              setFilterRoomType(e.target.value);
              setCurrentPage(0);
            }}
            className="rounded-full border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white shadow-sm focus:border-black focus:outline-none"
          >
            <option value="">Tất cả loại phòng</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          {(filterStatus || filterRoomType || activeKeyword) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-full border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Danh sách phòng: DẠNG LƯỚI AIRBNB */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-500">Đang tải danh sách phòng...</p>
          </div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <BedDouble className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-900">Không tìm thấy phòng nào</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterStatus || filterRoomType || activeKeyword
              ? 'Không có phòng nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Cơ sở homestay này hiện chưa được cấu hình phòng nào.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {(filterStatus || filterRoomType || activeKeyword) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Xóa bộ lọc
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setModalError('');
                setCreateModalOpen(true);
              }}
              className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black"
            >
              Thêm phòng mới ngay
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* AIRBNB CARD GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms.map((room) => {
            return (
              <div
                key={room.id}
                onClick={() => navigate(`/manager/rooms/${room.id}`)}
                className="group flex flex-col cursor-pointer transition-transform duration-200"
              >
                {/* Photo container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm border border-gray-100">
                  <RoomCoverImage room={room} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {/* Status Badge floating on top right */}
                  <div className="absolute top-3 right-3">
                    <StatusBadge type="room" status={room.status} />
                  </div>

                  {/* ID badge top left */}
                  <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                    #{room.id}
                  </div>
                </div>

                {/* Details below photo */}
                <div className="mt-3 flex flex-col space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold text-base text-gray-900 truncate group-hover:text-black">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      <span>{room.maxGuests} khách</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 truncate">
                    {room.roomTypeName || 'Loại phòng tiêu chuẩn'}
                  </p>

                  {/* Amenity icons preview */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-hidden">
                    {room.amenities && room.amenities.slice(0, 3).map((amenity, idx) => (
                      <AmenityBadge key={idx} name={amenity} className="!py-0.5 !px-2 !text-[11px]" />
                    ))}
                    {room.amenities && room.amenities.length > 3 && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        +{room.amenities.length - 3}
                      </span>
                    )}
                  </div>

                  {room.status === 'LOCKED' && room.statusReason && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-[11px] text-amber-800">
                      <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />
                      <span className="truncate" title={room.statusReason}>{room.statusReason}</span>
                    </div>
                  )}

                  {/* Pricing row */}
                  <div className="pt-2 flex items-baseline justify-between border-t border-gray-100 mt-2">
                    <div>
                      <span className="font-bold text-sm text-gray-900">
                        {room.basePrice == null ? 'Chưa thiết lập giá' : formatVnd(room.basePrice)}
                      </span>
                      {room.basePrice != null && <span className="text-xs text-gray-500 font-normal"> / đêm</span>}
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(e, room.id)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
                        title="Chỉnh sửa thông tin phòng"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenStatus(e, room)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-600 transition-colors"
                        title="Đổi trạng thái phòng"
                      >
                        <PowerOff className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DẠNG BẢNG TRUYỀN THỐNG */
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Loại phòng</th>
                  <th className="px-6 py-4">Sức chứa</th>
                  <th className="px-6 py-4">Tiện nghi</th>
                  <th className="px-6 py-4">Giá cơ bản</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    onClick={() => navigate(`/manager/rooms/${room.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <RoomCoverImage room={room} className="h-10 w-12 rounded-lg object-cover" />
                        <div>
                          <span className="font-bold text-gray-900 block">{room.name}</span>
                          <span className="text-xs text-gray-400">ID: #{room.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{room.roomTypeName}</td>
                    <td className="px-6 py-4">{room.maxGuests} khách</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {room.amenities?.slice(0, 2).map((a, i) => (
                          <AmenityBadge key={i} name={a} className="!py-0.5 !px-1.5 !text-[10px]" />
                        ))}
                        {room.amenities?.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{room.amenities.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {room.basePrice == null ? 'Chưa thiết lập giá' : `${formatVnd(room.basePrice)} / đêm`}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type="room" status={room.status} />
                      {room.status === 'LOCKED' && room.statusReason && (
                        <p className="mt-1 text-[11px] text-amber-700 max-w-[180px] truncate" title={room.statusReason}>
                          {room.statusReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/manager/rooms/${room.id}`}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black"
                          title="Xem chi tiết phong cách Airbnb"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(e, room.id)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black"
                          title="Sửa phòng"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenStatus(e, room)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-600"
                          title="Đổi trạng thái"
                        >
                          <PowerOff className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phân trang */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm text-sm">
          <span className="text-xs text-gray-500">
            Trang <span className="font-bold text-gray-900">{pagination.page + 1}</span> / {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page === 0}
              onClick={() => setCurrentPage(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages - 1}
              onClick={() => setCurrentPage(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TẠO PHÒNG MỚI (API-MGR-04) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
              <h3 className="text-xl font-bold text-gray-900">Thêm phòng mới cho homestay</h3>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={modalSubmitting}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
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

            <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tên / Số phòng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: Phòng 101 - Ban công"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Loại phòng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.roomTypeId}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, roomTypeId: e.target.value }))}
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
                  value={createForm.maxGuests}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, maxGuests: e.target.value }))}
                  className="w-full sm:w-1/2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mô tả chi tiết phòng
                </label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Giới thiệu view phòng, giường ngủ, không gian..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="create-room-media" className="block text-sm font-semibold text-gray-900">
                  Ảnh phòng <span className="font-normal text-gray-500">(không bắt buộc, tối đa 8 ảnh)</span>
                </label>
                <p className="mb-2 mt-1 text-xs text-gray-500">Mỗi ảnh tối đa 5 MB. Hỗ trợ JPG, PNG và WEBP.</p>
                <input
                  id="create-room-media"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    const selectedFiles = Array.from(event.target.files || []);
                    event.target.value = '';
                    const invalidSize = selectedFiles.find((file) => file.size > 5 * 1024 * 1024);
                    if (invalidSize) {
                      setModalError(`Ảnh "${invalidSize.name}" vượt quá giới hạn 5 MB.`);
                      return;
                    }

                    const additions = selectedFiles.filter((file) => !createMediaFiles.some(
                        (current) => current.name === file.name
                          && current.size === file.size
                          && current.lastModified === file.lastModified
                    ));
                    if (createMediaFiles.length + additions.length > 8) {
                      setModalError('Bạn chỉ có thể chọn tối đa 8 ảnh cho một phòng.');
                      return;
                    }
                    setModalError('');
                    setCreateMediaFiles((currentFiles) => [...currentFiles, ...additions]);
                  }}
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
                {createMediaFiles.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600" aria-live="polite">
                    {createMediaFiles.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3">
                        <span className="truncate">{file.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                          <button
                            type="button"
                            aria-label={`Bỏ ảnh ${file.name}`}
                            onClick={() => setCreateMediaFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <X aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Tiện nghi phòng</h4>
                <p className="mb-3 mt-1 text-xs text-gray-500">Tìm và chọn các tiện nghi đang có tại phòng.</p>
                <AmenityPicker value={createForm.amenities} onChange={(amenities) => setCreateForm((prev) => ({ ...prev, amenities }))} />

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={customAmenityInput}
                    onChange={(e) => setCustomAmenityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity(false))}
                    placeholder="Nhập tiện nghi khác..."
                    className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addCustomAmenity(false)}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={modalSubmitting}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
                >
                  {modalSubmitting ? 'Đang tạo...' : 'Tạo phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA PHÒNG (API-MGR-06) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
              <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa thông tin phòng</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
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
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
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
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mô tả chi tiết phòng
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Tiện nghi phòng</h4>
                <p className="mb-3 mt-1 text-xs text-gray-500">Tìm và chọn các tiện nghi đang có tại phòng.</p>
                <AmenityPicker value={editForm.amenities} onChange={(amenities) => setEditForm((prev) => ({ ...prev, amenities }))} />

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={customAmenityInput}
                    onChange={(e) => setCustomAmenityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity(true))}
                    placeholder="Nhập tiện nghi khác..."
                    className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addCustomAmenity(true)}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={modalSubmitting}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
                >
                  {modalSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐỔI TRẠNG THÁI (API-MGR-07) */}
      {statusModalOpen && statusTargetRoom && (
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
                <p className="text-xs text-gray-500">
                  Thao tác trên phòng: <span className="font-bold text-gray-900">{statusTargetRoom.name}</span>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-2">Chọn trạng thái mới</label>
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
                  disabled={modalSubmitting}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
                >
                  {modalSubmitting ? 'Đang cập nhật...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerRoomsPage;
