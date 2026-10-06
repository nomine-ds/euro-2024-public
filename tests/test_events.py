import pandas as pd

import app.main as main
from app.routers.events import avg_position


def test_avg_position_uses_player_event_locations(monkeypatch):
    monkeypatch.setattr(
        main,
        "EVENTS_DF",
        pd.DataFrame(
            [
                {"match_id": 1, "player": {"id": 42}, "location": [10, 20]},
                {"match_id": 1, "player": {"id": 42}, "location": [30, 40]},
                {"match_id": 1, "player": {"id": 99}, "location": [80, 60]},
                {"match_id": 2, "player": {"id": 42}, "location": [100, 70]},
                {"match_id": 1, "player": {"id": 42}, "location": [float("nan"), 20]},
            ]
        ),
    )

    assert avg_position(player_id=42, match_id=1) == {
        "found": True,
        "player_id": 42,
        "match_id": 1,
        "avg_x": 20.0,
        "avg_y": 30.0,
        "samples": 2,
    }
