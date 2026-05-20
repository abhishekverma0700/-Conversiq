from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models.database import db
from routes.conversations import conversations_bp
from routes.export import export_bp
from routes.personas import personas_bp
from routes.memory import memory_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)

    app.register_blueprint(conversations_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(personas_bp)
    app.register_blueprint(memory_bp)

    with app.app_context():
        db.create_all()
        print("Database tables ready")

    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "message": "Conversational AI Platform is running!"
        })

    return app


app = create_app()

if __name__ == "__main__":
    print("Starting server...")
    print("Health: http://localhost:5000/api/health")
    app.run(debug=Config.DEBUG, port=5000)