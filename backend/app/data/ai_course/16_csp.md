# Bài toán ràng buộc: xếp lịch không bị trùng

**Mục tiêu:** Mô hình hóa được biến, miền giá trị và ràng buộc, rồi mô phỏng backtracking để giải một lịch thi nhỏ.

## Khi nào một bài toán là CSP?

**Constraint Satisfaction Problem (CSP)** là bài toán cần gán giá trị cho nhiều biến sao cho mọi quy tắc đều được thỏa mãn. Thay vì hỏi “đường nào tới đích?”, ta hỏi “cách xếp nào hợp lệ?”. Ba thành phần của một CSP là:

1. **Biến:** điều cần quyết định.
2. **Miền giá trị:** những lựa chọn được phép cho biến đó.
3. **Ràng buộc:** quy tắc kết hợp các lựa chọn.

Ví dụ xếp lịch thi: biến là môn thi; miền là các ca thi; ràng buộc nói hai môn có sinh viên học chung không được thi cùng ca.

## Một ví dụ tự làm

Có ba môn `A`, `B`, `C` và hai ca `Sáng`, `Chiều`. Một số sinh viên học cả A với B, và một số học cả B với C. A và C không có sinh viên chung. Ta cần xếp sao cho không ai phải thi hai môn cùng lúc.

```text
Biến: A, B, C
Miền mỗi biến: {Sáng, Chiều}
Ràng buộc: A ≠ B; B ≠ C
```

Thử gán `B = Sáng`. Vì `A ≠ B`, A buộc phải là `Chiều`. Vì `B ≠ C`, C cũng phải là `Chiều`. Cách gán này hợp lệ: A và C trùng ca không sao vì chúng không có ràng buộc với nhau. Nếu đề yêu cầu cả ba môn không được trùng nhau thì hai ca không đủ; CSP giúp phát hiện mâu thuẫn đó thay vì xếp lịch bằng cách đoán.

## Backtracking: thử, kiểm tra, quay lại

Backtracking gán một biến, rồi kiểm tra xem ràng buộc nào đã bị vi phạm:

1. Chọn một môn chưa xếp.
2. Thử một ca còn trong miền của môn đó.
3. Nếu xung đột với lựa chọn đã gán, bỏ ca đó và thử lựa chọn khác.
4. Nếu không còn ca phù hợp, quay về môn trước để đổi lựa chọn.
5. Thành công khi mọi biến đều được gán và các ràng buộc đều đúng.

Quay lui không phải “làm sai thì đoán lại tùy ý”; thuật toán khôi phục trạng thái trước đó và thử nhánh kế tiếp có hệ thống.

## Chọn biến thông minh hơn

Nếu chọn biến tùy ý, có thể thử nhiều nhánh mới phát hiện cuối cùng vô nghiệm. Hai mẹo phổ biến:

- **MRV (biến ít lựa chọn nhất):** chọn biến đang còn ít giá trị hợp lệ nhất. Nếu một môn chỉ còn một ca thì nên xử lý ngay, trước khi lựa chọn khác làm ca đó biến mất.
- **Degree heuristic:** nếu nhiều biến cùng ít lựa chọn, chọn biến đang ràng buộc với nhiều biến chưa gán nhất. Xử lý nút “ảnh hưởng rộng” sớm thường giúp phát hiện xung đột sớm.

Sau khi gán một ca cho B, **forward checking** loại ca Sáng khỏi miền của A và C vì chúng không được trùng B. Nếu một biến nào đó hết sạch lựa chọn, ta biết phải quay lui ngay.

## Những nơi CSP được dùng

- Xếp lịch thi, phòng học và ca trực.
- Tô màu bản đồ sao cho hai vùng giáp nhau khác màu.
- Điền Sudoku: ô là biến, chữ số là miền, hàng/cột/khối là ràng buộc.
- Gán nhân sự vào ca nhưng vẫn thỏa kỹ năng và giờ nghỉ.

Một số bài toán còn có **ràng buộc mềm** như “ưu tiên ca sáng” hoặc “giảm số phòng trống”. Khi ấy, mục tiêu không chỉ tìm lời giải hợp lệ mà còn tối ưu mức độ hài lòng; cần tách quy tắc bắt buộc khỏi sở thích.

## Tự kiểm tra

Nếu `A` và `B` có sinh viên học chung, ràng buộc là gì? **`A ≠ B`**, tức không thi cùng ca. Nếu không còn ca hợp lệ cho B sau khi đã xếp A, thuật toán làm gì? **Quay lui và thử đổi lựa chọn trước đó.**

**Nguồn:** [Bài toán CSP trong giáo trình CS188 của Berkeley](https://inst.eecs.berkeley.edu/~cs188/textbook/csp/csps.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
