# Bài 36: Dùng Keras lắp ghép và huấn luyện mô hình

**Mục tiêu:** Đọc được quy trình tạo mô hình, chọn loss/optimizer/metric, huấn luyện bằng `fit` và đánh giá bằng `evaluate` trong Keras.

## Keras giúp nối các khối tính toán

Keras cung cấp API để mô tả mạng bằng các lớp, cấu hình cách học và chạy huấn luyện. **Sequential** phù hợp khi dữ liệu đi qua một chuỗi lớp theo thứ tự: đầu vào → lớp ẩn → đầu ra. Mô hình nhiều nhánh hoặc nhiều đầu vào có thể cần Functional API thay vì một chuỗi thẳng.

## Ví dụ phân loại một trong ba loại hoa

Giả sử `X_train` có bốn đặc trưng cho mỗi bông hoa và `y_train` là số nguyên `0`, `1` hoặc `2`. Tập validation được tách riêng từ train để theo dõi quá trình; `X_test` chỉ dùng đánh giá sau cùng.

```python
import keras
from keras import layers

model = keras.Sequential([
    keras.Input(shape=(4,)),
    layers.Dense(16, activation="relu"),
    layers.Dense(3, activation="softmax"),
])

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

model.fit(
    X_train, y_train,
    validation_data=(X_valid, y_valid),
    epochs=30,
)
test_loss, test_accuracy = model.evaluate(X_test, y_test)
```

## Đọc từng phần

- `Input(shape=(4,))`: mỗi mẫu có bốn số; không tính số lượng mẫu.
- `Dense(16, activation="relu")`: một lớp ẩn có 16 nơ-ron.
- `Dense(3, activation="softmax")`: ba lớp đầu ra; xác suất dự đoán cộng thành 1.
- `loss`: cách tính lỗi để mô hình học. `sparse_categorical_crossentropy` phù hợp khi nhãn nhiều lớp được lưu bằng số nguyên.
- `optimizer`: cách cập nhật trọng số; Adam là một lựa chọn phổ biến, không phải luôn tốt nhất.
- `metrics`: chỉ số dễ đọc trong lúc huấn luyện; accuracy không thay thế các chỉ số theo lớp khi dữ liệu lệch.
- `epochs`: số lần mô hình đi qua tập train; số lớn quá có thể dẫn tới overfitting.

Keras cho phép lắp mô hình nhanh, nhưng không tự kiểm tra dữ liệu có rò rỉ, nhãn có đúng hay mô hình có phù hợp ứng dụng. Hãy xem loss train và validation, giữ test độc lập và lưu cấu hình cần thiết để tái lập kết quả.

**Phiên bản:** cú pháp trên theo Keras 3. Cài đặt backend và chi tiết API có thể thay đổi theo môi trường; xem tài liệu chính thức trước khi chạy trong dự án thật.

## Thực hành hoàn chỉnh với bộ dữ liệu Iris

Ví dụ dưới đây tách riêng train, validation và test theo nhãn; bộ chuẩn hóa chỉ học trung bình/độ lệch chuẩn trên train để tránh rò rỉ. Có thể chạy trong môi trường đã cài Keras 3, một backend tương thích và scikit-learn.

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import keras
from keras import layers

X, y = load_iris(return_X_y=True)
X_train, X_hold, y_train, y_hold = train_test_split(
    X, y, test_size=0.30, stratify=y, random_state=42
)
X_valid, X_test, y_valid, y_test = train_test_split(
    X_hold, y_hold, test_size=0.50, stratify=y_hold, random_state=42
)
scaler = StandardScaler().fit(X_train)
X_train = scaler.transform(X_train)
X_valid = scaler.transform(X_valid)
X_test = scaler.transform(X_test)

model = keras.Sequential([
    keras.Input(shape=(X_train.shape[1],)),
    layers.Dense(16, activation="relu"),
    layers.Dense(3, activation="softmax"),
])
model.compile(optimizer="adam", loss="sparse_categorical_crossentropy",
              metrics=["accuracy"])
stop = keras.callbacks.EarlyStopping(
    monitor="val_loss", patience=5, restore_best_weights=True
)
model.fit(X_train, y_train, validation_data=(X_valid, y_valid),
          epochs=100, batch_size=16, callbacks=[stop], verbose=0)
loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
print(f"Test accuracy: {accuracy:.3f}")
```

Iris có bốn phép đo cho mỗi bông hoa và ba nhãn nguyên 0/1/2. Hai lớp Dense biến bốn số thành biểu diễn 16 chiều rồi thành ba điểm đầu ra; softmax đổi điểm thành phân phối tổng bằng 1. Sparse categorical cross-entropy dùng trực tiếp nhãn số nguyên. Early stopping dừng khi loss validation không cải thiện và khôi phục trọng số tốt nhất.

Đừng chọn kiến trúc bằng cách xem kết quả test nhiều lần. Nếu kết quả thay đổi giữa các lần chạy, cố định seed và lưu phiên bản thư viện khi cần tái lập; ngay cả khi accuracy cao, hãy kiểm tra nhầm lẫn theo từng lớp.

## Tự kiểm tra

Trong ví dụ, một mẫu có bao nhiêu đặc trưng? **Bốn.** Mảng nhãn chứa `0/1/2` nên dùng loss nào? **Sparse categorical cross-entropy.** `fit` dùng để làm gì? **Huấn luyện mô hình trên dữ liệu và nhãn.**

**Nguồn:** [Bài 36 về Keras](https://machinelearningcoban.com/), [Keras Sequential](https://keras.io/guides/sequential_model/) và [cách huấn luyện/đánh giá mô hình bằng Keras](https://keras.io/guides/training_with_built_in_methods/).
