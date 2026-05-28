import os
import jwt
import requests
from flask import abort, current_app, g, request
from models.database import Conversation


def _get_supabase_public_keys():
    """Supabase se JWKS fetch karo ES256 verify karne ke liye."""
    try:
        project_url = os.getenv("SUPABASE_URL", "")
        if not project_url:
            return None
        jwks_url = f"{project_url}/auth/v1/.well-known/jwks.json"
        response = requests.get(jwks_url, timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return None


def get_authenticated_user_id() -> str:
    cached_user_id = getattr(g, "current_user_id", None)
    if cached_user_id:
        return cached_user_id

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        abort(401, description="Authenticated user not found")

    token = auth_header.removeprefix("Bearer ").strip()

    # Pehle HS256 try karo (legacy)
    jwt_secret = current_app.config.get("SUPABASE_JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET")
    if jwt_secret:
        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if user_id:
                g.current_user_id = user_id
                return user_id
        except jwt.PyJWTError:
            pass  # HS256 fail hua, ES256 try karenge

    # ES256 try karo (new Supabase key)
    try:
        jwks = _get_supabase_public_keys()
        if jwks:
            from jwt import PyJWKClient
            supabase_url = os.getenv("SUPABASE_URL", "")
            jwks_client = PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if user_id:
                g.current_user_id = user_id
                return user_id
    except Exception as e:
        current_app.logger.warning("ES256 verification failed: %s", e)

    abort(401, description="Authenticated user not found")


def get_owned_conversation_or_404(conv_id: int):
    user_id = get_authenticated_user_id()
    conv = Conversation.query.filter_by(id=conv_id, user_id=user_id).first()
    if not conv:
        abort(404)
    return conv