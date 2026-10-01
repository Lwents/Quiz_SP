# Vùng phủ, chuyển vùng, trạm ẩn và trạm lộ

**Mục tiêu:** Đọc sơ đồ bốn trạm và tự nhận ra hai vấn đề trạm ẩn, trạm lộ thay vì học thuộc đáp án.

Một AP chỉ phục vụ thiết bị trong vùng phủ của nó. Trong tòa nhà, sàn, tường và tủ kim loại làm vùng phủ khác hình tròn lý tưởng. **Site survey** là quá trình thử vị trí AP, di chuyển máy trạm để đo khả năng thu sóng, nhiễu và tốc độ tại những nơi thực sự cần dùng.

Khi máy trạm rời vùng của AP này và sang AP khác, quá trình đổi điểm kết nối gọi là **roaming**. Thiết kế tốt cần vùng phủ liên tục vừa đủ và cấu hình mạng cho phép chuyển đổi; đặt AP thật gần nhau trên cùng kênh có thể làm nhiễu tăng.

## Trạm ẩn: hai người cùng nói với một người nghe

Giả sử A và C đều gửi cho B nhưng A và C nằm ngoài vùng nghe của nhau. A thấy kênh rảnh, C cũng thấy kênh rảnh, nên cả hai có thể phát cùng lúc. Tín hiệu **va chạm tại B**. Việc C “nghe trước khi nói” không bảo đảm phát hiện A vì C không nghe được A. Đây là lý do ví dụ trong slide phải xét tại **máy thu B**, không chỉ tại máy phát.

## Trạm lộ: nghe tiếng nói nhưng không gây cản trở

Giả sử B đang gửi cho A; C nghe được B nên tưởng kênh bận. Tuy nhiên C muốn gửi cho D và hai cuộc truyền này có thể cùng diễn ra mà không làm hỏng tín hiệu tại A hoặc D. Nếu C luôn im lặng, băng thông bị bỏ phí. Đây là **trạm lộ**: một trạm trì hoãn dù cuộc truyền riêng của nó có thể an toàn.

| Tình huống | Điều quan trọng tại máy thu |
| --- | --- |
| Trạm ẩn | Hai tín hiệu va chạm ở cùng một máy thu. |
| Trạm lộ | Hai máy thu khác nhau có thể nhận được đồng thời. |

## Tự kiểm tra

A và C không nghe nhau nhưng đều gửi B: vấn đề gì? B gửi A còn C muốn gửi D nhưng C dừng vì nghe B: vấn đề gì? Hãy giải thích bằng vị trí **máy thu**, không chỉ bằng vị trí máy phát.

*Đọc slide K74 số 3, trang 1–15.*
