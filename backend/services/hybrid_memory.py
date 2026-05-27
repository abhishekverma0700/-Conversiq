import logging
from typing import Dict, List

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from models.database import ConversationSummary
from services.buffer_memory import get_messages_for_prompt
from services.entity_memory import extract_entities_from_message, get_relevant_entities_for_message
from services.llm_client import get_chat_llm
from services.summary_memory import get_latest_summary, update_summary_from_ai_response


logger = logging.getLogger(__name__)

HYBRID_SYSTEM_PROMPT_TEMPLATE = """{system_prompt}

Use the combined memory below to answer accurately and consistently.

--- Conversation Summary ---
{conversation_summary}
--- End Summary ---

--- Relevant Entities ---
{relevant_entities}
--- End Entities ---

--- Recent Messages ---
{recent_messages}
--- End Recent Messages ---"""


def _messages_to_text(messages: List[dict]) -> str:
    lines = []
    for message in messages:
        role = "User" if message.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {message.get('content', '')}")
    return "\n\n".join(lines)


class HybridMemory:
    def __init__(self, conversation_id: int):
        self.conversation_id = conversation_id

    def get_memory_context(self, user_message: str) -> Dict[str, object]:
        summary_row = get_latest_summary(self.conversation_id)
        conversation_summary = summary_row.summary_text if summary_row else ""
        relevant_entities = get_relevant_entities_for_message(self.conversation_id, user_message)
        recent_messages, _ = get_messages_for_prompt(self.conversation_id)
        recent_messages_text = _messages_to_text(recent_messages)

        return {
            "conversation_summary": conversation_summary,
            "relevant_entities": relevant_entities,
            "recent_messages": recent_messages,
            "recent_messages_text": recent_messages_text,
            "context_str": "\n\n".join(
                part for part in [conversation_summary, relevant_entities, recent_messages_text] if part
            ),
        }

    def build_chain(self, system_prompt: str, memory_context: Dict[str, object]):
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                HYBRID_SYSTEM_PROMPT_TEMPLATE.format(
                    system_prompt=system_prompt,
                    conversation_summary=memory_context.get("conversation_summary", ""),
                    relevant_entities=memory_context.get("relevant_entities", ""),
                    recent_messages=memory_context.get("recent_messages_text", ""),
                ),
            ),
            ("human", "{user_message}"),
        ])
        return prompt | get_chat_llm() | StrOutputParser()

    def get_response(self, system_prompt: str, user_message: str) -> tuple[str, Dict[str, object]]:
        context = self.get_memory_context(user_message)
        chain = self.build_chain(system_prompt, context)
        response = chain.invoke({
            "user_message": user_message,
        })
        return response, context

    def update_after_message(self, assistant_message: str, assistant_message_id: int | None = None):
        updated_summary = None
        try:
            if assistant_message_id is not None:
                updated_summary = update_summary_from_ai_response(self.conversation_id, assistant_message_id)
        except Exception:
            logger.exception("Failed to update hybrid summary for conversation %s", self.conversation_id)

        try:
            extract_entities_from_message(self.conversation_id, assistant_message, assistant_message_id)
        except Exception:
            logger.exception("Failed to update hybrid entities for conversation %s", self.conversation_id)

        return updated_summary
