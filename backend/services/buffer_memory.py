from models.database import db, Message
from services.context_manager import count_tokens, truncate_messages_to_fit
from config import Config


def save_message(conversation_id: int, role: str, content: str):
    token_count = count_tokens(content)
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        token_count=token_count
    )
    db.session.add(msg)
    db.session.commit()
    return msg


def get_buffer_messages(conversation_id: int) -> list:
    messages = Message.query.filter_by(
        conversation_id=conversation_id
    ).order_by(Message.created_at.asc()).all()
    return [{"role": m.role, "content": m.content} for m in messages]


def get_messages_for_prompt(conversation_id: int) -> tuple:
    all_messages = get_buffer_messages(conversation_id)
    token_budget = Config.TOKEN_RECENT_MSGS
    fitted_messages = truncate_messages_to_fit(all_messages, token_budget)
    removed_count = len(all_messages) - len(fitted_messages)
    return fitted_messages, removed_count


def get_message_count(conversation_id: int) -> int:
    return Message.query.filter_by(conversation_id=conversation_id).count()