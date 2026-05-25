import logging

from models.database import db, Message, ConversationSummary
from services.context_manager import count_tokens
from services.llm_client import get_precise_llm
from config import Config
from langchain_core.messages import HumanMessage


logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """You are a conversation summarizer.
Summarize the following conversation concisely but completely.
Preserve all important facts, decisions, names, dates, and key information.
Write in third person. Be specific.

Conversation to summarize:
{conversation}

Write a dense, factual summary in 3-5 sentences:"""


SUMMARY_UPDATE_PROMPT = """You update conversation memory after the assistant has responded.

Rules:
- Use the assistant response as the primary source of truth.
- Use recent context only to resolve references and maintain continuity.
- Keep only meaningful facts, decisions, entities, and outcomes.
- Ignore greetings, filler, and repetitive wording.
- Avoid duplicate information from the previous summary.
- Write concise, factual third-person prose.

Previous summary:
{previous_summary}

Recent context:
{recent_context}

Assistant final response (primary source):
{assistant_response}

Return an updated summary in 1-3 sentences."""


def _messages_to_text(messages: list) -> str:
    text = ""
    for msg in messages:
        role = "User" if msg["role"] == "user" else "Assistant"
        text += f"{role}: {msg['content']}\n\n"
    return text


def get_latest_summary(conversation_id: int):
    return ConversationSummary.query.filter_by(
        conversation_id=conversation_id
    ).order_by(ConversationSummary.created_at.desc()).first()


def create_summary(conversation_id: int, messages_to_summarize: list) -> ConversationSummary:
    """Create and save a summary using the LLM."""
    conv_text = _messages_to_text(messages_to_summarize)

    llm = get_precise_llm()
    prompt = SUMMARY_PROMPT.format(conversation=conv_text)

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        summary_text = response.content.strip()
    except Exception as e:
        logger.error("Summary LLM error: %s", e)
        summary_text = "Summary generation failed."

    summary = ConversationSummary(
        conversation_id=conversation_id,
        summary_text=summary_text,
        messages_covered=len(messages_to_summarize),
        token_count=count_tokens(summary_text)
    )
    db.session.add(summary)
    db.session.commit()

    logger.info("Summary created: %s...", summary_text[:100])
    return summary


def get_summary_context_for_prompt(conversation_id: int) -> tuple:
    """
    Return the summary and recent messages for the prompt.
    """
    # Fetch all messages
    all_messages = Message.query.filter_by(
        conversation_id=conversation_id
    ).order_by(Message.created_at.asc()).all()

    if not all_messages:
        return "", []

    msgs_as_dicts = [{"role": m.role, "content": m.content} for m in all_messages]
    total_msgs = len(msgs_as_dicts)

    logger.info("Total messages: %s, Summary interval: %s", total_msgs, Config.SUMMARY_INTERVAL)

    # For prompting, return the most recent N messages (used as recent context).
    n_recent = Config.SUMMARY_INTERVAL
    if total_msgs >= n_recent:
        recent_messages = msgs_as_dicts[-n_recent:]
    else:
        recent_messages = msgs_as_dicts

    # Fetch the latest summary
    latest_summary = get_latest_summary(conversation_id)
    summary_text = latest_summary.summary_text if latest_summary else ""

    return summary_text, recent_messages


def update_summary_from_ai_response(conversation_id: int, assistant_message_id: int) -> ConversationSummary:
    """
    Generate or update the conversation summary after an assistant response is produced.
    This function uses the assistant response together with recent conversation context
    and the previous summary (if any) to produce an updated summary.
    """
    assistant_msg = Message.query.filter_by(
        id=assistant_message_id,
        conversation_id=conversation_id,
        role="assistant"
    ).first()

    if not assistant_msg:
        logger.warning(
            "Skipping summary update: assistant message not found (conversation_id=%s, message_id=%s)",
            conversation_id,
            assistant_message_id,
        )
        return None

    n_recent = max(Config.SUMMARY_INTERVAL, 6)
    recent_window = Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.id <= assistant_message_id,
    ).order_by(Message.created_at.desc()).limit(n_recent).all()

    recent_messages = list(reversed(recent_window))
    recent_context = _messages_to_text([
        {"role": m.role, "content": m.content} for m in recent_messages
    ])

    existing_summary = get_latest_summary(conversation_id)
    previous_summary = existing_summary.summary_text if existing_summary else "None"

    llm = get_precise_llm()
    prompt = SUMMARY_UPDATE_PROMPT.format(
        previous_summary=previous_summary,
        recent_context=recent_context or "None",
        assistant_response=assistant_msg.content,
    )

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        summary_text = response.content.strip()
    except Exception as e:
        logger.error("Summary update LLM error: %s", e)
        summary_text = existing_summary.summary_text if existing_summary else "Summary generation failed."

    summary = ConversationSummary(
        conversation_id=conversation_id,
        summary_text=summary_text,
        messages_covered=len(recent_messages),
        token_count=count_tokens(summary_text)
    )
    db.session.add(summary)
    db.session.commit()

    logger.info("Summary updated from AI response: %s...", summary_text[:100])
    return summary


def trigger_summary_now(conversation_id: int) -> str:
    """
    Force a summary manually.
    """
    all_messages = Message.query.filter_by(
        conversation_id=conversation_id
    ).order_by(Message.created_at.asc()).all()

    if not all_messages:
        return ""

    msgs_as_dicts = [{"role": m.role, "content": m.content} for m in all_messages]
    summary = create_summary(conversation_id, msgs_as_dicts)
    return summary.summary_text