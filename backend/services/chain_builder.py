import logging

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from services.llm_client import get_chat_llm, get_precise_llm


logger = logging.getLogger(__name__)


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
    return prompt | get_chat_llm() | StrOutputParser()


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
    return prompt | get_chat_llm() | StrOutputParser()


def build_entity_chain(system_prompt: str):
    """Entity memory chain"""
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
    return prompt | get_chat_llm() | StrOutputParser()


def build_kg_chain(system_prompt: str):
    """KG memory chain"""
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
    return prompt | get_chat_llm() | StrOutputParser()


def classify_intent(user_message: str) -> str:
    """Classify the message intent."""
    llm = get_precise_llm()
    prompt = INTENT_CLASSIFICATION_PROMPT.format(message=user_message)
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        intent = response.content.strip().lower()
        if intent not in ["question", "instruction", "fact", "smalltalk"]:
            intent = "question"
        return intent
    except Exception as e:
        logger.warning("Intent classification failed: %s", e)
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


def run_conversation_chain(
    chain,
    user_message: str,
    history_messages: list,
    summary: str = "",
    entity_context: str = "",
    kg_context: str = ""
) -> str:
    """Run the chain and pass the correct variables based on the type."""
    lc_history = format_messages_for_langchain(history_messages)

    if summary:
        return chain.invoke({
            "user_message": user_message,
            "recent_history": lc_history,
            "summary": summary,
        })
    elif entity_context:
        return chain.invoke({
            "user_message": user_message,
            "history": lc_history,
            "entity_context": entity_context,
        })
    elif kg_context:
        return chain.invoke({
            "user_message": user_message,
            "history": lc_history,
            "kg_context": kg_context,
        })
    else:
        return chain.invoke({
            "user_message": user_message,
            "history": lc_history,
        })


def run_entity_chain_safe(chain, user_message: str, history_messages: list, entity_context: str) -> str:
    """Entity chain — safe when the context is empty"""
    lc_history = format_messages_for_langchain(history_messages)
    return chain.invoke({
        "user_message": user_message,
        "history": lc_history,
        "entity_context": entity_context if entity_context else "No entities tracked yet.",
    })


def run_kg_chain_safe(chain, user_message: str, history_messages: list, kg_context: str) -> str:
    """KG chain — safe when the context is empty"""
    lc_history = format_messages_for_langchain(history_messages)
    return chain.invoke({
        "user_message": user_message,
        "history": lc_history,
        "kg_context": kg_context if kg_context else "No relationships tracked yet.",
    })


def run_sequential_chain(
    system_prompt: str,
    user_message: str,
    history_messages: list,
    conversation_id: int
) -> dict:
    """
    Sequential Chain:
    Step 1: Classify intent
    Step 2: Fetch context
    Step 3: Generate response
    """
    from services.entity_memory import get_entity_context_for_prompt
    from services.kg_memory import get_kg_context_for_prompt

    intent = classify_intent(user_message)
    logger.info("Intent: %s", intent)

    entity_context = ""
    kg_context = ""

    if intent in ["question", "fact"]:
        entity_context = get_entity_context_for_prompt(conversation_id, user_message)
        kg_context = get_kg_context_for_prompt(conversation_id, user_message)

    if entity_context:
        chain = build_entity_chain(system_prompt)
        response = run_entity_chain_safe(chain, user_message, history_messages, entity_context)
    elif kg_context:
        chain = build_kg_chain(system_prompt)
        response = run_kg_chain_safe(chain, user_message, history_messages, kg_context)
    else:
        chain = build_simple_conversation_chain(system_prompt)
        response = run_conversation_chain(chain, user_message, history_messages)

    return {
        "response": response,
        "intent": intent,
        "entity_context": entity_context,
        "kg_context": kg_context
    }


from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda, RunnableBranch


def run_parallel_chain(
    system_prompt: str,
    user_message: str,
    history_messages: list,
    conversation_id: int
) -> dict:
    """
    Parallel Chain using LCEL RunnableParallel:
    Simultaneously runs:
    1. Response generation
    2. Intent classification
    Both run at the same time, then results are merged.
    Entity extraction and KG update happen after.
    """
    from services.entity_memory import get_entity_context_for_prompt
    from services.kg_memory import get_kg_context_for_prompt

    # Get context first
    entity_context = get_entity_context_for_prompt(conversation_id, user_message)
    kg_context = get_kg_context_for_prompt(conversation_id, user_message)

    # Build chains
    if entity_context:
        response_chain = build_entity_chain(system_prompt)
    elif kg_context:
        response_chain = build_kg_chain(system_prompt)
    else:
        response_chain = build_simple_conversation_chain(system_prompt)

    lc_history = format_messages_for_langchain(history_messages)

    # LCEL RunnableParallel — run response + intent simultaneously
    parallel_chain = RunnableParallel(
        response=RunnableLambda(lambda x: run_entity_chain_safe(
            response_chain,
            x["user_message"],
            lc_history,
            entity_context
        ) if entity_context else run_conversation_chain(
            response_chain,
            x["user_message"],
            lc_history,
            kg_context=kg_context
        )),
        intent=RunnableLambda(lambda x: classify_intent(x["user_message"]))
    )

    result = parallel_chain.invoke({"user_message": user_message})

    return {
        "response": result["response"],
        "intent": result["intent"],
        "entity_context": entity_context,
        "kg_context": kg_context,
        "chain_type": "parallel"
    }


def run_branching_chain(
    system_prompt: str,
    user_message: str,
    history_messages: list,
    conversation_id: int
) -> dict:
    """
    Branching/Router Chain using LCEL RunnableBranch:
    Routes to different chains based on message intent:
    - question/fact → entity chain (fact recall)
    - instruction → kg chain (relationship context)
    - smalltalk → simple chain (minimal context)
    """
    from services.entity_memory import get_entity_context_for_prompt
    from services.kg_memory import get_kg_context_for_prompt

    # Step 1: Classify intent
    intent = classify_intent(user_message)

    # Step 2: Get context
    entity_context = get_entity_context_for_prompt(conversation_id, user_message)
    kg_context = get_kg_context_for_prompt(conversation_id, user_message)

    # Step 3: Route based on intent using RunnableBranch
    branching_chain = RunnableBranch(
        # Branch 1: question or fact → use entity chain
        (
            lambda x: x["intent"] in ["question", "fact"],
            RunnableLambda(lambda x: run_entity_chain_safe(
                build_entity_chain(system_prompt),
                x["user_message"],
                history_messages,
                entity_context or "No entities yet."
            ))
        ),
        # Branch 2: instruction → use KG chain
        (
            lambda x: x["intent"] == "instruction",
            RunnableLambda(lambda x: run_kg_chain_safe(
                build_kg_chain(system_prompt),
                x["user_message"],
                history_messages,
                kg_context or "No relationships yet."
            ))
        ),
        # Default: smalltalk → simple chain with minimal context
        RunnableLambda(lambda x: run_conversation_chain(
            build_simple_conversation_chain(system_prompt),
            x["user_message"],
            history_messages
        ))
    )

    result = branching_chain.invoke({
        "intent": intent,
        "user_message": user_message
    })

    return {
        "response": result,
        "intent": intent,
        "branch_taken": (
            "entity" if intent in ["question", "fact"]
            else "kg" if intent == "instruction"
            else "simple"
        ),
        "entity_context": entity_context,
        "kg_context": kg_context,
        "chain_type": "branching"
    }