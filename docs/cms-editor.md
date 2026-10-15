# Hướng dẫn CMS Alda Hub

Truy cập https://aldahub.com/admin/ sau khi bản nâng cấp CMS đã được merge và Netlify xuất bản thành công. Dùng tài khoản Netlify Identity hiện có. Giao diện CMS là tiếng Việt; cửa sổ tài khoản của Netlify có thể dùng tiếng Anh. Xem [hướng dẫn đăng nhập](cms-login.md) nếu cần khôi phục mật khẩu hoặc nhận lời mời.

## Tạo và sửa bài viết

1. Chọn **Bài viết → Tạo bài thuộc loại Bài viết**.
2. Điền tiêu đề, ngày, tác giả và mô tả SEO. Chọn ảnh đại diện trong thư viện và thêm mô tả alt khi ảnh mang thông tin có ý nghĩa.
3. Soạn nội dung bằng trình soạn Markdown; dùng H2/H3 cho các mục vì tiêu đề bài đã là H1. Thêm chủ đề bằng danh sách tags.
4. Giữ **Bản nháp — chưa công khai** bật khi đang viết. Xem trước ở khung bên phải; trên màn hình hẹp dùng nút bật/tắt preview.
5. Lưu để giữ bản nháp. Khi đã sẵn sàng, tắt **Bản nháp** rồi lưu/xuất bản. Netlify cần build thành công trước khi bài xuất hiện trên website.

Nút lưu/xuất bản của CMS lưu file vào Git; trường **Bản nháp** mới quyết định bài có được tạo thành trang công khai hay không. Ngày xuất bản chỉ là thông tin hiển thị, không tự hẹn giờ. Trường ngày cập nhật chỉ điền khi sửa đáng kể nội dung bài đã xuất bản.

Đổi tiêu đề bài cũ giữ nguyên filename và URL. Để gỡ một bài khỏi website, bật **Bản nháp** và lưu; nút xóa bài không được bật trong CMS. Không đưa thông tin mật vào bản nháp: file vẫn được lưu trong repo theo quyền hiển thị của repo hiện có.

## Chỉnh các module

Chọn **Nội dung website**, sau đó mở module cần sửa:

| Module | Nội dung có thể chỉnh |
| --- | --- |
| Thương hiệu & liên hệ | Tên, logo, slogan đầy đủ, mô tả SEO mặc định và số WhatsApp |
| Navbar / menu đầu trang | Nhãn Menu trên mobile, nhãn/đường dẫn/thứ tự liên kết, nút CTA |
| Footer / chân trang | Danh sách liên kết, nhãn WhatsApp, tiêu đề/mô tả/nút newsletter và dòng cuối trang |
| Trang chủ / hero | SEO title, hai phần headline, caption, hai CTA và chú thích |
| Khối CTA dùng chung | Dòng giới thiệu, tiêu đề, mô tả, nút audit và nhãn WhatsApp trên các trang dùng khối này |

Kéo các mục trong danh sách để đổi thứ tự. Đường dẫn phải trỏ tới trang đã xuất bản và có dấu `/` cuối, ví dụ `/services/seo-aio/`. Mỗi URL chỉ xuất hiện một lần trong cùng menu. Đổi số WhatsApp bằng dạng `https://wa.me/84916882795`, không có dấu `+` hay khoảng trắng.

Các trường là nội dung văn bản; thẻ HTML trong trường module sẽ hiển thị như chữ. Bố cục, màu sắc, các phần nội dung khác trong trang chủ và nội dung chi tiết trang dịch vụ vẫn sửa trong code. Biểu mẫu giữ nguyên cơ chế nhận liên hệ/newsletter đang dùng. Bản xem trước module trình bày nội dung và thứ tự, không phải bản sao toàn bộ trang.

Giữ slogan đã duyệt: **Alda Hub - Data Alchemy Marketing Agency, Where Data Becomes Gold**. Slogan đầy đủ nằm ở footer và metadata; hero lồng thông điệp vào headline/caption, không có một dòng slogan riêng phía trên.

## Khi nào thay đổi lên website?

Mỗi lần lưu tạo commit trong repo **alda**, nhánh **main**. Không cần thao tác GitHub Desktop cho từng bài hoặc từng lần sửa nội dung CMS. Netlify tự build lại theo kết nối hiện tại; kiểm tra **Published** trong https://app.netlify.com/projects/aldahub/deploys trước khi kiểm tra website.

Nếu nhập liên kết không hợp lệ hoặc trỏ tới trang chưa công khai, kiểm tra CMS/build sẽ báo lỗi kèm tên trường. Sửa lại liên kết và lưu; bản deploy thành công trước đó vẫn phục vụ website. Có thể xem lịch sử thay đổi trong GitHub.

## Kiểm tra sau triển khai

Chủ website đăng nhập bằng tài khoản thật, tạo một bài nháp, kiểm tra ảnh và khung preview rồi lưu; xác nhận bài nháp không xuất hiện ở blog/sitemap. Khi chỉnh một module thật, chờ Netlify Published rồi kiểm tra trang tương ứng. Đăng xuất khi hoàn tất.

Trong quá trình phát triển chỉ dùng build và CMS test-repo trong bộ nhớ ở localhost, không đăng nhập tài khoản thật, không gửi email đặt lại mật khẩu và không ghi thử vào production. Bản test-repo không được đưa vào thư mục build hay cấu hình production.

Tài liệu nền tảng: [Decap file collections](https://decapcms.org/docs/collection-file/), [custom previews](https://decapcms.org/docs/customization/), [test backend](https://decapcms.org/docs/test-backend/). Git Gateway hiện hữu được giữ nguyên; [Netlify đánh dấu dịch vụ này deprecated](https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/), nên việc chuyển cơ chế đăng nhập/backend về sau cần kế hoạch riêng và kiểm tra quyền truy cập, không đổi âm thầm trong bản nâng cấp giao diện CMS này.
