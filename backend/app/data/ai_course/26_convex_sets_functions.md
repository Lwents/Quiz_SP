# Bài 16: Tập lồi và hàm lồi bằng hình dung

**Mục tiêu:** Nhận ra trực giác của tập lồi và hàm lồi, hiểu vì sao chúng làm bài toán tìm cực tiểu dễ bảo đảm hơn.

## Tập lồi là vùng không có “lõm”

Chọn hai điểm bất kỳ nằm trong một vùng. Nếu kéo một đoạn thẳng nối chúng mà đoạn ấy luôn nằm trọn trong vùng, vùng đó là **tập lồi**. Hình chữ nhật đặc, hình tròn đặc và một nửa mặt phẳng đều lồi. Hình mặt trăng khuyết hoặc hình chữ C thì không: có hai điểm trong hình nhưng đoạn nối chúng đi ra ngoài.

Ta có thể tưởng tượng người đi bộ trong công viên: với một vùng lồi, nếu hai vị trí được phép đứng thì con đường thẳng nối hai vị trí ấy cũng không phải băng ra khỏi vùng hợp lệ.

## Hàm lồi là “cái bát” không có hố phụ

Hàm số lồi có đồ thị giống một chiếc bát hướng lên. Lấy hai điểm trên đồ thị, đoạn thẳng nối chúng không nằm dưới đồ thị. Ví dụ `f(x)=x²` là hàm lồi; nó có một đáy thấp nhất tại `x=0`.

Điểm mấu chốt cho tối ưu: với hàm lồi trên miền lồi, một cực tiểu cục bộ cũng là cực tiểu toàn cục. Không có một “hố thấp hơn nữa” bị che sau ngọn đồi. Nếu có nhiều nghiệm cùng thấp nhất, tất cả đều là nghiệm tối ưu.

## Tại sao học máy quan tâm?

Hãy xem trọng số của mô hình là tọa độ có thể vặn. Hàm mất mát cho biết mỗi cách vặn sai số lớn hay nhỏ. Nếu hàm mất mát theo trọng số là lồi, việc tìm nghiệm tối ưu có cam kết toán học thuận lợi hơn. Hồi quy bình phương tuyến tính có cấu trúc lồi; mạng nơ-ron nhiều lớp nói chung có bề mặt không lồi.

Đừng nhầm: dữ liệu có hình dạng lồi không tự làm mọi hàm mất mát thành lồi. Tính lồi là thuộc tính của cả hàm/mô hình và cách tham số hóa, không chỉ của các điểm dữ liệu.

## Một phép thử bằng nét vẽ

Vẽ `y=x²`: có một đáy duy nhất. Vẽ hàm lượn sóng `y=sin(x)` trong một khoảng dài: có nhiều đỉnh và đáy địa phương. Nếu đứng ở một đáy nhỏ, chỉ nhìn quanh một đoạn, chưa biết có đáy thấp hơn ở xa hay không. Đó là khác biệt trực quan giữa tối ưu lồi và không lồi.

## Tự kiểm tra

Trong một vòng tròn đặc, chọn hai điểm bất kỳ bên trong. Đoạn thẳng nối chúng có ra ngoài không? **Không, nên hình tròn là tập lồi.** Một hàm có nhiều đáy thấp khác nhau có chắc lồi không? **Không; nhiều đáy cục bộ thường là dấu hiệu không lồi.**

**Nguồn tham khảo:** [Bài 16 về tập lồi và hàm lồi](https://machinelearningcoban.com/).
