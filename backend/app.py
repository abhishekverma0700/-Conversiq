from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from sqlalchemy import inspect, text
from config import Config
import os
import json
import uuid
from models.database import db, Persona
from routes.conversations import conversations_bp
from routes.export import export_bp
from routes.personas import personas_bp
from routes.memory import memory_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["SUPABASE_JWT_SECRET"] = Config.SUPABASE_JWT_SECRET

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)

    app.register_blueprint(conversations_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(personas_bp)
    app.register_blueprint(memory_bp)

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        app.logger.warning("HTTP %s on %s: %s", error.code, request.path, error.description)
        return jsonify({"error": error.description, "status": error.code}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error):
        app.logger.exception("Unhandled error on %s", request.path)
        return jsonify({"error": "Internal server error", "status": 500}), 500

    with app.app_context():
        db.create_all()
        inspector = inspect(db.engine)
        if inspector.has_table("conversations"):
            columns = {column["name"] for column in inspector.get_columns("conversations")}
            if "user_id" not in columns:
                app.logger.warning("Adding missing conversations.user_id column")
                db.session.execute(text("ALTER TABLE conversations ADD COLUMN user_id TEXT"))
                db.session.commit()
        app.logger.info("Database tables ready")
        # Seed builtin personas from data/personas.json if table empty
        try:
            if Persona.query.count() == 0:
                json_path = os.path.join(os.path.dirname(__file__), "data", "personas.json")
                with open(json_path, "r", encoding="utf-8") as f:
                    personas = json.load(f)
                for p in personas:
                    persona = Persona(
                        id=p.get("id") or str(uuid.uuid4()),
                        name=p.get("name"),
                        description=p.get("description", ""),
                        system_prompt=p.get("system_prompt", ""),
                        memory_type=p.get("memory_type", "buffer"),
                        temperature=float(p.get("temperature", 0.7)),
                        domain=p.get("domain", "general"),
                        avatar=p.get("avatar", "🤖"),
                        is_builtin=True,
                    )
                    db.session.add(persona)
                db.session.commit()
                app.logger.info("Seeded builtin personas")
        except Exception:
            app.logger.exception("Failed to seed personas")

    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "message": "Conversational AI Platform is running!"
        })

    return app


app = create_app()

if __name__ == "__main__":
    app.logger.info("Starting server...")
    app.logger.info("Health: http://localhost:5000/api/health")
    app.run(debug=Config.DEBUG, port=5000)