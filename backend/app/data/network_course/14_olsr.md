# OLSR và nút chuyển tiếp MPR

**Mục tiêu:** Giải thích vì sao OLSR là proactive và vì sao MPR làm giảm số nút phải phát lại thông điệp quảng bá.

**OLSR** (*Optimized Link State Routing*) thuộc nhóm định tuyến chủ động. Các nút chủ động duy trì thông tin về liên kết trong mạng để có thể tính tuyến khi cần gửi. Nếu mọi nút đều phát lại mọi bản tin quảng bá, cùng một tin sẽ xuất hiện nhiều lần, làm kênh vô tuyến bận và tiêu tốn pin.

## Ý tưởng MPR

Mỗi nút chọn một tập hàng xóm hai chiều phù hợp làm **Multipoint Relay (MPR)**. Chỉ những hàng xóm được chọn này chịu trách nhiệm phát lại một số thông tin điều khiển. Hãy hình dung A có 6 hàng xóm nhưng chỉ cần B và C để bản tin tới được tất cả nút cách A hai hop: cho cả 6 nút phát lại là lãng phí; chọn B và C làm MPR giảm bản sao.

Để hiểu sơ đồ OLSR, phân biệt:

- **Hàng xóm 1 hop:** nút liên lạc trực tiếp với mình.
- **Hàng xóm 2 hop:** nút đạt tới thông qua một hàng xóm 1 hop.
- **Liên kết đối xứng:** hai chiều đã được xác nhận; một chiều nghe được chưa đủ kết luận cả hai chiều hoạt động.

## Chống lặp trong gói điều khiển

Slide giới thiệu các trường như **TTL** (giới hạn số chặng), **sequence number** (nhận diện gói/thông điệp) và **validity time** (thời hạn còn giá trị). Nút có thể ghi các thông điệp đã xử lý vào *duplicate set*; nếu cùng thông điệp quay lại, nó không phát lại vô hạn. Đây là một lớp bảo vệ khác với MPR: MPR giảm số nút phát, còn dấu nhận diện ngăn xử lý lặp.

## So với AODV

OLSR duy trì trạng thái tuyến từ trước nên có thể gửi nhanh hơn khi có nhu cầu, nhưng phải trả chi phí thông điệp định kỳ. AODV chỉ tìm đường khi cần, tiết kiệm cập nhật lúc mạng nhàn nhưng có độ trễ khám phá tuyến ban đầu.

## Tự kiểm tra

Vì sao nút nghe được một chiều chưa chắc là hàng xóm đối xứng? Nếu một bản tin OLSR quay lại nút đã xử lý nó, những trường/cấu trúc nào giúp nút không phát mãi?

*Đọc slide K74 số 6, trang 31–42.*
