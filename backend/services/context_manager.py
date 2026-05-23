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

    last_message = messages[-1]
    older_messages = messages[:-1]

    if count_messages_tokens(messages) <= token_budget:
        return messages

    while older_messages and count_messages_tokens(older_messages + [last_message]) > token_budget:
        older_messages.pop(0)

    return older_messages + [last_message]


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