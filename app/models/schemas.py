from typing import List, Optional
from pydantic import BaseModel

class PlayerPosition(BaseModel):
    player_id: int
    player_name: str
    x: float
    y: float
    teammate: bool
    jersey: Optional[int] = 0

class FreezeFrameResponse(BaseModel):
    event_id: str
    match_id: int
    timestamp: int
    period: int
    ball_x: float
    ball_y: float
    possession_team: List[PlayerPosition]
    opponent_team: List[PlayerPosition]