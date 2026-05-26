from config import Config


def count_tokens(text: str) -> int:
    """Simple token approximation: ~4 chars per token"""
    if not text:
        return 0
    return max(1, len(text) // 4)


def count_messages_tokens(messages: list) -> int:
    """Count tokens for a list of messages"""
    total = 0
    for msg in messages:
        content = msg.get("content", "") if isinstance(msg, dict) else str(msg)
        total += count_tokens(content)
    return total


def truncate_messages_to_fit(messages: list, token_budget: int) -> list:
    if not messages:
        return messages

    if count_messages_tokens(messages) <= token_budget:
        return messages

    # Always keep the most recent conversation context.
    must_keep = messages[-4:] if len(messages) >= 4 else messages
    must_keep_tokens = count_messages_tokens(must_keep)

    if must_keep_tokens >= token_budget:
        return must_keep

    remaining_budget = token_budget - must_keep_tokens
    older = messages[:-4] if len(messages) >= 4 else []
    selected_older = []

    for msg in reversed(older):
        msg_tokens = count_tokens(msg.get("content", "")) if isinstance(msg, dict) else count_tokens(str(msg))
        if remaining_budget - msg_tokens >= 0:
            selected_older.insert(0, msg)
            remaining_budget -= msg_tokens
        else:
            break

    return selected_older + must_keep


def get_token_budget_status(system_prompt: str, memory_text: str, recent_messages: list) -> dict:
    system_tokens = count_tokens(system_prompt)
    memory_tokens = count_tokens(memory_text)
    recent_tokens = count_messages_tokens(recent_messages)
    used_tokens = system_tokens + memory_tokens + recent_tokens
    total_budget = Config.TOKEN_BUDGET

    return {
        "system_prompt_tokens": system_tokens,
        "memory_tokens": memory_tokens,
        "recent_message_tokens": recent_tokens,
        "used_tokens": used_tokens,
        "total_budget": total_budget,
        "generation_reserved": Config.TOKEN_GENERATION,
        "available_for_generation": max(0, total_budget - used_tokens),
        "usage_percentage": round((used_tokens / total_budget) * 100, 1),
        "is_near_limit": used_tokens > (total_budget * 0.8),
        "is_over_limit": used_tokens > (total_budget - Config.TOKEN_GENERATION)
    }


def should_trigger_summarization(messages: list) -> bool:
    token_count = count_messages_tokens(messages)
    token_limit = Config.TOKEN_RECENT_MSGS * 0.8
    msg_count = len(messages)
    msg_limit = Config.MAX_BUFFER_MESSAGES * 0.8
    return token_count > token_limit or msg_count > msg_limit