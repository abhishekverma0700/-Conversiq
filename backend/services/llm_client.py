from langchain_groq import ChatGroq
from config import Config


def get_llm(temperature: float = 0.7):
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=Config.GROQ_API_KEY,
        temperature=temperature,
    )


def get_precise_llm():
    return get_llm(temperature=0.0)


def get_chat_llm():
    return get_llm(temperature=0.7)


def get_streaming_llm():
    from langchain_groq import ChatGroq
    import os

    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        streaming=True
    )