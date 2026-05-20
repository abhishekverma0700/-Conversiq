from services.buffer_memory import get_messages_for_prompt
from services.summary_memory import get_summary_context_for_prompt
from services.entity_memory import get_entity_context_for_prompt, extract_entities_from_message
from services.kg_memory import get_kg_context_for_prompt, extract_triples_from_message


def get_memory_context(conversation_id: int, memory_type: str, user_message: str) -> dict:
    """
    Memory type ke hisaab se context return karo.
    Ek jagah se saari memory types manage hoti hain.
    """
    if memory_type == "buffer":
        history, removed = get_messages_for_prompt(conversation_id)
        return {
            "type": "buffer",
            "history": history,
            "removed": removed,
            "context_str": ""
        }

    elif memory_type == "summary":
        summary, recent = get_summary_context_for_prompt(conversation_id)
        return {
            "type": "summary",
            "history": recent,
            "summary": summary,
            "context_str": summary
        }

    elif memory_type == "entity":
        history, _ = get_messages_for_prompt(conversation_id)
        entity_context = get_entity_context_for_prompt(conversation_id, user_message)
        return {
            "type": "entity",
            "history": history,
            "entity_context": entity_context,
            "context_str": entity_context
        }

    elif memory_type == "kg":
        history, _ = get_messages_for_prompt(conversation_id)
        kg_context = get_kg_context_for_prompt(conversation_id, user_message)
        return {
            "type": "kg",
            "history": history,
            "kg_context": kg_context,
            "context_str": kg_context
        }

    else:
        history, _ = get_messages_for_prompt(conversation_id)
        return {
            "type": "buffer",
            "history": history,
            "context_str": ""
        }


def update_memory_after_message(conversation_id: int, memory_type: str, message_content: str, message_id: int):
    """
    Message ke baad memory update karo — entities aur triples extract karo.
    """
    if memory_type in ["entity", "sequential"]:
        extract_entities_from_message(conversation_id, message_content, message_id)

    if memory_type in ["kg", "sequential"]:
        extract_triples_from_message(conversation_id, message_content, message_id)

    if memory_type == "hybrid":
        extract_entities_from_message(conversation_id, message_content, message_id)
        extract_triples_from_message(conversation_id, message_content, message_id)