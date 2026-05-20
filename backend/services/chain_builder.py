from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from services.llm_client import get_chat_llm


def build_simple_conversation_chain(system_prompt: str):
    
    safe_system_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", safe_system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{user_message}")
    ])

    llm = get_chat_llm()
    parser = StrOutputParser()

    chain = prompt | llm | parser
    return chain


def build_summary_chain(system_prompt: str):
    safe_system_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    full_system = safe_system_prompt + """

--- Conversation Summary So Far ---
{summary}
--- End Summary ---

Use the above summary as context."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", full_system),
        MessagesPlaceholder(variable_name="recent_history"),
        ("human", "{user_message}")
    ])

    llm = get_chat_llm()
    parser = StrOutputParser()

    chain = prompt | llm | parser
    return chain


def format_messages_for_langchain(messages: list) -> list:
    lc_messages = []
    for msg in messages:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))
    return lc_messages


def run_conversation_chain(chain, user_message: str, history_messages: list, summary: str = "", extra_context: str = "") -> str:
    lc_history = format_messages_for_langchain(history_messages)

    if summary:
        response = chain.invoke({
            "user_message": user_message,
            "recent_history": lc_history,
            "summary": summary or "No summary yet.",
        })
    else:
        response = chain.invoke({
            "user_message": user_message,
            "history": lc_history,
        })

    return response