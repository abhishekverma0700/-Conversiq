import logging

from models.database import db, Entity, Message
from services.llm_client import get_precise_llm
from services.context_manager import count_tokens
from langchain_core.messages import HumanMessage
import json


logger = logging.getLogger(__name__)


ENTITY_EXTRACTION_PROMPT = """You are a precise knowledge extraction system.
Your job is to extract named entities from the AI's final response text.

STRICT RULES:
1. Extract ONLY entities explicitly stated in the AI response
2. NEVER invent, assume, or hallucinate entity names
3. NEVER use example names from your training data
4. Ignore greetings, filler words, and generic conversational text
5. If no real entities exist in the response, return empty list

Entity types to extract:
- person: real people mentioned by name
- organization: companies, teams, institutions
- project: specific project or product names
- technology: programming languages, frameworks, libraries, tools, platforms
- date: specific dates, deadlines, timeframes
- concept: useful abstract ideas or domain concepts that are not concrete products
- location: cities, countries, places

AI response: {message}

Already known entities: {existing_entities}

Return ONLY valid JSON, no explanation:
{{
    "entities": [
        {{
            "name": "exact name from message",
            "type": "one of the types above",
            "description": "what was said about this entity in the message"
        }}
    ]
}}

If nothing to extract: {{"entities": []}}"""


_GENERIC_ENTITY_NAMES = {
    "user",
    "assistant",
    "hello",
    "hi",
    "hey",
    "thanks",
    "thank you",
    "good morning",
    "good afternoon",
    "good evening",
    "question",
    "answer",
    "message",
    "response",
    "conversation",
}

_ENTITY_TYPE_PRIORITY = {
    "general": 0,
    "concept": 1,
    "date": 2,
    "location": 2,
    "project": 3,
    "organization": 4,
    "org": 4,
    "person": 5,
    "technology": 6,
}


ENTITY_CONTEXT_PROMPT = """You are an entity selector. Given a user message and known entities, return only the relevant entities.

User message: {message}
Known entities: {entities}

Return ONLY a JSON array of relevant entity names (no other text):
["name1", "name2"]

If none relevant, return: []"""


def extract_entities_from_message(conversation_id: int, message_content: str, message_id: int = None) -> list:
    """
    Extract entities from the AI response using the LLM.
    """
    
    existing = get_all_entities(conversation_id)
    existing_str = json.dumps([{"name": e["name"], "description": e["description"]} for e in existing])

    llm = get_precise_llm()
    prompt = ENTITY_EXTRACTION_PROMPT.format(
        message=message_content,
        existing_entities=existing_str or "None"
    )

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()

         # DEBUG — this will appear in the terminal
        logger.info("=== ENTITY EXTRACTION ===")
        logger.info("AI Response: %s", message_content)
        logger.info("LLM Raw Response: %s", raw)

        
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        data = json.loads(raw)
        extracted = data.get("entities", [])

       
        saved = []
        seen_names = set()
        for entity_data in extracted:
            name = (entity_data.get("name", "") or "").strip()
            normalized_name = _normalize_entity_name(name)
            if not name or normalized_name in seen_names:
                continue
            if _should_skip_entity(name):
                continue
            seen_names.add(normalized_name)
            entity = save_or_update_entity(
                conversation_id=conversation_id,
                name=name,
                entity_type=entity_data.get("type", "general"),
                description=entity_data.get("description", ""),
                source_message_id=message_id
            )
            if entity:
                saved.append(entity)

        return saved

    except Exception as e:
        logger.error("Entity extraction error: %s", e)
        return []


def save_or_update_entity(conversation_id: int, name: str, entity_type: str, description: str, source_message_id: int = None) -> dict:
    """
    Save the entity and update it if it already exists.
    """
    name = name.strip()
    if not name or _should_skip_entity(name):
        return None

   
    existing = Entity.query.filter(
        Entity.conversation_id == conversation_id,
        db.func.lower(Entity.name) == name.lower()
    ).first()

    if existing:
        new_type = _choose_better_entity_type(existing.entity_type, entity_type)
        if new_type != existing.entity_type:
            existing.entity_type = new_type

        if description:
            cleaned_description = description.strip()
            if cleaned_description and cleaned_description.lower() not in existing.description.lower():
                existing.description = (
                    existing.description + ". " + cleaned_description
                    if existing.description
                    else cleaned_description
                )
        db.session.commit()
        return existing.to_dict()
    else:
        entity = Entity(
            conversation_id=conversation_id,
            name=name,
            entity_type=entity_type.strip() if entity_type else "general",
            description=description.strip() if description else "",
            source_message_id=source_message_id
        )
        db.session.add(entity)
        db.session.commit()
        return entity.to_dict()


def _normalize_entity_name(name: str) -> str:
    return " ".join(name.lower().split())


def _should_skip_entity(name: str) -> bool:
    normalized = _normalize_entity_name(name)
    if not normalized or len(normalized) < 2:
        return True
    if normalized in _GENERIC_ENTITY_NAMES:
        return True
    if normalized.isdigit():
        return True
    if normalized in {"ai", "llm"}:
        return False
    return False


def _choose_better_entity_type(existing_type: str, new_type: str) -> str:
    existing_key = (existing_type or "general").lower()
    new_key = (new_type or "general").lower()
    if _ENTITY_TYPE_PRIORITY.get(new_key, 0) >= _ENTITY_TYPE_PRIORITY.get(existing_key, 0):
        return new_key
    return existing_key


def get_all_entities(conversation_id: int) -> list:
    """Fetch all entities for the conversation."""
    entities = Entity.query.filter_by(
        conversation_id=conversation_id
    ).order_by(Entity.updated_at.desc()).all()
    return [e.to_dict() for e in entities]


def get_relevant_entities_for_message(conversation_id: int, message: str) -> str:
    """
    Find relevant entities for the message and build a string for injection.
    """
    all_entities = get_all_entities(conversation_id)

    if not all_entities:
        return ""

    
    relevant = []
    message_lower = message.lower()

    for entity in all_entities:
        if entity["name"].lower() in message_lower:
            relevant.append(entity)

   
    if not relevant:
        return ""

    
    entity_lines = []
    for e in relevant:
        entity_lines.append(f"- {e['name']} ({e['entity_type']}): {e['description']}")

    return "Known entities:\n" + "\n".join(entity_lines)


def get_entity_context_for_prompt(conversation_id: int, user_message: str) -> str:
    """
    Return an entity context string for injection into the prompt.
    Token budget: max 500 tokens
    """
    context = get_relevant_entities_for_message(conversation_id, user_message)

   
    if count_tokens(context) > 500:
        lines = context.split("\n")
        trimmed = []
        tokens = 0
        for line in lines:
            t = count_tokens(line)
            if tokens + t < 500:
                trimmed.append(line)
                tokens += t
        context = "\n".join(trimmed)

    return context