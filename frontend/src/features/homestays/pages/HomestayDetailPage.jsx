import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { fetchHomestayDetail, fetchHomestayRoomTypes, fetchHomestayRooms, searchAvailableRooms, fetchHomestayPolicies, fetchHomestayServices } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import HomestayLocationMap from '../components/HomestayLocationMap';
import HomestayPolicySection from '../components/HomestayPolicySection';
import { getAmenityMeta } from '../../../lib/amenities';
import { getServiceIcon } from '../../../lib/services';
import { formatVnd, getNextDate, nightsBetween } from '../../../lib/format';

function DetailSkeleton() {
  return (
    <div aria-label="Đang tải thông tin homestay" className="mx-auto max-w-7xl animate-pulse space-y-6">
      <div className="h-8 w-1/2 rounded bg-[var(--color-surface-soft)]" />
      <div className="aspect-[16/7] rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)]" />
      <div className="h-24 rounded bg-[var(--color-surface-soft)]" />
    </div>
  );
}

export function HomestayDetailPage() {
  const { homestayId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todayDate] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  });
  const [homestay, setHomestay] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsPage, setRoomsPage] = useState(0);
  const [roomsMeta, setRoomsMeta] = useState({ page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [priceSort, setPriceSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomTypesError, setRoomTypesError] = useState('');
  const [roomsError, setRoomsError] = useState('');
  const [checkInDate, setCheckInDate] = useState(() => searchParams.get('checkIn') || '');
  const [checkOutDate, setCheckOutDate] = useState(() => searchParams.get('checkOut') || '');
  const [guestCount, setGuestCount] = useState(() => Math.max(1, Number(searchParams.get('guests') || 2)));
  const [availableRooms, setAvailableRooms] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Quản lý các phòng được chọn để đặt nhiều phòng cùng lúc
  const [selectedRoomIds, setSelectedRoomIds] = useState(() => new Set((searchParams.get('rooms') || '').split(',').filter(Boolean).map(Number)));

  // Quản lý chính sách & quy định lưu trú của homestay (API-PUB-POLICY-01)
  const [policies, setPolicies] = useState(null);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState('');
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [homestayId]);

  useEffect(() => {
    const urlCheckIn = searchParams.get('checkIn');
    const urlCheckOut = searchParams.get('checkOut');
    if (!urlCheckIn || !urlCheckOut || urlCheckOut <= urlCheckIn || !homestayId) {
      return undefined;
    }
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setAvailabilityLoading(true);
      searchAvailableRooms({
        homestayId,
        checkInDate: urlCheckIn,
        checkOutDate: urlCheckOut,
        guestCount: 1,
        page: 0,
        size: 100,
      })
        .then((result) => {
          if (active) setAvailableRooms(result.items || []);
        })
        .catch((err) => {
          if (active) {
            setAvailabilityError(getErrorMessage(err));
            setAvailableRooms(null);
          }
        })
        .finally(() => {
          if (active) setAvailabilityLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [homestayId, searchParams]);

  useEffect(() => {
    if (!homestayId) return undefined;
    let active = true;
    Promise.allSettled([
      fetchHomestayDetail(homestayId),
      fetchHomestayRoomTypes(homestayId),
      fetchHomestayPolicies(homestayId),
      fetchHomestayServices(homestayId),
    ])
      .then(([detailResult, typesResult, policiesResult, servicesResult]) => {
        if (!active) return;
        if (detailResult.status === 'fulfilled') {
          setHomestay(detailResult.value);
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } else {
          setError(getErrorMessage(detailResult.reason));
        }

        if (typesResult.status === 'fulfilled') {
          setRoomTypes(typesResult.value || []);
        } else {
          setRoomTypesError(getErrorMessage(typesResult.reason));
        }

        if (policiesResult.status === 'fulfilled') {
          setPolicies(policiesResult.value);
          setPoliciesError('');
        } else {
          setPoliciesError(getErrorMessage(policiesResult.reason));
        }

        if (servicesResult.status === 'fulfilled') {
          setServices(servicesResult.value || []);
          setServicesError('');
        } else {
          setServicesError(getErrorMessage(servicesResult.reason));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setPoliciesLoading(false);
          setServicesLoading(false);
        }
      });
    return () => { active = false; };
  }, [homestayId, reloadKey]);

  useEffect(() => {
    if (!homestayId) return undefined;
    let active = true;
    fetchHomestayRooms(homestayId, { page: roomsPage, size: roomsMeta.size })
      .then((result) => {
        if (!active) return;
        setRooms(result.items || []);
        setRoomsMeta((current) => ({ ...current, ...result }));
        setRoomsError('');
      })
      .catch((roomError) => { if (active) setRoomsError(getErrorMessage(roomError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [homestayId, reloadKey, roomsPage, roomsMeta.size]);

  const retry = () => {
    setLoading(true);
    setPoliciesLoading(true);
    setServicesLoading(true);
    setError('');
    setPoliciesError('');
    setServicesError('');
    setRoomTypesError('');
    setRoomsError('');
    setReloadKey((key) => key + 1);
  };

  const handleAvailabilitySearch = async (event) => {
    if (event) event.preventDefault();
    setAvailabilityError('');
    setSelectedRoomIds(new Set());
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setAvailabilityError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      return;
    }
    setAvailabilityLoading(true);
    try {
      const result = await searchAvailableRooms({
        homestayId,
        checkInDate,
        checkOutDate,
        guestCount: 1, // Lấy tất cả các phòng còn trống trong homestay để khách có thể chọn phối hợp nhiều phòng
        page: 0,
        size: 100,
      });
      setAvailableRooms(result.items || []);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('checkIn', checkInDate);
      nextParams.set('checkOut', checkOutDate);
      nextParams.set('guests', String(guestCount));
      setSearchParams(nextParams, { replace: true });
    } catch (searchError) {
      setAvailabilityError(getErrorMessage(searchError));
      setAvailableRooms(null);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const toggleSelectRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  if (loading) return <DetailSkeleton />;
  if (error || !homestay) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <ErrorBanner message={error || 'Không tìm thấy thông tin homestay.'} onRetry={retry} />
        <div className="mt-4 text-center"><Link to="/"><Button variant="secondary">Quay lại khám phá</Button></Link></div>
      </div>
    );
  }

  const media = homestay.media || [];
  const photos = media.slice(0, 5);
  const selectedRoomType = roomTypes.find((type) => String(type.id) === roomTypeFilter);
  const visibleRooms = (availableRooms ?? rooms)
    .filter((room) => !roomTypeFilter || String(room.roomTypeId) === roomTypeFilter || room.roomTypeName === roomTypeFilter || (selectedRoomType && room.roomTypeName === selectedRoomType.name))
    .sort((a, b) => priceSort === 'asc'
      ? (a.roomTotalPrice ?? a.nightlyPrice ?? Number.MAX_SAFE_INTEGER) - (b.roomTotalPrice ?? b.nightlyPrice ?? Number.MAX_SAFE_INTEGER)
      : priceSort === 'desc'
        ? (b.roomTotalPrice ?? b.nightlyPrice ?? -1) - (a.roomTotalPrice ?? a.nightlyPrice ?? -1)
        : 0);

  const selectedRooms = (availableRooms || []).filter((r) =>
    selectedRoomIds.has(r.roomId ?? r.id)
  );
  const totalSelectedPrice = selectedRooms.reduce((sum, r) => sum + (r.roomTotalPrice || 0), 0);
  const totalSelectedCapacity = selectedRooms.reduce((sum, r) => sum + Number(r.maxGuests || 0), 0);
  const nights = checkInDate && checkOutDate ? nightsBetween(checkInDate, checkOutDate) : 0;

  return (
    <article className="mx-auto max-w-7xl space-y-8 sm:space-y-10 pb-28">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Link to="/" className="rounded-sm hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]">Khám phá</Link>
        <span aria-hidden="true">›</span>
        <span className="truncate font-medium text-[var(--color-ink)]">{homestay.name}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">{homestay.name}</h1>
        <p className="flex items-start gap-2 text-sm text-[var(--color-body)] sm:text-base">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <span>{[homestay.address, homestay.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}</span>
        </p>
      </header>

      {photos.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-[var(--radius-lg)] md:h-[420px] md:grid-cols-4">
          <img src={fileUrl(photos[0].url)} alt={photos[0].caption || homestay.name} fetchPriority="high" className="aspect-[4/3] h-full w-full object-cover md:col-span-2 md:aspect-auto" />
          {photos.slice(1, 5).length > 0 && (
            <div className="hidden grid-cols-2 grid-rows-2 gap-2 md:col-span-2 md:grid">
              {photos.slice(1, 5).map((photo, index) => (
                <img key={photo.id || photo.url || index} src={fileUrl(photo.url)} alt={photo.caption || `${homestay.name}, ảnh ${index + 2}`} loading="lazy" className="h-full min-h-0 w-full object-cover" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-[16/7] flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
          <Home aria-hidden="true" className="mb-3 h-12 w-12" />
          <p>Homestay chưa có ảnh giới thiệu.</p>
        </div>
      )}

      <div className="space-y-10">
        <section aria-labelledby="homestay-description" className="border-b border-[var(--color-border)] pb-8">
          <h2 id="homestay-description" className="text-xl font-semibold text-[var(--color-ink)]">Giới thiệu cơ sở</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-[var(--color-body)]">{homestay.description || 'Homestay chưa cập nhật phần giới thiệu.'}</p>
        </section>

        <section aria-labelledby="homestay-services-title" className="border-b border-[var(--color-border)] pb-8">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 id="homestay-services-title" className="text-xl font-semibold text-[var(--color-ink)]">Dịch vụ tại homestay</h2>
          </div>
          {servicesLoading ? (
            <div aria-label="Đang tải dịch vụ" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />)}
            </div>
          ) : servicesError ? (
            <ErrorBanner message={servicesError} onRetry={retry} className="mt-4" />
          ) : services.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {services.map((service) => {
                const Icon = getServiceIcon(service.name);
                return (
                  <li key={service.id} className="flex min-h-28 min-w-0 gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
                    <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-ink)]" strokeWidth={1.5} />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-6 text-[var(--color-ink)]">{service.name}</h3>
                        {service.description && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--color-body)]">{service.description}</p>}
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold leading-5 text-[var(--color-ink)]">
                        <span className="block whitespace-nowrap">{formatVnd(service.unitPrice)}</span>
                        <span className="mt-0.5 block whitespace-nowrap text-xs font-normal text-[var(--color-muted)]">/ {service.unit}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-body)]">Homestay hiện chưa công khai dịch vụ bổ sung.</p>
          )}
        </section>

        <section id="rooms" aria-labelledby="rooms-title" className="scroll-mt-28">
          <form onSubmit={handleAvailabilitySearch} className="mb-6 grid gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-1)] sm:grid-cols-[1fr_1fr_0.7fr_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-semibold text-[var(--color-body)]">Ngày nhận phòng
              <input
                type="date"
                required
                min={todayDate}
                value={checkInDate}
                onChange={(event) => {
                  const nextIn = event.target.value;
                  setCheckInDate(nextIn);
                  const minOut = getNextDate(nextIn);
                  if (checkOutDate && checkOutDate < minOut) {
                    setCheckOutDate('');
                    setAvailableRooms(null);
                    setSelectedRoomIds(new Set());
                    setAvailabilityError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
                  } else {
                    setAvailabilityError('');
                  }
                }}
                className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[var(--color-body)]">Ngày trả phòng
              <input
                type="date"
                required
                min={checkInDate ? getNextDate(checkInDate) : todayDate}
                value={checkOutDate}
                onChange={(event) => {
                  const nextOut = event.target.value;
                  setCheckOutDate(nextOut);
                  if (checkInDate && nextOut <= checkInDate) {
                    setAvailabilityError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
                    setAvailableRooms(null);
                    setSelectedRoomIds(new Set());
                  } else {
                    setAvailabilityError('');
                  }
                }}
                className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[var(--color-body)]">Số khách dự kiến
              <input type="number" min="1" max="50" required value={guestCount} onChange={(event) => setGuestCount(Math.max(1, Number(event.target.value)))} className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)]" />
            </label>
            <button type="submit" disabled={availabilityLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60 shadow-xs"><Search aria-hidden="true" className="h-4 w-4" />{availabilityLoading ? 'Đang tìm…' : 'Tìm phòng'}</button>
          </form>
          {availabilityError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{availabilityError}</p>}
          <div className="mb-5 flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BedDouble aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" />
                <h2 id="rooms-title" className="text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">Phòng tại {homestay.name}</h2>
              </div>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {availableRooms === null
                  ? `${roomsMeta.totalElements} phòng đang được công khai (Chọn ngày để đặt một hoặc nhiều phòng)`
                  : `${availableRooms.length} phòng còn trống từ ${checkInDate} đến ${checkOutDate} · Bạn có thể chọn nhiều phòng để đặt cùng lúc`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="room-type-filter">Lọc theo loại phòng</label>
              <div className="relative">
                <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <select id="room-type-filter" value={roomTypeFilter} onChange={(event) => setRoomTypeFilter(event.target.value)} className="min-h-11 rounded-full border border-[var(--color-border)] bg-white py-2 pl-9 pr-4 text-sm text-[var(--color-ink)]">
                  <option value="">Tất cả loại phòng</option>
                  {roomTypes.map((type) => <option key={type.id} value={String(type.id)}>{type.name}</option>)}
                </select>
              </div>
              <label className="sr-only" htmlFor="room-price-sort">Sắp xếp giá phòng</label>
              <select id="room-price-sort" value={priceSort} onChange={(event) => setPriceSort(event.target.value)} className="min-h-11 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-ink)]">
                <option value="">Thứ tự mặc định</option>
                <option value="asc">Giá thấp đến cao</option>
                <option value="desc">Giá cao đến thấp</option>
              </select>
            </div>
          </div>

          {roomsError && availableRooms === null ? <ErrorBanner message={roomsError} onRetry={retry} className="my-4" /> : visibleRooms.length === 0 ? (
            <EmptyState title={availableRooms !== null ? 'Không có phòng trống trong khoảng ngày này' : rooms.length ? 'Không có phòng phù hợp' : 'Chưa có phòng được công khai'} description={availableRooms !== null ? 'Thử đổi ngày lưu trú hoặc chọn ngày khác.' : rooms.length ? 'Thử chọn loại phòng khác.' : 'Homestay chưa mở phòng nào để khách xem. Bạn có thể liên hệ trực tiếp để được tư vấn.'} />
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRooms.map((room) => {
                const roomId = room.roomId ?? room.id;
                const isSelected = selectedRoomIds.has(roomId);
                const isAvailableView = availableRooms !== null;

                return (
                  <article
                    key={roomId}
                    className={`group min-w-0 rounded-2xl p-3 border transition-all duration-200 flex flex-col justify-between ${isSelected
                      ? 'border-[var(--color-primary)] bg-emerald-50/20 shadow-[var(--shadow-1)] ring-2 ring-[var(--color-primary)]/20'
                      : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]'
                      }`}
                  >
                    <div>
                      <Link
                        to={`/rooms/${roomId}${availableRooms === null
                          ? ''
                          : `?checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guestCount}`
                          }`}
                        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-surface-soft)]">
                          {room.coverImageUrl ? (
                            <img
                              src={fileUrl(room.coverImageUrl)}
                              alt={room.roomName || room.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[var(--color-muted)]">
                              <BedDouble aria-hidden="true" className="h-10 w-10" />
                            </div>
                          )}

                          {isSelected && (
                            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Đã chọn</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-[var(--color-ink)]">
                              {room.roomName || room.name}
                            </h3>
                            <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                              {room.roomTypeName || 'Phòng lưu trú'}
                              {homestay.province ? ` · ${homestay.province}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-[var(--color-ink)]">
                            {room.roomTotalPrice != null ? (
                              <>
                                {formatVnd(room.roomTotalPrice)}{' '}
                                <span className="font-normal text-[var(--color-muted)]">
                                  / {nights} đêm
                                </span>
                              </>
                            ) : room.nightlyPrice == null ? (
                              'Chưa thiết lập giá'
                            ) : (
                              <>
                                {formatVnd(room.nightlyPrice)}{' '}
                                <span className="font-normal text-[var(--color-muted)]">
                                  / đêm
                                </span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-body)]">
                          <Users aria-hidden="true" className="h-4 w-4 text-[var(--color-muted)]" />
                          <span>Tối đa {room.maxGuests ?? '—'} khách</span>
                        </div>

                        {room.amenities?.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted)]">
                            {room.amenities.slice(0, 3).map((name) => {
                              const Icon = getAmenityMeta(name).icon;
                              return (
                                <li key={name} className="inline-flex items-center gap-1">
                                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                                  {name}
                                </li>
                              );
                            })}
                            {room.amenities.length > 3 && <li>+{room.amenities.length - 3} tiện nghi</li>}
                          </ul>
                        )}
                      </Link>
                    </div>

                    {/* Nút chọn phòng khi đang trong chế độ tìm phòng theo ngày */}
                    {isAvailableView && (
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => toggleSelectRoom(roomId)}
                          className={`flex w-full min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${isSelected
                            ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                            : 'border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]'
                            }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-4 w-4 stroke-[2.5]" />
                              <span>Đã chọn (Nhấn để hủy)</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span> Chọn phòng này</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {availableRooms === null && roomsMeta.totalPages > 1 && (
            <nav aria-label="Phân trang danh sách phòng" className="mt-8 flex items-center justify-center gap-4">
              <button type="button" disabled={roomsMeta.page <= 0} onClick={() => setRoomsPage((page) => Math.max(0, page - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] px-4 text-sm font-medium disabled:opacity-40"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Trước</button>
              <span className="text-sm text-[var(--color-muted)]">Trang {roomsMeta.page + 1} / {roomsMeta.totalPages}</span>
              <button type="button" disabled={roomsMeta.page >= roomsMeta.totalPages - 1} onClick={() => setRoomsPage((page) => page + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] px-4 text-sm font-medium disabled:opacity-40">Sau<ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </nav>
          )}
        </section>

        <section aria-labelledby="room-types-title" className="border-t border-[var(--color-border)] pt-8">
          <h2 id="room-types-title" className="text-lg font-semibold text-[var(--color-ink)]">Các loại phòng</h2>
          {roomTypesError ? <ErrorBanner message={roomTypesError} onRetry={retry} className="my-4" /> : roomTypes.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {roomTypes.map((type) => <article key={type.id} className="rounded-2xl border border-[var(--color-border)] p-4"><h3 className="font-semibold text-[var(--color-ink)]">{type.name}</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{type.description || 'Chưa có mô tả cho loại phòng này.'}</p></article>)}
            </div>
          ) : <p className="mt-3 text-sm text-[var(--color-muted)]">Chưa có thông tin loại phòng.</p>}
        </section>

        {/* Chính sách & Quy định lưu trú (API-PUB-POLICY-01) */}
        <HomestayPolicySection
          policies={policies}
          loading={policiesLoading}
          error={policiesError}
          className="border-t border-[var(--color-border)] pt-10"
        />

        <aside className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-semibold text-[var(--color-ink)]">Cần tư vấn thêm?</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Gọi homestay để hỏi về phòng và ngày lưu trú mong muốn.</p></div>
            {homestay.hotlinePhone ? <a href={`tel:${homestay.hotlinePhone}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-semibold text-white hover:bg-[var(--color-primary-hover)]"><Phone aria-hidden="true" className="h-4 w-4" />Gọi {homestay.hotlinePhone}</a> : <p className="text-sm text-[var(--color-muted)]">Chưa cập nhật hotline.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-body)]"><p>Nhận phòng từ {CHECK_IN_TIME}</p><p>Trả phòng đến hết {CHECK_OUT_DEADLINE}</p></div>
        </aside>
      </div>

      <HomestayLocationMap
        address={homestay.address}
        province={homestay.province}
        homestayName={homestay.name}
        hotlinePhone={homestay.hotlinePhone}
        className="border-t border-[var(--color-border)] pt-10"
      />

      {/* Thanh cố định dưới màn hình khi có phòng được chọn */}
      {selectedRooms.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white/95 p-3.5 sm:p-4 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-3 duration-200">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary)]">
                {selectedRooms.length}
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)]">
                  Đã chọn {selectedRooms.length} phòng ({selectedRooms.map((r) => r.roomName || r.name).join(', ')})
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--color-muted)]">
                    Tổng sức chứa: <strong>{totalSelectedCapacity} khách</strong>
                  </span>
                  {guestCount > totalSelectedCapacity ? (
                    <span className="font-semibold text-rose-600">
                      (Đoàn đang có {guestCount} khách &gt; tối đa {totalSelectedCapacity} khách)
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      (Đủ chỗ cho {guestCount} khách)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--color-border)]">
              <div className="text-right">
                <span className="text-xs text-[var(--color-muted)]">Tổng tiền ({nights} đêm):</span>
                <p className="text-lg font-bold text-[var(--color-ink)] leading-none">
                  {formatVnd(totalSelectedPrice)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    guests: String(guestCount),
                    rooms: selectedRooms.map((room) => String(room.roomId ?? room.id)).join(','),
                  });
                  navigate(`/homestays/${homestayId}/book?${params.toString()}`);
                }}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <span>Tiến hành đặt {selectedRooms.length} phòng</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </article>
  );
}

export default HomestayDetailPage;
