from flask import Blueprint, request, jsonify
import json
import os
import uuid
from models.database import db, Persona

personas_bp = Blueprint("personas", __name__)


@personas_bp.route("/api/personas", methods=["GET"])
def list_personas():
    personas = Persona.query.order_by(Persona.name.asc()).all()
    return jsonify([p.to_dict() for p in personas])


@personas_bp.route("/api/personas", methods=["POST"])
def create_persona():
    data = request.json or {}
    if not data.get("name") or not data.get("system_prompt"):
        return jsonify({"error": "name and system_prompt required"}), 400

    persona = Persona(
        id=str(uuid.uuid4()),
        name=data["name"],
        description=data.get("description", ""),
        system_prompt=data["system_prompt"],
        memory_type=data.get("memory_type", "buffer"),
        temperature=float(data.get("temperature", 0.7)),
        domain=data.get("domain", "general"),
        avatar=data.get("avatar", "🎭"),
        is_builtin=False,
    )
    db.session.add(persona)
    db.session.commit()
    return jsonify(persona.to_dict()), 201


@personas_bp.route("/api/personas/<persona_id>", methods=["GET"])
def get_persona(persona_id):
    persona = Persona.query.get(persona_id)
    if not persona:
        return jsonify({"error": "Persona not found"}), 404
    return jsonify(persona.to_dict())


@personas_bp.route("/api/personas/<persona_id>", methods=["PUT"])
def update_persona(persona_id):
    persona = Persona.query.get(persona_id)
    if not persona:
        return jsonify({"error": "Persona not found"}), 404
    if persona.is_builtin:
        return jsonify({"error": "Cannot update builtin persona"}), 400
    data = request.json or {}
    for key in ["name", "description", "system_prompt", "memory_type", "temperature", "domain", "avatar"]:
        if key in data:
            setattr(persona, key, data[key])
    db.session.commit()
    return jsonify(persona.to_dict())


@personas_bp.route("/api/personas/<persona_id>", methods=["DELETE"])
def delete_persona(persona_id):
    persona = Persona.query.get(persona_id)
    if not persona:
        return jsonify({"error": "Persona not found"}), 404
    if persona.is_builtin:
        return jsonify({"error": "Cannot delete builtin persona"}), 400
    db.session.delete(persona)
    db.session.commit()
    return jsonify({"message": "Deleted successfully"})