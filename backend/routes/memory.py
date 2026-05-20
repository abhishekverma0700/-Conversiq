from flask import Blueprint, request, jsonify
from models.database import db, Conversation, Message, Entity, KGTriple, ConversationSummary
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

    conv = Conversation.query.get_or_404(conv_id)
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
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify({"error": "Search query required. Use ?q=keyword"}), 400

    entities = Entity.query.filter(
        Entity.name.ilike(f"%{query}%") |
        Entity.description.ilike(f"%{query}%")
    ).all()

    return jsonify({
        "query": query,
        "results": [e.to_dict() for e in entities],
        "total": len(entities)
    })


@memory_bp.route("/api/stats", methods=["GET"])
def get_stats():
    total_conversations = Conversation.query.count()
    total_messages = Message.query.count()
    total_entities = Entity.query.count()
    total_triples = KGTriple.query.count()
    total_summaries = ConversationSummary.query.count()

    all_messages = Message.query.all()
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