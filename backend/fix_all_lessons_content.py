import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson

LESSONS_CONTENT = {
    "Bài 1: Khái niệm Mệnh đề và Các phép toán Logic cơ bản": r"""# Bài 1: Khái niệm Mệnh đề và Các phép toán Logic cơ bản

> **Học phần:** Toán rời rạc (3 tín chỉ)  
> **Giảng viên:** Phạm Thị Lan - Khoa Công nghệ Thông tin, Trường Đại học Sư phạm Hà Nội (ĐHSPHN).

---

## 1. Khái niệm Mệnh đề (Proposition)
- **Định nghĩa:** Mệnh đề là một câu khẳng định có giá trị chân lý xác định: hoặc **ĐÚNG** (True - $T$ hoặc $1$) hoặc **SAI** (False - $F$ hoặc $0$).
- Không có mệnh đề nào vừa đúng vừa sai, hoặc không xác định được tính đúng/sai.
- **Ví dụ về mệnh đề:**
  - *"Hà Nội là thủ đô của Việt Nam"* $\rightarrow$ Mệnh đề **ĐÚNG**.
  - *"1 + 1 = 3"* $\rightarrow$ Mệnh đề **SAI**.
- **Không phải mệnh đề:**
  - Câu hỏi: *"Bây giờ là mấy giờ?"*
  - Câu cảm thán / mệnh lệnh: *"Hãy suy nghĩ điều này cho kỹ lưỡng!"*
  - Câu chứa biến tự do chưa xác định: $x + 1 = 2$ (là vị từ, chưa phải mệnh đề).

---

## 2. Các Phép toán Logic cơ bản
Giả sử $p$ và $q$ là các mệnh đề:

1. **Phép phủ định (Negation):** $\neg p$ hoặc $\overline{p}$
   - Đúng khi $p$ sai, và sai khi $p$ đúng.
2. **Phép hội (Conjunction):** $p \land q$
   - Đọc là *"p VÀ q"*. Chỉ đúng khi cả $p$ và $q$ cùng đúng.
3. **Phép tuyển (Disjunction):** $p \lor q$
   - Đọc là *"p HOẶC q"*. Sai khi cả $p$ và $q$ cùng sai, đúng trong các trường hợp còn lại.
4. **Phép kéo theo (Implication):** $p \rightarrow q$
   - Đọc là *"Nếu p thì q"*. Chỉ **SAI** duy nhất khi $p$ đúng mà $q$ sai ($T \rightarrow F \equiv F$).
   - Quy tắc tương đương quan trọng: $p \rightarrow q \equiv \neg p \lor q$.
5. **Phép tương đương (Biconditional):** $p \leftrightarrow q$
   - Đọc là *"p khi và chỉ khi q"*. Đúng khi $p$ và $q$ có cùng giá trị chân lý ($T \leftrightarrow T \equiv T$ và $F \leftrightarrow F \equiv T$).
6. **Phép tuyển loại trừ (XOR):** $p \oplus q$
   - Đúng khi $p$ và $q$ khác chân trị, sai khi cùng đúng hoặc cùng sai.

---

## 3. Bảng chân trị tổng hợp (Truth Table)
| $p$ | $q$ | $\neg p$ | $p \land q$ | $p \lor q$ | $p \rightarrow q$ | $p \leftrightarrow q$ | $p \oplus q$ |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | 1 | 0 | 1 | 1 | 1 | 1 | 0 |
| 1 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| 0 | 1 | 1 | 0 | 1 | 1 | 0 | 1 |
| 0 | 0 | 1 | 0 | 0 | 1 | 1 | 0 |
""",

    "Bài 2: Tương đương Logic & Biến đổi biểu thức": r"""# Bài 2: Tương đương Logic & Biến đổi biểu thức

---

## 1. Định nghĩa Tương đương Logic
- Hai mệnh đề phức hợp $p$ và $q$ được gọi là **tương đương logic** (ký hiệu $p \equiv q$ hoặc $p \Leftrightarrow q$) nếu chúng luôn có cùng giá trị chân lý trong mọi trường hợp gán chân trị.
- Mệnh đề $p \leftrightarrow q$ là một hằng đúng (Tautology).

---

## 2. Bảng các Quy luật Logic cơ bản (Cần nhớ)
1. **Luật De Morgan:**
   - $\neg(p \land q) \equiv \neg p \lor \neg q$
   - $\neg(p \lor q) \equiv \neg p \land \neg q$
2. **Luật Phân phối (Distributive laws):**
   - $p \land (q \lor r) \equiv (p \land q) \lor (p \land r)$
   - $p \lor (q \land r) \equiv (p \lor q) \land (p \lor r)$
3. **Luật Đầy đủ & Phi mâu thuẫn:**
   - $p \lor \neg p \equiv T$ *(Luật bài trung - Law of excluded middle)*
   - $p \land \neg p \equiv F$ *(Luật phi mâu thuẫn - Law of non-contradiction)*
4. **Luật Nuốt & Phần tử trung hòa:**
   - $p \lor T \equiv T$ ; $p \land F \equiv F$
   - $p \lor F \equiv p$ ; $p \land T \equiv p$
5. **Quy luật Kéo theo và Phản đảo:**
   - $p \rightarrow q \equiv \neg p \lor q$
   - $p \rightarrow q \equiv \neg q \rightarrow \neg p$ *(Luật phản đảo)*
""",

    "Bài 3: Vị ngữ và Lượng từ (∀ Với mọi, ∃ Tồn tại)": r"""# Bài 3: Vị ngữ và Lượng từ (∀ Với mọi, ∃ Tồn tại)

---

## 1. Vị ngữ (Predicate)
- Câu chứa biến $P(x)$ được gọi là một **hàm mệnh đề** (hay vị từ).
- Bản thân $P(x)$ chưa phải là mệnh đề. Khi gán cho $x$ một giá trị cụ thể trong tập xác định $U$, $P(x)$ trở thành một mệnh đề có chân trị xác định.

---

## 2. Các Lượng từ toán học
1. **Lượng từ phổ dụng (Universal Quantifier) $\forall$:**
   - $\forall x P(x)$: *"Với mọi x, P(x) đúng"*.
   - Đúng khi $P(x)$ đúng với tất cả các phần tử $x \in U$.
   - Sai khi tồn tại ít nhất một phần tử phản ví dụ $x_0 \in U$ sao cho $P(x_0)$ sai.
2. **Lượng từ tồn tại (Existential Quantifier) $\exists$:**
   - $\exists x P(x)$: *"Tồn tại x để P(x) đúng"*.
   - Đúng khi có ít nhất một phần tử $x_0 \in U$ sao cho $P(x_0)$ đúng.
   - Sai khi với mọi $x \in U$, $P(x)$ đều sai.

---

## 3. Quy tắc Phủ định Lượng từ (De Morgan cho lượng từ)
$$\neg(\forall x P(x)) \equiv \exists x \neg P(x)$$
$$\neg(\exists x P(x)) \equiv \forall x \neg P(x)$$

Đối với mệnh đề 2 biến:
$$\neg(\forall x \exists y P(x, y)) \equiv \exists x \forall y \neg P(x, y)$$
$$\neg(\exists x \forall y P(x, y)) \equiv \forall x \exists y \neg P(x, y)$$
""",

    "Bài 1: Khái niệm Tập hợp và Các phép toán cơ bản": r"""# Chương 2 - Bài 1: Khái niệm Tập hợp và Các phép toán cơ bản

> **Slide tài liệu:** Bài giảng Chương 2 - Lý thuyết tập hợp (Khoa CNTT - ĐHSPHN)

---

## 1. Khái niệm cơ bản
- **Tập hợp (Set):** là tập hợp các đối tượng được xác định rõ ràng, các đối tượng này gọi là các phần tử của tập hợp.
- **Ký hiệu:** Tập hợp ký hiệu bằng chữ cái in hoa $A, B, X, Y...$; phần tử ký hiệu $a, b, c...$
- $a \in A$: $a$ thuộc tập hợp $A$.
- $a \notin A$: $a$ không thuộc tập hợp $A$.
- **Tập rỗng:** $\emptyset$ hoặc $\{\}$, là tập không chứa phần tử nào.

---

## 2. Các Phép toán trên tập hợp
1. **Phép hợp (Union):** $A \cup B = \{x \mid x \in A \lor x \in B\}$
2. **Phép giao (Intersection):** $A \cap B = \{x \mid x \in A \land x \in B\}$
3. **Phép hiệu (Difference):** $A \setminus B = \{x \mid x \in A \land x \notin B\}$
4. **Phần bù (Complement):** $\overline{A} = U \setminus A = \{x \in U \mid x \notin A\}$
5. **Tích Descartes:** $A \times B = \{(a, b) \mid a \in A, b \in B\}$
""",

    "Bài 2: Ánh xạ, Hàm số và Lực lượng tập hợp": r"""# Chương 2 - Bài 2: Ánh xạ, Hàm số và Lực lượng tập hợp

---

## 1. Ánh xạ (Functions / Mappings)
Cho hai tập hợp $A$ và $B$. Một ánh xạ $f: A \rightarrow B$ là một quy tắc đặt tương ứng mỗi phần tử $x \in A$ với duy nhất một phần tử $y = f(x) \in B$.
- **Đơn ánh (Injective):** $\forall x_1, x_2 \in A: x_1 \neq x_2 \Rightarrow f(x_1) \neq f(x_2)$.
- **Toàn ánh (Surjective):** $\forall y \in B, \exists x \in A: f(x) = y$.
- **Song ánh (Bijective):** Ánh xạ vừa là đơn ánh, vừa là toàn ánh. Khi đó tồn tại ánh xạ ngược $f^{-1}: B \rightarrow A$.

---

## 2. Lực lượng tập hợp (Cardinality)
- Số phần tử của tập hợp hữu hạn $A$ ký hiệu là $|A|$.
- Hai tập hợp có cùng lực lượng nếu tồn tại một song ánh giữa chúng.
- Tập hợp đếm được: có cùng lực lượng với tập số tự nhiên $\mathbb{N}$.
""",

    "Bài 1: Các nguyên lý đếm cơ bản": r"""# Chương 3 - Bài 1: Các nguyên lý đếm cơ bản

> **Slide tài liệu:** Bài giảng Chương 3 - Lý thuyết tổ hợp (Khoa CNTT - ĐHSPHN)

---

## 1. Nguyên lý cộng (Sum Rule)
Nếu một công việc có thể thực hiện theo một trong hai phương án loại trừ nhau:
- Phương án 1 có $m$ cách thực hiện.
- Phương án 2 có $n$ cách thực hiện.
$$\Rightarrow \text{Có } m + n \text{ cách hoàn thành công việc.}$$

---

## 2. Nguyên lý nhân (Product Rule)
Nếu một công việc được chia thành hai giai đoạn kế tiếp nhau:
- Giai đoạn 1 có $m$ cách thực hiện.
- Với mỗi cách của giai đoạn 1, giai đoạn 2 có $n$ cách thực hiện.
$$\Rightarrow \text{Có } m \times n \text{ cách hoàn thành công việc.}$$

---

## 3. Nguyên lý bù trừ (Inclusion-Exclusion)
$$|A \cup B| = |A| + |B| - |A \cap B|$$
$$|A \cup B \cup C| = |A| + |B| + |C| - (|A \cap B| + |B \cap C| + |C \cap A|) + |A \cap B \cap C|$$

---

## 4. Nguyên lý Dirichlet (Pigeonhole Principle)
Nếu xếp $k+1$ chú chim bồ câu vào $k$ cái lồng thì chắc chắn có ít nhất một lồng chứa từ 2 chú chim trở lên.
""",

    "Bài 2: Chỉnh hợp, Hoán vị và Tổ hợp": r"""# Chương 3 - Bài 2: Chỉnh hợp, Hoán vị và Tổ hợp

---

## 1. Hoán vị (Permutations)
Số cách sắp xếp có thứ tự $n$ phần tử phân biệt:
$$P_n = n! = n \times (n-1) \times \dots \times 2 \times 1$$

---

## 2. Chỉnh hợp chập k của n (k-Permutations)
Số cách chọn $k$ phần tử từ $n$ phần tử và sắp xếp theo thứ tự ($0 \le k \le n$):
$$A_n^k = \frac{n!}{(n-k)!} = n(n-1)\dots(n-k+1)$$

---

## 3. Tổ hợp chập k của n (Combinations)
Số cách chọn $k$ phần tử từ $n$ phần tử không phân biệt thứ tự:
$$C_n^k = \binom{n}{k} = \frac{n!}{k!(n-k)!}$$
Tính chất đối xứng: $C_n^k = C_n^{n-k}$.
""",

    "Bài 1: Đại số Boole và Cổng logic kỹ thuật số": r"""# Chương 4 - Bài 1: Đại số Boole và Cổng logic kỹ thuật số

> **Slide tài liệu:** Bài giảng Chương 4 - Đại số Boole (Khoa CNTT - ĐHSPHN)

---

## 1. Mở đầu về Đại số Boole
- Đại số Boole là hệ thống toán học thiết lập trên tập $\{0, 1\}$ với hai phép toán nhị phân cộng Boole ($+$ tương ứng $\lor$), nhân Boole ($\cdot$ tương ứng $\land$) và phép lấy bù ($'$ hoặc $\overline{x}$ tương ứng $\neg$).
- Tạo cơ sở lý thuyết toán học cho ngành kiến trúc máy tính, vi xử lý và vi mạch logic số.

---

## 2. Các Cổng Logic cơ bản
- **Cổng AND:** Đầu ra $= 1$ khi tất cả đầu vào $= 1$.
- **Cổng OR:** Đầu ra $= 1$ khi có ít nhất một đầu vào $= 1$.
- **Cổng NOT (Inverter):** Đảo ngược mức logic ($0 \rightarrow 1, 1 \rightarrow 0$).
- **Cổng NAND / NOR:** Cổng đa năng (Universal gates), có thể dùng để xây dựng mọi mạch logic khác.
""",

    "Bài 2: Hàm Boole và Dạng chuẩn tắc": r"""# Chương 4 - Bài 2: Hàm Boole và Dạng chuẩn tắc

---

## 1. Hàm Boole
Một hàm Boole $n$ biến là ánh xạ $f: \{0, 1\}^n \rightarrow \{0, 1\}$. Có $2^{2^n}$ hàm Boole khác nhau ứng với $n$ biến.

---

## 2. Minterm và Dạng chuẩn tắc tuyển (SOP)
- Mỗi tổ hợp biến mà tại đó hàm nhận giá trị $1$ tương ứng với một minterm (tích các biến hoặc phần bù của biến).
- Hàm Boole có thể biểu diễn duy nhất dưới dạng tổng của các minterm.
""",

    "Bài 1: Định nghĩa Đồ thị và Phân loại cơ bản": r"""# Chương 5 - Bài 1: Định nghĩa Đồ thị và Phân loại cơ bản

> **Slide tài liệu:** Bài giảng Chương 6 - Lý thuyết đồ thị Phần 1 (Khoa CNTT - ĐHSPHN)

---

## 1. Định nghĩa Đồ thị
Đồ thị $G = (V, E)$ gồm:
- $V$: Tập hợp các đỉnh (Vertices / Nodes), $V \neq \emptyset$.
- $E$: Tập hợp các cạnh (Edges) nối các cặp đỉnh.
- Nếu các cạnh không định hướng: Đồ thị vô hướng.
- Nếu các cạnh là các cặp đỉnh có thứ tự $(u, v)$: Đồ thị có hướng.

---

## 2. Bậc của đỉnh và Định lý bắt tay
- Trong đồ thị vô hướng, bậc của đỉnh $v$ (ký hiệu $\deg(v)$) là số cạnh tới $v$.
- **Định lý bắt tay (Handshaking Theorem):**
$$\sum_{v \in V} \deg(v) = 2|E|$$
- **Hệ quả:** Trong mọi đồ thị vô hướng, số đỉnh có bậc lẻ luôn luôn là một số chẵn.
""",

    "Bài 2: Một số đồ thị đơn vô hướng đặc biệt": r"""# Chương 5 - Bài 2: Một số đồ thị đơn vô hướng đặc biệt

> **Slide tài liệu:** Bài giảng Chương 6 - Lý thuyết đồ thị Phần 2 (Khoa CNTT - ĐHSPHN)

---

## 1. Đồ thị đầy đủ $K_n$
- Đơn đồ thị vô hướng $n$ đỉnh mà giữa hai đỉnh bất kỳ đều có cạnh nối.
- Mỗi đỉnh có bậc: $\deg(v) = n - 1$.
- Tổng số cạnh: $|E| = \frac{n(n-1)}{2}$.

---

## 2. Đồ thị vòng $C_n$ và Đồ thị bánh xe $W_n$
- $C_n$ ($n \ge 3$): Các đỉnh tạo thành một vòng khép kín. Mọi đỉnh đều có bậc 2.
- $W_n$: Tạo thành bằng cách thêm 1 đỉnh trung tâm nối với tất cả các đỉnh của $C_n$.

---

## 3. Đồ thị lưỡng phân (Bipartite Graph)
- Tập đỉnh $V$ có thể chia thành hai tập rời nhau $V_1$ và $V_2$ sao cho mỗi cạnh chỉ nối một đỉnh thuộc $V_1$ với một đỉnh thuộc $V_2$.
- Định lý: Đồ thị là lưỡng phân khi và chỉ khi nó không chứa chu trình độ dài lẻ.
""",

    "Bài 3: Cây và Cây khung nhỏ nhất (Spanning Tree)": r"""# Chương 5 - Bài 3: Cây và Cây khung nhỏ nhất (Spanning Tree)

> **Slide tài liệu:** Bài giảng Chương 6 - Lý thuyết đồ thị Phần 3 (Khoa CNTT - ĐHSPHN)

---

## 1. Định nghĩa Cây (Tree)
- Cây là một đơn đồ thị vô hướng, **liên thông** và **không có chu trình**.
- Cây $n$ đỉnh luôn có đúng $n - 1$ cạnh.
- Giữa hai đỉnh bất kỳ của cây luôn tồn tại duy nhất một đường đi đơn.

---

## 2. Cây khung và Cây khung nhỏ nhất (MST)
- Cây khung của đồ thị liên thông $G$ là một đồ thị con của $G$ chứa tất cả các đỉnh của $G$ và là một cây.
- Trong đồ thị có trọng số, Cây khung nhỏ nhất (Minimum Spanning Tree) là cây khung có tổng trọng số các cạnh là nhỏ nhất.
- Hai thuật toán kinh điển tìm cây khung nhỏ nhất:
  1. **Thuật toán Kruskal:** Tham lam chọn cạnh có trọng số nhỏ nhất không tạo thành chu trình.
  2. **Thuật toán Prim:** Phát triển cây từ một đỉnh ban đầu, mỗi bước kết nạp cạnh có trọng số nhỏ nhất nối cây với đỉnh ngoài cây.
"""
}

async def update():
    async with AsyncSessionLocal() as session:
        lessons = (await session.execute(select(Lesson))).scalars().all()
        for l in lessons:
            # Clear video url
            l.video_url = None
            if l.title in LESSONS_CONTENT:
                l.content = LESSONS_CONTENT[l.title]
                print(f"Updated content for: {l.title}")
        await session.commit()
        print("All lessons updated successfully without escape errors!")

if __name__ == "__main__":
    asyncio.run(update())
