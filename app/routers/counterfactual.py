# app/routers/counterfactual.py
"""
Counterfactual Engine endpoint — Monte Carlo simulation.

Endpoints:
    GET /counterfactual/simulate — ΔxG for alternative action
"""
from fastapi import APIRouter, HTTPException, Query

import app.main as main

router = APIRouter(tags=["counterfactual"])

# Valid actions for counterfactual simulation
VALID_ACTIONS = ("pass", "shoot", "dribble", "cross", "through_ball")


@router.get("/counterfactual/simulate")
def counterfactual_simulate(
    match_id: int,
    event_id: str,
    alternative: str = Query("pass", description="pass, shoot, dribble, cross, through_ball")
):
    from app.services.counterfactual import monte_carlo_simulate

    if alternative not in VALID_ACTIONS:
        raise HTTPException(
            422,
            f"Invalid alternative '{alternative}'. Must be one of: {', '.join(VALID_ACTIONS)}",
        )

    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")

    try:
        row = main.EVENTS_DF.loc[event_id]
        context = row.to_dict()
    except KeyError:
        raise HTTPException(404, f"Event {event_id} not found.")

    shot = context.get('shot', {})
    if isinstance(shot, dict):
        original_xg = shot.get('statsbomb_xg', 0.1)
    else:
        original_xg = 0.1

    event_context = {
        'shot_xg': float(original_xg) if original_xg else 0.1,
        'location': context.get('location', [60, 40]),
        'event_type': main.get_event_type_name(context),
        'event_id': event_id,
    }

    # Simulate original using its actual action type, not always 'shoot'
    event_type_raw = (main.get_event_type_name(context) or '').lower()
    original_action = 'shoot' if event_type_raw == 'shot' else event_type_raw
    if original_action not in VALID_ACTIONS:
        original_action = 'shoot'

    original_result = monte_carlo_simulate(event_context, original_action, n=1000)
    alternative_result = monte_carlo_simulate(event_context, alternative, n=1000)

    delta = alternative_result['mean_xg'] - original_result['mean_xg']

    return {
        'match_id': match_id,
        'event_id': event_id,
        'original': {
            'action': original_action,
            'mean_xg': original_result['mean_xg'],
            'probability_goal': original_result['probability_goal'],
        },
        'alternative': {
            'action': alternative,
            'mean_xg': alternative_result['mean_xg'],
            'probability_goal': alternative_result['probability_goal'],
        },
        'delta_xg': round(delta, 3),
        'delta_percent': round(delta / max(original_result['mean_xg'], 0.01) * 100, 1),
        'simulation_details': alternative_result,
        'message': f"If '{alternative}' was chosen, ΔxG = {delta:+.3f}",
    }