from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from services.llm_client import get_chat_llm, get_precise_llm
import json


INTENT_CLASSIFICATION_PROMPT = """Classify this message into one category.

Message: {message}

Categories:
- question: user is asking something
- instruction: user wants something done
- fact: user is sharing information about themselves or others
- smalltalk: casual conversation

Return ONLY one word (question/instruction/fact/smalltalk):"""


def build_simple_conversation_chain(system_prompt: str):
    """Buffer memory chain"""
    safe_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", safe_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{user_message}")
    ])

    chain = prompt | get_chat_llm() | StrOutputParser()
    return chain


def build_summary_chain(system_prompt: str):
    """Summary memory chain"""
    safe_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    full_system = safe_prompt + """

--- Conversation Summary ---
{summary}
--- End Summary ---"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", full_system),
        MessagesPlaceholder(variable_name="recent_history"),
        ("human", "{user_message}")
    ])

    chain = prompt | get_chat_llm() | StrOutputParser()
    return chain


def build_entity_chain(system_prompt: str):
    """
    Entity memory chain
    Entity context prompt mein inject hoti hai
    """
    safe_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    full_system = safe_prompt + """

--- Known Facts ---
{entity_context}
--- End Facts ---

Use the above facts to give personalized, contextual responses."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", full_system),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{user_message}")
    ])

    chain = prompt | get_chat_llm() | StrOutputParser()
    return chain


def build_kg_chain(system_prompt: str):
    """
    Knowledge Graph memory chain
    KG relationships prompt mein inject hoti hain
    """
    safe_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    full_system = safe_prompt + """

--- Known Relationships ---
{kg_context}
--- End Relationships ---

Use these relationships to provide accurate, connected responses."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", full_system),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{user_message}")
    ])

    chain = prompt | get_chat_llm() | StrOutputParser()
    return chain


def classify_intent(user_message: str) -> str:
    """
    Sequential chain ka Step 1
    Message ka intent classify karo
    """
    llm = get_precise_llm()
    prompt = INTENT_CLASSIFICATION_PROMPT.format(message=user_message)

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        intent = response.content.strip().lower()
        if intent not in ["question", "instruction", "fact", "smalltalk"]:
            intent = "question"
        return intent
    except:
        return "question"


def format_messages_for_langchain(messages: list) -> list:
    """DB messages → LangChain format"""
    lc_messages = []
    for msg in messages:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))
    return lc_messages


def run_conversation_chain(chain, user_message: str, history_messages: list, summary: str = "", entity_context: str = "", kg_context: str = "") -> str:
    """Chain run karo"""
    lc_history = format_messages_for_langchain(history_messages)

    if summary:
        response = chain.invoke({
            "user_message": user_message,
            "recent_history": lc_history,
            "summary": summary or "No summary yet.",
        })
    elif entity_context:
        response = chain.invoke({
            "user_message": user_message,
            "history": lc_history,
            "entity_context": entity_context or "No entities tracked yet.",
        })
    elif kg_context:
        response = chain.invoke({
            "user_message": user_message,
            "history": lc_history,
            "kg_context": kg_context or "No relationships tracked yet.",
        })
    else:
        response = chain.invoke({
            "user_message": user_message,
            "history": lc_history,
        })

    return response


def run_sequential_chain(system_prompt: str, user_message: str, history_messages: list, conversation_id: int) -> dict:
    """
    Sequential Chain:
    Step 1: Intent classify karo
    Step 2: Entity context inject karo
    Step 3: Response generate karo
    Step 4: Return sab kuch
    """
    from services.entity_memory import get_entity_context_for_prompt
    from services.kg_memory import get_kg_context_for_prompt

    
    intent = classify_intent(user_message)
    print(f"Intent: {intent}")

   
    entity_context = ""
    kg_context = ""

    if intent in ["question", "fact"]:
        entity_context = get_entity_context_for_prompt(conversation_id, user_message)
        kg_context = get_kg_context_for_prompt(conversation_id, user_message)

    
    if entity_context:
        chain = build_entity_chain(system_prompt)
        response = run_conversation_chain(
            chain, user_message, history_messages,
            entity_context=entity_context
        )
    elif kg_context:
        chain = build_kg_chain(system_prompt)
        response = run_conversation_chain(
            chain, user_message, history_messages,
            kg_context=kg_context
        )
    else:
        chain = build_simple_conversation_chain(system_prompt)
        response = run_conversation_chain(
            chain, user_message, history_messages
        )

    return {
        "response": response,
        "intent": intent,
        "entity_context": entity_context,
        "kg_context": kg_context
    }