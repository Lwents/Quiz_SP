"""Idempotently add beginner-friendly AI lessons from class assignments and sources.

Exact known starter drafts are upgraded from app/data/ai_course; teacher-edited
lesson records remain untouched across backend restarts.
"""

import hashlib
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson
from app.models.quiz import Subject, Topic


SUBJECT_CODE = "AI-K74"
CONTENT_DIR = Path(__file__).resolve().parent / "data" / "ai_course"

# Hashes of the original 28 lesson drafts. Only replace exact drafts; keep teacher edits.
LEGACY_CONTENT_HASHES = {
    "20_ml_algorithm_families.md": "2718ffd807416122cb55901551003cb9f029384ea53ab9ebbfc04e1ebb2cf841",
    "21_kmeans_applications.md": "c441263ffae00b7a40ada9219050de6544afb1fae0da25576368b1393f88574d",
    "22_knn.md": "7e35927203aaaed4012fd314ed9f8d991b57e462c60d11409f8d5e8e2aeb00a0",
    "23_feature_engineering.md": "6b2d54840603bf3a2dde52dcc686255e6c7917d214afd657b71bfa5a25876015",
    "24_binary_classifiers.md": "cb4d0d9c59f1d2b6a0ada4e796ced2946e38c3f33f4882e0f51ed62d522c68b3",
    "25_overfitting.md": "0a19d6eb848afa2795c2573a07a6f59779b010f587b4cc9266041f08c58dbc61",
    "26_convex_sets_functions.md": "f8b58d89db27a9794a8806e8b2a139340908fed66abef0d4c9a1c62cd80750e6",
    "27_convex_optimization.md": "18775d9592e07c2ef64e2b44c73c77833715cc53b8dc3d9821bd3ac7868f0945",
    "28_duality.md": "56312a8d5bbee0a1aa3826fef28e27c3f6a66aeed7c7128429f355c6b7548265",
    "29_svm.md": "2be59d10cd982561e4a523430cf678c961244614072d5564e68f9daec9c76d2e",
    "30_soft_margin_svm.md": "f267acc235247f2c03960f3f55dfc816d21384304bb2299efa5e19e9125a9b8f",
    "31_kernel_svm.md": "410b15fc463addc45479418e902120258031aaed5f34b84bbca0cbe7b9d4cbc1",
    "32_multiclass_svm.md": "4c871666fdd6906b4259eba219b07f64cf9036666ba242a25229c8cb7fc194b3",
    "33_content_recommenders.md": "83148b55f3c2a1fbc41bf67d8f5a1b8f2a67b718ca2efa844a6f87b26c932c11",
    "34_neighborhood_cf.md": "7fa8bbd562dced0d862eaab2c204adaee9911254d1c576a7f247bc6d98d0b360",
    "35_matrix_factorization.md": "0b472366779d34a4e8c3fc12bfaa6053d6fecd41cbc0e7b1d3af3c35ad87b4b3",
    "36_svd.md": "cb614e35b31edf0d62eb468daf72f140befc4f0e4897eb3eb22cd16bdbe7b5f0",
    "37_pca_1.md": "1700e84592de396437d556b91cfb5521964ae126d02d22a5f07d75555b546a58",
    "38_pca_2.md": "b12ca066d3973b9b0f714b998eaa54edf78dce884cb6dc934188f38d72610539",
    "39_lda.md": "48379edf129ff2750db280ee7f86da4fc729ac9834fe3a46aa7b94a20a3db07d",
    "40_probability_review.md": "5a5f111025c34b3de0d9b00ff4edb277445a47e31ddc81e5f17f175528f16ff8",
    "41_mle_map.md": "686bc75c561f3715367a0ec3b86aef0c0319082b749bd6af0f040c4b1cf4feed",
    "42_naive_bayes.md": "c02294d9be81cdf934492100d81a697c394953e0b862f1a710d2031c43975371",
    "43_classification_metrics.md": "9b2bdef8797f083ff5354dbc3f63b15d031ffce7a897efc2126ad72db53b8010",
    "44_decision_trees.md": "07863bcd81cdf61f3da2779ffd2120953f1a4046912b21b4147767cba12bbfa7",
    "45_deep_learning_history.md": "7b8e2ffdd92f9972001e030b9ec552f66e2ac3a017105a7285064a4cfeaccaef",
    "46_keras.md": "d600e9608ec0dae1594577e7d71c6ad64f9f6aa9976e360d0b35863409fbd0cb",
    "47_convolution.md": "4640e02f7f2929150e4385391d1e1b99b3d46edc6994b0e60b0831b3a1eda9ef",
}

CURRICULUM = [
    ("Bắt đầu: hiểu dữ liệu trước khi chạy mô hình", "Đặc trưng, nhãn, tập huấn luyện và tập kiểm thử.", [
        ("01_start.md", "AI, học máy, đặc trưng và nhãn", 18),
        ("02_train_test.md", "Vì sao phải tách train và test?", 18),
    ]),
    ("Tuần 1: Hồi quy tuyến tính và bài CO₂", "Bài hồi quy nhiều biến thầy gửi ngày 11/09 và tài liệu W3Schools.", [
        ("03_linear.md", "Hồi quy tuyến tính: dự đoán một con số", 20),
        ("04_multiple_co2.md", "Bài CO₂ với Volume và Weight", 25),
    ]),
    ("Tuần 2: Gradient Descent", "Bài nộp trên CST và notebook thực hành so sánh ba cách giải.", [
        ("05_gradient.md", "Gradient Descent: sửa trọng số từng bước", 23),
        ("06_three_ways.md", "So sánh pinv, scikit-learn và Gradient Descent", 25),
    ]),
    ("Tuần 3: Phân loại bằng Perceptron", "Bài 20 khách train, 10 khách test, dự đoán khách mới và so sánh sklearn.", [
        ("07_pla.md", "PLA: học đường chia hai nhóm", 22),
        ("08_pla_practice.md", "Thực hành PLA theo bài thầy giao", 28),
    ]),
    ("Bài tiếp theo: Logistic Regression", "Notebook Colab Tùng chia sẻ và bài phân loại vỡ nợ 2/8 đặc trưng.", [
        ("09_logistic.md", "Logistic Regression và ý nghĩa xác suất", 22),
        ("10_logistic_practice.md", "Bài 2 đặc trưng: khách hàng (32, 400)", 25),
        ("11_logistic_evaluation.md", "Bài 8 đặc trưng: đánh giá mô hình trên test", 28),
    ]),
    ("Đọc thêm theo lộ trình OLM", "Tìm kiếm, K-means, Softmax và mạng nhiều lớp; tách khỏi bài thầy đã giao.", [
        ("12_roadmap.md", "Bản đồ các chủ đề AI tiếp theo", 20),
    ]),
    ("Chương 7: Tìm lời giải bằng tìm kiếm", "Tìm đường, chọn nước đi và giải bài toán có ràng buộc; đây là phần mở rộng theo lộ trình AI.", [
        ("13_bfs_dfs.md", "BFS và DFS: tìm đường từng bước", 25),
        ("14_heuristic_astar.md", "Heuristic và A*: tìm hướng có triển vọng", 25),
        ("15_game_search.md", "Minimax: máy chọn nước đi trong trò chơi", 25),
        ("16_csp.md", "Bài toán ràng buộc: xếp lịch không bị trùng", 25),
    ]),
    ("Chương 8: Học máy mở rộng", "Phân cụm không nhãn, phân loại nhiều lớp và mạng nơ-ron nhiều tầng; phần đọc thêm sau các bài cơ bản.", [
        ("17_kmeans.md", "K-means: tự gom nhóm dữ liệu chưa có nhãn", 25),
        ("18_softmax.md", "Softmax: phân loại từ ba nhóm trở lên", 25),
        ("19_mlp.md", "MLP: học ranh giới phi tuyến bằng nhiều lớp", 30),
    ]),
    ("Chương 9: Chọn cách học và chuẩn bị dữ liệu", "Mở rộng chuỗi Machine Learning cơ bản: các kiểu học, K-means ứng dụng, KNN và cách tạo đặc trưng.", [
        ("20_ml_algorithm_families.md", "Bài 2: Có những kiểu học máy nào?", 20),
        ("21_kmeans_applications.md", "Bài 5: K-means dùng để làm gì với ảnh?", 22),
        ("22_knn.md", "Bài 6: KNN đo khoảng cách rồi hỏi láng giềng", 25),
        ("23_feature_engineering.md", "Bài 11: Biến dữ liệu thô thành đặc trưng hữu ích", 25),
    ]),
    ("Chương 10: Ranh giới phân loại và khả năng khái quát", "Nối Logistic Regression với cách đặt ngưỡng, hiện tượng học thuộc và kiểm tra trên dữ liệu mới.", [
        ("24_binary_classifiers.md", "Bài 12: Bộ phân loại hai lớp và ngưỡng quyết định", 22),
        ("25_overfitting.md", "Bài 15: Nhận biết và giảm overfitting", 25),
    ]),
    ("Chương 11: Tối ưu hóa và Support Vector Machine", "Giải thích trực quan từ hình học lồi tới SVM tuyến tính, soft margin, kernel và nhiều lớp.", [
        ("26_convex_sets_functions.md", "Bài 16: Tập lồi và hàm lồi bằng hình dung", 22),
        ("27_convex_optimization.md", "Bài 17: Tối ưu lồi và vì sao nghiệm đáng tin", 22),
        ("28_duality.md", "Bài 18: Đối ngẫu — đổi góc nhìn để giải bài toán", 22),
        ("29_svm.md", "Bài 19: SVM chọn đường biên có lề rộng", 25),
        ("30_soft_margin_svm.md", "Bài 20: Soft margin khi dữ liệu không hoàn hảo", 22),
        ("31_kernel_svm.md", "Bài 21: Kernel giúp SVM xử lý đường biên cong", 25),
        ("32_multiclass_svm.md", "Bài 22: Dùng SVM khi có nhiều lớp", 22),
    ]),
    ("Chương 12: Hệ thống gợi ý", "Ba cách gợi ý dựa trên nội dung, người dùng hoặc sản phẩm tương tự và các yếu tố ẩn.", [
        ("33_content_recommenders.md", "Bài 23: Gợi ý dựa trên nội dung món đồ", 22),
        ("34_neighborhood_cf.md", "Bài 24: Gợi ý từ người dùng và sản phẩm giống nhau", 25),
        ("35_matrix_factorization.md", "Bài 25: Ma trận yếu tố ẩn trong hệ gợi ý", 25),
    ]),
    ("Chương 13: Rút gọn và nhìn dữ liệu nhiều chiều", "SVD, PCA và LDA giúp nén, trực quan hóa hoặc tìm hướng phân biệt trong dữ liệu.", [
        ("36_svd.md", "Bài 26: SVD — tách ma trận thành các mẫu chính", 25),
        ("37_pca_1.md", "Bài 27: PCA tìm hướng dữ liệu biến thiên nhiều", 25),
        ("38_pca_2.md", "Bài 28: Chiếu dữ liệu và chọn số thành phần PCA", 25),
        ("39_lda.md", "Bài 29: LDA tìm hướng tách các lớp", 25),
    ]),
    ("Chương 14: Xác suất, Bayes và đọc kết quả phân loại", "Ôn xác suất có điều kiện, học tham số bằng MLE/MAP, Naive Bayes và các thước đo đánh giá.", [
        ("40_probability_review.md", "Bài 30: Ôn xác suất để hiểu mô hình", 22),
        ("41_mle_map.md", "Bài 31: MLE và MAP ước lượng tham số ra sao?", 25),
        ("42_naive_bayes.md", "Bài 32: Naive Bayes phân loại bằng xác suất", 25),
        ("43_classification_metrics.md", "Bài 33: Đánh giá bộ phân loại ngoài accuracy", 25),
        ("44_decision_trees.md", "Bài 34: Cây quyết định ID3 hỏi câu nào trước?", 25),
    ]),
    ("Chương 15: Nhìn vào Deep Learning và CNN", "Bối cảnh lịch sử, cách dùng Keras và phép tích chập giúp mạng nhận biết cấu trúc ảnh.", [
        ("45_deep_learning_history.md", "Bài 35: Các cột mốc dẫn tới Deep Learning", 20),
        ("46_keras.md", "Bài 36: Dùng Keras lắp ghép và huấn luyện mô hình", 25),
        ("47_convolution.md", "Bài 37: Tích chập hai chiều trong CNN", 25),
    ]),
]


async def seed_ai_course() -> dict[str, int]:
    added_topics = 0
    added_lessons = 0
    updated_lessons = 0
    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == SUBJECT_CODE))).scalar_one_or_none()
        if subject is None:
            subject = Subject(
                code=SUBJECT_CODE,
                name="Trí tuệ nhân tạo",
                description=(
                    "Khóa học dễ hiểu cho người mới: hồi quy, Gradient Descent, Perceptron "
                    "và Logistic Regression theo bài nhóm TTNT K74; phần mở rộng theo lộ trình OLM."
                ),
            )
            db.add(subject)
            await db.flush()

        for topic_order, (name, description, lessons) in enumerate(CURRICULUM, start=1):
            topic = (await db.execute(select(Topic).where(
                Topic.subject_id == subject.id, Topic.name == name
            ))).scalar_one_or_none()
            if topic is None:
                topic = Topic(subject_id=subject.id, name=name, description=description, order=topic_order)
                db.add(topic)
                await db.flush()
                added_topics += 1

            for lesson_order, (filename, title, duration) in enumerate(lessons, start=1):
                content = (CONTENT_DIR / filename).read_text(encoding="utf-8")
                if not content.startswith("# ") or "**Mục tiêu:**" not in content:
                    raise ValueError(f"Invalid AI lesson: {filename}")
                existing = (await db.execute(select(Lesson).where(
                    Lesson.topic_id == topic.id, Lesson.title == title
                ))).scalar_one_or_none()
                objective = content.split("**Mục tiêu:**", 1)[1].splitlines()[0].strip()
                if existing:
                    current_hash = hashlib.sha256(existing.content.encode("utf-8")).hexdigest()
                    if current_hash == LEGACY_CONTENT_HASHES.get(filename):
                        existing.content = content
                        existing.description = objective
                        existing.duration_minutes = duration
                        updated_lessons += 1
                    continue
                db.add(Lesson(
                    topic_id=topic.id, title=title, description=objective,
                    content=content, duration_minutes=duration, order=lesson_order,
                ))
                added_lessons += 1

        await db.commit()
    return {"topics": len(CURRICULUM), "lessons": sum(len(item[2]) for item in CURRICULUM),
            "added_topics": added_topics, "added_lessons": added_lessons,
            "updated_lessons": updated_lessons}
