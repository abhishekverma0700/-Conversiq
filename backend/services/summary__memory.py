from models.database import db,Message,ConversationSummary
from services.context_manager import count_tokens, should_trigger_summarization
from services.llm_client import get_precise_llm
from config import Config
from langchain_core.messages import HumanMessage, SystemMessage

SUMMARY_PROMPT='''You are a conversation summarizer.
Summarize the following converstion concisely but compltely.
Preserve all important facts,decion,names,dates and key information,
Write in thrid person.Be specific-don't say "they disscussed X',say what was actually said a bout X.
Converstion to summarize:
{converstion}
Write a dense,factual summary in 3-5 senctences:'''

def get_latest_summary(conversation_id:int)->ConversationSummary |None:
    '''GET THE LATEST SUMMARY FOR A CONVERSATION'''
    return ConversationSummary.query.filter_by(
        conversation_id=conversation_id
    ).order_by(ConversationSummary.created_at.desc()).first()
def create_summary(conversation_id:int,messages_to_summarize:list[dict])->ConversationSummary:
    '''Create a new summary for the given messages and save it to the database'''
    conv_text=""
    for msg in messages_to_summarize:
        role="User" if msg['role']=="user"else "Assistant"
        conv_text +=f'{role}:{msg['content']}\n\n'
    llm=get_precise_llm()
    prompt=SUMMARY_PROMPT.format(conversation=conv_text)
    response=llm.invoke([HumanMessage(content=prompt)])
    summary_text=response.content.strip()
    summary=ConversationSummary(
        conversaton_id=conversation_id,
        summary_text=summary_text,
        mesages_covered=len(messages_to_summarize),
        token_count=count_tokens(summary_text)
    )
    db.session.add(summary)
    db.session.commit()
    return summary
def get_summary_context_for_prompt(conversation_id:int)->tuple[str,list[dict]]:
    '''Get the summary text and recent messages to include in the prompt context'''
    all_messages=Message.query.filter_by(
        conversation_id=conversation_id
    ).order_by(Message.created_at.asc()).all()
    if not all_messages:
        return "",[]
    msgs_as_dicts=[{'role':m.role,'content':m.content}for m in all_messages]
    if should_trigger_summarization(msgs_as_dicts):
        n_recent=Config.SUMMARY_INTERVAL
        to_summarize=msgs_as_dicts[:-n_recent] if len(msgs_as_dicts)>n_recent else[]
        recent_messages=msgs_as_dicts[-n_recent:]

        if to_summarize:
            existing_summary=get_latest_summary(conversation_id)
            if existing_summary:
                combined=[{'role':'assistent','content':f"[Pevious summary]:{existing_summary.summary_text}"}]
                combined.extend(to_summarize)
                to_summarize=combined
            create_summary(conversation_id,to_summarize)
        else:
            recent_messages=msgs_as_dicts
        latest_summary=get_latest_summary(conversation_id)
        summary_text=latest_summary.summary_text if latest_summary else""
        return summary_text,recent_messages

            