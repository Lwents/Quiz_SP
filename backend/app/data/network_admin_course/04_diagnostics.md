# Kiểm tra kết nối và tìm lỗi cấu hình

**Mục tiêu:** Tìm được nguyên nhân mất kết nối theo thứ tự dây nối, địa chỉ IP, gateway và tuyến đi.

## Quy trình bốn bước

1. **Kiểm tra liên kết:** Thiết bị có nối đúng cổng không? Có cổng nào đang bị dùng hai lần không?
2. **Kiểm tra địa chỉ:** Mỗi giao diện có IP riêng, mask đúng và không trùng địa chỉ mạng hoặc broadcast không?
3. **Kiểm tra cổng ra:** Nếu đích khác mạng, PC có gateway cùng mạng con với chính PC không?
4. **Kiểm tra tuyến:** Router có mạng đích trực tiếp hoặc tuyến tĩnh đi đến router kế tiếp không? Chiều về có tuyến ngược không?

## Tập tự sửa lỗi

Trong bài một router, đổi gateway của PC1 thành `192.168.20.1`. Ping sẽ thất bại vì PC1 không thể gửi trực tiếp cho gateway nằm ngoài mạng `192.168.10.0/24`. Đổi lại `192.168.10.1` và thử tiếp.

Trong bài ba PC và switch, đặt hai PC cùng địa chỉ `192.168.1.11`. Đây là xung đột IP; hãy cấp lại một địa chỉ chưa dùng. Trong bài hai router, bỏ tuyến tĩnh chiều về trên Router2 rồi kiểm tra gói có đi được đến PC2 nhưng phản hồi không quay lại PC1.

## Ghi nhớ

Ping thành công chứng minh một luồng đi và về ở thời điểm thử nghiệm. Ping thất bại chỉ báo có vấn đề trên đường đi; dùng bảng cấu hình và từng bước trên để khoanh vùng, không đoán theo cảm giác.
