import asyncio
import uuid
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.quiz import Subject, Topic, Quiz, QuizStatus, DifficultyLevel
from app.models.question import Question, QuestionType, QuizQuestion

async def seed():
    async with AsyncSessionLocal() as db:
        # Get or create Subject
        sub_res = await db.execute(select(Subject).where(Subject.code == "COMP228"))
        subject = sub_res.scalar_one_or_none()
        if not subject:
            subject = Subject(
                name="Truyền thông đa phương tiện",
                code="COMP228",
                description="Học phần cơ sở ngành về nguyên lý truyền thông đa phương tiện, các thành phần media, nén dữ liệu, mạng truyền thông và xuất bản số."
            )
            db.add(subject)
            await db.commit()
            await db.refresh(subject)

        # Get or create Topic
        top_res = await db.execute(select(Topic).where(Topic.subject_id == subject.id, Topic.name.like("%Tuần 1%")))
        topic = top_res.scalar_one_or_none()
        if not topic:
            topic = Topic(
                subject_id=subject.id,
                name="Tuần 1: Nhập môn & Khảo thí Truyền thông Đa phương tiện",
                description="Bộ đề khảo thí ôn luyện tương tác đa dạng các dạng câu hỏi: Single Choice, Multiple Choice, Điền từ, Kéo thả sắp xếp, Ghép nối và Câu hỏi hình ảnh trực quan.",
                order=1
            )
            db.add(topic)
            await db.commit()
            await db.refresh(topic)

        # Find existing Quiz or create
        quiz_res = await db.execute(select(Quiz).where(Quiz.title.like("%Truyền thông Đa phương tiện%")))
        quiz = quiz_res.scalars().first()
        if not quiz:
            quiz = Quiz(
                title="Đề trắc nghiệm Tổng hợp Tuần 1: Truyền thông Đa phương tiện",
                slug="de-trac-nghiem-tong-hop-tuan-1-truyen-thong-da-phuong-tien",
                description="Bài thi tổng hợp 44 câu hỏi chuẩn khảo thí với đầy đủ dạng bài: Trắc nghiệm, Điền khuyết từ, Kéo thả sắp xếp thứ tự, Ghép nối cột và Nhận diện hình ảnh trực quan.",
                subject_id=subject.id,
                topic_id=topic.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=45,
                pass_score=5.0,
                max_attempts=0,
                shuffle_questions=False,
                shuffle_answers=False,
                show_answer_after_submit=True,
                status=QuizStatus.PUBLISHED
            )
            db.add(quiz)
            await db.commit()
            await db.refresh(quiz)
        else:
            # Clean old quiz_questions to rebuild
            await db.execute(delete(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id))
            await db.commit()

        # Definitions of 44 questions with genuine types
        # 1. FILL_BLANK: điền từ
        # 2. ORDERING: kéo thả sắp xếp
        # 3. MATCHING: ghép nối
        # 4. SINGLE_CHOICE / MULTIPLE_CHOICE / IMAGE: có ảnh trực quan
        questions_spec = [
            # Q1: Single choice - Media
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "“Media” là dạng số nhiều của “medium” và có nghĩa là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Hình thức bạn sử dụng để gửi một thông điệp"},
                        {"id": "B", "text": "Cách bạn nhập tin nhắn"},
                        {"id": "C", "text": "Một thông điệp gửi cho nhóm nhỏ"},
                        {"id": "D", "text": "Một thông điệp không quan trọng gửi cho nhiều người"}
                    ],
                    "correct": "A"
                },
                "explanation": "Theo chuẩn khảo thí: Medium có nghĩa là hình thức hoặc phương tiện bạn sử dụng để gửi một thông điệp từ người gửi đến người nhận."
            },
            # Q2: FILL_BLANK - sinh học
            {
                "type": QuestionType.FILL_BLANK,
                "content": "Mọi hình thức truyền thông phức tạp bắt rễ từ các cơ chế ________ cơ bản, như việc sử dụng các giác quan của con người.",
                "config": {
                    "accepted_answers": ["sinh học", "sinh hoc", "biological"],
                    "case_sensitive": False
                },
                "explanation": "Khảo thí xác nhận: Mọi hình thức truyền thông phức tạp đều bắt rễ từ các cơ chế 'sinh học' cơ bản."
            },
            # Q3: FILL_BLANK - một
            {
                "type": QuestionType.FILL_BLANK,
                "content": "Thông tin trong báo giấy hoặc truyền hình truyền thống chảy theo ________ chiều.",
                "config": {
                    "accepted_answers": ["một", "mot", "1", "one"],
                    "case_sensitive": False
                },
                "explanation": "Khảo thí xác nhận: Truyền thông truyền thống (báo giấy, TV) là truyền thông một chiều (One-way communication)."
            },
            # Q4: FILL_BLANK - phản hồi
            {
                "type": QuestionType.FILL_BLANK,
                "content": "Một trong những hình thái tương tác phổ biến nhất hiện nay là khi sinh viên tham gia vào các diễn đàn để đặt vấn đề, thảo luận và ________ thông tin.",
                "config": {
                    "accepted_answers": ["phản hồi", "phan hoi", "feedback"],
                    "case_sensitive": False
                },
                "explanation": "Đáp án xác nhận ĐÚNG qua khảo thí trực tiếp (q8938): 'phản hồi' (các từ 'chia sẻ', 'trao đổi' hệ thống chấm sai)."
            },
            # Q5: FILL_BLANK - cứng
            {
                "type": QuestionType.FILL_BLANK,
                "content": "Ổ đĩa ________ (HDD) lưu dữ liệu bằng cách từ hóa vật liệu trên các đĩa tròn quay tốc độ cao.",
                "config": {
                    "accepted_answers": ["cứng", "cung", "hard"],
                    "case_sensitive": False
                },
                "explanation": "HDD = Hard Disk Drive = Ổ đĩa cứng."
            },
            # Q6: FILL_BLANK - chủ động
            {
                "type": QuestionType.FILL_BLANK,
                "content": "Trong môi trường trao đổi số và diễn đàn, sinh viên tham gia với vai trò ________ để tiếp nhận và điều hướng tri thức.",
                "config": {
                    "accepted_answers": ["chủ động", "chu dong", "active"],
                    "case_sensitive": False
                },
                "explanation": "Khảo thí xác nhận ĐÚNG (q8937): 'chủ động'."
            },
            # Q7: ORDERING - Kéo thả sắp xếp Cáp đồng trục
            {
                "type": QuestionType.ORDERING,
                "content": "Sắp xếp thứ tự các lớp cấu tạo của cáp đồng trục (Coaxial Cable) từ TRONG ra NGOÀI:",
                "config": {
                    "correct_order": [
                        "Lõi dẫn điện bằng đồng ở trong cùng",
                        "Lớp vật liệu điện môi cách điện",
                        "Lưới kim loại bện chắn nhiễu điện từ (Shielding)",
                        "Lớp vỏ bảo vệ ngoài cùng bằng nhựa"
                    ]
                },
                "explanation": "Khảo thí xác nhận ĐÚNG: Thứ tự cấu tạo cáp đồng trục từ trong ra ngoài: Lõi đồng -> Lớp cách điện -> Lưới kim loại bện -> Lớp vỏ bọc nhựa."
            },
            # Q8: ORDERING - Quy trình truyền thông cơ bản
            {
                "type": QuestionType.ORDERING,
                "content": "Sắp xếp các bước trong quy trình truyền thông cơ bản theo trình tự diễn tiến hợp lý:",
                "config": {
                    "correct_order": [
                        "Người gửi hình thành ý tưởng thông điệp",
                        "Mã hóa thông điệp thành tín hiệu",
                        "Truyền tín hiệu qua kênh truyền dẫn",
                        "Người nhận thu nhận và giải mã tín hiệu",
                        "Người nhận thấu hiểu và gửi thông tin phản hồi"
                    ]
                },
                "explanation": "Quy trình truyền thông: Ý tưởng -> Mã hóa -> Kênh truyền -> Giải mã -> Phản hồi."
            },
            # Q9: ORDERING - Sắp xếp dung lượng file đa phương tiện
            {
                "type": QuestionType.ORDERING,
                "content": "Sắp xếp dung lượng trung bình của các loại tệp dữ liệu đa phương tiện từ NHẸ NHẤT đến NẶNG NHẤT:",
                "config": {
                    "correct_order": [
                        "Tệp văn bản thuần (Text / DOCX)",
                        "Tệp hình ảnh nén (JPEG / PNG)",
                        "Tệp âm thanh số (MP3 / WAV)",
                        "Tệp video độ nét cao (Video HD / 4K)"
                    ]
                },
                "explanation": "Dung lượng tăng dần: Text (vài KB) < Ảnh (vài trăm KB - vài MB) < Âm thanh (vài MB - chục MB) < Video (hàng trăm MB - vài GB)."
            },
            # Q10: ORDERING - Thao tác tải ảnh từ Cloud Storage
            {
                "type": QuestionType.ORDERING,
                "content": "Sắp xếp các thao tác tải và hiển thị hình ảnh từ Cloud Storage về điện thoại:",
                "config": {
                    "correct_order": [
                        "Người dùng chạm nút Tải xuống (Download)",
                        "Yêu cầu được gửi qua mạng Internet đến máy chủ Cloud",
                        "Máy chủ Cloud truy xuất tệp và gửi dữ liệu về thiết bị",
                        "Điện thoại giải mã dữ liệu và hiển thị ảnh lên màn hình"
                    ]
                },
                "explanation": "Trình tự tải tệp từ đám mây: Người dùng kích hoạt -> Gửi Request -> Máy chủ Cloud gửi dữ liệu -> Thiết bị Decode & Render."
            },
            # Q11: ORDERING - Quy trình hiển thị ảnh từ ổ đĩa lên màn hình
            {
                "type": QuestionType.ORDERING,
                "content": "Sắp xếp quy trình phần cứng hiển thị một bức ảnh từ ổ đĩa lên màn hình máy tính:",
                "config": {
                    "correct_order": [
                        "Đọc dữ liệu nhị phân từ ổ cứng lưu trữ (HDD/SSD)",
                        "CPU và phần mềm tiến hành giải mã định dạng ảnh",
                        "GPU (Card đồ họa) xử lý và render các điểm ảnh",
                        "Màn hình hiển thị hình ảnh hoàn chỉnh"
                    ]
                },
                "explanation": "Quy trình hiển thị phần cứng: Ổ đĩa -> Bộ nhớ & CPU giải mã -> GPU dựng hình -> Màn hình hiển thị."
            },
            # Q12: MATCHING - Ghép Text / Image / Audio / Video
            {
                "type": QuestionType.MATCHING,
                "content": "Hãy ghép nối từng thành phần đa phương tiện ở cột bên trái với định dạng tệp tương ứng ở cột bên phải:",
                "config": {
                    "pairs": [
                        {"left": "Text (Văn bản)", "right": ".DOCX / .TXT"},
                        {"left": "Image (Hình ảnh)", "right": ".PNG / .JPEG"},
                        {"left": "Audio (Âm thanh)", "right": ".MP3 / .WAV"},
                        {"left": "Video (Hình ảnh động kèm tiếng)", "right": ".MP4 / .AVI"}
                    ]
                },
                "explanation": "Ghép đúng: Text -> DOCX/TXT, Image -> PNG/JPEG, Audio -> MP3/WAV, Video -> MP4/AVI."
            },
            # Q13: MATCHING - Ghép phương tiện lưu trữ với bản chất vật lý
            {
                "type": QuestionType.MATCHING,
                "content": "Ghép nối từng phương tiện lưu trữ với bản chất kỹ thuật - vật lý chính xác của nó:",
                "config": {
                    "pairs": [
                        {"left": "Đĩa mềm (Floppy Disk)", "right": "Dữ liệu lưu trên phiến đĩa từ tính mềm, dung lượng thấp"},
                        {"left": "Ổ cứng (HDD)", "right": "Dữ liệu lưu trên phiến đĩa kim loại từ tính cứng, quay tốc độ cao"},
                        {"left": "Lưu trữ đám mây (Cloud Storage)", "right": "Dữ liệu phân tán trên các máy chủ từ xa, truy cập qua mạng"}
                    ]
                },
                "explanation": "Đĩa mềm và HDD là lưu trữ từ tính, Cloud là trung tâm dữ liệu phân tán truy cập qua Internet."
            },
            # Q14: MATCHING - Ghép thuật ngữ Multimedia
            {
                "type": QuestionType.MATCHING,
                "content": "Ghép nối các từ gốc tiếng Anh với ý nghĩa chuẩn xác trong Truyền thông Đa phương tiện:",
                "config": {
                    "pairs": [
                        {"left": "Multiple", "right": "Nhiều hơn một"},
                        {"left": "Medium", "right": "Phương tiện trung gian"},
                        {"left": "Conveying information", "right": "Truyền đạt và chuyển tải thông tin"}
                    ]
                },
                "explanation": "Multiple = Nhiều hơn một; Medium = Phương tiện trung gian; Conveying information = Truyền tải thông tin."
            },
            # Q15: MATCHING - Ghép lấy mẫu âm thanh
            {
                "type": QuestionType.MATCHING,
                "content": "Ghép nối các thông số kỹ thuật âm thanh và hình ảnh với ý nghĩa đo lường tương ứng:",
                "config": {
                    "pairs": [
                        {"left": "Lấy mẫu (Sampling)", "right": "Rời rạc hóa tín hiệu liên tục theo thời gian (Hz)"},
                        {"left": "Lượng tử hóa (Quantization)", "right": "Làm tròn biên độ tín hiệu thành các mức nhị phân (Bits)"},
                        {"left": "Tốc độ khung hình (Frame Rate)", "right": "Số lượng hình ảnh hiển thị trong một giây (fps)"}
                    ]
                },
                "explanation": "Lấy mẫu (Sampling rate), Lượng tử hóa (Bit depth), Frame rate (fps) của video và hoạt ảnh."
            },
            # Q16: IMAGE Question - 2D Animation con ngựa
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Quan sát hình ảnh minh họa chuyển động đồ họa phẳng từng khung hình (frame-by-frame) dưới đây. Đây là ví dụ đại diện cho thể loại nào?\n\n![Minh họa chuyển động 2D Animation](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80)",
                "config": {
                    "options": [
                        {"id": "A", "text": "2D Animation (Hoạt ảnh hai chiều)"},
                        {"id": "B", "text": "3D Animation (Hoạt ảnh ba chiều không gian)"},
                        {"id": "C", "text": "Video live-action quay thực tế"},
                        {"id": "D", "text": "Hình chụp tĩnh Panorama"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận ĐÚNG (q1545): Hình chuỗi chuyển động phẳng đại diện cho 2D animation."
            },
            # Q17: IMAGE Question - 3D Animation khối lập phương
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Quan sát mô hình khối đa diện lập phương trong không gian ba chiều với các trục tọa độ X-Y-Z dưới đây. Hình ảnh này minh họa cho kỹ thuật đồ họa nào?\n\n![Mô hình không gian 3D Cube Mesh](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80)",
                "config": {
                    "options": [
                        {"id": "A", "text": "3D Animation / 3D Modeling"},
                        {"id": "B", "text": "2D Animation vẽ tay trên giấy"},
                        {"id": "C", "text": "Nhiếp ảnh tĩnh macro"},
                        {"id": "D", "text": "Kỹ thuật in thạch bản truyền thống"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận ĐÚNG (q1546): Hình khối lập phương có trục tọa độ chiều sâu đại diện cho 3D animation / 3D graphics."
            },
            # Q18: IMAGE Question - Cáp quang sợi quang
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Quan sát hình ảnh đường truyền dẫn ánh sáng xuyên qua các bó sợi thủy tinh tinh khiết dưới đây. Đây là phương tiện truyền dẫn nào?\n\n![Cáp quang phát sáng](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80)",
                "config": {
                    "options": [
                        {"id": "A", "text": "Cáp quang (Fiber Optic Cable)"},
                        {"id": "B", "text": "Cáp xoắn đôi UTP điện thoại"},
                        {"id": "C", "text": "Cáp đồng trục truyền hình cáp"},
                        {"id": "D", "text": "Đường dây điện cao thế"}
                    ],
                    "correct": "A"
                },
                "explanation": "Cáp quang sử dụng các sợi thủy tinh siêu tinh khiết để truyền dữ liệu dưới dạng các xung ánh sáng nhờ hiện tượng phản xạ toàn phần."
            },
            # Q19: MULTIPLE_CHOICE - Định dạng ảnh
            {
                "type": QuestionType.MULTIPLE_CHOICE,
                "content": "Đâu là các định dạng tệp dành cho hình ảnh và đồ họa? (Chọn 3 phương án đúng, TUYỆT ĐỐI KHÔNG chọn định dạng âm thanh)",
                "config": {
                    "options": [
                        {"id": "A", "text": "PNG"},
                        {"id": "B", "text": "TIFF"},
                        {"id": "C", "text": "JPEG (JIF)"},
                        {"id": "D", "text": "AIFF (Audio Interchange File Format)"}
                    ],
                    "correct": ["A", "B", "C"],
                    "allow_partial": True
                },
                "explanation": "Khảo thí xác nhận ĐÚNG (q1596): PNG, TIFF, JPEG là định dạng hình ảnh. AIFF là định dạng tệp âm thanh của Apple."
            },
            # Q20: MULTIPLE_CHOICE - Podcast
            {
                "type": QuestionType.MULTIPLE_CHOICE,
                "content": "Theo ngân hàng đề thi khảo thí, Podcast là hình thức phương tiện thuộc những nhóm nào dưới đây? (Chọn 2 đáp án)",
                "config": {
                    "options": [
                        {"id": "A", "text": "Audio"},
                        {"id": "B", "text": "Sound"},
                        {"id": "C", "text": "Phim hoạt hình 3D"},
                        {"id": "D", "text": "Tạp chí in ấn"}
                    ],
                    "correct": ["A", "B"],
                    "allow_partial": True
                },
                "explanation": "Khảo thí xác nhận ĐÚNG (q1566): Podcast được chấm đúng khi chọn đồng thời cả hai thuộc tính Audio và Sound."
            },
            # Q21: Single Choice - Mục đích văn bản
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Nêu mục đích quan trọng nhất của việc sử dụng văn bản (Text) trong sản xuất đa phương tiện:",
                "config": {
                    "options": [
                        {"id": "A", "text": "Để truyền đạt ý tưởng, suy nghĩ và sự kiện"},
                        {"id": "B", "text": "Chỉ dùng để trang trí góc màn hình"},
                        {"id": "C", "text": "Thay thế hoàn toàn cho hình ảnh và video"},
                        {"id": "D", "text": "Làm tăng tối đa dung lượng tệp"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận ĐÚNG (q1557): Văn bản dùng 'Để truyền đạt ý tưởng, suy nghĩ và sự kiện'."
            },
            # Q22: Single Choice - Hoạt ảnh đề cập
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Thuật ngữ “Hoạt ảnh” (Animation) đề cập chính xác đến điều gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Chuyển động của bức tranh đã tạo"},
                        {"id": "B", "text": "Bức ảnh chụp tĩnh vật"},
                        {"id": "C", "text": "Đoạn video quay người thật ngoài đời"},
                        {"id": "D", "text": "Một bản thu âm lời nói"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận ĐÚNG: Hoạt ảnh đề cập đến 'Chuyển động của bức tranh đã tạo'."
            },
            # Q23: Single Choice - Trí nhớ thị giác
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Trí nhớ thị giác (Visual Memory) là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Tiếp nhận, lưu trữ và truy xuất hình ảnh, biểu tượng trực quan"},
                        {"id": "B", "text": "Bộ nhớ RAM của máy tính"},
                        {"id": "C", "text": "Dung lượng thẻ nhớ máy ảnh"},
                        {"id": "D", "text": "Khả năng nghe và nhận biết âm thanh"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận ĐÚNG: Trí nhớ thị giác là khả năng tiếp nhận, lưu trữ và truy xuất hình ảnh cùng các biểu tượng trực quan."
            },
            # Q24: Single Choice - VR tương lai
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Không gian Multimedia tương lai mở rộng khỏi giới hạn màn hình phẳng, đi cùng AR hướng tới môi trường nào?",
                "config": {
                    "options": [
                        {"id": "A", "text": "VR (Thực tế ảo)"},
                        {"id": "B", "text": "CRT"},
                        {"id": "C", "text": "Màn hình đen trắng"},
                        {"id": "D", "text": "Máy chiếu phim nhựa"}
                    ],
                    "correct": "A"
                },
                "explanation": "VR kết hợp AR tạo nên môi trường thực tế mở rộng (XR)."
            },
            # Q25: Single Choice - Mạng 5G
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Thế hệ mạng viễn thông di động thứ năm được viết tắt là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "5G"},
                        {"id": "B", "text": "3G"},
                        {"id": "C", "text": "4G LTE"},
                        {"id": "D", "text": "GPRS"}
                    ],
                    "correct": "A"
                },
                "explanation": "5G là thế hệ mạng di động thứ năm."
            },
            # Q26: Single Choice - Microwave tầm nhìn thẳng
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Đặc trưng kỹ thuật bắt buộc của Liên kết vi ba (Microwave Links) bằng ăng-ten đĩa là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Đường truyền thẳng tầm nhìn (Line of Sight - LoS), không có vật cản"},
                        {"id": "B", "text": "Phải truyền xuyên qua lõi Trái Đất"},
                        {"id": "C", "text": "Phải dùng dây kim loại nối giữa hai đĩa"},
                        {"id": "D", "text": "Bị cản bởi tòa nhà vẫn hoạt động tốt nhất"}
                    ],
                    "correct": "A"
                },
                "explanation": "Sóng viba tần số siêu cao đòi hỏi đường ngắm thẳng Line of Sight giữa 2 tháp ăng-ten."
            },
            # Q27: Single Choice - Vệ tinh
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Ưu điểm nổi bật nhất của truyền thông vệ tinh (Satellite Communication) là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Vùng phủ sóng rộng lớn, kết nối được vùng núi non hiểm trở và hải đảo xa xôi"},
                        {"id": "B", "text": "Giá thành chế tạo và phóng rẻ nhất"},
                        {"id": "C", "text": "Độ trễ truyền tín hiệu luôn bằng 0"},
                        {"id": "D", "text": "Không bao giờ bị ảnh hưởng bởi thời tiết bão gió"}
                    ],
                    "correct": "A"
                },
                "explanation": "Vệ tinh có vùng phủ sóng địa lý bao quát toàn cầu."
            },
            # Q28: Single Choice - Cáp quang ưu điểm
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Vì sao sợi cáp quang dần thay thế cáp đồng trục trong hạ tầng mạng truyền thông hiện đại?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Băng thông cực lớn, độ suy hao tín hiệu rất thấp và hoàn toàn miễn nhiễm với nhiễu điện từ"},
                        {"id": "B", "text": "Sợi quang dẫn điện tốt hơn đồng"},
                        {"id": "C", "text": "Cáp quang có thể bẻ gập tùy ý không bao giờ gãy"},
                        {"id": "D", "text": "Cáp quang dùng được cho tivi cổ không cần giải mã"}
                    ],
                    "correct": "A"
                },
                "explanation": "Cáp quang dùng xung ánh sáng nên băng thông vượt trội, ít suy hao và không chịu tác động của điện từ trường."
            },
            # Q29: Single Choice - Số hóa âm thanh
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Hai bước kỹ thuật nền tảng để số hóa một tín hiệu âm thanh analog liên tục thành dữ liệu số là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Lấy mẫu (Sampling) và Lượng tử hóa (Quantization)"},
                        {"id": "B", "text": "Ghi âm và Phát lại"},
                        {"id": "C", "text": "Khuếch đại và Lọc nhiễu"},
                        {"id": "D", "text": "Chụp ảnh và In ấn"}
                    ],
                    "correct": "A"
                },
                "explanation": "Quá trình ADC âm thanh gồm: Sampling (theo thời gian) và Quantization (theo biên độ)."
            },
            # Q30: Single Choice - LASER phát quang
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Nguồn phát quang thường được sử dụng để phát các xung ánh sáng vào sợi cáp quang là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "LASER (hoặc LED chuyên dụng)"},
                        {"id": "B", "text": "Đèn dầu"},
                        {"id": "C", "text": "Đèn sợi đốt"},
                        {"id": "D", "text": "Tia X-ray"}
                    ],
                    "correct": "A"
                },
                "explanation": "LASER phát ra chùm sáng đơn sắc chuẩn xác truyền dọc trong lõi sợi quang."
            },
            # Q31: Single Choice - Command & Control
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Hệ thống Command & Control tương lai đòi hỏi hạ tầng mạng đáp ứng tiêu chuẩn khắt khe nào nhất?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Độ trễ siêu thấp và độ tin cậy thời gian thực"},
                        {"id": "B", "text": "Tốc độ đường truyền chậm"},
                        {"id": "C", "text": "Dùng tín hiệu quay số Dial-up"},
                        {"id": "D", "text": "Chỉ truyền dữ liệu 1 lần mỗi ngày"}
                    ],
                    "correct": "A"
                },
                "explanation": "Hệ thống chỉ huy và điều khiển yêu cầu phản hồi tức thời (Ultra-low latency)."
            },
            # Q32: Single Choice - Ki-ốt công cộng
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Ứng dụng đa phương tiện tương tác phổ biến nhất tại sân bay, bảo tàng, trung tâm thương mại là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Ki-ốt thông tin màn hình cảm ứng (Information Kiosk)"},
                        {"id": "B", "text": "Máy in tài liệu"},
                        {"id": "C", "text": "Hệ thống điện thoại bàn quay số"},
                        {"id": "D", "text": "Bảng tin dán giấy thủ công"}
                    ],
                    "correct": "A"
                },
                "explanation": "Ki-ốt tra cứu thông tin tương tác công cộng."
            },
            # Q33: Single Choice - Courseware giáo dục
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Ứng dụng tiêu biểu nhất của Đa phương tiện trong lĩnh vực giáo dục và đào tạo trực tuyến là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Phần mềm học liệu tương tác (Courseware / E-learning)"},
                        {"id": "B", "text": "Sổ điểm ghi chép bằng bút mực"},
                        {"id": "C", "text": "Thước kẻ học sinh"},
                        {"id": "D", "text": "Máy tính bấm tay số học"}
                    ],
                    "correct": "A"
                },
                "explanation": "Courseware / E-learning tích hợp văn bản, bài giảng âm thanh, video minh họa và trắc nghiệm tương tác."
            },
            # Q34: Single Choice - GIF
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Định dạng ảnh GIF là viết tắt của cụm từ tiếng Anh nào?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Graphics Interchange Format"},
                        {"id": "B", "text": "Global Internet File"},
                        {"id": "C", "text": "General Image Frame"},
                        {"id": "D", "text": "Geometric Information Form"}
                    ],
                    "correct": "A"
                },
                "explanation": "GIF = Graphics Interchange Format."
            },
            # Q35: Single Choice - Phương tiện vô tuyến
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Phương tiện nào sau đây KHÔNG PHẢI là phương tiện truyền dẫn vô tuyến (không dây)?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Đường cáp điện thoại hữu tuyến (Telephone wire)"},
                        {"id": "B", "text": "Sóng phát thanh Radio"},
                        {"id": "C", "text": "Sóng vi ba (Microwave)"},
                        {"id": "D", "text": "Sóng vệ tinh (Satellite)"}
                    ],
                    "correct": "A"
                },
                "explanation": "Cáp điện thoại là đường truyền hữu tuyến (Guided transmission medium)."
            },
            # Q36: Single Choice - JPEG
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Định dạng tệp nào phù hợp nhất để lưu trữ ảnh chụp thực tế với dung lượng tệp nhỏ nhờ thuật toán nén phù hợp?",
                "config": {
                    "options": [
                        {"id": "A", "text": "JPEG / JPG"},
                        {"id": "B", "text": "BMP không nén"},
                        {"id": "C", "text": "WAV"},
                        {"id": "D", "text": "EXE"}
                    ],
                    "correct": "A"
                },
                "explanation": "JPEG sử dụng nén có mất mát tối ưu cho mắt người xem ảnh đời thực."
            },
            # Q37: Single Choice - PNG trong suốt
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Định dạng tệp hình ảnh đồ họa nào hỗ trợ kênh độ trong suốt (Alpha transparency) rất phổ biến trên Internet?",
                "config": {
                    "options": [
                        {"id": "A", "text": "PNG"},
                        {"id": "B", "text": "BMP"},
                        {"id": "C", "text": "MP3"},
                        {"id": "D", "text": "AVI"}
                    ],
                    "correct": "A"
                },
                "explanation": "PNG hỗ trợ kênh Alpha giúp nền ảnh trong suốt."
            },
            # Q38: Single Choice - Tin tức chuyên sâu & phóng sự ảnh
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Ví dụ về 'News Featured' (Bài viết chuyên sâu) và 'Photo Gallery' (Bộ sưu tập ảnh) minh họa cho ứng dụng đa phương tiện trong lĩnh vực nào?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Báo chí và tạp chí số (Digital Journalism)"},
                        {"id": "B", "text": "Hệ thống điều khiển radar quân sự"},
                        {"id": "C", "text": "Sản xuất vi mạch bán dẫn"},
                        {"id": "D", "text": "Thiết kế cơ khí chế tạo máy"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận: News Featured và Photo Gallery là ứng dụng điển hình trong báo chí và xuất bản số."
            },
            # Q39: Single Choice - Storyboard
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Một loạt đồ họa phác thảo chi tiết trực quan nội dung từng phân cảnh của dự án đa phương tiện trước khi sản xuất được gọi là gì?",
                "config": {
                    "options": [
                        {"id": "A", "text": "a storyboard (Bảng phân cảnh kịch bản)"},
                        {"id": "B", "text": "a keyboard"},
                        {"id": "C", "text": "a motherboard"},
                        {"id": "D", "text": "a hard disk"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận: Bảng phác thảo phân cảnh là 'a storyboard'."
            },
            # Q40: Single Choice - Khối nội dung cốt lõi
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Các khối nội dung cốt lõi của môn Truyền thông Đa phương tiện gồm bao nhiêu khối chính?",
                "config": {
                    "options": [
                        {"id": "A", "text": "3 khối chính (Nội dung & Dữ liệu, Mạng & Truyền dẫn, Xử lý & Ứng dụng)"},
                        {"id": "B", "text": "8 khối"},
                        {"id": "C", "text": "10 khối"},
                        {"id": "D", "text": "1 khối duy nhất"}
                    ],
                    "correct": "A"
                },
                "explanation": "Khảo thí xác nhận: Tổ hợp thành 3 khối nội dung cốt lõi."
            },
            # Q41: Single Choice - Mô hình truyền thông 4 thành phần
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "Mô hình truyền thông cơ bản bắt buộc phải có đủ những thành phần nào?",
                "config": {
                    "options": [
                        {"id": "A", "text": "Người gửi (Sender), Thông điệp (Message), Kênh truyền (Channel), Người nhận (Receiver)"},
                        {"id": "B", "text": "Màn hình, Bàn phím, Chuột, Ổ cứng"},
                        {"id": "C", "text": "Vệ tinh, Cáp quang, Bộ định tuyến, Dây điện"},
                        {"id": "D", "text": "Hình ảnh, Âm thanh, Chữ viết, Video"}
                    ],
                    "correct": "A"
                },
                "explanation": "Mô hình truyền thông chuẩn: Sender -> Message -> Channel -> Receiver."
            },
            # Q42: Single Choice [CHƯA CÓ ĐÁP ÁN CHÍNH THỨC] - Tương tác phi tuyến
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "[Chưa có đáp án chính thức - Đang cập nhật] Ví dụ nào sau đây thể hiện rõ nét tính chất của Tương tác phi tuyến (Non-linear interactivity)?\n\n*(Ghi chú khảo thí: Đã thử Trang web - SAI; Phần mềm học liệu Courseware là ứng viên đang chờ hệ thống xác nhận đối soát)*",
                "config": {
                    "options": [
                        {"id": "A", "text": "Phần mềm học liệu tương tác (Courseware)"},
                        {"id": "B", "text": "Trang web thông thường"},
                        {"id": "C", "text": "Cuốn băng cát-sét nghe nhạc từ đầu đến cuối"},
                        {"id": "D", "text": "Một bộ phim chiếu rạp tuyến tính"}
                    ],
                    "correct": "A"
                },
                "explanation": "[Chưa có đáp án chính thức - Đang cập nhật]: Trong khảo thí trước đó phương án Trang web đã bị chấm SAI. Phần mềm học liệu cho phép người học rẽ nhánh theo tiến độ là ứng viên cần kiểm tra."
            },
            # Q43: Single Choice [CHƯA CÓ ĐÁP ÁN CHÍNH THỨC] - Tín hiệu lõi đồng
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "[Chưa có đáp án chính thức - Đang cập nhật] Dòng tín hiệu truyền trong lõi đồng của cáp đồng trục là dạng tín hiệu gì?\n\n*(Ghi chú khảo thí: Đã thử 'điện', 'electrical', 'electric' đều bị hệ thống chấm sai; có thể hệ thống yêu cầu thuật ngữ 'tương tự' hoặc 'cao tần')*",
                "config": {
                    "options": [
                        {"id": "A", "text": "Tín hiệu tương tự / Cao tần (RF)"},
                        {"id": "B", "text": "Tín hiệu điện (Electrical)"},
                        {"id": "C", "text": "Tín hiệu xung ánh sáng"},
                        {"id": "D", "text": "Sóng âm thanh cơ học"}
                    ],
                    "correct": "A"
                },
                "explanation": "[Chưa có đáp án chính thức - Đang cập nhật]: Khảo thí ghi nhận các từ khóa 'điện', 'electric' chưa được khóa chấm chấp nhận."
            },
            # Q44: Single Choice [CHƯA CÓ ĐÁP ÁN CHÍNH THỨC] - Mối liên hệ
            {
                "type": QuestionType.SINGLE_CHOICE,
                "content": "[Chưa có đáp án chính thức - Đang cập nhật] Mối liên hệ cốt lõi giữa Truyền thông và ________ là gì?\n\n*(Ghi chú khảo thí: Đã thử 'Công nghệ' / 'technology' - SAI; đang đối soát đáp án chuẩn)*",
                "config": {
                    "options": [
                        {"id": "A", "text": "Xã hội / Văn hóa tương tác"},
                        {"id": "B", "text": "Công nghệ kỹ thuật"},
                        {"id": "C", "text": "Máy móc phần cứng"},
                        {"id": "D", "text": "Mạng viễn thông"}
                    ],
                    "correct": "A"
                },
                "explanation": "[Chưa có đáp án chính thức - Đang cập nhật]: Đã thử 'Công nghệ' hệ thống chấm SAI. Cần chờ khóa đối soát ngân hàng đề."
            }
        ]

        # Insert questions and link to quiz
        for idx, q_data in enumerate(questions_spec):
            q_obj = Question(
                type=q_data["type"],
                title=f"Câu {idx + 1}",
                content=q_data["content"],
                points=1.0,
                difficulty=DifficultyLevel.MEDIUM,
                config=q_data["config"],
                explanation=q_data["explanation"]
            )
            db.add(q_obj)
            await db.flush()

            qq = QuizQuestion(
                quiz_id=quiz.id,
                question_id=q_obj.id,
                order=idx,
                points_override=1.0
            )
            db.add(qq)

        await db.commit()
        print(f"DONE! Successfully seeded {len(questions_spec)} realistic questions into Quiz {quiz.id}!")

if __name__ == "__main__":
    asyncio.run(seed())
