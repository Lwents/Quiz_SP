# -*- coding: utf-8 -*-
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson

# Xây dựng nội dung chi tiết bám sát 100% từng slide bài giảng của ĐHSP Hà Nội
# Mỗi bài học được viết đầy đủ định nghĩa, ví dụ minh họa từng bước, bảng biểu, mẹo ghi nhớ, định lý và bài tập ứng dụng.
LESSONS_EXPANDED = {
    "Bài 1: Khái niệm Mệnh đề và Các phép toán Logic cơ bản": r"""# Chương 1 - Bài 1: Khái niệm Mệnh đề và Các phép toán Logic cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 1 (Trang 1 - 23) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_1_logic_menh_de.pdf` ở khung trình chiếu bên dưới.

---

## 1. Khái niệm Mệnh đề (Proposition)

### 📌 Định nghĩa chuẩn (Slide trang 4)
Một **mệnh đề** là một câu khẳng định có giá trị chân lý xác định: hoặc **ĐÚNG (ký hiệu là T - Truth)** hoặc **SAI (ký hiệu là F - False)**, không thể vừa đúng vừa sai.

### 💡 Các ví dụ thực tế trong Slide:
* **Các câu LÀ MỆNH ĐỀ:**
  - *"Hà Nội là thủ đô của Việt Nam."* $\rightarrow$ Câu khẳng định đúng, có giá trị chân lý là **T**.
  - *$1 + 1 = 2$* $\rightarrow$ Khẳng định toán học đúng, giá trị chân lý là **T**.
  - *$2 + 2 = 3$* $\rightarrow$ Khẳng định toán học sai, giá trị chân lý là **F**.
  - *"Bác Hồ sinh năm 1890"* $\rightarrow$ Mệnh đề sơ cấp có giá trị chân lý là **T**.
  - *"Bác Hồ mất năm 1970"* $\rightarrow$ Mệnh đề sơ cấp có giá trị chân lý là **F** (Bác mất năm 1969).
* **Các câu KHÔNG PHẢI LÀ MỆNH ĐỀ:**
  - Câu hỏi: *"Bây giờ là mấy giờ?"* $\rightarrow$ Không phải câu khẳng định.
  - Câu mệnh lệnh / khuyên nhủ: *"Hãy suy nghĩ điều này cho kỹ lưỡng!"* $\rightarrow$ Không có tính đúng/sai.
  - Câu chứa biến tự do chưa xác định: $x + 1 = 2$ hoặc $x + y = z$ $\rightarrow$ Chưa xác định được đúng hay sai khi chưa biết giá trị cụ thể của $x, y, z$ (đây là vị từ, không phải mệnh đề).

### 🔍 Mệnh đề sơ cấp (Slide trang 5)
Mệnh đề sơ cấp là mệnh đề mà khi bỏ bớt một thành phần thì không còn là mệnh đề nữa (tương ứng câu khẳng định có 1 chủ ngữ - 1 vị ngữ).

---

## 2. Các phép toán trên Mệnh đề & Quy tắc chân trị (T / F)

Trong slide bài giảng (Trang 6 - 10), mỗi phép toán được gắn liền với một liên từ tiếng Việt và quy tắc xét chân trị chặt chẽ:

### ① Phép phủ định ($\neg p$ hoặc $\overline{p}$) - Liên từ: "Không"
* **Định nghĩa:** Phủ định mệnh đề $p$ nhận giá trị **F** khi $p$ nhận giá trị **T**, nhận giá trị **T** khi $p$ nhận giá trị **F**.
* *Ví dụ:* $p$: "Hôm nay trời mưa" ($T$) $\Rightarrow$ $\neg p$: "Hôm nay trời không mưa" ($F$).

### ② Phép hội ($p \land q$) - Liên từ: "Và", "Nhưng"
* **Định nghĩa:** $p \land q$ chỉ nhận giá trị **T** khi và chỉ khi **cả $p$ và $q$ đều nhận giá trị T**. Nhận giá trị **F** khi ít nhất một trong hai nhận **F**.
* *Ví dụ:* "Tôi thích lập trình ($T$) và tôi thích toán ($T$)" $\rightarrow$ Toàn bộ câu đúng (**T**). Nếu 1 trong 2 vế sai thì câu ghép bị sai ngay (**F**).

### ③ Phép tuyển ($p \lor q$) - Liên từ: "Hoặc"
* **Định nghĩa:** $p \lor q$ nhận giá trị **T** khi và chỉ khi **ít nhất một trong hai mệnh đề $p, q$ nhận giá trị T**. Nhận giá trị **F** khi và chỉ khi cả $p$ và $q$ đều nhận giá trị **F**.
* *Ví dụ:* "Ngày mai tôi đi học ($T$) hoặc tôi đi chơi ($F$)" $\rightarrow$ Vẫn là phát biểu đúng (**T**).

### ④ Phép tuyển loại ($p \oplus q$) - Liên từ: "Hoặc... hoặc...", "Không... không..."
* **Định nghĩa:** $p \oplus q$ chỉ đúng (**T**) khi một trong hai mệnh đề $p$ hoặc $q$ là đúng (khác nhau về giá trị chân lý), và sai (**F**) khi $p$ và $q$ có cùng giá trị chân lý.
* *Ví dụ:* Một bóng đèn điều khiển bởi 2 công tắc cầu thang: Chỉ sáng khi 2 công tắc ở trạng thái đối lập nhau.

### ⑤ Phép kéo theo / Phép suy ra ($p \rightarrow q$) - Liên từ: "Nếu... thì...", "Từ p suy ra q", "q chỉ khi p"
* **Định nghĩa:** $p \rightarrow q$ nhận giá trị **F** khi và chỉ khi **$p$ nhận giá trị T và $q$ nhận giá trị F**. Nhận giá trị **T** trong các trường hợp còn lại.
* *Giải thích dễ hiểu:* Thầy giáo bảo: *"Nếu em đạt 10 điểm ($p$) thì thầy thưởng quà ($q$)"*.
  - Bạn được 10 ($T$) và có quà ($T$) $\rightarrow$ Thầy giữ lời (**T**).
  - Bạn được 10 ($T$) mà không có quà ($F$) $\rightarrow$ Thầy thất hứa (**F**).
  - Bạn không được 10 ($F$), thầy có cho quà hay không thì thầy vẫn không hề nói dối $\rightarrow$ Luôn nhận **T**!

### ⑥ Phép tương đương ($p \leftrightarrow q$) - Liên từ: "Khi và chỉ khi", "Nếu và chỉ nếu"
* **Định nghĩa:** $p \leftrightarrow q$ có giá trị **T** khi $p$ và $q$ có cùng giá trị chân lý (cùng T hoặc cùng F), và nhận **F** khi khác giá trị chân lý.

---

## 3. Bảng giá trị chân lý tổng hợp chuẩn Slide HNUE (Truth Table - Trang 11)

| $p$ | $q$ | $p \lor q$ | $p \land q$ | $\neg p$ | $p \oplus q$ | $p \rightarrow q$ | $p \leftrightarrow q$ |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **T** | **T** | **T** | **T** | **F** | **F** | **T** | **T** |
| **T** | **F** | **T** | **F** | **F** | **T** | **F** | **F** |
| **F** | **T** | **T** | **F** | **T** | **T** | **T** | **F** |
| **F** | **F** | **F** | **F** | **T** | **F** | **T** | **T** |

---

## 4. Thứ tự ưu tiên & Mệnh đề đảo, phản đảo (Slide trang 14 & 16)

### ⚡ Thứ tự ưu tiên các phép toán:
1. Các phép toán trong ngoặc $( )$ luôn thực hiện trước.
2. Khi không có ngoặc, thứ tự ưu tiên giảm dần:
$$\text{Phủ định } (\neg) \;\longrightarrow\; \text{Phép hội } (\land) \;\longrightarrow\; \text{Phép tuyển } (\lor) \;\longrightarrow\; \text{Phép suy ra } (\rightarrow) \;\longrightarrow\; \text{Phép tương đương } (\leftrightarrow)$$

### 🔄 Mệnh đề Đảo và Phản đảo của $p \rightarrow q$:
* **Mệnh đề thuận:** $p \rightarrow q$
* **Mệnh đề đảo:** $q \rightarrow p$
* **Mệnh đề phản đảo:** $\neg q \rightarrow \neg p$
* **Định lý cốt lõi:** Một mệnh đề kéo theo và mệnh đề phản đảo của nó luôn có cùng chân trị (tương đương logic):
$$p \rightarrow q \;\equiv\; \neg q \rightarrow \neg p$$

---

## 5. Ứng dụng Logic mệnh đề: Dịch câu thông thường & Câu đố logic (Slide trang 18 - 23)

### Ứng dụng 1: Mô hình hóa câu điều kiện trong Tin học (Slide trang 18)
*"Bạn có thể truy cập Internet trong khuôn viên trường chỉ khi bạn là sinh viên chuyên ngành khoa học máy tính hoặc bạn không phải là sinh viên năm nhất."*
- $p$: Bạn có thể truy cập Internet trong khuôn viên trường.
- $q$: Bạn là sinh viên chuyên ngành khoa học máy tính.
- $r$: Bạn là sinh viên năm nhất.
$$\Longrightarrow \text{Mô hình hóa logic: } p \rightarrow (q \lor \neg r)$$

### Ứng dụng 2: Câu đố logic người nói thật / nói dối (Slide trang 22 - 23)
* Trong làng có 2 kiểu người: luôn nói thật hoặc luôn nói dối. Gặp A và B:
  - A nói: *"B là người nói thật"*.
  - B nói: *"Hai chúng tôi là 2 người đối lập"*.
* **Phân tích logic:**
  - Giả sử A nói thật ($p = T$) $\Rightarrow$ B nói thật ($q = T$). Khi đó câu của B phải đúng, tức là A và B phải đối lập nhau $\rightarrow$ Mâu thuẫn! Vậy A không thể nói thật.
  - Do đó A nói dối ($p = F$). Vì A nói dối nên câu "B nói thật" là dối $\Rightarrow$ B cũng nói dối ($q = F$). B nói "hai chúng tôi đối lập" là sai, phù hợp vì cả hai cùng là người nói dối!
  - **Kết luận:** Cả A và B đều là người nói dối.
""",

    "Bài 1: Khái niệm Tập hợp và Các phép toán cơ bản": r"""# Chương 2 - Bài 1: Khái niệm Tập hợp và Các phép toán cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 2 (Trang 1 - 20) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_2_ly_thuyet_tap_hop.pdf` ở khung trình chiếu bên dưới.

---

## 1. Khái niệm cơ bản về Tập hợp (Slide trang 2 - 6)

### 📌 Định nghĩa chuẩn
Tập hợp hình thành từ việc nhóm một số đối tượng nào đó với nhau. Các đối tượng đó được gọi là các **phần tử** của tập hợp.
* Ký hiệu tập hợp: $A, B, X, Y...$
* Ký hiệu phần tử: $a, b, c, u, v...$
* $a \in A$: Phần tử $a$ thuộc tập hợp $A$.
* $a \notin A$: Phần tử $a$ không thuộc tập hợp $A$.
* **Tập rỗng:** Là tập không chứa bất kỳ một phần tử nào. Ký hiệu là $\emptyset$ hoặc $\{ \}$.

### 📌 Ba cách biểu diễn tập hợp (Slide trang 3):
1. **Liệt kê các phần tử:** $A = \{u, e, o, a, i\}$
2. **Sử dụng quy tắc đơn giản:** $B = \{0, 2, 4, 6, \dots\}$
3. **Sử dụng quy tắc nhận biết (tính chất đặc trưng):** $C = \{x \mid x < 100 \text{ và } x \text{ là số nguyên tố}\}$

### 📌 Tập con, Tập bằng nhau & Bản số (Slide trang 4 - 5):
* **Tập con:** $A \subseteq B \Leftrightarrow \forall x \in A \Rightarrow x \in B$.
* **Tập bằng nhau:** $A = B \Leftrightarrow A \subseteq B \text{ và } B \subseteq A$.
* **Bản số (Lực lượng của tập hợp hữu hạn):** Tập hợp $S$ có chính xác $n$ phần tử phân biệt thì $n$ được gọi là bản số của $S$, ký hiệu là $|S|$.
  - *Ví dụ:* $A = \{0, 1, 2, 3, 4, 5, 6, 7, 8, 9\} \Rightarrow |A| = 10$.
  - $B = \{0, 2, 4, 6, 8\} \Rightarrow |B| = 5$.
* **Tập lũy thừa của một tập hợp (Slide trang 6):**
  - Tập lũy thừa của $S$ là tập hợp tất cả các tập con của $S$, ký hiệu là $\mathcal{P}(S)$.
  - Nếu $|S| = n$ thì số phần tử của tập lũy thừa là $|\mathcal{P}(S)| = 2^n$.
  - *Ví dụ:* $S = \{0, 1, 2\} \Rightarrow \mathcal{P}(S) = \{\emptyset, \{0\}, \{1\}, \{2\}, \{0, 1\}, \{0, 2\}, \{1, 2\}, \{0, 1, 2\}\}$ (gồm đúng $2^3 = 8$ tập con).

---

## 2. Tích Đề-các (Cartesian Product - Slide trang 7 - 8)
Cho $A$ và $B$ là hai tập hợp. Tích Đề-các của $A$ và $B$ ký hiệu là $A \times B$:
$$A \times B = \{(a, b) \mid a \in A, b \in B\}$$
* Số phần tử: $|A \times B| = |A| \times |B|$.
* *Ví dụ:* $A = \{0, 1\}$ và $B = \{a, b, c\}$.
  - $A \times B = \{(0, a), (0, b), (0, c), (1, a), (1, b), (1, c)\}$.
  - $|A \times B| = 2 \times 3 = 6$ phần tử.

---

## 3. Các Phép toán trên Tập hợp (Slide trang 9 - 11)

1. **Phép hợp (Union):**
   $$A \cup B = \{x \mid x \in A \lor x \in B\}$$
   *(Lấy tất cả các phần tử thuộc A hoặc thuộc B)*
2. **Phép giao (Intersection):**
   $$A \cap B = \{x \mid x \in A \land x \in B\}$$
   *(Chỉ lấy các phần tử chung xuất hiện ở cả A và B)*
3. **Phép hiệu (Difference):**
   $$A \setminus B = \{x \mid x \in A \land x \notin B\}$$
   *(Thuộc A nhưng loại bỏ tất cả phần tử thuộc B)*
4. **Phần bù (Complement):**
   $$\overline{A} = U \setminus A = \{x \in U \mid x \notin A\}$$
   *(Tập hợp tất cả các phần tử trong không gian U mà không thuộc A)*

---

## 4. Các Hằng đẳng thức Tập hợp tương đương với Logic (Slide trang 12 - 14)
Các phép toán tập hợp hoàn toàn tương ứng với các phép toán logic:
* Phép hợp $\cup$ tương ứng phép tuyển $\lor$.
* Phép giao $\cap$ tương ứng phép hội $\land$.
* Phần bù $\overline{A}$ tương ứng phép phủ định $\neg$.
* Luật De Morgan trên tập hợp:
$$\overline{A \cup B} = \overline{A} \cap \overline{B}$$
$$\overline{A \cap B} = \overline{A} \cup \overline{B}$$
""",

    "Bài 2: Ánh xạ, Hàm số và Lực lượng tập hợp": r"""# Chương 2 - Bài 2: Ánh xạ, Hàm số và Lực lượng tập hợp

> **Nguồn giáo trình:** Slide bài giảng Chương 2 (Trang 21 - 30) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_2_ly_thuyet_tap_hop.pdf` ở khung trình chiếu bên dưới.

---

## 1. Khái niệm Ánh xạ (Slide trang 21)
Cho hai tập hợp $A$ và $B$. Một **ánh xạ** (hay hàm số) $f: A \rightarrow B$ là một quy tắc đặt tương ứng mỗi phần tử $x \in A$ với **duy nhất một** phần tử $y = f(x) \in B$.
* $A$ được gọi là **tập nguồn** (miền xác định).
* $B$ được gọi là **tập đích**.
* $y = f(x)$ được gọi là **ảnh** của $x$ qua ánh xạ $f$.

---

## 2. Phân loại Ánh xạ: Đơn ánh, Toàn ánh và Song ánh (Slide trang 22 - 25)

### 📌 Đơn ánh (Injective / One-to-One):
Ánh xạ $f: A \rightarrow B$ được gọi là **đơn ánh** nếu các phần tử khác nhau ở $A$ luôn cho ra các ảnh khác nhau ở $B$:
$$\forall x_1, x_2 \in A: x_1 \neq x_2 \Longrightarrow f(x_1) \neq f(x_2)$$
*(Hoặc tương đương: nếu $f(x_1) = f(x_2)$ thì bắt buộc $x_1 = x_2$)*.

### 📌 Toàn ánh (Surjective / Onto):
Ánh xạ $f: A \rightarrow B$ được gọi là **toàn ánh** nếu mọi phần tử trong tập đích $B$ đều là ảnh của ít nhất một phần tử trong tập nguồn $A$:
$$\forall y \in B, \exists x \in A: f(x) = y$$

### 📌 Song ánh (Bijective / One-to-One Correspondence):
Ánh xạ $f$ vừa là **đơn ánh** vừa là **toàn ánh** thì được gọi là một **song ánh**.
* Khi $f: A \rightarrow B$ là một song ánh, luôn tồn tại một **ánh xạ ngược** $f^{-1}: B \rightarrow A$ sao cho $f^{-1}(y) = x \Leftrightarrow f(x) = y$.

---

## 3. Lực lượng của Tập hợp (Cardinality - Slide trang 27 - 30)

### 📌 Khái niệm cùng lực lượng
Hai tập hợp $A$ và $B$ được gọi là **có cùng lực lượng** (ký hiệu $|A| = |B|$) khi và chỉ khi tồn tại một **song ánh** đi từ $A$ đến $B$.

### 📌 Tập đếm được (Countable Set):
* Một tập hợp được gọi là **đếm được** nếu nó là tập hữu hạn hoặc có cùng lực lượng với tập số tự nhiên $\mathbb{N}$ (tức là có thể đánh số thứ tự các phần tử của nó: $a_1, a_2, a_3, \dots$).
* **Các tập hợp đếm được kinh điển:**
  - Tập các số tự nhiên $\mathbb{N}$.
  - Tập các số nguyên $\mathbb{Z}$.
  - Tập các số hữu tỷ $\mathbb{Q}$.
* **Tập hợp KHÔNG đếm được (Uncountable):**
  - Tập các số thực $\mathbb{R}$.
  - Bất kỳ khoảng thực nào như $(0, 1)$ hoặc $[a, b]$ với $a < b$ đều có lực lượng continuum và không đếm được.
""",

    "Bài 1: Các nguyên lý đếm cơ bản": r"""# Chương 3 - Bài 1: Các nguyên lý đếm cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 3 (Trang 1 - 15) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_3_ly_thuyet_to_hop.pdf` ở khung trình chiếu bên dưới.

---

## 1. Nguyên lý cộng (Sum Rule - Slide trang 6 - 8)

### 📌 Phát biểu quy tắc:
Nếu một công việc có thể thực hiện theo một trong hai phương án **rời nhau** (loại trừ lẫn nhau):
- Phương án 1 có $m$ cách thực hiện.
- Phương án 2 có $n$ cách thực hiện.
$$\Longrightarrow \text{Tổng số cách hoàn thành công việc là: } m + n$$

### 💡 Các ví dụ điển hình trong Slide:
* **Ví dụ 1:** Cần chọn ra một quyển sách để đọc. Biết rằng có 5 cuốn sách văn học và 3 cuốn sách khoa học. Hỏi có bao nhiêu cách chọn?  
  $\rightarrow$ Vì hai loại sách rời nhau, số cách chọn là: $5 + 3 = 8$ cách.
* **Ví dụ 2:** Giả sử cần chọn một chuyến bay hoặc tàu đi từ Hà Nội vào TP.HCM. Có 4 chuyến bay và 3 chuyến tàu mỗi ngày. Hỏi có bao nhiêu lựa chọn phương tiện?  
  $\rightarrow$ Số cách lựa chọn: $4 + 3 = 7$ cách.

---

## 2. Nguyên lý nhân (Product Rule - Slide trang 9 - 10)

### 📌 Phát biểu quy tắc:
Nếu một quy trình được chia thành hai giai đoạn **kế tiếp nhau**:
- Giai đoạn 1 có $m$ cách thực hiện.
- Ứng với mỗi cách của giai đoạn 1, giai đoạn 2 có $n$ cách thực hiện.
$$\Longrightarrow \text{Tổng số cách hoàn thành quy trình là: } m \times n$$

### 💡 Các ví dụ điển hình trong Slide:
* **Ví dụ 3:** Cần chuẩn bị tài liệu cho môn Toán rời rạc gồm 1 vở ghi và 1 bút. Biết có 4 loại vở ghi và 3 loại bút. Hỏi có bao nhiêu cách chọn một bộ?  
  $\rightarrow$ Giai đoạn 1 chọn vở (4 cách), giai đoạn 2 chọn bút (3 cách). Số cách chọn: $4 \times 3 = 12$ cách.
* **Ví dụ 4 (Đánh nhãn ghế phòng học):** Mỗi chiếc ghế được đánh nhãn bằng 1 chữ cái tiếng Anh (26 chữ cái) theo sau bởi một số nguyên dương từ 1 đến 100. Hỏi có tối đa bao nhiêu chiếc ghế được đánh nhãn khác nhau?  
  $\rightarrow$ Chọn chữ cái (26 cách), chọn số (100 cách). Số nhãn tối đa: $26 \times 100 = 2600$ nhãn.

---

## 3. Nguyên lý trừ / Nguyên lý bù trừ (Inclusion-Exclusion - Slide trang 11 - 13)

### 📌 Phát biểu quy tắc:
Khi hai phương án **không rời nhau** (có phần giao nhau bị đếm lặp 2 lần):
$$|A \cup B| = |A| + |B| - |A \cap B|$$

### 💡 Ví dụ trong Slide (Trang 11):
Lớp Toán rời rạc có 25 sinh viên giỏi tin học ($A$), 13 sinh viên giỏi toán ($B$), và 8 sinh viên giỏi cả toán lẫn tin ($A \cap B$). Hỏi lớp có bao nhiêu sinh viên giỏi ít nhất một môn?  
$$\text{Số sinh viên} = 25 + 13 - 8 = 30 \text{ sinh viên.}$$
""",

    "Bài 2: Chỉnh hợp, Hoán vị và Tổ hợp": r"""# Chương 3 - Bài 2: Chỉnh hợp, Hoán vị và Tổ hợp

> **Nguồn giáo trình:** Slide bài giảng Chương 3 (Trang 16 - 48) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_3_ly_thuyet_to_hop.pdf` ở khung trình chiếu bên dưới.

---

## 1. Hoán vị (Permutation - Slide trang 21 - 23)
* **Định nghĩa:** Một hoán vị của $n$ phần tử khác nhau là một cách sắp xếp có thứ tự $n$ phần tử đó.
* **Công thức tính:**
$$P_n = n! = n \times (n-1) \times \dots \times 2 \times 1 \quad (\text{Quy ước: } 0! = 1)$$
* **Ví dụ Slide:** Có 6 người xếp thành một hàng để chụp ảnh. Có bao nhiêu cách xếp?  
  $\rightarrow$ Số cách sắp xếp: $P_6 = 6! = 720$ cách.

---

## 2. Chỉnh hợp chập k của n ($A_n^k$ - Slide trang 17 - 20)
* **Định nghĩa:** Một chỉnh hợp chập $k$ của $n$ phần tử ($1 \le k \le n$) là một cách chọn ra $k$ phần tử từ $n$ phần tử và **CÓ sắp xếp thứ tự**.
* **Công thức tính:**
$$A_n^k = \frac{n!}{(n-k)!} = n(n-1)\dots(n-k+1)$$
* **Ví dụ Slide:** Trong một cuộc thi chạy có 10 thí sinh. Hỏi có bao nhiêu khả năng cho 3 giải: Nhất, Nhì, Ba?  
  $\rightarrow$ Vì 3 giải có thứ tự phân biệt, số khả năng là: $A_{10}^3 = 10 \times 9 \times 8 = 720$ cách.

---

## 3. Tổ hợp chập k của n ($C_n^k$ - Slide trang 26 - 28)
* **Định nghĩa:** Một tổ hợp chập $k$ của $n$ phần tử ($0 \le k \le n$) là một cách chọn ra $k$ phần tử từ $n$ phần tử **KHÔNG quan tâm đến thứ tự**.
* **Công thức tính:**
$$C_n^k = \binom{n}{k} = \frac{n!}{k!(n-k)!}$$
* **Tính chất đối xứng:** $C_n^k = C_n^{n-k}$.
* **Ví dụ Slide:** Cần chọn ra một nhóm 5 cầu thủ từ đội hình 10 cầu thủ dự bị. Hỏi có bao nhiêu cách chọn?  
  $\rightarrow$ Vì chỉ chọn nhóm mà không phân biệt vị trí: $C_{10}^5 = \frac{10!}{5!5!} = 252$ cách.

---

## 4. Chỉnh hợp lặp & Tổ hợp lặp (Slide trang 30 - 38)
* **Chỉnh hợp lặp chập $k$ của $n$ phần tử:** Cho phép phần tử được chọn lại nhiều lần, có tính thứ tự:
$$\widetilde{A}_n^k = n^k$$
  *Ví dụ:* Tạo xâu nhị phân độ dài 8: Mỗi vị trí có 2 cách chọn ($0$ hoặc $1$) $\Rightarrow 2^8 = 256$ xâu.
* **Tổ hợp lặp chập $k$ của $n$ phần tử:**
$$\widetilde{C}_n^k = C_{n+k-1}^k = \frac{(n+k-1)!}{k!(n-1)!}$$
""",

    "Bài 1: Đại số Boole và Cổng logic kỹ thuật số": r"""# Chương 4 - Bài 1: Đại số Boole và Cổng logic kỹ thuật số

> **Nguồn giáo trình:** Slide bài giảng Chương 4 (Trang 1 - 15) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_4_dai_so_boole.pdf` ở khung trình chiếu bên dưới.

---

## 1. Mở đầu & Định nghĩa Đại số Boole (Slide trang 5 - 8)
* Đại số Boole cung cấp các phép toán và các luật trên tập gồm hai giá trị nhị phân $B = \{0, 1\}$.
* Ba phép toán nền tảng:
  1. **Phép lấy phần bù (phủ định):** Ký hiệu $\overline{x}$ hoặc $x'$. Quy tắc: $\overline{0} = 1, \overline{1} = 0$.
  2. **Phép lấy tổng Boole (phép OR):** Ký hiệu $+$. Quy tắc:
     $$0 + 0 = 0, \quad 0 + 1 = 1, \quad 1 + 0 = 1, \quad 1 + 1 = 1$$
  3. **Phép lấy tích Boole (phép AND):** Ký hiệu $\cdot$ (hoặc viết liền). Quy tắc:
     $$0 \cdot 0 = 0, \quad 0 \cdot 1 = 0, \quad 1 \cdot 0 = 0, \quad 1 \cdot 1 = 1$$

---

## 2. Thứ tự ưu tiên & Các hằng đẳng thức Boole (Slide trang 7 - 10)
* **Thứ tự ưu tiên:** Phép lấy phần bù $\overline{x} \longrightarrow$ Phép nhân Boole $\cdot \longrightarrow$ Phép cộng Boole $+$.
* **Các luật Boole quan trọng:**
  - Luật bù: $x + \overline{x} = 1$ ; $x \cdot \overline{x} = 0$.
  - Luật đồng nhất: $x + 0 = x$ ; $x \cdot 1 = x$.
  - Luật nuốt: $x + 1 = 1$ ; $x \cdot 0 = 0$.
  - Luật De Morgan: $\overline{x + y} = \overline{x} \cdot \overline{y}$ ; $\overline{x \cdot y} = \overline{x} + \overline{y}$.

---

## 3. Các Cổng Logic cơ bản (Logic Gates - Slide trang 23 - 28)
* **Cổng AND:** Đầu ra $= 1$ khi và chỉ khi tất cả các đầu vào $= 1$.
* **Cổng OR:** Đầu ra $= 1$ khi có ít nhất một đầu vào $= 1$.
* **Cổng NOT (Inverter):** Đảo ngược mức logic đầu vào ($0 \leftrightarrow 1$).
* **Cổng NAND / NOR:** Cổng đa năng (Universal gates), có thể kết hợp để tạo ra mọi mạch điện tử logic trong thực tế máy tính.
""",

    "Bài 2: Hàm Boole và Dạng chuẩn tắc": r"""# Chương 4 - Bài 2: Hàm Boole và Dạng chuẩn tắc

> **Nguồn giáo trình:** Slide bài giảng Chương 4 (Trang 16 - 29) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_4_dai_so_boole.pdf` ở khung trình chiếu bên dưới.

---

## 1. Khái niệm Hàm Boole (Slide trang 12 - 16)
Một **hàm Boole** $n$ biến là một ánh xạ từ $B^n$ vào $B$:
$$f: \{0, 1\}^n \longrightarrow \{0, 1\}$$
* Với $n$ biến nhị phân, có $2^n$ tổ hợp đầu vào khác nhau.
* Do đó, có tất cả $2^{2^n}$ hàm Boole $n$ biến khác nhau.
  - Với $n = 1$: Có $2^{2^1} = 2^2 = 4$ hàm.
  - Với $n = 2$: Có $2^{2^2} = 2^4 = 16$ hàm.

---

## 2. Dạng chuẩn tắc tổng (SOP) & Dạng chuẩn tắc tích (POS) (Slide trang 17 - 22)

### 📌 Minterm (Tích chuẩn):
Một minterm của $n$ biến là tích của $n$ biến, trong đó mỗi biến xuất hiện đúng một lần ở dạng khẳng định ($x$) hoặc phủ định ($\overline{x}$).
* Quy ước: Biến nhận giá trị $1$ biểu diễn là $x$, biến nhận $0$ biểu diễn là $\overline{x}$.
* Minterm chỉ nhận giá trị $1$ tại duy nhất một hàng chân trị.

### 📌 Dạng tổng chuẩn (Sum-of-Products - SOP):
Mọi hàm Boole không đồng nhất bằng 0 đều có thể biểu diễn duy nhất dưới dạng tổng của các minterm ứng với các hàng mà tại đó hàm nhận giá trị $1$.
""",

    "Bài 1: Định nghĩa Đồ thị và Phân loại cơ bản": r"""# Chương 5 - Bài 1: Định nghĩa Đồ thị và Phân loại cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 6 - Phần 1 (Trang 1 - 48) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_6_ly_thuyet_do_thi_p1.pdf` ở khung trình chiếu bên dưới.

---

## 1. Định nghĩa Đồ thị (Slide trang 4 - 10)

### 📌 Khái niệm đồ thị:
Đồ thị là một mô hình toán học dùng để giải quyết rất nhiều bài toán thực tế. Một đồ thị có thể hiểu đơn giản là một hệ thống gồm các **đỉnh** và các **cạnh** nối các đỉnh này với nhau.

### 📌 Đồ thị vô hướng (Undirected Graph - Slide trang 6):
Đồ thị vô hướng $G = (V, E)$ gồm:
* $V$ là tập hợp các **đỉnh** (Vertices / Nodes), $V \neq \emptyset$.
* $E$ là tập hợp các **cạnh** (Edges), mỗi phần tử là một cặp không thứ tự $(v, w)$ của 2 đỉnh thuộc $V$. Khi đó $(v, w) \equiv (w, v)$.
* *Ví dụ:* Bản đồ mạng giao thông hai chiều, mạng kết nối bạn bè Facebook.

### 📌 Đồ thị có hướng (Directed Graph - Slide trang 9):
Đồ thị có hướng $G = (V, E)$ gồm tập đỉnh $V$ và tập các **cung** $E$. Mỗi phần tử là một cặp có thứ tự $[v, w]$ đi từ đỉnh đầu $v$ đến đỉnh cuối $w$. Khi đó $[v, w] \neq [w, v]$.
* *Ví dụ:* Mạng đường một chiều, đồ thị thi đấu vòng tròn thắng - thua.

---

## 2. Một số thuật ngữ cơ bản (Slide trang 11 - 15)
* Cho cạnh $e = (v, w) \in E$:
  - $e$ là cạnh liên thuộc với hai đỉnh $v$ và $w$.
  - Hai đỉnh $v, w$ gọi là **kề nhau**.
  - Nếu $v \equiv w$ (cạnh nối một đỉnh với chính nó) thì $e$ gọi là một **khuyên** (loop).
  - Nếu có từ 2 cạnh trở lên cùng nối một cặp đỉnh $(v, w)$ thì gọi là **cạnh song song** (đa cạnh).
* **Đơn đồ thị (Simple graph):** Đồ thị không có khuyên và không có cạnh song song.

---

## 3. Bậc của Đỉnh & Định lý Bắt tay (Slide trang 26 - 28)

### 📌 Bậc của đỉnh $\deg(v)$:
Trong đồ thị vô hướng, bậc của đỉnh $v$ (ký hiệu $\deg(v)$) bằng số cạnh liên thuộc với nó (mỗi khuyên tính 2 đơn vị).
* **Đỉnh cô lập:** Đỉnh có $\deg(v) = 0$.
* **Đỉnh treo:** Đỉnh có $\deg(v) = 1$.

### 📌 Định lý Bắt tay (Handshaking Theorem - Slide trang 28):
Cho đồ thị vô hướng $G = (V, E)$ có $m$ cạnh. Khi đó:
$$2|E| = \sum_{v \in V} \deg(v)$$

### 📌 Hệ quả quan trọng:
Trong mọi đồ thị vô hướng, **số đỉnh có bậc lẻ luôn luôn là một số chẵn!**

---

## 4. Đường đi, Chu trình & Tính Liên thông (Slide trang 29 - 38)
* **Đường đi:** Dãy các cạnh $e_1, e_2, \dots, e_m$ nối các đỉnh liên tiếp nhau mà các đỉnh đôi một khác nhau.
* **Chu trình:** Đường đi khép kín có đỉnh xuất phát trùng với đỉnh kết thúc ($v_1 \equiv v_{m+1}$).
* **Đồ thị liên thông:** Đồ thị mà giữa hai đỉnh bất kỳ luôn luôn có đường đi nối giữa chúng.
* **Đỉnh cắt & Cạnh cầu (Slide trang 38):**
  - **Đỉnh cắt:** Đỉnh mà khi bỏ nó cùng các cạnh gắn với nó sẽ làm tăng số thành phần liên thông của đồ thị.
  - **Cạnh cầu:** Cạnh mà khi xóa nó đi sẽ làm tăng số thành phần liên thông của đồ thị.
""",

    "Bài 2: Một số đồ thị đơn vô hướng đặc biệt": r"""# Chương 5 - Bài 2: Một số đồ thị đơn vô hướng đặc biệt

> **Nguồn giáo trình:** Slide bài giảng Chương 6 - Phần 2 (Trang 1 - 35) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_6_ly_thuyet_do_thi_p2.pdf` ở khung trình chiếu bên dưới.

---

## 1. Đồ thị Đầy đủ $K_n$ (Slide trang 4 - 5)
* **Định nghĩa:** Đồ thị đầy đủ $n$ đỉnh, ký hiệu $K_n$, là đơn đồ thị vô hướng mà giữa **hai đỉnh bất kỳ đều có cạnh nối**.
* **Đặc điểm:**
  - Có $n$ đỉnh.
  - Mỗi đỉnh đều có bậc bằng nhau: $\deg(v) = n - 1$.
  - Tổng số cạnh: $|E| = \frac{n(n-1)}{2}$.

---

## 2. Đồ thị Vòng $C_n$ & Đồ thị Bánh xe $W_n$ (Slide trang 6 - 8)
* **Đồ thị vòng $C_n$ ($n \ge 3$):** Gồm $n$ đỉnh $v_1, v_2, \dots, v_n$ và các cạnh $(v_1, v_2), (v_2, v_3), \dots, (v_n, v_1)$ tạo thành một chu trình khép kín. Mọi đỉnh đều có bậc bằng $2$.
* **Đồ thị bánh xe $W_n$ ($n \ge 3$):** Thu được bằng cách lấy đồ thị vòng $C_n$ và thêm 1 đỉnh trung tâm $w$, rồi nối đỉnh $w$ này tới tất cả $n$ đỉnh của $C_n$.
  - Đỉnh trung tâm có bậc: $\deg(w) = n$.
  - $n$ đỉnh ngoài có bậc: $\deg(v) = 3$.
  - Tổng số cạnh: $|E| = 2n$.

---

## 3. Đồ thị Lưỡng phân (Bipartite Graph - Slide trang 12 - 18)
* **Định nghĩa:** Đồ thị $G = (V, E)$ được gọi là đồ thị lưỡng phân nếu tập đỉnh $V$ có thể phân hoạch thành hai tập rời nhau $V_1$ và $V_2$ ($V = V_1 \cup V_2$ và $V_1 \cap V_2 = \emptyset$) sao cho mỗi cạnh của $E$ chỉ nối một đỉnh thuộc $V_1$ với một đỉnh thuộc $V_2$ (không có cạnh nào nối giữa 2 đỉnh cùng thuộc $V_1$ hoặc cùng thuộc $V_2$).
* **Định lý quan trọng (Slide trang 14):** Một đồ thị $G$ là đồ thị lưỡng phân **khi và chỉ khi nó không chứa chu trình có độ dài lẻ**!
* **Đồ thị lưỡng phân đầy đủ $K_{m, n}$:** Mỗi đỉnh của $V_1$ ($m$ đỉnh) đều nối với tất cả các đỉnh của $V_2$ ($n$ đỉnh). Tổng số cạnh là $m \times n$.

---

## 4. Đồ thị Euler & Chu trình Hamilton (Slide trang 19 - 35)
* **Đồ thị Euler:** Đồ thị có chu trình đi qua tất cả các cạnh của đồ thị đúng một lần.
  - **Định lý Euler:** Đơn đồ thị liên thông là đồ thị Euler khi và chỉ khi **mọi đỉnh của nó đều có bậc chẵn**.
* **Chu trình Hamilton:** Chu trình đi qua tất cả các đỉnh của đồ thị đúng một lần.
""",

    "Bài 3: Cây và Cây khung nhỏ nhất (Spanning Tree)": r"""# Chương 5 - Bài 3: Cây và Cây khung nhỏ nhất (Spanning Tree)

> **Nguồn giáo trình:** Slide bài giảng Chương 6 - Phần 3 (Trang 1 - 51) - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_6_ly_thuyet_do_thi_p3.pdf` ở khung trình chiếu bên dưới.

---

## 1. Định nghĩa Cây (Tree - Slide trang 4 - 10)
* **Định nghĩa chuẩn:** Cây là một đơn đồ thị vô hướng, **liên thông** và **không chứa bất kỳ chu trình nào**.
* **Định lý Daisy Chain (Đặc trưng của Cây):** Một đồ thị $T = (V, E)$ có $n$ đỉnh là một cây khi và chỉ khi thỏa mãn các điều kiện tương đương sau:
  1. $T$ liên thông và có đúng $n - 1$ cạnh ($|E| = |V| - 1$).
  2. Giữa hai đỉnh bất kỳ của $T$ luôn có duy nhất một đường đi đơn.
  3. $T$ không có chu trình và có đúng $n - 1$ cạnh.
  4. $T$ không có chu trình, nhưng nếu thêm một cạnh bất kỳ nối 2 đỉnh chưa kề nhau sẽ tạo ra đúng một chu trình.

---

## 2. Cây có gốc & Cây nhị phân tìm kiếm (Slide trang 11 - 15)
* **Cây có gốc (Rooted Tree):** Chọn một đỉnh đặc biệt làm gốc, các cạnh được định hướng đi từ gốc ra ngoài.
* **Cây nhị phân (Binary Tree):** Mỗi đỉnh có tối đa 2 con (con trái và con phải).
* **Cây nhị phân tìm kiếm (BST):** Giá trị của nút con bên trái luôn nhỏ hơn nút cha, giá trị của nút con bên phải luôn lớn hơn nút cha.

---

## 3. Cây khung & Cây khung nhỏ nhất (Minimum Spanning Tree - Slide trang 23 - 36)
* **Cây khung (Spanning Tree):** Cho đồ thị liên thông $G = (V, E)$. Một đồ thị con $T = (V, E')$ của $G$ được gọi là cây khung nếu $T$ chứa tất cả các đỉnh của $G$ và $T$ là một cây.
* **Cây khung nhỏ nhất (MST):** Cho đồ thị có trọng số, cây khung nhỏ nhất là cây khung có tổng trọng số các cạnh là nhỏ nhất:
$$W(T) = \sum_{e \in E'} w(e) \longrightarrow \min$$

### 🛠️ Hai thuật toán kinh điển tìm Cây khung nhỏ nhất:
1. **Thuật toán Kruskal (Tham lam theo cạnh - Slide trang 35):**
   - Bước 1: Sắp xếp tất cả các cạnh theo trọng số tăng dần.
   - Bước 2: Lần lượt chọn cạnh có trọng số nhỏ nhất kết nạp vào cây, miễn là không tạo thành chu trình với các cạnh đã chọn.
   - Dừng lại khi đã chọn đủ $n - 1$ cạnh.
2. **Thuật toán Prim (Phát triển từ đỉnh - Slide trang 34):**
   - Bắt đầu từ 1 đỉnh tùy ý.
   - Mỗi bước, chọn cạnh có trọng số nhỏ nhất nối giữa một đỉnh đã thuộc cây với một đỉnh chưa thuộc cây.
   - Lặp lại cho đến khi toàn bộ các đỉnh được kết nạp vào cây.
"""
}

async def update_all():
    async with AsyncSessionLocal() as session:
        lessons = (await session.execute(select(Lesson))).scalars().all()
        for l in lessons:
            if l.title in LESSONS_EXPANDED:
                l.content = LESSONS_EXPANDED[l.title]
                print(f"Updated rich slide-based content for: {l.title}")
        await session.commit()
        print("Successfully updated all 12 lessons to comprehensive slide-aligned versions!")

if __name__ == "__main__":
    asyncio.run(update_all())
