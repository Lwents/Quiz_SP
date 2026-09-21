# -*- coding: utf-8 -*-
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson

# Nội dung bám sát 100% từng slide bài giảng HNUE, dùng T (True) / F (False), ví dụ chuẩn và giải thích cực kỳ dễ hiểu
LESSONS = {
    "Bài 1: Khái niệm Mệnh đề và Các phép toán Logic cơ bản": r"""# Chương 1 - Bài 1: Khái niệm Mệnh đề và Các phép toán Logic cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 1 - *TS. Phạm Thị Lan (Khoa CNTT - Trường ĐH Sư phạm Hà Nội)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_1_logic_menh_de.pdf` ở khung trình chiếu bên dưới.

---

## 1. Khái niệm Mệnh đề (Proposition)

### 📌 Định nghĩa chuẩn
Một **mệnh đề** là một câu khẳng định có giá trị chân lý hoặc **ĐÚNG (ký hiệu là T - Truth)** hoặc **SAI (ký hiệu là F - False)**, không thể vừa đúng vừa sai.

### 💡 Ví dụ từ bài giảng
* **Là mệnh đề:**
  - *"Hà Nội là thủ đô của Việt Nam."* $\rightarrow$ Là mệnh đề có giá trị chân lý là **T** (Đúng).
  - *$1 + 1 = 2$* $\rightarrow$ Là mệnh đề có giá trị chân lý là **T** (Đúng).
  - *$2 + 2 = 3$* $\rightarrow$ Là mệnh đề có giá trị chân lý là **F** (Sai).
  - *"Bác Hồ sinh năm 1890"* $\rightarrow$ Là mệnh đề sơ cấp có giá trị chân lý là **T**.
* **KHÔNG PHẢI là mệnh đề:**
  - Câu hỏi: *"Bây giờ là mấy giờ?"* (Không khẳng định tính đúng hay sai).
  - Câu mệnh lệnh / khuyên nhủ: *"Hãy suy nghĩ điều này cho kỹ lưỡng!"*.
  - Câu chứa biến số chưa xác định: $x + 1 = 2$ hoặc $x + y = z$ (Tính đúng sai phụ thuộc vào giá trị của biến, đây là vị từ chứ chưa phải mệnh đề).

---

## 2. Các phép toán trên Mệnh đề & Bảng chân trị chuẩn (T / F)

Trong slide bài giảng, mỗi phép toán được định nghĩa cụ thể về chân trị **T / F** và liên từ tiếng Việt tương ứng:

### ① Phép phủ định ($\neg p$ hoặc $\overline{p}$)
* **Ý nghĩa:** Đảo ngược giá trị chân trị của $p$.
* **Quy tắc:** $\neg p$ nhận giá trị **F** khi $p$ nhận giá trị **T**; nhận giá trị **T** khi $p$ nhận giá trị **F**.
* **Liên từ diễn đạt:** *"Không"*, *"Không phải là"*.

### ② Phép hội ($p \land q$)
* **Ý nghĩa:** Phép "VÀ" (Conjunction).
* **Quy tắc:** $p \land q$ chỉ nhận giá trị **T** khi và chỉ khi **cả $p$ và $q$ đều nhận giá trị T**. Nhận giá trị **F** khi có ít nhất một trong hai nhận **F**.
* **Liên từ diễn đạt:** *"Và"*, *"Nhưng"*.
* **Mẹo nhớ:** Cả hai cùng đúng thì mới đúng!

### ③ Phép tuyển ($p \lor q$)
* **Ý nghĩa:** Phép "HOẶC" (Disjunction).
* **Quy tắc:** $p \lor q$ nhận giá trị **T** khi có **ít nhất một trong hai mệnh đề $p, q$ nhận giá trị T**. Nhận giá trị **F** khi và chỉ khi **cả $p$ và $q$ đều nhận F**.
* **Liên từ diễn đạt:** *"Hoặc"*.
* **Mẹo nhớ:** Chỉ cần một bên đúng là đúng ngay!

### ④ Phép tuyển loại ($p \oplus q$)
* **Ý nghĩa:** Phép tuyển loại trừ (Exclusive OR - XOR).
* **Quy tắc:** $p \oplus q$ chỉ nhận **T** khi **đúng một trong hai mệnh đề là đúng** (khác nhau về giá trị). Nhận **F** khi $p$ và $q$ có cùng giá trị chân lý (cùng T hoặc cùng F).
* **Liên từ diễn đạt:** *"Hoặc... hoặc..."*, *"Không... không..."*.

### ⑤ Phép kéo theo ($p \rightarrow q$)
* **Ý nghĩa:** Phép suy ra (Implication).
* **Quy tắc cực kỳ quan trọng:** $p \rightarrow q$ chỉ nhận giá trị **F** trong **duy nhất trường hợp $p = T$ mà $q = F$** ($T \rightarrow F$ ra **F**). Nhận giá trị **T** trong tất cả các trường hợp còn lại.
* **Liên từ diễn đạt:** *"Nếu p thì q"*, *"từ p suy ra q"*, *"q chỉ khi p"*.
* **Mẹo nhớ:** "Hứa làm ($p=T$) mà không làm ($q=F$) thì mới là nói dối ($F$), còn nếu không hứa ($p=F$) thì kết quả thế nào cũng đúng ($T$)".

### ⑥ Phép tương đương ($p \leftrightarrow q$)
* **Ý nghĩa:** Hai chiều (Biconditional).
* **Quy tắc:** $p \leftrightarrow q$ có giá trị **T** khi $p$ và $q$ có **cùng giá trị chân lý** (cùng T hoặc cùng F). Nhận giá trị **F** khi khác giá trị chân lý.
* **Liên từ diễn đạt:** *"Nếu và chỉ nếu"*, *"Khi và chỉ khi"*, *"Từ p suy ra q và ngược lại"*.

---

## 3. Bảng giá trị chân lý tổng hợp chuẩn Slide HNUE (Truth Table)

Dưới đây là bảng chân trị chính thức trang 11 trong Slide của cô Phạm Thị Lan:

| $p$ | $q$ | $p \lor q$ | $p \land q$ | $\neg p$ | $p \oplus q$ | $p \rightarrow q$ | $p \leftrightarrow q$ |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **T** | **T** | **T** | **T** | **F** | **F** | **T** | **T** |
| **T** | **F** | **T** | **F** | **F** | **T** | **F** | **F** |
| **F** | **T** | **T** | **F** | **T** | **T** | **T** | **F** |
| **F** | **F** | **F** | **F** | **T** | **F** | **T** | **T** |

---

## 4. Thứ tự ưu tiên & Mệnh đề đảo, phản đảo (Slide trang 14 & 16)

### ⚡ Thứ tự ưu tiên các phép toán (khi không có dấu ngoặc)
1. Các phép toán trong dấu ngoặc $( )$ luôn thực hiện trước.
2. Khi không có ngoặc, thứ tự ưu tiên giảm dần:
$$\text{Phủ định } (\neg) \;>\; \text{Phép hội } (\land) \;>\; \text{Phép tuyển } (\lor) \;>\; \text{Phép suy ra } (\rightarrow) \;>\; \text{Phép tương đương } (\leftrightarrow)$$

### 🔄 Mệnh đề Đảo và Phản đảo của $p \rightarrow q$
* **Mệnh đề ban đầu:** $p \rightarrow q$ (Nếu $p$ thì $q$)
* **Mệnh đề đảo:** $q \rightarrow p$ (Nếu $q$ thì $p$)
* **Mệnh đề phản đảo:** $\neg q \rightarrow \neg p$ (Nếu phủ định $q$ thì phủ định $p$)
* **Quy tắc vàng:** Mệnh đề phản đảo **luôn tương đương logic** với mệnh đề ban đầu:
$$p \rightarrow q \;\equiv\; \neg q \rightarrow \neg p$$
* **Ví dụ trong slide:**
  - Mệnh đề gốc: *"Nếu hôm nay có tuyết rơi ($p$), ngày mai tôi sẽ đi trượt tuyết ($q$)"*
  - Mệnh đề đảo: *"Nếu ngày mai tôi đi trượt tuyết, hôm nay có tuyết rơi"*
  - Mệnh đề phản đảo: *"Nếu ngày mai tôi không đi trượt tuyết, hôm nay không có tuyết rơi"*
""",

    "Bài 2: Tương đương Logic & Biến đổi biểu thức": r"""# Chương 1 - Bài 2: Tương đương Logic & Biến đổi biểu thức

> **Nguồn giáo trình:** Slide bài giảng Chương 1 - Phần 4 *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_1_logic_menh_de.pdf` từ trang 24 đến 31.

---

## 1. Khái niệm Hằng đúng, Hằng sai & Tương đương Logic

### 📌 Định nghĩa chuẩn Slide HNUE (Trang 26)
* **Hằng đúng (Tautology):** Một mệnh đề phức hợp mà luôn luôn nhận giá trị **T** với bất kể các giá trị chân lý của các mệnh đề thành phần.
* **Hằng sai (Contradiction):** Một mệnh đề luôn luôn nhận giá trị **F** với mọi giá trị chân lý của các mệnh đề thành phần.
* **Tương đương logic:** Hai mệnh đề $p$ và $q$ được gọi là **tương đương logic** với nhau (ký hiệu $p \equiv q$ hoặc $p \Leftrightarrow q$) khi và chỉ khi mệnh đề $p \leftrightarrow q$ là một **hằng đúng** (tức là $p$ và $q$ luôn luôn có cùng giá trị chân lý trong mọi trường hợp).

---

## 2. Bảng các Luật Tương đương Logic cốt lõi (Slide trang 27 & 28)

Dưới đây là các định luật nền tảng dùng để giải toàn bộ câu hỏi trắc nghiệm của CST HNUE:

| Tên luật logic | Biểu thức tương đương theo slide | Ý nghĩa & Giải thích trực quan |
| :--- | :--- | :--- |
| **Luật đồng nhất** | $p \land T \equiv p$<br>$p \lor F \equiv p$ | Giao với $T$ hoặc hợp với $F$ thì chân trị không đổi |
| **Luật nuốt (Hấp thu)** | $p \lor T \equiv T$<br>$p \land F \equiv F$ | Hợp với Đúng luôn ra Đúng; Giao với Sai luôn ra Sai |
| **Luật lũy đẳng** | $p \lor p \equiv p$<br>$p \land p \equiv p$ | Lặp lại cùng một mệnh đề thì giá trị giữ nguyên |
| **Luật phủ định kép** | $\neg(\neg p) \equiv p$ | Phủ định của phủ định là khẳng định |
| **Luật đầy đủ & Phi mâu thuẫn** | $p \lor \neg p \equiv T$ *(Đầy đủ / bài trung)*<br>$p \land \neg p \equiv F$ *(Phi mâu thuẫn)* | Một điều hoặc đúng hoặc sai (luôn T); Không thể vừa đúng vừa sai (luôn F) |
| **Luật giao hoán** | $p \lor q \equiv q \lor p$<br>$p \land q \equiv q \land p$ | Đổi vị trí hai vế kết quả không đổi |
| **Luật kết hợp** | $(p \lor q) \lor r \equiv p \lor (q \lor r)$<br>$(p \land q) \land r \equiv p \land (q \land r)$ | Cùng phép toán thì nhóm tùy ý |
| **Luật phân phối** | $p \lor (q \land r) \equiv (p \lor q) \land (p \lor r)$<br>$p \land (q \lor r) \equiv (p \land q) \lor (p \land r)$ | Nhân phân phối giữa phép $\land$ và phép $\lor$ |
| **Luật De Morgan** | $\neg(p \land q) \equiv \neg p \lor \neg q$<br>$\neg(p \lor q) \equiv \neg p \land \neg q$ | Phủ định bên ngoài đưa vào trong đổi $\land \leftrightarrow \lor$ |

---

## 3. Các hệ thức biến đổi tương đương quan trọng khi làm Quiz
1. **Biến đổi phép kéo theo:**
   $$p \rightarrow q \;\equiv\; \neg p \lor q$$
2. **Biến đổi phép tương đương:**
   $$p \leftrightarrow q \;\equiv\; (p \rightarrow q) \land (q \rightarrow p) \;\equiv\; \neg(p \oplus q)$$
3. **Phủ định của phép tương đương:**
   $$\neg(p \leftrightarrow q) \;\equiv\; \neg p \leftrightarrow q \;\equiv\; p \leftrightarrow \neg q \;\equiv\; p \oplus q$$
""",

    "Bài 3: Vị ngữ và Lượng từ (∀ Với mọi, ∃ Tồn tại)": r"""# Chương 1 - Bài 3: Vị ngữ, Lượng từ và Các quy tắc suy luận

> **Nguồn giáo trình:** Slide bài giảng Chương 1 - Phần 5 & 6 *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_1_logic_menh_de.pdf` từ trang 32 đến 48.

---

## 1. Vị ngữ & Hàm mệnh đề (Slide trang 32)
* Xét câu chứa biến: $P(x): "x > 2, x \in \mathbb{N}"$. Đây là một **hàm mệnh đề** (hay vị từ).
* Khi thay $x = 3 \Rightarrow P(3): 3 > 2$ là mệnh đề có giá trị **T**.
* Khi thay $x = 1 \Rightarrow P(1): 1 > 2$ là mệnh đề có giá trị **F**.

---

## 2. Hai lượng từ toán học cơ bản (Slide trang 34 - 35)

| Lượng từ | Ký hiệu & Cách đọc | Nhận giá trị T khi nào? | Nhận giá trị F khi nào? |
| :--- | :--- | :--- | :--- |
| **Lượng từ với mọi** | $\forall x P(x)$<br>*(Với mọi, tất cả, với mỗi)* | $P(x)$ **đúng với tất cả** mọi $x$ trong tập xác định | Tồn tại **ít nhất một** phần tử $x_0$ làm $P(x_0)$ sai |
| **Lượng từ tồn tại** | $\exists x P(x)$<br>*(Tồn tại, có ít nhất một)* | Có **ít nhất một** phần tử $x_0$ làm $P(x_0)$ đúng | $P(x)$ **sai với mọi** $x$ trong tập xác định |

---

## 3. Quy tắc phủ định mệnh đề lượng từ (De Morgan mở rộng) (Slide trang 36)
Phủ định đưa vào trong biến $\forall$ thành $\exists$, biến $\exists$ thành $\forall$ và phủ định vị ngữ:
$$\overline{\forall x P(x)} \;\equiv\; \exists x \overline{P(x)}$$
$$\overline{\exists x P(x)} \;\equiv\; \forall x \overline{P(x)}$$

### Với mệnh đề hai biến $P(x, y)$:
$$\overline{\exists x \forall y P(x, y)} \;\equiv\; \forall x \exists y \overline{P(x, y)}$$
$$\overline{\forall x \exists y P(x, y)} \;\equiv\; \exists x \forall y \overline{P(x, y)}$$

---

## 4. Các Quy tắc suy diễn có cơ sở (Slide trang 37 - 42)

Dưới đây là các quy tắc suy diễn kinh điển trong đề thi:

1. **Quy tắc khẳng định (Modus Ponens):**
   $$\frac{p \rightarrow q, \quad p}{\therefore q}$$
   *Ví dụ:* Nếu trời mưa thì nghỉ làm ($p \rightarrow q$). Hôm nay trời mưa ($p$). Kết luận: Chúng ta nghỉ làm ($q$).
2. **Quy tắc phủ định (Modus Tollens):**
   $$\frac{p \rightarrow q, \quad \neg q}{\therefore \neg p}$$
   *Ví dụ:* Nếu trời mưa thì có sấm ($p \rightarrow q$). Trời không có sấm ($\neg q$). Kết luận: Trời không mưa ($\neg p$).
3. **Quy tắc tam đoạn luận:**
   $$\frac{p \rightarrow q, \quad q \rightarrow r}{\therefore p \rightarrow r}$$
4. **Quy tắc loại trừ:**
   $$\frac{p \lor q, \quad \neg p}{\therefore q}$$
""",

    "Bài 1: Khái niệm Tập hợp và Các phép toán cơ bản": r"""# Chương 2 - Bài 1: Khái niệm Tập hợp và Các phép toán cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 2 - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_2_ly_thuyet_tap_hop.pdf` từ trang 1 đến 15.

---

## 1. Khái niệm cơ bản về Tập hợp (Slide trang 2 - 6)
- **Tập hợp (Set):** Hình thành từ việc nhóm một số đối tượng với nhau. Các đối tượng gọi là **phần tử**.
- **Ký hiệu:** Tập hợp ký hiệu bằng chữ hoa: $A, B, X, Y...$; phần tử ký hiệu bằng chữ thường: $a, b, c...$
- $a \in A$: Phần tử $a$ thuộc tập hợp $A$.
- $a \notin A$: Phần tử $a$ không thuộc tập hợp $A$.
- **Tập rỗng:** Ký hiệu là $\emptyset$ hoặc $\{ \}$, là tập không chứa bất kỳ một phần tử nào.

### 📌 Các cách biểu diễn tập hợp (Slide trang 3):
1. **Liệt kê phần tử:** $A = \{u, e, o, a, i\}$
2. **Quy tắc nhận biết:** $C = \{x \mid x < 100 \text{ và } x \text{ là số nguyên tố}\}$

### 📌 Tập con, Tập bằng nhau & Bản số (Slide trang 4):
- **Tập con:** $A \subseteq B \Leftrightarrow \forall x \in A \Rightarrow x \in B$.
- **Tập bằng nhau:** $A = B \Leftrightarrow A \subseteq B \text{ và } B \subseteq A$.
- **Bản số (Lực lượng):** Tập hợp $S$ có chính xác $n$ phần tử phân biệt thì $n$ được gọi là bản số của $S$, ký hiệu $|S|$.
- **Tập lũy thừa $P(S)$:** Là tập hợp tất cả các tập con của $S$. Nếu $|S| = n$ thì số phần tử của tập lũy thừa là $2^{|S|} = 2^n$.

---

## 2. Các Phép toán trên Tập hợp (Slide trang 9 - 11)

1. **Phép hợp (Union):**
   $$A \cup B = \{x \mid x \in A \lor x \in B\}$$
   *(Lấy tất cả các phần tử thuộc A hoặc thuộc B)*
2. **Phép giao (Intersection):**
   $$A \cap B = \{x \mid x \in A \land x \in B\}$$
   *(Chỉ lấy các phần tử chung của cả A và B)*
3. **Phép hiệu (Difference):**
   $$A \setminus B = \{x \mid x \in A \land x \notin B\}$$
   *(Thuộc A nhưng không thuộc B)*
4. **Phần bù (Complement):**
   $$\overline{A} = U \setminus A = \{x \in U \mid x \notin A\}$$
   *(Tất cả phần tử trong không gian U không thuộc A)*
5. **Tích Đề-các (Cartesian Product) (Slide trang 7):**
   $$A \times B = \{(a, b) \mid a \in A, b \in B\}$$
   Số phần tử: $|A \times B| = |A| \times |B|$.
""",

    "Bài 2: Ánh xạ, Hàm số và Lực lượng tập hợp": r"""# Chương 2 - Bài 2: Ánh xạ, Hàm số và Lực lượng tập hợp

> **Nguồn giáo trình:** Slide bài giảng Chương 2 - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_2_ly_thuyet_tap_hop.pdf` từ trang 16 đến 30.

---

## 1. Khái niệm Ánh xạ (Hàm số)
Cho $A$ và $B$ là hai tập hợp. Ánh xạ $f: A \rightarrow B$ là một quy tắc đặt tương ứng mỗi phần tử $x \in A$ với duy nhất một phần tử $y = f(x) \in B$.
- $A$: Miền xác định (Domain).
- $B$: Miền giá trị (Codomain).

---

## 2. Phân loại Ánh xạ: Đơn ánh, Toàn ánh, Song ánh

| Phân loại | Định nghĩa toán học | Ý nghĩa trực quan |
| :--- | :--- | :--- |
| **Đơn ánh (Injective)** | $\forall x_1, x_2 \in A: x_1 \neq x_2 \Rightarrow f(x_1) \neq f(x_2)$ | Các phần tử khác nhau ở $A$ cho ra các ảnh khác nhau ở $B$ |
| **Toàn ánh (Surjective)** | $\forall y \in B, \exists x \in A: f(x) = y$ | Mọi phần tử ở $B$ đều có ít nhất một phần tử ở $A$ chiếu tới |
| **Song ánh (Bijective)** | Vừa là đơn ánh, vừa là toàn ánh | Tương ứng 1 - 1 hoàn hảo giữa $A$ và $B$ |

* Khi $f$ là song ánh, tồn tại **ánh xạ ngược** $f^{-1}: B \rightarrow A$.

---

## 3. Lực lượng của Tập hợp vô hạn
- Hai tập hợp có cùng lực lượng nếu tồn tại một song ánh giữa chúng.
- Tập hợp được gọi là **đếm được** nếu nó hữu hạn hoặc có cùng lực lượng với tập số tự nhiên $\mathbb{N}$.
- Tập số nguyên $\mathbb{Z}$, tập số hữu tỷ $\mathbb{Q}$ là các tập đếm được. Tập số thực $\mathbb{R}$ là tập không đếm được.
""",

    "Bài 1: Các nguyên lý đếm cơ bản": r"""# Chương 3 - Bài 1: Các nguyên lý đếm cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 3 - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_3_ly_thuyet_to_hop.pdf` từ trang 1 đến 15.

---

## 1. Nguyên lý cộng (Sum Rule) - Slide trang 6
Nếu một công việc có thể hoàn thành theo một trong hai phương án loại trừ nhau:
- Phương án 1 có $m$ cách thực hiện.
- Phương án 2 có $n$ cách thực hiện.
$$\Rightarrow \text{Tổng số cách hoàn thành công việc là: } m + n$$

* **Ví dụ trong slide:** Cần chọn ra một quyển sách để đọc. Biết rằng có 5 cuốn sách văn học và 3 cuốn sách khoa học. Hỏi có bao nhiêu cách chọn?  
  $\rightarrow$ Số cách chọn: $5 + 3 = 8$ cách.

---

## 2. Nguyên lý nhân (Product Rule) - Slide trang 9
Nếu một quy trình được chia thành hai giai đoạn kế tiếp nhau:
- Giai đoạn 1 có $m$ cách thực hiện.
- Ứng với mỗi cách của giai đoạn 1, giai đoạn 2 có $n$ cách thực hiện.
$$\Rightarrow \text{Tổng số cách hoàn thành quy trình là: } m \times n$$

* **Ví dụ trong slide:** Cần chuẩn bị tài liệu cho môn TRR gồm 1 vở ghi và 1 bút. Biết có 4 loại vở ghi và 3 loại bút. Hỏi có bao nhiêu cách chọn?  
  $\rightarrow$ Số cách chọn: $4 \times 3 = 12$ cách.

---

## 3. Nguyên lý bù trừ (Inclusion-Exclusion) - Slide trang 12
Khi hai tập hợp có phần tử chung giao nhau:
$$|A \cup B| = |A| + |B| - |A \cap B|$$
""",

    "Bài 2: Chỉnh hợp, Hoán vị và Tổ hợp": r"""# Chương 3 - Bài 2: Chỉnh hợp, Hoán vị và Tổ hợp

> **Nguồn giáo trình:** Slide bài giảng Chương 3 - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_3_ly_thuyet_to_hop.pdf` từ trang 16 đến 48.

---

## 1. Hoán vị (Permutation) - Slide trang 20
Số cách sắp xếp có thứ tự $n$ phần tử phân biệt:
$$P_n = n! = n \times (n-1) \times \dots \times 2 \times 1$$
*(Quy ước: $0! = 1$)*

---

## 2. Chỉnh hợp chập k của n ($A_n^k$) - Slide trang 16
Số cách chọn ra $k$ phần tử từ $n$ phần tử ($1 \le k \le n$) và **CÓ sắp xếp thứ tự**:
$$A_n^k = \frac{n!}{(n-k)!} = n(n-1)\dots(n-k+1)$$

---

## 3. Tổ hợp chập k của n ($C_n^k$) - Slide trang 24
Số cách chọn ra $k$ phần tử từ $n$ phần tử ($0 \le k \le n$) và **KHÔNG quan tâm đến thứ tự**:
$$C_n^k = \binom{n}{k} = \frac{n!}{k!(n-k)!}$$
Tính chất đối xứng: $C_n^k = C_n^{n-k}$.
""",

    "Bài 1: Đại số Boole và Cổng logic kỹ thuật số": r"""# Chương 4 - Bài 1: Đại số Boole và Cổng logic kỹ thuật số

> **Nguồn giáo trình:** Slide bài giảng Chương 4 - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_4_dai_so_boole.pdf` từ trang 1 đến 15.

---

## 1. Mở đầu về Đại số Boole (Slide trang 5 - 6)
- Đại số Boole thiết lập trên tập $B = \{0, 1\}$ với 3 phép toán:
  1. **Phép lấy phần bù (phủ định):** Ký hiệu $\overline{x}$ hoặc $x'$. Có $\overline{0} = 1, \overline{1} = 0$.
  2. **Phép lấy tổng Boole (OR):** Ký hiệu $+$. Có $0+0=0; 0+1=1; 1+0=1; 1+1=1$.
  3. **Phép nhân Boole (AND):** Ký hiệu $\cdot$. Có $0\cdot 0=0; 0\cdot 1=0; 1\cdot 0=0; 1\cdot 1=1$.

---

## 2. Các Cổng Logic cơ bản (Logic Gates)
- **Cổng AND:** Cho tín hiệu $1$ khi cả hai đầu vào đều bằng $1$.
- **Cổng OR:** Cho tín hiệu $1$ khi có ít nhất một đầu vào bằng $1$.
- **Cổng NOT (Inverter):** Đảo tín hiệu logic $0 \leftrightarrow 1$.
- **Cổng NAND / NOR:** Cổng phủ định của AND/OR.
""",

    "Bài 2: Hàm Boole và Dạng chuẩn tắc": r"""# Chương 4 - Bài 2: Hàm Boole và Dạng chuẩn tắc

> **Nguồn giáo trình:** Slide bài giảng Chương 4 - *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_4_dai_so_boole.pdf` từ trang 16 đến 29.

---

## 1. Khái niệm Hàm Boole
Một hàm Boole $n$ biến là ánh xạ $f: \{0, 1\}^n \rightarrow \{0, 1\}$.
- Với $n$ biến số nhị phân, có chính xác $2^{2^n}$ hàm Boole khác nhau.

---

## 2. Dạng chuẩn tắc tổng (SOP) & Dạng chuẩn tắc tích (POS)
- **Minterm (Tích chuẩn):** Tích của các biến hoặc phần bù của biến sao cho nhận giá trị $1$ ứng với một hàng chân trị.
- **Dạng chuẩn tắc tổng (Sum of Products - SOP):** Biểu diễn hàm Boole bằng tổng của các minterm tại những vị trí hàm nhận giá trị $1$.
""",

    "Bài 1: Định nghĩa Đồ thị và Phân loại cơ bản": r"""# Chương 5 - Bài 1: Định nghĩa Đồ thị và Phân loại cơ bản

> **Nguồn giáo trình:** Slide bài giảng Chương 6 - Phần 1 *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_6_ly_thuyet_do_thi_p1.pdf`.

---

## 1. Định nghĩa Đồ thị (Slide trang 4 - 6)
Đồ thị $G = (V, E)$ gồm hai tập hợp:
- $V$: Tập hợp các **đỉnh** (Vertices / Nodes), $V \neq \emptyset$.
- $E$: Tập hợp các **cạnh** (Edges) nối các đỉnh.
- **Đồ thị vô hướng:** Các cạnh không định hướng, ký hiệu là cặp vô thứ tự $(u, v)$.
- **Đồ thị có hướng:** Các cạnh là các cung có hướng từ $u$ sang $v$, ký hiệu là cặp có thứ tự $(u, v)$.

---

## 2. Bậc của đỉnh và Định lý Bắt tay (Handshaking Theorem)
- Trong đơn đồ thị vô hướng, **bậc của đỉnh $v$** (ký hiệu $\deg(v)$) là số cạnh gắn với đỉnh $v$.
- **Định lý Bắt tay:**
$$\sum_{v \in V} \deg(v) = 2|E|$$
- **Hệ quả quan trọng:** Trong mọi đồ thị vô hướng, số đỉnh có bậc lẻ luôn là một số chẵn!
""",

    "Bài 2: Một số đồ thị đơn vô hướng đặc biệt": r"""# Chương 5 - Bài 2: Một số đồ thị đơn vô hướng đặc biệt

> **Nguồn giáo trình:** Slide bài giảng Chương 6 - Phần 2 *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_6_ly_thuyet_do_thi_p2.pdf`.

---

## 1. Đồ thị đầy đủ $K_n$ (Slide trang 4)
- Đơn đồ thị vô hướng $n$ đỉnh mà giữa **hai đỉnh bất kỳ đều có cạnh nối**.
- Bậc của mỗi đỉnh: $\deg(v) = n - 1$.
- Tổng số cạnh: $|E| = \frac{n(n-1)}{2}$.

---

## 2. Đồ thị vòng $C_n$ và Đồ thị bánh xe $W_n$
- **Đồ thị vòng $C_n$ ($n \ge 3$):** Các đỉnh tạo thành một chu trình khép kín. Mỗi đỉnh đều có bậc 2.
- **Đồ thị bánh xe $W_n$ ($n \ge 3$):** Được tạo thành bằng cách thêm 1 đỉnh trung tâm nối với tất cả các đỉnh của $C_n$. Đỉnh trung tâm có bậc $n$, các đỉnh ngoài có bậc 3.

---

## 3. Đồ thị lưỡng phân (Bipartite Graph)
- Tập đỉnh $V$ có thể phân hoạch thành 2 tập rời nhau $V_1$ và $V_2$ sao cho mỗi cạnh chỉ nối giữa một đỉnh thuộc $V_1$ và một đỉnh thuộc $V_2$.
- **Định lý:** Đồ thị là lưỡng phân khi và chỉ khi nó không chứa chu trình có độ dài lẻ.
""",

    "Bài 3: Cây và Cây khung nhỏ nhất (Spanning Tree)": r"""# Chương 5 - Bài 3: Cây và Cây khung nhỏ nhất (Spanning Tree)

> **Nguồn giáo trình:** Slide bài giảng Chương 6 - Phần 3 *TS. Phạm Thị Lan (Khoa CNTT - ĐHSPHN)*  
> **Tài liệu kèm theo:** Xem chi tiết file `chuong_6_ly_thuyet_do_thi_p3.pdf`.

---

## 1. Định nghĩa Cây (Tree) (Slide trang 4)
- Cây là một đơn đồ thị vô hướng, **liên thông** và **không có chu trình**.
- Cây có $n$ đỉnh luôn có đúng $n - 1$ cạnh:
$$|E| = |V| - 1$$
- Giữa hai đỉnh bất kỳ của cây luôn tồn tại duy nhất một đường đi đơn.

---

## 2. Cây khung nhỏ nhất (Minimum Spanning Tree - MST)
Cho đồ thị vô hướng liên thông có trọng số $G = (V, E)$:
- Cây khung nhỏ nhất là cây khung có tổng trọng số các cạnh là nhỏ nhất.
- **Hai thuật toán tìm MST phổ biến:**
  1. **Thuật toán Kruskal:** Sắp xếp các cạnh theo trọng số tăng dần, lần lượt thêm từng cạnh vào cây miễn là không tạo thành chu trình.
  2. **Thuật toán Prim:** Bắt đầu từ 1 đỉnh tùy ý, liên tục kết nạp cạnh có trọng số nhỏ nhất nối cây với một đỉnh ngoài cây.
"""
}

async def run():
    async with AsyncSessionLocal() as session:
        lessons = (await session.execute(select(Lesson))).scalars().all()
        for l in lessons:
            if l.title in LESSONS:
                l.content = LESSONS[l.title]
                l.video_url = None
                print(f"Updated lesson: {l.title}")
        await session.commit()
        print("Done rewriting all lessons from HNUE slides!")

if __name__ == "__main__":
    asyncio.run(run())
