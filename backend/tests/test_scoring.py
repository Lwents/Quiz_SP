import pytest
from app.scoring.base import (
    score_single_choice,
    score_multiple_choice,
    score_true_false,
    score_fill_blank,
    score_numeric,
    score_matching,
    score_ordering,
    score_question
)


def test_score_single_choice():
    config = {"options": [{"id": "a", "text": "3"}, {"id": "b", "text": "4"}], "correct": "b"}
    
    # Correct answer
    is_corr, score = score_single_choice(config, "b", 1.0)
    assert is_corr is True
    assert score == 1.0

    # Wrong answer
    is_corr, score = score_single_choice(config, "a", 1.0)
    assert is_corr is False
    assert score == 0.0

    # None answer
    is_corr, score = score_single_choice(config, None, 1.0)
    assert is_corr is False
    assert score == 0.0


def test_score_multiple_choice():
    config = {
        "options": [{"id": "a"}, {"id": "b"}, {"id": "c"}],
        "correct": ["a", "c"],
        "allow_partial": True
    }

    # All correct
    is_corr, score = score_multiple_choice(config, ["a", "c"], 2.0)
    assert is_corr is True
    assert score == 2.0

    # Partial correct (1 of 2)
    is_corr, score = score_multiple_choice(config, ["a"], 2.0)
    assert is_corr is False
    assert score == 1.0

    # Wrong selection penalty
    is_corr, score = score_multiple_choice(config, ["a", "b"], 2.0)
    assert is_corr is False
    assert score == 0.0


def test_score_true_false():
    config = {"correct": True}
    
    is_corr, score = score_true_false(config, True, 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_true_false(config, "true", 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_true_false(config, False, 1.0)
    assert is_corr is False
    assert score == 0.0


def test_score_fill_blank():
    config = {
        "accepted_answers": ["Hà Nội", "Ha Noi"],
        "case_sensitive": False
    }

    is_corr, score = score_fill_blank(config, "HÀ NỘI", 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_fill_blank(config, "  ha noi  ", 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_fill_blank(config, "Sài Gòn", 1.0)
    assert is_corr is False
    assert score == 0.0


def test_score_numeric():
    config = {"correct": 3.14, "tolerance": 0.01}

    is_corr, score = score_numeric(config, 3.1415, 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_numeric(config, 3.13, 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_numeric(config, 3.10, 1.0)
    assert is_corr is False
    assert score == 0.0


def test_score_matching():
    config = {
        "pairs": [
            {"left": "VN", "right": "Hà Nội"},
            {"left": "JP", "right": "Tokyo"}
        ]
    }

    # All correct
    is_corr, score = score_matching(config, {"VN": "Hà Nội", "JP": "Tokyo"}, 2.0)
    assert is_corr is True
    assert score == 2.0

    # 1 correct of 2
    is_corr, score = score_matching(config, {"VN": "Hà Nội", "JP": "Osaka"}, 2.0)
    assert is_corr is False
    assert score == 1.0


def test_score_ordering():
    config = {
        "correct_order": ["Thiết kế", "Code", "Test", "Deploy"]
    }

    is_corr, score = score_ordering(config, ["Thiết kế", "Code", "Test", "Deploy"], 1.0)
    assert is_corr is True
    assert score == 1.0

    is_corr, score = score_ordering(config, ["Code", "Thiết kế", "Test", "Deploy"], 1.0)
    assert is_corr is False
    assert score == 0.0


def test_score_question_dispatcher():
    res = score_question("single_choice", {"correct": "a"}, "a", 1.0)
    assert res["correct"] is True
    assert res["score"] == 1.0
    assert res["max_score"] == 1.0
