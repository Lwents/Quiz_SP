"""Ground tutor explanations in the same answer configuration as grading."""

import json

from app.scoring.base import score_question


def explanation_context(question_type, config, user_answer, max_score=1.0):
    result = score_question(question_type, config, user_answer, max_score)
    blank = user_answer is None or user_answer == "" or user_answer == [] or user_answer == {}
    state = ("pending" if result["pending_manual_grade"] else "correct" if result["correct"]
             else "unanswered" if blank else "partial" if result["score"] > 0 else "incorrect")
    labels = {"correct": "ĐÚNG", "partial": "ĐÚNG MỘT PHẦN", "incorrect": "CHƯA ĐÚNG",
              "unanswered": "BỎ TRỐNG", "pending": "CHƯA ĐƯỢC CHẤM"}
    options = config.get("options", [])
    option_labels = {str(o["id"]).strip().lower(): o.get("text", "") for o in options}

    def selected(value):
        key = str(value).strip().lower()
        return f"{value}: {option_labels[key]}" if key in option_labels else str(value)

    def readable(value):
        if value is None or value == "" or value == [] or value == {}:
            return "(Bỏ trống - chưa làm)"
        if isinstance(value, list):
            return "\n".join(selected(v) for v in value)
        if isinstance(value, dict):
            return "\n".join(f"{k} → {v}" for k, v in value.items())
        return selected(value)

    details = []
    if question_type in ("matching", "drag_drop"):
        pairs = config.get("pairs", [])
        correct = {p["left"]: p["right"] for p in pairs}
        if isinstance(user_answer, list):
            user_answer = {p.get("left", ""): p.get("right", "") for p in user_answer if isinstance(p, dict)}
        answers = {str(k).strip().lower(): str(v).strip().lower()
                   for k, v in (user_answer.items() if isinstance(user_answer, dict) else [])}
        for pair in pairs:
            given = answers.get(str(pair["left"]).strip().lower())
            status = "Chưa ghép" if not given else "Đúng" if given == str(pair["right"]).strip().lower() else "Sai"
            details.append(f"{pair['left']}: {status}; chuẩn là {pair['right']}")
    elif question_type == "ordering":
        correct = config.get("correct_order", [])
        if isinstance(user_answer, list):
            details = [f"Vị trí {i + 1}: bạn đặt {user_answer[i] if i < len(user_answer) else '(trống)'}; chuẩn là {item}"
                       for i, item in enumerate(correct)]
    elif question_type in ("fill_blank", "short_answer", "multiple_blank"):
        correct = config.get("accepted_answers") or config.get("correct")
    else:
        correct = config.get("correct")
        if question_type == "multiple_choice":
            keys = correct if isinstance(correct, list) else [correct]
            chosen = user_answer if isinstance(user_answer, list) else [user_answer] if user_answer is not None else []
            wanted = {str(x).strip().lower() for x in keys}
            actual = {str(x).strip().lower() for x in chosen}
            details.extend(f"Còn thiếu: {selected(k)}" for k in keys if str(k).strip().lower() not in actual)
            details.extend(f"Chọn thừa: {selected(k)}" for k in chosen if str(k).strip().lower() not in wanted)

    return {"state": state, "status": labels[state], "score": result["score"],
            "max_score": max_score, "user_answer": readable(user_answer),
            "correct_answer": readable(correct), "details": "\n".join(details),
            "options": "\n".join(f"{o['id']}: {o.get('text', '')}" for o in options),
            "config": json.dumps(config, ensure_ascii=False, sort_keys=True)}
