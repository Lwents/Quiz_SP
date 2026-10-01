# Wi-Fi, 802.11 và các thế hệ tốc độ

**Mục tiêu:** Phân biệt vai trò PHY/MAC, nhớ các mốc 802.11 thường gặp và giải thích được MIMO, MU-MIMO, beamforming bằng lời của mình.

Wi-Fi là cách triển khai mạng cục bộ không dây. Họ chuẩn **IEEE 802.11** tập trung vào tầng vật lý (PHY: tín hiệu truyền như thế nào) và phần điều khiển truy cập môi trường của tầng liên kết dữ liệu (MAC: thiết bị nào được phát khi nhiều thiết bị dùng chung kênh).

## Các mốc trong slide

| Chuẩn | Ý chính để nhớ |
| --- | --- |
| 802.11b | 2,4 GHz, tốc độ danh nghĩa 11 Mb/s. |
| 802.11a | 5 GHz, tốc độ danh nghĩa 54 Mb/s; qua vật cản thường khó hơn 2,4 GHz. |
| 802.11g | 2,4 GHz, tốc độ danh nghĩa 54 Mb/s và tương thích với 802.11b. |
| 802.11n | Dùng 2,4 hoặc 5 GHz; đưa nhiều ăng-ten MIMO vào khai thác. |
| 802.11ac / Wi-Fi 5 | Tập trung vào 5 GHz, kênh rộng và nhiều luồng dữ liệu. |
| 802.11ax / Wi-Fi 6 | Cải thiện hiệu quả khi nhiều thiết bị cùng kết nối; slide nhắc MU-MIMO và BSS Color. |
| 802.11be / Wi-Fi 7 | Thế hệ được giới thiệu cuối phần chuẩn Wi-Fi của slide. |

Các con số tốc độ trên là **tốc độ danh nghĩa của chuẩn**, không phải tốc độ tải tệp chắc chắn đạt được. Thông lượng thực tế phụ thuộc khoảng cách, tường, số người dùng, cấu hình kênh và thiết bị ở hai đầu.

## Từ một ăng-ten đến nhiều luồng

**SISO** dùng một đường phát và một đường thu. **MIMO** dùng nhiều ăng-ten và đặc tính của đường truyền vô tuyến để tăng độ tin cậy hoặc truyền nhiều luồng không gian. Hãy hình dung một con đường có thêm làn xe: chỉ có ích khi cả hai đầu và điều kiện đường đều hỗ trợ.

**SU-MIMO** phục vụ một thiết bị nhận tại một thời điểm, dù dùng nhiều luồng. **MU-MIMO** cho phép chia khả năng đó giữa nhiều thiết bị. **Beamforming** điều chỉnh cách phát để tín hiệu mạnh hơn về hướng thiết bị nhận, thay vì phân bố năng lượng như nhau mọi hướng. Nó cải thiện chất lượng liên kết trong điều kiện phù hợp; không bảo đảm tốc độ không đổi ở mọi khoảng cách.

## Tự kiểm tra

Vì sao AP chuẩn nhanh hơn vẫn có thể cho trải nghiệm chậm trong một lớp đông người? Trả lời theo ba ý: tài nguyên dùng chung, suy hao/nhiễu và khả năng của máy trạm.

*Đọc slide K74 số 1, trang 49–77.*
