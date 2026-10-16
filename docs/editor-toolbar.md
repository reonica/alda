# Thanh công cụ bài viết

Sau khi triển khai bản nâng cấp, mở **Bài viết → Nội dung bài viết** trong CMS. Trình soạn mới dùng [SunEditor](https://github.com/JiHong88/suneditor) 3.3.3, giấy phép MIT, được build và phục vụ từ website. Không cần tài khoản hay API key mới.

| Công cụ | Cách dùng |
| --- | --- |
| Kiểu đoạn | Chọn đoạn văn hoặc H2–H6; tiêu đề bài đã là H1 |
| Phông và cỡ chữ | Chọn văn bản rồi đổi phông/cỡ chữ thông dụng |
| Đậm, nghiêng, gạch chân, gạch ngang | Chọn từ hoặc đoạn cần định dạng |
| Chỉ số dưới / trên | Ví dụ H₂O và x² |
| Màu chữ / màu nền chữ | Chọn văn bản, chọn màu trong bảng màu hoặc nhập mã HEX |
| Căn lề | Chọn đoạn cần căn trái, giữa, phải hoặc đều |
| Danh sách, thụt lề, giãn dòng | Chọn các đoạn cần thay đổi |
| Trích dẫn / đường phân cách | Tạo khối trích dẫn hoặc phân chia phần nội dung |
| Liên kết | Chọn nội dung liên kết, nhập URL trong hộp thoại |
| Bảng | Chọn kích thước, sau đó chỉnh các ô bằng công cụ bảng |
| Hộp mã | Chèn code hiển thị trong bài; chọn ngôn ngữ nếu cần. Nội dung mã không được thực thi |
| Hoàn tác / làm lại | Khôi phục các bước chỉnh sửa trong phiên soạn hiện tại |
| Toàn màn hình / khung các đoạn | Mở rộng vùng soạn hoặc xem ranh giới các khối |
| Thư viện ảnh | Nút phía trên toolbar mở thư viện CMS hiện có. Chọn/tải ảnh, điền mô tả alt rồi bấm **Chèn ảnh** |
| Mã nguồn | Chỉnh Markdown và HTML được hỗ trợ; bấm **Áp dụng mã nguồn** hoặc **Hủy thay đổi mã nguồn** trước khi lưu |

Trong chế độ toàn màn hình, thoát về vùng soạn thường để dùng **Thư viện ảnh** hoặc **Mã nguồn** phía trên toolbar. Các hàng công cụ tự xuống dòng trên màn hình hẹp.

## Lưu định dạng

Nội dung vẫn nằm trong các file `.md` của repo alda. Tiêu đề, danh sách, liên kết và code thông thường lưu dưới dạng Markdown. Màu chữ, căn lề và bảng phức tạp được giữ bằng các đoạn HTML có kiểm soát trong Markdown, để không mất định dạng khi xuất bản hoặc mở lại.

Mở một bài cũ không tự đổi nguồn nội dung. Chỉ khi thực sự biên tập, editor mới cập nhật trường nội dung. HTML không được hỗ trợ và nội dung có thể thực thi bị loại; mã trong **Hộp mã** vẫn hiển thị nguyên văn. Preview và build dùng cùng bộ xử lý `lib/article-content.cjs`.

**Hộp mã** là một khối nhìn thấy trong bài. **Mã nguồn** là nội dung nguồn của toàn bài; hai chức năng khác nhau. Không dùng chế độ xuất Markdown riêng của thư viện SunEditor vì bộ chuyển đổi đó không giữ đầy đủ màu và căn lề; widget Alda dùng bộ chuyển đổi chung của website.

Trạng thái nháp, URL bài viết, đăng nhập và cách Netlify xuất bản giữ theo [hướng dẫn CMS](cms-editor.md). Trình soạn chỉ tải trong admin; người đọc blog nhận HTML tĩnh và không tải thư viện editor.

## Phát triển và kiểm tra

`pnpm build` tự tạo bundle admin qua `scripts/build-editor.cjs`, rồi Eleventy sinh các trang. Dùng `pnpm install --frozen-lockfile` trên máy/host mới. Dependencies được khóa phiên bản trong `package.json` và `pnpm-lock.yaml`; các giấy phép được xuất cùng bundle vào `/admin/editor-licenses.txt`.

Kiểm tra tự động bao gồm giữ nguyên cấu trúc/nội dung 14 bài cũ, vòng lưu Markdown/HTML của định dạng, code nhiều dòng và ký tự HTML, loại nội dung không an toàn, cùng build bài giàu định dạng thật. Thử editor trong backend bộ nhớ ở localhost; kiểm tra tài khoản và lưu bài nháp thật sau khi Netlify triển khai.
