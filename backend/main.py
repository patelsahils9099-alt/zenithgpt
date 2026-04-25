from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

class SaveChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    title: str
    messages: list
    mode: str = "general"
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    error: Optional[str] = None

    conversation_id: Optional[str] = None
    title: str
    messages: list
    mode: str = "general"class SaveChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    title: str
    messages: list
    mode: str = "general"

class UpdateChatRequest(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None

@app.get("/")
def read_root():
    return {"message": "ZenithGPT Backend API"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        system_prompts = {
            "general": "You are ZenithGPT, a helpful AI assistant.",
            "health": "You are a medical expert AI. Always remind users to consult a doctor.",
            "code": "You are an expert programmer.",
            "writing": "You are an expert writer.",
            "data": "You are a data science expert."
        }
        system_message = system_prompts.get(request.mode, system_prompts["general"])
        messages = [{"role": "system", "content": system_message}]
        messages.extend(request.history)
        messages.append({"role": "user", "content": request.message})
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1024
        )
        reply = response.choices[0].message.content
        return ChatResponse(reply=reply)
    except Exception as e:
        return ChatResponse(reply="", error=str(e))

@app.post("/save-chat")
async def save_chat(request: SaveChatRequest):
    try:
        if request.conversation_id:
            result = supabase.table("conversations").update({
                "messages": request.messages,
                "title": request.title,
                "mode": request.mode
            }).eq("id", request.conversation_id).execute()
                    result = supabase.table("conversations").insert({
                "title": request.title,
                "messages": request.messages,
                "mode": request.mode
            }).execute()else:
            result = supabase.table("conversations").insert({
                "title": request.title,
                "messages": request.messages,
                "mode": request.mode,
                "user_id": request.user_id
            }).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def get_conversations():
    try:
        result = supabase.table("conversations").select("*").order("updated_at", desc=True).execute()
        return {"conversations": result.data}
    except Exception as e:
        return {"conversations": [], "error": str(e)}@app.get("/conversations")
async def get_conversations():
    try:
        query = supabase.table("conversations").select("*").order("updated_at", desc=True)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return {"conversations": result.data}
    except Exception as e:
        return {"conversations": [], "error": str(e)}

@app.patch("/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, request: UpdateChatRequest):
    try:
        updates = {}
        if request.title is not None:
            updates["title"] = request.title
        if request.pinned is not None:
            updates["pinned"] = request.pinned
        if request.archived is not None:
            updates["archived"] = request.archived
        supabase.table("conversations").update(updates).eq("id", conversation_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    try:
        supabase.table("conversations").delete().eq("id", conversation_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/delete-account/{user_id}")
async def delete_account(user_id: str):
    try:
        supabase.table("conversations").delete().eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
