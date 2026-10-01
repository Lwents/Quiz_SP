# MANET: mạng tự tổ chức khi các nút di chuyển

**Mục tiêu:** Phân biệt MANET với WLAN dùng AP và hiểu ý nghĩa single-hop, multi-hop, mạng phẳng và mạng phân cấp.

**MANET** là mạng tùy biến di động: các nút không cần một bộ định tuyến cố định để bắt đầu liên lạc. Mỗi nút có thể là máy dùng ứng dụng và đồng thời chuyển tiếp gói tin cho nút khác. Ví dụ tại hiện trường cứu hộ, các đội mang thiết bị có thể tạo mạng tạm khi hạ tầng bị hỏng.

## Một hop hay nhiều hop?

Nếu A gửi trực tiếp tới B, đó là liên kết một chặng. Nếu A không nghe được C nhưng nghe được B và B nghe được C, A có thể gửi **A → B → C**. B là nút trung gian, nên đường đi nhiều chặng cần khả năng định tuyến. Khi B di chuyển hoặc hết pin, đường A–C có thể mất; mạng phải tìm đường khác.

**Mạng phẳng (flat):** các nút có vai trò gần ngang nhau. **Mạng phân cấp:** các nút được nhóm thành cụm (*cluster*); nút chủ hỗ trợ quản lý và liên lạc giữa các cụm. Phân cấp có thể giảm độ phức tạp quản lý, nhưng nút chủ dễ trở thành điểm quan trọng cần bảo vệ.

## Vì sao MANET khó hơn mạng cố định?

Topo đổi khi các nút di chuyển; thiết bị không đồng đều; pin hạn chế; băng tần được chia sẻ và có thể bị nhiễu. Một đường đi ít hop chưa chắc là tốt nhất nếu một nút trung gian sắp hết pin hoặc liên kết rất yếu. Vì vậy giao thức phải cân bằng độ trễ tìm đường, lượng thông điệp điều khiển, độ tin cậy và năng lượng.

## Tự kiểm tra

Trong đường A → B → C, B rời khỏi vùng phủ. Điều gì xảy ra với gói tin của A? Hãy đề xuất hai cách: tìm tuyến thay thế qua nút khác hoặc chờ B quay lại; cách nào hợp với liên lạc khẩn cấp?

*Đọc slide K74 số 5, trang 1–24.*
