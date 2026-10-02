# Bài 31: MLE và MAP ước lượng tham số ra sao?

**Mục tiêu:** Phân biệt ước lượng hợp lý cực đại (MLE) với ước lượng hậu nghiệm cực đại (MAP) qua ví dụ tung đồng xu.

## Tham số nào có thể giải thích dữ liệu?

Giả sử đồng xu có xác suất ngửa chưa biết là `p`. Ta tung 10 lần và thấy 8 lần ngửa. Muốn chọn giá trị `p` phù hợp với quan sát.

**Likelihood** (hàm hợp lý) không hỏi “xác suất tham số đúng là bao nhiêu”; nó hỏi: *nếu tham số là p, dữ liệu đã quan sát có dễ xảy ra tới mức nào?* Với đồng xu độc lập, phần phụ thuộc vào `p` của likelihood là:

```text
L(p) = p⁸ × (1 − p)²
```

## MLE chọn giá trị hợp dữ liệu quan sát nhất

**Maximum Likelihood Estimation (MLE)** chọn `p` làm likelihood lớn nhất. Với 8 ngửa trong 10 lần, nghiệm là `p = 8/10 = 0.8`. Đây là ước lượng hợp lý cho mẫu đã thấy, nhưng nếu chỉ tung hai lần và cả hai đều ngửa, MLE sẽ là 1 dù dữ liệu còn rất ít.

## MAP thêm hiểu biết ban đầu

**Maximum A Posteriori (MAP)** tối đa hóa xác suất hậu nghiệm: likelihood × prior (niềm tin/xu hướng ban đầu). Nếu trước thí nghiệm ta tin nhẹ rằng đồng xu có thể lệch, prior có thể kéo ước lượng khỏi cực trị khi mẫu ít.

Ví dụ dùng prior Beta đối xứng `Beta(2,2)` cho đồng xu 8/10: phân phối hậu nghiệm là `Beta(10,4)`, mode của nó là `(10−1)/(10+4−2)=0.75`. MLE cho `0.8`; MAP cho `0.75` vì prior thêm ảnh hưởng. Với dữ liệu rất lớn, ảnh hưởng prior thường nhỏ dần.

## Không biến prior thành sự thật

MAP phụ thuộc prior đã chọn. Một prior sai lệch có thể kéo kết quả sai hướng; cần giải thích giả định và xem độ nhạy khi đổi prior. MLE/MAP là cách ước lượng tham số, không tự chứng minh mô hình phù hợp với đời thực.

## Tự suy ra MLE cho ví dụ tung đồng xu

Với 8 lần ngửa và 2 lần sấp, log-likelihood bỏ hằng số tổ hợp là ℓ(p)=8 ln(p)+2 ln(1−p). Lấy đạo hàm được 8/p−2/(1−p). Cho đạo hàm bằng 0: 8(1−p)=2p, nên p=0.8. Ta tìm giá trị làm dữ liệu đã quan sát có likelihood lớn nhất.

Nếu thêm prior Beta(2,2), hậu nghiệm là Beta(10,4). Mode bằng (10−1)/(10+4−2)=9/12=0.75. Ước lượng MAP thấp hơn MLE vì prior đối xứng kéo kết quả khỏi 0 hoặc 1 khi số quan sát hữu hạn. Khi có nhiều lần tung hơn, 8/10 hay 800/1000 có cùng tỉ lệ MLE, nhưng prior có ảnh hưởng tương đối nhỏ hơn ở mẫu lớn.

## Khi nào dùng mỗi cách?

MLE là lựa chọn tự nhiên khi muốn tối đa hóa mức phù hợp dữ liệu và không muốn đặt prior tường minh. MAP hữu ích khi có kiến thức trước hoặc muốn regularize nghiệm, nhưng phải nêu rõ prior và kiểm tra độ nhạy. Cả hai đều dựa trên mô hình xác suất; nếu mô hình không diễn tả được dữ liệu, phép tối ưu chính xác vẫn cho câu trả lời sai mục đích.

## Tự kiểm tra

Với 8 lần ngửa trên 10 lần tung, MLE cho p bao nhiêu? **0.8.** Nếu MAP ra 0.75 trong ví dụ, phần khác với MLE đến từ đâu? **Prior đã chọn.**

**Nguồn tham khảo:** [Bài 31 về Maximum Likelihood và Maximum A Posteriori](https://machinelearningcoban.com/).
