from flask import Blueprint, request, jsonify
from models.database import db, Conversation, Message, Entity, KGTriple, ConversationSummary
from services.auth import get_authenticated_user_id, get_owned_conversation_or_404
from services.context_manager import count_messages_tokens, count_tokens

memory_bp = Blueprint("memory", __name__)


@memory_bp.route("/api/compare/memory", methods=["POST"])
def compare_memory():
    from services.chain_builder import build_simple_conversation_chain, build_summary_chain, run_conversation_chain
    from services.buffer_memory import get_messages_for_prompt
    from services.summary_memory import get_summary_context_for_prompt

    data = request.json or {}
    conv_id = data.get("conversation_id")
    test_message = data.get("test_message", "What do you remember about me?")
    memory_type_a = data.get("memory_type_a", "buffer")
    memory_type_b = data.get("memory_type_b", "summary")

    if not conv_id:
        return jsonify({"error": "conversation_id required"}), 400

    conv = get_owned_conversation_or_404(conv_id)
    system_prompt = "You are a helpful assistant. Remember everything the user tells you."

    results = {}

    for memory_type in [memory_type_a, memory_type_b]:
        if memory_type == "buffer":
            history, _ = get_messages_for_prompt(conv_id)
            chain = build_simple_conversation_chain(system_prompt)
            response = run_conversation_chain(chain, test_message, history)
            token_used = count_messages_tokens(history)

        elif memory_type == "summary":
            summary, recent = get_summary_context_for_prompt(conv_id)
            chain = build_summary_chain(system_prompt)
            response = run_conversation_chain(chain, test_message, recent, summary=summary)
            token_used = count_tokens(summary) + count_messages_tokens(recent)

        else:
            response = "Memory type not supported for comparison yet"
            token_used = 0

        results[memory_type] = {
            "response": response,
            "tokens_used": token_used
        }

    return jsonify({
        "test_message": test_message,
        "conversation_id": conv_id,
        "comparison": results
    })



@memory_bp.route("/api/entities/search", methods=["GET"])
def search_entities():
    user_id = get_authenticated_user_id()
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify({"error": "Search query required. Use ?q=keyword"}), 400

    conversation_ids = [c.id for c in Conversation.query.filter_by(user_id=user_id).all()]
    if not conversation_ids:
        return jsonify({"query": query, "results": [], "total": 0})

    entities = Entity.query.filter(
        Entity.conversation_id.in_(conversation_ids),
        (Entity.name.ilike(f"%{query}%") | Entity.description.ilike(f"%{query}%"))
    ).all()

    return jsonify({
        "query": query,
        "results": [e.to_dict() for e in entities],
        "total": len(entities)
    })


@memory_bp.route("/api/stats", methods=["GET"])
def get_stats():
    user_id = get_authenticated_user_id()
    conversation_ids = [c.id for c in Conversation.query.filter_by(user_id=user_id).all()]

    total_conversations = len(conversation_ids)
    total_messages = Message.query.filter(Message.conversation_id.in_(conversation_ids)).count() if conversation_ids else 0
    total_entities = Entity.query.filter(Entity.conversation_id.in_(conversation_ids)).count() if conversation_ids else 0
    total_triples = KGTriple.query.filter(KGTriple.conversation_id.in_(conversation_ids)).count() if conversation_ids else 0
    total_summaries = ConversationSummary.query.filter(ConversationSummary.conversation_id.in_(conversation_ids)).count() if conversation_ids else 0

    all_messages = Message.query.filter(Message.conversation_id.in_(conversation_ids)).all() if conversation_ids else []
    total_tokens = sum(m.token_count for m in all_messages)

    return jsonify({
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "total_entities": total_entities,
        "total_kg_triples": total_triples,
        "total_summaries": total_summaries,
        "total_tokens_used": total_tokens,
        "average_messages_per_conversation": round(total_messages / total_conversations, 1) if total_conversations > 0 else 0
    })