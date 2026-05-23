from models.database import db, Entity, Message
from services.llm_client import get_precise_llm
from services.context_manager import count_tokens
from langchain_core.messages import HumanMessage
import json



ENTITY_EXTRACTION_PROMPT = """You are an entity extractor. Extract named entities and their key facts from this conversation message.

Extract: people, organizations, projects, dates, technologies, locations.

Message: {message}

Previous entities known: {existing_entities}

Return ONLY a JSON object like this (no other text):
{{
  "entities": [
    {{
      "name": "Rahul",
      "type": "person",
      "description": "Python developer at Acme Corp"
    }},
    {{
      "name": "Acme Corp", 
      "type": "organization",
      "description": "Tech company where Rahul works"
    }}
  ]
}}

If no entities found, return: {{"entities": []}}"""


ENTITY_CONTEXT_PROMPT = """You are an entity selector. Given a user message and known entities, return only the relevant entities.

User message: {message}
Known entities: {entities}

Return ONLY a JSON array of relevant entity names (no other text):
["name1", "name2"]

If none relevant, return: []"""


def extract_entities_from_message(conversation_id: int, message_content: str, message_id: int = None) -> list:
    """
    Extract entities from the message using the LLM.
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
        print(f"=== ENTITY EXTRACTION ===")
        print(f"Message: {message_content}")
        print(f"LLM Raw Response: {raw}")

        
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        data = json.loads(raw)
        extracted = data.get("entities", [])

       
        saved = []
        for entity_data in extracted:
            entity = save_or_update_entity(
                conversation_id=conversation_id,
                name=entity_data.get("name", ""),
                entity_type=entity_data.get("type", "general"),
                description=entity_data.get("description", ""),
                source_message_id=message_id
            )
            if entity:
                saved.append(entity)

        return saved

    except Exception as e:
        print(f"Entity extraction error: {e}")
        return []


def save_or_update_entity(conversation_id: int, name: str, entity_type: str, description: str, source_message_id: int = None) -> dict:
    """
    Save the entity and update it if it already exists.
    """
    if not name or not name.strip():
        return None

   
    existing = Entity.query.filter_by(
        conversation_id=conversation_id,
        name=name
    ).first()

    if existing:
       
        if description and description not in existing.description:
            existing.description = existing.description + ". " + description if existing.description else description
        db.session.commit()
        return existing.to_dict()
    else:
       
        entity = Entity(
            conversation_id=conversation_id,
            name=name,
            entity_type=entity_type,
            description=description,
            source_message_id=source_message_id
        )
        db.session.add(entity)
        db.session.commit()
        return entity.to_dict()


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

   
    if not relevant and len(all_entities) > 0:
        relevant = all_entities[:5]  # Inject the top 5 entities

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