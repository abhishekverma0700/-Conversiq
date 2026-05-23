import os

import jwt
from flask import abort, current_app, g, request

from models.database import Conversation


def get_authenticated_user_id() -> str:
    cached_user_id = getattr(g, "current_user_id", None)
    if cached_user_id:
        return cached_user_id

    jwt_secret = current_app.config.get("SUPABASE_JWT_SECRET") or os.getenv(
        "SUPABASE_JWT_SECRET"
    )

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer ") and jwt_secret:
        token = auth_header.removeprefix("Bearer ").strip()

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except jwt.PyJWTError:
            current_app.logger.warning("Invalid Supabase access token on %s", request.path)
        else:
            user_id = payload.get("sub")
            if user_id:
                g.current_user_id = user_id
                return user_id
            current_app.logger.warning("Supabase access token missing sub claim on %s", request.path)

    fallback_user_id = (request.headers.get("X-User-Id") or "").strip()
    if fallback_user_id:
        current_app.logger.warning("Using X-User-Id fallback for %s", request.path)
        g.current_user_id = fallback_user_id
        return fallback_user_id

    if not jwt_secret:
        current_app.logger.error("SUPABASE_JWT_SECRET is not configured and no X-User-Id fallback was provided")

    abort(401, description="Authenticated user not found")


def get_owned_conversation_or_404(conv_id: int):
    user_id = get_authenticated_user_id()
    conv = Conversation.query.filter_by(id=conv_id, user_id=user_id).first()
    if not conv:
        abort(404)
    return conv