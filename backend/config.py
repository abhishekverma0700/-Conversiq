import os
from dotenv import load_dotenv
load_dotenv()
class Config:
    SECRET_KEY=os.getenv("FLASK_SECRET_KEY","dev-secret-key")
    DEBUG=os.getenv("FLASK_DEBUG","True")=="True"
    SUPABASE_JWT_SECRET=os.getenv("SUPABASE_JWT_SECRET")

    SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL","sqlite:///conversional_ai.db")
    SQLALCHEMY_TRACK_MODIFICATIONS=False

    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    SUMMARY_INTERVAL=int(os.getenv("SUMMARY_INTENRVAL",5))
    MAX_BUFFER_MESSAGES=int(os.getenv("MAX_BUFFER_MESSAGES",20))

    TOKEN_BUDGET=int(os.getenv("TOKEN_BUDGET",4000))
    TOKEN_SYSTEM_PROMPT=500
    TOKEN_MEMORY=1000
    TOKEN_RECENT_MSGS=1500
    TOKEN_GENERATION=1000
