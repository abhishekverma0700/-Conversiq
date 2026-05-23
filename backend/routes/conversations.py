from flask import Blueprint, request, jsonify
from models.database import db, Conversation, Message
from services.auth import get_authenticated_user_id, get_owned_conversation_or_404
from services.buffer_memory import get_buffer_messages, save_message, get_messages_for_prompt
from services.summary_memory import get_summary_context_for_prompt
from services.entity_memory import extract_entities_from_message, get_entity_context_for_prompt
from services.kg_memory import extract_triples_from_message, get_kg_context_for_prompt, get_graph_data
from services.chain_builder import (
    build_simple_conversation_chain,
    build_summary_chain,
    build_entity_chain,
    build_kg_chain,
    run_conversation_chain,
    run_entity_chain_safe,
    run_kg_chain_safe,
    run_sequential_chain,
    format_messages_for_langchain
)
from services.context_manager import get_token_budget_status

conversations_bp = Blueprint("conversations", __name__)


@conversations_bp.route("/api/conversations", methods=["GET"])
def list_conversations():
    user_id = get_authenticated_user_id()
    search = request.args.get("search", "")
    show_archived = request.args.get("archived", "false") == "true"
    query = Conversation.query.filter_by(user_id=user_id, is_archived=show_archived)
    if search:
        query = query.filter(Conversation.title.ilike(f"%{search}%"))
    conversations = query.order_by(
        Conversation.is_pinned.desc(),
        Conversation.updated_at.desc()
    ).all()
    return jsonify([c.to_dict() for c in conversations])


@conversations_bp.route("/api/conversations", methods=["POST"])
def create_conversation():
    user_id = get_authenticated_user_id()
    data = request.json or {}
    requested_user_id = data.get("user_id")
    if requested_user_id and requested_user_id != user_id:
        return jsonify({"error": "Cannot create conversations for another user"}), 403

    conv = Conversation(
        user_id=user_id,
        title=data.get("title", "New Chat"),
        persona_id=data.get("persona_id", "general_assistant"),
        memory_type=data.get("memory_type", "buffer")
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify(conv.to_dict()), 201


@conversations_bp.route("/api/conversations/<int:conv_id>", methods=["GET"])
def get_conversation(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    messages = get_buffer_messages(conv_id)
    return jsonify({**conv.to_dict(), "messages": messages})


@conversations_bp.route("/api/conversations/<int:conv_id>", methods=["PUT"])
def update_conversation(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    data = request.json or {}
    if "title" in data:
        conv.title = data["title"]
    if "is_pinned" in data:
        conv.is_pinned = data["is_pinned"]
    if "is_archived" in data:
        conv.is_archived = data["is_archived"]
    if "memory_type" in data:
        conv.memory_type = data["memory_type"]
    db.session.commit()
    return jsonify(conv.to_dict())


@conversations_bp.route("/api/conversations/<int:conv_id>", methods=["DELETE"])
def delete_conversation(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    db.session.delete(conv)
    db.session.commit()
    return jsonify({"message": "Deleted successfully"})


@conversations_bp.route("/api/conversations/<int:conv_id>/message", methods=["POST"])
def send_message(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    data = request.json or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    saved_msg = save_message(conv_id, "user", user_message)
    system_prompt = get_system_prompt(conv.persona_id)
    memory_type = conv.memory_type
    ai_response = ""
    token_info = {}
    extra_info = {}

    if memory_type == "buffer":
        history, removed = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        chain = build_simple_conversation_chain(system_prompt)
        ai_response = run_conversation_chain(
            chain,
            user_message=user_message,
            history_messages=history_without_current
        )
        token_info = get_token_budget_status(system_prompt, "", history_without_current)
        if removed > 0:
            token_info["truncated_messages"] = removed

    elif memory_type == "summary":
        summary, recent_msgs = get_summary_context_for_prompt(conv_id)
        recent_without_current = [m for m in recent_msgs if m["content"] != user_message]
        if not summary:
            chain = build_simple_conversation_chain(system_prompt)
            ai_response = run_conversation_chain(
                chain,
                user_message=user_message,
                history_messages=recent_without_current
            )
        else:
            chain = build_summary_chain(system_prompt)
            ai_response = run_conversation_chain(
                chain,
                user_message=user_message,
                history_messages=recent_without_current,
                summary=summary
            )
        token_info = get_token_budget_status(system_prompt, summary or "", recent_without_current)
        extra_info["summary"] = summary

    elif memory_type == "entity":
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        entity_context = get_entity_context_for_prompt(conv_id, user_message)
        chain = build_entity_chain(system_prompt)
        
        # Pass entity_context even when it is empty
        ai_response = chain.invoke({
            "user_message": user_message,
            "history": format_messages_for_langchain(history_without_current),
            "entity_context": entity_context if entity_context else "No entities tracked yet.",
    })
    
        extract_entities_from_message(conv_id, user_message, saved_msg.id)
        token_info = get_token_budget_status(system_prompt, entity_context, history_without_current)
        extra_info["entity_context"] = entity_context

    elif memory_type == "kg":
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        kg_context = get_kg_context_for_prompt(conv_id, user_message)
        chain = build_kg_chain(system_prompt)
        ai_response = run_kg_chain_safe(
            chain,
            user_message=user_message,
            history_messages=history_without_current,
            kg_context=kg_context
    )
        extract_triples_from_message(conv_id, user_message, saved_msg.id)
        token_info = get_token_budget_status(system_prompt, kg_context, history_without_current)
        extra_info["kg_context"] = kg_context

    elif memory_type == "sequential":
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        result = run_sequential_chain(
            system_prompt=system_prompt,
            user_message=user_message,
            history_messages=history_without_current,
            conversation_id=conv_id
        )
        ai_response = result["response"]
        extra_info["intent"] = result["intent"]
        extra_info["entity_context"] = result["entity_context"]
        extract_entities_from_message(conv_id, user_message, saved_msg.id)
        extract_triples_from_message(conv_id, user_message, saved_msg.id)
        token_info = get_token_budget_status(system_prompt, "", history_without_current)

    else:
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        chain = build_simple_conversation_chain(system_prompt)
        ai_response = run_conversation_chain(chain, user_message, history_without_current)
        token_info = {}

    save_message(conv_id, "assistant", ai_response)

    if conv.title == "New Chat":
        conv.title = user_message[:50] + ("..." if len(user_message) > 50 else "")
        db.session.commit()

    return jsonify({
        "response": ai_response,
        "token_info": token_info,
        "memory_type": memory_type,
        **extra_info
    })


@conversations_bp.route("/api/conversations/<int:conv_id>/tokens", methods=["GET"])
def get_token_info(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    history, _ = get_messages_for_prompt(conv_id)
    system_prompt = get_system_prompt(conv.persona_id)
    token_info = get_token_budget_status(system_prompt, "", history)
    return jsonify(token_info)


@conversations_bp.route("/api/conversations/<int:conv_id>/summary", methods=["GET"])
def get_summary(conv_id):
    from models.database import ConversationSummary
    get_owned_conversation_or_404(conv_id)
    summary = ConversationSummary.query.filter_by(
        conversation_id=conv_id
    ).order_by(ConversationSummary.created_at.desc()).first()
    if not summary:
        return jsonify({"summary": None, "message": "No summary yet"})
    return jsonify(summary.to_dict())


@conversations_bp.route("/api/conversations/<int:conv_id>/entities", methods=["GET"])
def get_entities(conv_id):
    from models.database import Entity
    get_owned_conversation_or_404(conv_id)
    entities = Entity.query.filter_by(
        conversation_id=conv_id
    ).order_by(Entity.updated_at.desc()).all()
    return jsonify({
        "entities": [e.to_dict() for e in entities],
        "total": len(entities)
    })


@conversations_bp.route("/api/conversations/<int:conv_id>/graph", methods=["GET"])
def get_kg_triples(conv_id):
    get_owned_conversation_or_404(conv_id)
    graph_data = get_graph_data(conv_id)
    from models.database import KGTriple
    triples = KGTriple.query.filter_by(
        conversation_id=conv_id
    ).order_by(KGTriple.created_at.desc()).all()
    return jsonify({
        "triples": [t.to_dict() for t in triples],
        "graph": graph_data,
        "total": len(triples)
    })


def get_system_prompt(persona_id: str) -> str:
    prompts = {
        "general_assistant": "You are a helpful, friendly AI assistant. Remember everything the user tells you and use it to provide personalized responses.",
        "code_helper": "You are an expert programming assistant. Track all code snippets, function names, file names, and technical decisions. Always reference previous code when relevant.",
        "creative_writer": "You are a creative writing partner. Track all characters, plot points, settings, and story elements. Build a rich narrative world together.",
        "business_analyst": "You are a professional business analyst. Track all metrics, KPIs, project names, team members, and deadlines. Provide structured, data-driven insights.",
        "study_buddy": "You are a patient, encouraging tutor. Build concept maps from topics discussed. Connect new concepts to previously learned material."
    }
    return prompts.get(persona_id, prompts["general_assistant"])