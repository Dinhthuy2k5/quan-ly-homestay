from docx import Document
from pathlib import Path

ROOT = Path('docs')

def all_paragraphs(doc):
    paragraphs = list(doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                paragraphs.extend(cell.paragraphs)
    return paragraphs

def set_paragraph_text(paragraph, text):
    if paragraph.runs:
        paragraph.runs[0].text = text
        for run in paragraph.runs[1:]:
            run.text = ''
    else:
        paragraph.add_run(text)

def save_safely(doc, path):
    temp_path = path.with_name(path.stem + '.tmp.docx')
    doc.save(temp_path)

def replace_in_doc(path, replacements):
    doc = Document(path)
    count = 0
    for paragraph in all_paragraphs(doc):
        original = paragraph.text
        updated = original
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        if updated != original:
            set_paragraph_text(paragraph, updated)
            count += 1
    save_safely(doc, path)
    return count

plan = ROOT / 'ke_hoach_10_tuan_homestay_theo_api.docx'
api = ROOT / 'thiet_ke_api.docx'
architecture = ROOT / 'thiet_ke_kien_truc.docx'

plan_count = replace_in_doc(plan, {
    'trả phòng trước 08:00': 'trả phòng không muộn hơn 08:00 (bao gồm 08:00)',
})
api_count = replace_in_doc(api, {
    'trả phòng trước 08:00': 'trả phòng không muộn hơn 08:00 (bao gồm 08:00)',
    'yêu cầu trả phòng trước 08:00': 'yêu cầu trả phòng không muộn hơn 08:00 (bao gồm 08:00)',
})

doc = Document(architecture)
paragraph_updates = {
    'com.homestay.{ auth | homestay | room | pricing | booking | payment | service | expense | report | policy | common }':
        'vn.edu.hust.homestay.{ common | config | auth | homestay | room | pricing | booking | payment | service | expense | report | policy | media }',
    'Mỗi module có các package controller, service, repository, entity, dto. Package common chứa cấu hình bảo mật, xử lý lỗi chung và tiện ích.':
        'Mỗi module nghiệp vụ có các package controller, service, repository, entity và dto. Package common chứa response, exception và tiện ích dùng chung; config chứa cấu hình bảo mật, CORS, OpenAPI và phục vụ file.',
    'React gửi POST /api/bookings kèm JWT → Controller kiểm tra token, quyền và dữ liệu → BookingService (@Transactional): kiểm tra chính sách, sinh danh sách slot, tính giá từng slot, ghi bookings, booking_rooms, booking_room_slots → Repository → MySQL. Nếu slot đã có người đặt, khóa chính (room_id, slot_date, slot) báo trùng, Service trả mã 409. Đơn ở trạng thái PENDING_DEPOSIT, sau đó khách gửi chứng từ cọc và Manager duyệt.':
        'React gửi POST /api/v1/customer/bookings kèm JWT → Controller kiểm tra token, quyền và dữ liệu → BookingService (@Transactional): kiểm tra chính sách, tạo booking, booking_rooms và booking_room_nights cho từng đêm từ check_in_date đến trước check_out_date, đồng thời chốt giá từng đêm → Repository/JPA → MySQL. Khóa chính (room_id, stay_date) ngăn giữ trùng; xung đột trả mã 409. Booking giữ đêm ở trạng thái PENDING_DEPOSIT, sau đó khách gửi chứng từ cọc và Manager xác minh để duyệt.',
    'Chống đặt trùng, xung đột đồng thời: khóa chính của booking_room_slots làm chốt cuối cùng; @Version trên bookings để khóa lạc quan khi nhiều người cùng sửa đơn.':
        'Chống đặt trùng, xung đột đồng thời: khóa chính (room_id, stay_date) của booking_room_nights là chốt cuối cùng; @Version trên bookings hỗ trợ khóa lạc quan khi nhiều người cùng sửa đơn.',
    'Hết hạn giữ chỗ: tác vụ @Scheduled định kỳ chuyển đơn PENDING_DEPOSIT quá hold_expires_at sang EXPIRED và xóa slot để trả phòng.':
        'Hết hạn giữ chỗ: tác vụ @Scheduled định kỳ chuyển booking PENDING_DEPOSIT quá hold_expires_at sang EXPIRED và xóa các dòng booking_room_nights trong cùng transaction để trả phòng.',
    'Thời gian: DATETIME lưu UTC; DATE (ngày nhận/trả, ngày chi) là giờ địa phương; đổi sang +07:00 khi hiển thị và khi báo cáo theo tháng.':
        'Thời gian: DATETIME lưu UTC; DATE (ngày nhận/trả, ngày chi) là ngày địa phương; đổi sang +07:00 khi hiển thị và khi báo cáo theo tháng. Chính sách lưu trú: check-in từ 11:00 trở đi; check-out không muộn hơn 08:00 (bao gồm 08:00).',
}
arch_count = 0
for paragraph in all_paragraphs(doc):
    original = paragraph.text
    if original in paragraph_updates:
        set_paragraph_text(paragraph, paragraph_updates[original])
        arch_count += 1
for table in doc.tables:
    for row in table.rows:
        if len(row.cells) < 3:
            continue
        label = row.cells[0].text.strip()
        if label == 'Service':
            set_paragraph_text(row.cells[-1].paragraphs[0], 'Tạo booking_room_nights theo khoảng [check_in_date, check_out_date), chốt giá theo đêm; điều chỉnh/hủy booking, duyệt cọc, tính hoàn tiền; check-out chỉ tính dịch vụ USED và quyết toán số dư. Mỗi nghiệp vụ ghi dữ liệu nằm trong một transaction.')
            arch_count += 1
        elif label == 'Database':
            set_paragraph_text(row.cells[-1].paragraphs[0], 'MySQL 8 (schema SQL hiện hành; 18 bảng, 4 view). Khóa chính (room_id, stay_date) trong booking_room_nights chống giữ trùng; khóa ngoại và CHECK bảo đảm toàn vẹn dữ liệu.')
            arch_count += 1
        elif label == 'Repository':
            set_paragraph_text(row.cells[-1].paragraphs[0], 'Spring Data JPA, Hibernate | Entity ánh xạ bảng; Spring Data Repository truy cập dữ liệu; JPQL hoặc native query có kiểm soát cho truy vấn tùy biến và view báo cáo.')
            arch_count += 1

save_safely(doc, architecture)
print(f'Updated paragraphs: plan={plan_count}, api={api_count}, architecture={arch_count}')
