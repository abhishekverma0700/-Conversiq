import logging
import json

from flask import Blueprint, request, jsonify, Response, stream_with_context
from models.database import db, Conversation, Message
from services.auth import get_authenticated_user_id, get_owned_conversation_or_404
from services.buffer_memory import get_buffer_messages, save_message, get_messages_for_prompt
from services.summary_memory import get_summary_context_for_prompt, update_summary_from_ai_response
from services.entity_memory import extract_entities_from_message, get_entity_context_for_prompt
from services.kg_memory import extract_triples_from_message, get_kg_context_for_prompt, get_graph_data
from services.hybrid_memory import HybridMemory
from services.chain_builder import (
    build_simple_conversation_chain,
    build_summary_chain,
    build_entity_chain,
    build_kg_chain,
    run_conversation_chain,
    run_entity_chain_safe,
    run_kg_chain_safe,
    run_sequential_chain,
    format_messages_for_langchain,
    classify_intent,
    run_parallel_chain,
    run_branching_chain
)
from services.context_manager import get_token_budget_status


logger = logging.getLogger(__name__)

conversations_bp = Blueprint("conversations", __name__)


def _sse_event(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _trim_current_user_from_history(history: list, user_message: str) -> list:
    if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
        return history[:-1]
    return history


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

    save_message(conv_id, "user", user_message)
    if not conv.title or conv.title == "New Chat":
        conv.title = user_message[:50] + ("..." if len(user_message) > 50 else "")
        db.session.commit()

    system_prompt = get_system_prompt(conv.persona_id)
    memory_type = conv.memory_type
    ai_response = ""
    token_info = {}
    extra_info = {}

    # Auto-switch memory if conversation gets long
    if memory_type == "buffer":
        from services.buffer_memory import get_message_count
        try:
            msg_count = get_message_count(conv_id)
            if msg_count >= 15:
                memory_type = "sequential"
                # Update in DB
                conv.memory_type = "sequential"
                db.session.commit()
                # Add to extra_info so frontend knows
                extra_info["auto_switched"] = True
                extra_info["auto_switch_reason"] = (
                    "Conversation exceeded 15 messages. Switched to Sequential chain for better memory management."
                )
        except Exception:
            logger.exception("Failed to check message count for auto-switching")

    if memory_type == "buffer":
        history, removed = get_messages_for_prompt(conv_id)
        # Remove only the LAST message if it matches current user message
        # to avoid including the just-saved message in history
        if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
            history_without_current = history[:-1]
        else:
            history_without_current = history
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
        # Remove only the LAST message if it matches current user message
        # to avoid including the just-saved message in history
        if recent_msgs and recent_msgs[-1]["content"] == user_message and recent_msgs[-1]["role"] == "user":
            recent_without_current = recent_msgs[:-1]
        else:
            recent_without_current = recent_msgs
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
        # Remove only the LAST message if it matches current user message
        # to avoid including the just-saved message in history
        if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
            history_without_current = history[:-1]
        else:
            history_without_current = history
        entity_context = get_entity_context_for_prompt(conv_id, user_message)
        chain = build_entity_chain(system_prompt)
        
        # Pass entity_context even when it is empty
        ai_response = chain.invoke({
            "user_message": user_message,
            "history": format_messages_for_langchain(history_without_current),
            "entity_context": entity_context if entity_context else "No entities tracked yet.",
    })
        token_info = get_token_budget_status(system_prompt, entity_context, history_without_current)
        extra_info["entity_context"] = entity_context

    elif memory_type == "kg":
        history, _ = get_messages_for_prompt(conv_id)
        # Remove only the LAST message if it matches current user message
        # to avoid including the just-saved message in history
        if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
            history_without_current = history[:-1]
        else:
            history_without_current = history
        kg_context = get_kg_context_for_prompt(conv_id, user_message)
        chain = build_kg_chain(system_prompt)
        ai_response = run_kg_chain_safe(
            chain,
            user_message=user_message,
            history_messages=history_without_current,
            kg_context=kg_context
    )
        token_info = get_token_budget_status(system_prompt, kg_context, history_without_current)
        extra_info["kg_context"] = kg_context

    elif memory_type == "sequential":
        history, _ = get_messages_for_prompt(conv_id)
        # Remove only the LAST message if it matches current user message
        # to avoid including the just-saved message in history
        if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
            history_without_current = history[:-1]
        else:
            history_without_current = history
        result = run_sequential_chain(
            system_prompt=system_prompt,
            user_message=user_message,
            history_messages=history_without_current,
            conversation_id=conv_id
        )
        ai_response = result["response"]
        extra_info["intent"] = result["intent"]
        extra_info["entity_context"] = result["entity_context"]
        token_info = get_token_budget_status(system_prompt, "", history_without_current)

    elif memory_type == "hybrid":
        hybrid_memory = HybridMemory(conv_id)
        hybrid_context = hybrid_memory.get_memory_context(user_message)
        chain = hybrid_memory.build_chain(system_prompt, hybrid_context)
        ai_response = chain.invoke({"user_message": user_message})
        token_info = get_token_budget_status(
            system_prompt,
            "\n\n".join(
                part for part in [
                    hybrid_context.get("conversation_summary", ""),
                    hybrid_context.get("relevant_entities", ""),
                ] if part
            ),
            hybrid_context.get("recent_messages", []),
        )
        extra_info["conversation_summary"] = hybrid_context.get("conversation_summary", "")
        extra_info["relevant_entities"] = hybrid_context.get("relevant_entities", "")

    elif memory_type == "parallel":
        history, _ = get_messages_for_prompt(conv_id)
        # Remove only the LAST message if it matches current user message
        if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
            history_without_current = history[:-1]
        else:
            history_without_current = history

        result = run_parallel_chain(
            system_prompt=system_prompt,
            user_message=user_message,
            history_messages=history_without_current,
            conversation_id=conv_id
        )
        ai_response = result["response"]
        extra_info["intent"] = result.get("intent")
        extra_info["entity_context"] = result.get("entity_context")
        extra_info["chain_type"] = result.get("chain_type")
        token_info = get_token_budget_status(system_prompt, "", history_without_current)

    elif memory_type == "branching":
        history, _ = get_messages_for_prompt(conv_id)
        # Remove only the LAST message if it matches current user message
        if history and history[-1]["content"] == user_message and history[-1]["role"] == "user":
            history_without_current = history[:-1]
        else:
            history_without_current = history

        result = run_branching_chain(
            system_prompt=system_prompt,
            user_message=user_message,
            history_messages=history_without_current,
            conversation_id=conv_id
        )
        ai_response = result["response"]
        extra_info["intent"] = result.get("intent")
        extra_info["branch_taken"] = result.get("branch_taken")
        extra_info["entity_context"] = result.get("entity_context")
        extra_info["chain_type"] = result.get("chain_type")

        token_info = get_token_budget_status(system_prompt, "", history_without_current)

    else:
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        chain = build_simple_conversation_chain(system_prompt)
        ai_response = run_conversation_chain(chain, user_message, history_without_current)
        token_info = {}

    assistant_msg = save_message(conv_id, "assistant", ai_response)

    if memory_type == "entity":
        extract_entities_from_message(conv_id, ai_response, assistant_msg.id)
    elif memory_type == "kg":
        extract_triples_from_message(conv_id, ai_response, assistant_msg.id)
    elif memory_type == "sequential":
        extract_entities_from_message(conv_id, ai_response, assistant_msg.id)
        extract_triples_from_message(conv_id, ai_response, assistant_msg.id)
    elif memory_type == "hybrid":
        HybridMemory(conv_id).update_after_message(ai_response, assistant_msg.id)
    elif memory_type == "parallel":
        extract_entities_from_message(conv_id, ai_response, assistant_msg.id)
        extract_triples_from_message(conv_id, ai_response, assistant_msg.id)
    elif memory_type == "branching":
        extract_entities_from_message(conv_id, ai_response, assistant_msg.id)
        extract_triples_from_message(conv_id, ai_response, assistant_msg.id)

    # After assistant response is saved, update summary memory using the same AI response.
    try:
        if memory_type in ["summary", "sequential"]:
            updated_summary = update_summary_from_ai_response(conv_id, assistant_msg.id)
            if updated_summary:
                extra_info["summary"] = updated_summary.summary_text
    except Exception:
        logger.exception("Failed to update summary for conversation %s", conv_id)

    if conv.title == "New Chat":
        conv.title = user_message[:50] + ("..." if len(user_message) > 50 else "")
        db.session.commit()

    return jsonify({
        "response": ai_response,
        "token_info": token_info,
        "memory_type": memory_type,
        **extra_info
    })


@conversations_bp.route("/api/conversations/<int:conv_id>/message/stream", methods=["POST"])
def stream_message(conv_id):
    conv = get_owned_conversation_or_404(conv_id)
    data = request.json or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    save_message(conv_id, "user", user_message)
    if not conv.title or conv.title == "New Chat":
        conv.title = user_message[:50] + ("..." if len(user_message) > 50 else "")
        db.session.commit()
    if not conv.title or conv.title == "New Chat":
        conv.title = user_message[:50] + ("..." if len(user_message) > 50 else "")
        db.session.commit()

    system_prompt = get_system_prompt(conv.persona_id)
    memory_type = conv.memory_type
    token_info = {}
    extra_info = {}

    # Auto-switch memory if conversation gets long
    if memory_type == "buffer":
        from services.buffer_memory import get_message_count
        try:
            msg_count = get_message_count(conv_id)
            if msg_count >= 15:
                memory_type = "sequential"
                conv.memory_type = "sequential"
                db.session.commit()
                extra_info["auto_switched"] = True
                extra_info["auto_switch_reason"] = (
                    "Conversation exceeded 15 messages. Switched to Sequential chain for better memory management."
                )
        except Exception:
            logger.exception("Failed to check message count for auto-switching")

    chain = None
    stream_input = {}

    if memory_type == "buffer":
        history, removed = get_messages_for_prompt(conv_id)
        history_without_current = _trim_current_user_from_history(history, user_message)
        chain = build_simple_conversation_chain(system_prompt)
        stream_input = {
            "user_message": user_message,
            "history": format_messages_for_langchain(history_without_current),
        }
        token_info = get_token_budget_status(system_prompt, "", history_without_current)
        if removed > 0:
            token_info["truncated_messages"] = removed

    elif memory_type == "summary":
        summary, recent_msgs = get_summary_context_for_prompt(conv_id)
        recent_without_current = _trim_current_user_from_history(recent_msgs, user_message)
        if summary:
            chain = build_summary_chain(system_prompt)
            stream_input = {
                "user_message": user_message,
                "recent_history": format_messages_for_langchain(recent_without_current),
                "summary": summary,
            }
        else:
            chain = build_simple_conversation_chain(system_prompt)
            stream_input = {
                "user_message": user_message,
                "history": format_messages_for_langchain(recent_without_current),
            }
        token_info = get_token_budget_status(system_prompt, summary or "", recent_without_current)
        extra_info["summary"] = summary

    elif memory_type == "entity":
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = _trim_current_user_from_history(history, user_message)
        entity_context = get_entity_context_for_prompt(conv_id, user_message)
        chain = build_entity_chain(system_prompt)
        stream_input = {
            "user_message": user_message,
            "history": format_messages_for_langchain(history_without_current),
            "entity_context": entity_context if entity_context else "No entities tracked yet.",
        }
        token_info = get_token_budget_status(system_prompt, entity_context, history_without_current)
        extra_info["entity_context"] = entity_context

    elif memory_type == "kg":
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = _trim_current_user_from_history(history, user_message)
        kg_context = get_kg_context_for_prompt(conv_id, user_message)
        chain = build_kg_chain(system_prompt)
        stream_input = {
            "user_message": user_message,
            "history": format_messages_for_langchain(history_without_current),
            "kg_context": kg_context if kg_context else "No relationships tracked yet.",
        }
        token_info = get_token_budget_status(system_prompt, kg_context, history_without_current)
        extra_info["kg_context"] = kg_context

    elif memory_type == "sequential":
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = _trim_current_user_from_history(history, user_message)

        intent = classify_intent(user_message)
        extra_info["intent"] = intent

        entity_context = ""
        kg_context = ""
        if intent in ["question", "fact"]:
            entity_context = get_entity_context_for_prompt(conv_id, user_message)
            kg_context = get_kg_context_for_prompt(conv_id, user_message)

        if entity_context:
            chain = build_entity_chain(system_prompt)
            stream_input = {
                "user_message": user_message,
                "history": format_messages_for_langchain(history_without_current),
                "entity_context": entity_context,
            }
            extra_info["entity_context"] = entity_context
        elif kg_context:
            chain = build_kg_chain(system_prompt)
            stream_input = {
                "user_message": user_message,
                "history": format_messages_for_langchain(history_without_current),
                "kg_context": kg_context,
            }
            extra_info["kg_context"] = kg_context
        else:
            chain = build_simple_conversation_chain(system_prompt)
            stream_input = {
                "user_message": user_message,
                "history": format_messages_for_langchain(history_without_current),
            }

        token_info = get_token_budget_status(system_prompt, "", history_without_current)

    elif memory_type == "hybrid":
        hybrid_memory = HybridMemory(conv_id)
        hybrid_context = hybrid_memory.get_memory_context(user_message)
        chain = hybrid_memory.build_chain(system_prompt, hybrid_context)
        stream_input = {"user_message": user_message}
        token_info = get_token_budget_status(
            system_prompt,
            "\n\n".join(
                part for part in [
                    hybrid_context.get("conversation_summary", ""),
                    hybrid_context.get("relevant_entities", ""),
                ] if part
            ),
            hybrid_context.get("recent_messages", []),
        )
        extra_info["conversation_summary"] = hybrid_context.get("conversation_summary", "")
        extra_info["relevant_entities"] = hybrid_context.get("relevant_entities", "")

    else:
        history, _ = get_messages_for_prompt(conv_id)
        history_without_current = [m for m in history if m["content"] != user_message]
        chain = build_simple_conversation_chain(system_prompt)
        stream_input = {
            "user_message": user_message,
            "history": format_messages_for_langchain(history_without_current),
        }

    def event_stream():
        chunks = []

        try:
            yield _sse_event("thinking", {"status": "AI is thinking"})

            for piece in chain.stream(stream_input):
                text_piece = piece if isinstance(piece, str) else str(piece)
                if not text_piece:
                    continue
                chunks.append(text_piece)
                yield _sse_event("token", {"chunk": text_piece})

            ai_response = "".join(chunks).strip()
            if not ai_response:
                yield _sse_event("error", {"error": "Empty response from model"})
                return

            assistant_msg = save_message(conv_id, "assistant", ai_response)

            if memory_type == "entity":
                extract_entities_from_message(conv_id, ai_response, assistant_msg.id)
            elif memory_type == "kg":
                extract_triples_from_message(conv_id, ai_response, assistant_msg.id)
            elif memory_type == "sequential":
                extract_entities_from_message(conv_id, ai_response, assistant_msg.id)
                extract_triples_from_message(conv_id, ai_response, assistant_msg.id)
            elif memory_type == "hybrid":
                HybridMemory(conv_id).update_after_message(ai_response, assistant_msg.id)

            try:
                if memory_type in ["summary", "sequential"]:
                    updated_summary = update_summary_from_ai_response(conv_id, assistant_msg.id)
                    if updated_summary:
                        extra_info["summary"] = updated_summary.summary_text
            except Exception:
                logger.exception("Failed to update summary for conversation %s", conv_id)

            yield _sse_event("done", {
                "response": ai_response,
                "token_info": token_info,
                "memory_type": memory_type,
                **extra_info,
            })
        except GeneratorExit:
            logger.info("Client disconnected during stream for conversation %s", conv_id)
        except Exception as e:
            logger.exception("Streaming failed for conversation %s", conv_id)
            yield _sse_event("error", {"error": str(e)})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream", headers=headers)


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