"""Only presentation data may cross the active-exam API boundary."""

import random
import hashlib
import hmac
from copy import deepcopy
from app.core.config import settings


def student_question_config(question_type, config, seed):
    config = config or {}
    kind = getattr(question_type, "value", question_type)
    # An allowlist also excludes imported answer references, verification notes,
    # and any future answer-key fields that a denylist would silently expose.
    visible = {key: deepcopy(config[key]) for key in (
        "image_url", "blank_count", "placeholder", "language", "starter_code",
    ) if key in config}
    if isinstance(config.get("options"), list):
        visible["options"] = [
            {key: deepcopy(option[key]) for key in ("id", "text") if key in option}
            for option in config["options"] if isinstance(option, dict)
        ]
    private_seed = hmac.new(settings.SECRET_KEY.encode(), str(seed).encode(), hashlib.sha256).digest()
    rng = random.Random(private_seed)
    if kind == "ordering":
        visible["items"] = list(config.get("items") or config.get("correct_order", []))
        rng.shuffle(visible["items"])
    if kind in ("matching", "drag_drop"):
        pairs = config.get("pairs", [])
        visible["left_items"] = [pair["left"] for pair in pairs if "left" in pair]
        visible["right_items"] = [pair["right"] for pair in pairs if "right" in pair]
        # Paired arrays in source order reveal the key even without `pairs`.
        rng.shuffle(visible["right_items"])
    return visible
