from flask import Blueprint, request, jsonify
from models.database import db, Conversation, Message, ConversationSummary, Entity, KGTriple
from services.auth import get_owned_conversation_or_404, get_authenticated_user_id
import json

export_bp = Blueprint("export", __name__)


@export_bp.route("/api/conversations/<int:conv_id>/export", methods=["POST"])
def export_conversation(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    messages = Message.query.filter_by(conversation_id=conv_id).order_by(Message.created_at.asc()).all()
    summary = ConversationSummary.query.filter_by(conversation_id=conv_id).order_by(ConversationSummary.created_at.desc()).first()
    entities = Entity.query.filter_by(conversation_id=conv_id).all()
    triples = KGTriple.query.filter_by(conversation_id=conv_id).all()

    data = request.json or {}
    export_format = data.get("format", "json")

    if export_format == "json":
        export_data = {
            "conversation": conv.to_dict(),
            "messages": [m.to_dict() for m in messages],
            "summary": summary.to_dict() if summary else None,
            "entities": [e.to_dict() for e in entities],
            "kg_triples": [t.to_dict() for t in triples]
        }
        return jsonify(export_data)

    elif export_format == "markdown":
        md = f"# {conv.title}\n\n"
        md += f"**Memory Type:** {conv.memory_type}\n"
        md += f"**Created:** {conv.created_at.isoformat()}\n\n"

        if summary:
            md += f"## Summary\n{summary.summary_text}\n\n"

        md += "## Conversation\n\n"
        for m in messages:
            role = "**You**" if m.role == "user" else "**AI**"
            md += f"{role}: {m.content}\n\n"

        if entities:
            md += "## Entities\n\n"
            for e in entities:
                md += f"- **{e.name}** ({e.entity_type}): {e.description}\n"

        return jsonify({"markdown": md})

    return jsonify({"error": "Invalid format. Use json or markdown"}), 400



@export_bp.route("/api/conversations/import", methods=["POST"])
def import_conversation():
    user_id = get_authenticated_user_id()
    data = request.json or {}

    if "conversation" not in data:
        return jsonify({"error": "Invalid import data"}), 400

    conv_data = data["conversation"]
    new_conv = Conversation(
        user_id=user_id,
        title=conv_data.get("title", "Imported Chat"),
        persona_id=conv_data.get("persona_id", "general_assistant"),
        memory_type=conv_data.get("memory_type", "buffer")
    )
    db.session.add(new_conv)
    db.session.flush()

    for msg in data.get("messages", []):
        new_msg = Message(
            conversation_id=new_conv.id,
            role=msg["role"],
            content=msg["content"],
            token_count=msg.get("token_count", 0)
        )
        db.session.add(new_msg)

    if data.get("summary"):
        s = data["summary"]
        new_summary = ConversationSummary(
            conversation_id=new_conv.id,
            summary_text=s["summary_text"],
            messages_covered=s.get("messages_covered", 0),
            token_count=s.get("token_count", 0)
        )
        db.session.add(new_summary)

    for e in data.get("entities", []):
        new_entity = Entity(
            conversation_id=new_conv.id,
            name=e["name"],
            entity_type=e.get("entity_type", "general"),
            description=e.get("description", "")
        )
        db.session.add(new_entity)

    for t in data.get("kg_triples", []):
        new_triple = KGTriple(
            conversation_id=new_conv.id,
            subject=t["subject"],
            predicate=t["predicate"],
            object=t["object"]
        )
        db.session.add(new_triple)

    db.session.commit()
    return jsonify({
        "message": "Imported successfully",
        "conversation": new_conv.to_dict()
    }), 201