from flask import Blueprint, request, jsonify
from models.database import db

personas_bp = Blueprint("personas", __name__)


BUILTIN_PERSONAS = [
    {
        "id": "general_assistant",
        "name": "General Assistant",
        "description": "Helpful all-purpose assistant",
        "system_prompt": "You are a helpful, friendly AI assistant. Remember everything the user tells you.",
        "memory_type": "buffer",
        "temperature": 0.7,
        "domain": "general",
        "is_builtin": True,
        "avatar": "🤖"
    },
    {
        "id": "code_helper",
        "name": "Code Helper",
        "description": "Expert programming assistant",
        "system_prompt": "You are an expert programming assistant. Track all code snippets, function names, file names, and technical decisions. Always reference previous code when relevant.",
        "memory_type": "entity",
        "temperature": 0.3,
        "domain": "technical",
        "is_builtin": True,
        "avatar": "💻"
    },
    {
        "id": "creative_writer",
        "name": "Creative Writer",
        "description": "Imaginative writing partner",
        "system_prompt": "You are a creative writing partner. Track all characters, plot points, settings, and story elements. Build a rich narrative world together.",
        "memory_type": "kg",
        "temperature": 0.9,
        "domain": "creative",
        "is_builtin": True,
        "avatar": "✍️"
    },
    {
        "id": "business_analyst",
        "name": "Business Analyst",
        "description": "Professional business insights",
        "system_prompt": "You are a professional business analyst. Track all metrics, KPIs, project names, team members, and deadlines. Provide structured, data-driven insights.",
        "memory_type": "summary",
        "temperature": 0.4,
        "domain": "business",
        "is_builtin": True,
        "avatar": "📊"
    },
    {
        "id": "study_buddy",
        "name": "Study Buddy",
        "description": "Patient educational tutor",
        "system_prompt": "You are a patient, encouraging tutor. Build concept maps from topics discussed. Connect new concepts to previously learned material.",
        "memory_type": "kg",
        "temperature": 0.6,
        "domain": "educational",
        "is_builtin": True,
        "avatar": "📚"
    }
]

custom_personas = []



@personas_bp.route("/api/personas", methods=["GET"])
def list_personas():
    all_personas = BUILTIN_PERSONAS + custom_personas
    return jsonify(all_personas)



@personas_bp.route("/api/personas", methods=["POST"])
def create_persona():
    data = request.json or {}

    if not data.get("name") or not data.get("system_prompt"):
        return jsonify({"error": "name and system_prompt are required"}), 400

    import uuid
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
        return jsonify({"error": "Persona not found or is builtin"}), 404

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