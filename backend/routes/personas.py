from flask import Blueprint, request, jsonify
import json
import os
import uuid

personas_bp = Blueprint("personas", __name__)

# JSON file se load karo
def load_personas():
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "personas.json")
    with open(json_path, "r") as f:
        return json.load(f)

BUILTIN_PERSONAS = load_personas()
custom_personas = []


@personas_bp.route("/api/personas", methods=["GET"])
def list_personas():
    return jsonify(BUILTIN_PERSONAS + custom_personas)


@personas_bp.route("/api/personas", methods=["POST"])
def create_persona():
    data = request.json or {}
    if not data.get("name") or not data.get("system_prompt"):
        return jsonify({"error": "name and system_prompt required"}), 400

    new_persona = {
        "id": str(uuid.uuid4()),
        "name": data["name"],
        "description": data.get("description", ""),
        "system_prompt": data["system_prompt"],
        "memory_type": data.get("memory_type", "buffer"),
        "temperature": data.get("temperature", 0.7),
        "domain": data.get("domain", "general"),
        "is_builtin": False,
        "avatar": data.get("avatar", "🎭")
    }
    custom_personas.append(new_persona)
    return jsonify(new_persona), 201


@personas_bp.route("/api/personas/<persona_id>", methods=["GET"])
def get_persona(persona_id):
    all_personas = BUILTIN_PERSONAS + custom_personas
    persona = next((p for p in all_personas if p["id"] == persona_id), None)
    if not persona:
        return jsonify({"error": "Persona not found"}), 404
    return jsonify(persona)


@personas_bp.route("/api/personas/<persona_id>", methods=["PUT"])
def update_persona(persona_id):
    persona = next((p for p in custom_personas if p["id"] == persona_id), None)
    if not persona:
        return jsonify({"error": "Cannot update builtin persona"}), 404
    data = request.json or {}
    persona.update({k: v for k, v in data.items() if k != "id"})
    return jsonify(persona)


@personas_bp.route("/api/personas/<persona_id>", methods=["DELETE"])
def delete_persona(persona_id):
    global custom_personas
    builtin_ids = [p["id"] for p in BUILTIN_PERSONAS]
    if persona_id in builtin_ids:
        return jsonify({"error": "Cannot delete builtin persona"}), 400
    custom_personas = [p for p in custom_personas if p["id"] != persona_id]
    return jsonify({"message": "Deleted successfully"})