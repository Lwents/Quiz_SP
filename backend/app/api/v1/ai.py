from typing import Optional, List, Dict, Any
import httpx
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])

# Simple in-memory cache to save API calls for identical requests
_ai_cache: Dict[str, str] = {}


class AIExplainRequest(BaseModel):
    question_id: Optional[str] = None
    question_content: str
    question_type: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    user_answer: Optional[Any] = None
    correct_answer: Optional[Any] = None
    raw_explanation: Optional[str] = None


class AIExplainResponse(BaseModel):
    explanation: str
    cached: bool = False


@router.post("/explain", response_model=AIExplainResponse)
async def explain_question_with_ai(
    req: AIExplainRequest,
    current_user: User = Depends(get_current_user)
):
    # Check cache
    cache_key = f"{req.question_id}_{str(req.user_answer)}_{str(req.correct_answer)}"
    if req.question_id and cache_key in _ai_cache:
        return AIExplainResponse(explanation=_ai_cache[cache_key], cached=True)

    # Format options text
    opts_lines = []
    if req.options and isinstance(req.options, list):
        for o in req.options:
            if isinstance(o, dict):
                opts_lines.append(f"  {o.get('id', '')}. {o.get('text', '')}")
    opts_str = "\n".join(opts_lines)

    # Format user answer text
    user_ans_str = str(req.user_answer) if req.user_answer is not None and req.user_answer != '' else '(Bỏ trống - chưa làm)'

    # Format correct answer text
    if isinstance(req.correct_answer, list):
        correct_ans_str = ", ".join(str(x) for x in req.correct_answer)
    elif req.correct_answer is not None:
        correct_ans_str = str(req.correct_answer)
    else:
        correct_ans_str = "Không có"

    prompt = f"""Bạn là Gia sư AI Sư phạm chuyên nghiệp của hệ thống HNUE PRO. 
Một người học vừa làm câu hỏi trắc nghiệm sau đây và trả lời CHƯA CHÍNH XÁC:

📌 NỘI DUNG CÂU HỎI:
{req.question_content}

📋 CÁC PHƯƠNG ÁN LỰA CHỌN:
{opts_str or 'Không có'}

❌ CÂU TRẢ LỜI CỦA NGƯỜI HỌC (BỊ SAI HOẶC BỎ TRỐNG):
{user_ans_str}

✅ ĐÁP ÁN CHUẨN ĐÚNG:
{correct_ans_str}

📖 LỜI GIẢI THAM KHẢO GỐC:
{req.raw_explanation or 'Không có'}

---
QUY TẮC ĐỊNH DẠNG CÔNG THỨC TOÁN (BẮT BUỘC):
- Tất cả các ký hiệu toán học (như forall, exists, in, notin, rightarrow, leftrightarrow, land, lor, neg, mathbb, subset,...) PHẢI ĐƯỢC BỌC TRONG DẤU ĐÔ LA: ví dụ `$ \\forall $`, `$ \\exists $`, `$ \\mathbb{{Z}} $`, `$ \\neg p $`, `$ \\rightarrow $`, `$ P(x, y) $`. TUYỆT ĐỐI KHÔNG ĐỂ KÝ HIỆU TRẦN dạng \\forall hay \\exists mà không có dấu `$`.

HÃY GIẢI THÍCH CHO NGƯỜI HỌC THEO ĐÚNG CẤU TRÚC SAU (Trình bày Markdown đẹp mắt, văn phong ấm áp, gần gũi, khích lệ người học):

### 💡 1. Vì sao bạn chọn nhầm?
Chỉ ra thật rõ ràng lý do hoặc bẫy tư duy dẫn đến việc chọn nhầm phương án `{user_ans_str}` (hoặc vì sao dễ bị lúng túng bỏ trống).

### 🎯 2. Bản chất cốt lõi & Cách hiểu đúng
Giải thích thật giản dị, trực quan vì sao đáp án chuẩn `{correct_ans_str}` lại đúng. Hạn chế dùng thuật ngữ hàn lâm trừu tượng, giải thích như đang trò chuyện trực tiếp với học sinh.

### 🌟 3. Ví dụ thực tế siêu dễ hiểu
Đưa ra đúng 1 ví dụ cụ thể (bằng con số thực tế, phép so sánh đời thường quen thuộc) tương tự bài toán này, giúp người học hiểu thấu và tự tin chọn được ngay đáp án chuẩn.

### ✅ 4. Mẹo ghi nhớ bỏ túi
Đưa ra 1 câu thần chú ngắn gọn hoặc quy tắc nhanh để lần sau nhìn thấy dạng câu này là chọn đúng 100%.
"""

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Bạn là Gia sư AI Sư phạm thông minh, tận tình của HNUE PRO, chuyên giải thích kiến thức một cách dễ hiểu nhất, có ví dụ trực quan, sinh động. Luôn luôn bọc mọi ký hiệu toán học trong cặp dấu $...$."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "stream": False,
        "temperature": 0.4
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.AI_API_KEY}"
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{settings.AI_BASE_URL.rstrip('/')}/chat/completions",
                json=payload,
                headers=headers
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Lỗi dịch vụ AI ({resp.status_code}): {resp.text}"
                )
            
            # Xử lý an toàn cả trường hợp trả về JSON thường hoặc text/event-stream
            content_type = resp.headers.get("content-type", "")
            explanation_text = ""
            if "application/json" in content_type:
                data = resp.json()
                explanation_text = data["choices"][0]["message"]["content"]
            else:
                # Parse SSE chunks
                chunks = []
                for line in resp.text.split("\n"):
                    line = line.strip()
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            d = json.loads(data_str)
                            c = d["choices"][0].get("delta", {}).get("content", "")
                            if c:
                                chunks.append(c)
                        except Exception:
                            pass
                explanation_text = "".join(chunks)
            
            # Cache result
            if req.question_id and explanation_text:
                _ai_cache[cache_key] = explanation_text

            return AIExplainResponse(explanation=explanation_text, cached=False)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Không thể kết nối đến máy chủ AI: {str(exc)}"
        )
