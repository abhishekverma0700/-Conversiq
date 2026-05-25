import logging

from models.database import db, KGTriple
from services.llm_client import get_precise_llm
from services.context_manager import count_tokens
from langchain_core.messages import HumanMessage
import json


logger = logging.getLogger(__name__)


_GENERIC_TRIPLE_TERMS = {
    "user",
    "assistant",
    "hello",
    "hi",
    "hey",
    "thanks",
    "thank you",
    "message",
    "response",
    "conversation",
    "said",
    "says",
}


KG_EXTRACTION_PROMPT = """You are a knowledge graph builder. Extract relationship triples from the AI's final response text.

AI response: {message}

Extract meaningful subject-predicate-object triples.
Good examples:
- (Rahul, works_at, Acme Corp)
- (Project X, deadline, March 15)
- (Acme Corp, is_a, tech company)
- (Rahul, uses, Python)

Bad examples (too generic):
- (user, said, hello)
- (person, has, name)

STRICT RULES:
1. Extract only useful, meaningful relationships explicitly stated in the AI response
2. Ignore filler words, greetings, and generic conversational text
3. Avoid duplicate or near-duplicate triples
4. Prefer concrete entities and useful domain relationships over generic phrases

Return ONLY a JSON object (no other text):
{{
  "triples": [
    {{
      "subject": "Rahul",
      "predicate": "works_at",
      "object": "Acme Corp"
    }}
  ]
}}

If no meaningful triples found, return: {{"triples": []}}"""


def extract_triples_from_message(conversation_id: int, message_content: str, message_id: int = None) -> list:
    """Extract KG triples from the AI response using the LLM."""
    llm = get_precise_llm()
    prompt = KG_EXTRACTION_PROMPT.format(message=message_content)

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()


        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        data = json.loads(raw)
        triples = data.get("triples", [])

        
        saved = []
        seen_triples = set()
        for triple in triples:
            subject = triple.get("subject", "").strip()
            predicate = triple.get("predicate", "").strip()
            obj = triple.get("object", "").strip()

            normalized_key = _normalize_triple_key(subject, predicate, obj)
            if not subject or not predicate or not obj:
                continue
            if _should_skip_triple(subject, predicate, obj) or normalized_key in seen_triples:
                continue
            seen_triples.add(normalized_key)
            saved_triple = save_triple(
                conversation_id=conversation_id,
                subject=subject,
                predicate=predicate,
                object_=obj,
                source_message_id=message_id
            )
            if saved_triple:
                saved.append(saved_triple)

        return saved

    except Exception as e:
        logger.error("KG extraction error: %s", e)
        return []


def save_triple(conversation_id: int, subject: str, predicate: str, object_: str, source_message_id: int = None) -> dict:
    """
    Save the triple and check for duplicates.
    """
    
    existing = KGTriple.query.filter(
        KGTriple.conversation_id == conversation_id,
        db.func.lower(KGTriple.subject) == subject.lower(),
        db.func.lower(KGTriple.predicate) == predicate.lower(),
        db.func.lower(KGTriple.object) == object_.lower()
    ).first()

    if existing:
        return existing.to_dict()

    triple = KGTriple(
        conversation_id=conversation_id,
        subject=subject,
        predicate=predicate,
        object=object_,
        source_message_id=source_message_id
    )
    db.session.add(triple)
    db.session.commit()
    return triple.to_dict()


def _normalize_triple_key(subject: str, predicate: str, object_: str) -> tuple:
    return (
        " ".join(subject.lower().split()),
        " ".join(predicate.lower().split()),
        " ".join(object_.lower().split()),
    )


def _should_skip_triple(subject: str, predicate: str, object_: str) -> bool:
    normalized_subject = " ".join(subject.lower().split())
    normalized_predicate = " ".join(predicate.lower().split())
    normalized_object = " ".join(object_.lower().split())

    if not normalized_subject or not normalized_predicate or not normalized_object:
        return True
    if normalized_subject in _GENERIC_TRIPLE_TERMS:
        return True
    if normalized_object in _GENERIC_TRIPLE_TERMS:
        return True
    if normalized_predicate in _GENERIC_TRIPLE_TERMS:
        return True
    return False


def get_all_triples(conversation_id: int) -> list:
    """Fetch all triples for the conversation."""
    triples = KGTriple.query.filter_by(
        conversation_id=conversation_id
    ).order_by(KGTriple.created_at.desc()).all()
    return [t.to_dict() for t in triples]


def get_kg_context_for_prompt(conversation_id: int, user_message: str) -> str:
    """
    Return a KG context string for injection into the prompt.
    """
    all_triples = get_all_triples(conversation_id)

    if not all_triples:
        return ""

    
    message_lower = user_message.lower()
    relevant = []

    for triple in all_triples:
        if (triple["subject"].lower() in message_lower or
            triple["object"].lower() in message_lower):
            relevant.append(triple)

    
    if not relevant:
        return ""

    
    lines = []
    for t in relevant:
        lines.append(f"- ({t['subject']}) --{t['predicate']}--> ({t['object']})")

    context = "Known relationships:\n" + "\n".join(lines)


    if count_tokens(context) > 500:
        lines = lines[:10]
        context = "Known relationships:\n" + "\n".join(lines)

    return context


def get_graph_data(conversation_id: int) -> dict:
    """
    Return nodes and edges for frontend graph visualization.
    """
    triples = get_all_triples(conversation_id)

    nodes = {}
    edges = []

    for t in triples:
        
        if t["subject"] not in nodes:
            nodes[t["subject"]] = {"id": t["subject"], "label": t["subject"]}
        if t["object"] not in nodes:
            nodes[t["object"]] = {"id": t["object"], "label": t["object"]}

        
        edges.append({
            "from": t["subject"],
            "to": t["object"],
            "label": t["predicate"]
        })

    return {
        "nodes": list(nodes.values()),
        "edges": edges
    }