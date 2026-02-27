import sys
import types

if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # Block aiodns on Windows - it fails to resolve DNS.
    # aiohttp checks: if aiodns.DNSResolver is None → use ThreadedResolver
    # So we create a fake aiodns module with DNSResolver = None
    _fake_aiodns = types.ModuleType('aiodns')
    _fake_aiodns.DNSResolver = None
    sys.modules['aiodns'] = _fake_aiodns

# NOW import everything else below this block
import logging
import os
import uuid
import httpx
from typing import Dict
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from getstream import Stream
from vision_agents.core import Agent, AgentLauncher, User, Runner
from vision_agents.plugins import getstream, gemini, moondream

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

THREATS = [
    "kitchen knife or blade weapon", 
    "person fallen on ground", 
    "fire or flames", 
    "gun or pistol", 
    "unattended bag or backpack"
]

# ── FastAPI app ──────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class JoinRequest(BaseModel):
    user_id: str = "operator-1"
    user_name: str = "Security Operator"

@app.post("/api/join")
async def join_call_endpoint(req: JoinRequest):
    api_key = os.getenv("STREAM_API_KEY")
    api_secret = os.getenv("STREAM_API_SECRET")

    stream_client = Stream(api_key=api_key, api_secret=api_secret)
    call_id = f"sentinel-{uuid.uuid4().hex[:8]}"

    # Create the call
    call = stream_client.video.call("default", call_id)
    call.get_or_create(data={"created_by_id": req.user_id})

    # Generate token for the frontend user
    token = stream_client.create_token(req.user_id)

    # Tell Vision Agent server to join this call
    # The correct endpoint is /sessions (Vision Agents v0.3 HTTP API)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://localhost:8001/sessions",
                json={"call_type": "default", "call_id": call_id},
                timeout=10.0,
            )
            logger.info(f"[SentinelAI] Agent session started: {resp.status_code}")
    except Exception as e:
        logger.warning(f"[SentinelAI] Could not start agent session: {e}")

    return {
        "call_id": call_id,
        "call_type": "default",
        "token": token,
        "api_key": api_key,
        "user_id": req.user_id,
        "user_name": req.user_name,
    }

@app.get("/api/threats")
async def get_threats():
    return {"threats": THREATS}

# Serve React frontend
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

    @app.get("/")
    async def serve_frontend():
        return FileResponse("frontend/dist/index.html")


# ── Vision Agent ─────────────────────────────────────────────
# Shared queue to pass detections from processor to agent
_detection_queue: asyncio.Queue = asyncio.Queue()

class ThreatAlertProcessor(moondream.CloudDetectionProcessor):
    """Subclass that fires alerts into the detection queue when threats are found."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._last_alerted: Dict[str, float] = {}
        self._alert_cooldown = 15.0  # seconds between same-threat alerts

    async def _process_and_add_frame(self, frame):
        await super()._process_and_add_frame(frame)
        detections = self._last_results.get("detections", [])
        now = asyncio.get_event_loop().time()
        for det in detections:
            label = det.get("label", "")
            conf = det.get("confidence", 0)
            if conf >= self.conf_threshold:
                last = self._last_alerted.get(label, 0)
                if now - last > self._alert_cooldown:
                    self._last_alerted[label] = now
                    await _detection_queue.put(label)
                    logger.info(f"[SentinelAI] 🚨 QUEUED ALERT: {label} ({conf:.2f})")


async def create_agent(**kwargs) -> Agent:
    async def on_threat_detected(detections):
        """Called by Moondream when objects are detected."""
        for det in detections:
            label = det.get("label", "unknown")
            conf = det.get("confidence", 0)
            if conf >= 0.35:
                logger.info(f"[SentinelAI] 🚨 THREAT: {label} ({conf:.2f})")

    return Agent(
        edge=getstream.Edge(),
        agent_user=User(name="SentinelAI", id="sentinel-agent"),
        instructions="""You are SentinelAI, a real-time AI security surveillance system.
You are watching a live camera feed.

CRITICAL RULES:
1. You MUST watch the video continuously.
2. The moment you see a knife, gun, fire, fallen person, or unattended bag 
   in the video — immediately say "ALERT! [threat] detected!" out loud.
3. Do not wait to be asked. Announce threats automatically and immediately.
4. Keep alerts short: under 8 words.
5. If someone talks to you, respond briefly, then go back to monitoring.

Start by saying exactly: "SentinelAI online. I am your AI security guardian, monitoring this feed in real-time. Stay safe."
""",
        llm=gemini.Realtime(fps=2),
        processors=[
            ThreatAlertProcessor(
                detect_objects=THREATS,
                conf_threshold=0.65,
                fps=4,
            )
        ],
    )

async def join_vision_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    try:
        logger.info(f"[SentinelAI] 🟢 Joining call: {call_id}")
        call = agent.edge.client.video.call(call_type, call_id)
        async with agent.join(call):
            logger.info(f"[SentinelAI] 👁 Moondream active. Watching: {THREATS}")
            # Keep alive + process threat alerts
            while True:
                try:
                    label = await asyncio.wait_for(
                        _detection_queue.get(), timeout=30.0
                    )
                    msg = f"ALERT! {label} detected! Say this out loud urgently."
                    await agent.say(f"ALERT! {label} detected!")
                    logger.info(f"[SentinelAI] 🔊 Alert sent: {label}")
                except asyncio.TimeoutError:
                    # Send keep-alive ping every 30s to prevent idle timeout
                    await agent.say("Monitoring.")
    except asyncio.CancelledError:
        logger.info("[SentinelAI] Session ended.")
    except Exception as e:
        logger.warning(f"[SentinelAI] Session dropped ({e}), will retry on next /sessions call.")

if __name__ == "__main__":
    import sys as _sys
    if len(_sys.argv) > 1 and _sys.argv[1] == "serve":
        # Parse port argument manually
        port = 8001
        for i, arg in enumerate(_sys.argv):
            if arg == "--port" and i + 1 < len(_sys.argv):
                port = int(_sys.argv[i + 1])
        
        # Create runner and launch uvicorn with explicit asyncio loop
        # This forces SelectorEventLoop on Windows, fixing aiodns DNS resolution
        launcher = AgentLauncher(create_agent=create_agent, join_call=join_vision_call)
        runner = Runner(launcher)
        import uvicorn as _uvicorn
        _uvicorn.run(runner.fast_api, host="127.0.0.1", port=port, loop="asyncio")
    else:
        Runner(AgentLauncher(create_agent=create_agent, join_call=join_vision_call)).cli()

# Serve React frontend
frontend_build = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_build):
    app.mount("/", StaticFiles(directory=frontend_build, html=True), name="frontend")
