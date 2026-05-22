from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)
    title = db.Column(db.String(200), default="New Chat")
    persona_id = db.Column(db.String(50), default="general_assistant")
    memory_type = db.Column(db.String(50), default="buffer")
    is_pinned = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship("Message", backref="conversation", lazy=True, cascade="all, delete-orphan")
    summaries = db.relationship("ConversationSummary", backref="conversation", lazy=True, cascade="all, delete-orphan")
    entities = db.relationship("Entity", backref="conversation", lazy=True, cascade="all, delete-orphan")
    kg_triples = db.relationship("KGTriple", backref="conversation", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "persona_id": self.persona_id,
            "memory_type": self.memory_type,
            "is_pinned": self.is_pinned,
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "message_count": len(self.messages)
        }


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    token_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat()
        }


class ConversationSummary(db.Model):
    __tablename__ = "conversation_summaries"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False)
    summary_text = db.Column(db.Text, nullable=False)
    messages_covered = db.Column(db.Integer, default=0)
    token_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "summary_text": self.summary_text,
            "messages_covered": self.messages_covered,
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat()
        }


class Entity(db.Model):
    __tablename__ = "entities"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    entity_type = db.Column(db.String(50), default="general")
    description = db.Column(db.Text, default="")
    source_message_id = db.Column(db.Integer, db.ForeignKey("messages.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "name": self.name,
            "entity_type": self.entity_type,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class KGTriple(db.Model):
    __tablename__ = "kg_triples"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    predicate = db.Column(db.String(200), nullable=False)
    object = db.Column(db.String(200), nullable=False)
    source_message_id = db.Column(db.Integer, db.ForeignKey("messages.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "subject": self.subject,
            "predicate": self.predicate,
            "object": self.object,
            "created_at": self.created_at.isoformat()
        }
    