import math
from typing import Any, Dict, Tuple


def score_single_choice(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    correct = config.get("correct")
    if isinstance(correct, list) and len(correct) > 0:
        correct_val = str(correct[0]).strip().lower()
    else:
        correct_val = str(correct).strip().lower() if correct is not None else ""

    user_val = str(user_answer).strip().lower() if user_answer is not None else ""
    is_correct = bool(user_val and user_val == correct_val)
    return is_correct, max_score if is_correct else 0.0


def score_multiple_choice(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    raw_correct = config.get("correct", [])
    if not isinstance(raw_correct, list):
        raw_correct = [raw_correct]
    correct_set = set(str(x).strip().lower() for x in raw_correct if x is not None)

    if not isinstance(user_answer, list):
        user_list = [user_answer] if user_answer is not None else []
    else:
        user_list = user_answer
    user_set = set(str(x).strip().lower() for x in user_list if x is not None)

    allow_partial = config.get("allow_partial", False)
    if not correct_set:
        return False, 0.0

    if user_set == correct_set:
        return True, max_score

    if allow_partial:
        true_positives = len(user_set.intersection(correct_set))
        false_positives = len(user_set.difference(correct_set))
        raw_ratio = max(0.0, (true_positives - false_positives) / len(correct_set))
        earned = round(raw_ratio * max_score, 2)
        return False, earned

    return False, 0.0


def score_true_false(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    correct = config.get("correct")
    correct_bool = str(correct).strip().lower() in ("true", "1", "yes", "đúng", "t")
    user_bool = str(user_answer).strip().lower() in ("true", "1", "yes", "đúng", "t") if user_answer is not None else None
    
    if user_answer is None or str(user_answer).strip() == "":
        return False, 0.0

    is_correct = (correct_bool == user_bool)
    return is_correct, max_score if is_correct else 0.0


def score_fill_blank(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    accepted = config.get("accepted_answers", [])
    if isinstance(accepted, str):
        accepted = [accepted]
    if not accepted and "correct" in config:
        accepted = config.get("correct")
        if isinstance(accepted, str):
            accepted = [accepted]

    case_sensitive = config.get("case_sensitive", False)
    user_str = str(user_answer).strip() if user_answer is not None else ""
    if not user_str:
        return False, 0.0

    if not case_sensitive:
        user_str = user_str.lower()
        accepted_set = set(str(a).strip().lower() for a in accepted)
    else:
        accepted_set = set(str(a).strip() for a in accepted)

    is_correct = user_str in accepted_set
    return is_correct, max_score if is_correct else 0.0


def score_numeric(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    try:
        correct_val = float(config.get("correct", 0))
        tolerance = float(config.get("tolerance", 0.0))
        if user_answer is None or str(user_answer).strip() == "":
            return False, 0.0
        user_val = float(user_answer)
        # Use math.isclose or round to avoid 3.14 - 3.13 = 0.010000000000000231 floating point precision issue
        diff = abs(user_val - correct_val)
        is_correct = diff <= tolerance or math.isclose(diff, tolerance, rel_tol=1e-7, abs_tol=1e-7)
        return is_correct, max_score if is_correct else 0.0
    except (ValueError, TypeError):
        return False, 0.0


def score_matching(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    pairs = config.get("pairs", [])
    if not pairs:
        return False, 0.0

    target_map = {str(p.get("left", "")).strip().lower(): str(p.get("right", "")).strip().lower() for p in pairs}
    
    user_map = {}
    if isinstance(user_answer, dict):
        user_map = {str(k).strip().lower(): str(v).strip().lower() for k, v in user_answer.items()}
    elif isinstance(user_answer, list):
        for item in user_answer:
            if isinstance(item, dict):
                user_map[str(item.get("left", "")).strip().lower()] = str(item.get("right", "")).strip().lower()

    correct_count = 0
    for l_key, r_val in target_map.items():
        if user_map.get(l_key) == r_val:
            correct_count += 1

    total_pairs = len(target_map)
    is_correct = (correct_count == total_pairs)
    score_earned = round((correct_count / total_pairs) * max_score, 2)
    return is_correct, score_earned


def score_ordering(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    correct_order = [str(x).strip().lower() for x in config.get("correct_order", [])]
    if not isinstance(user_answer, list):
        return False, 0.0
    user_order = [str(x).strip().lower() for x in user_answer]
    
    is_correct = (correct_order == user_order)
    return is_correct, max_score if is_correct else 0.0


def score_short_answer(config: Dict[str, Any], user_answer: Any, max_score: float) -> Tuple[bool, float]:
    return score_fill_blank(config, user_answer, max_score)


def score_question(q_type: str, config: Dict[str, Any], user_answer: Any, max_score: float) -> Dict[str, Any]:
    scoring_functions = {
        "single_choice": score_single_choice,
        "multiple_choice": score_multiple_choice,
        "true_false": score_true_false,
        "fill_blank": score_fill_blank,
        "multiple_blank": score_fill_blank,
        "numeric": score_numeric,
        "matching": score_matching,
        "drag_drop": score_matching,
        "ordering": score_ordering,
        "dropdown": score_single_choice,
        "short_answer": score_short_answer,
    }

    fn = scoring_functions.get(q_type)
    if not fn:
        return {
            "correct": False,
            "score": 0.0,
            "max_score": max_score,
            "pending_manual_grade": True
        }

    is_correct, earned = fn(config or {}, user_answer, max_score)
    return {
        "correct": is_correct,
        "score": earned,
        "max_score": max_score,
        "pending_manual_grade": False
    }
