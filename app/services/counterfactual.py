# app/services/counterfactual.py
"""
Counterfactual Engine — simple heuristic-based version.

Estimates ΔxG from alternative actions using a heuristic model,
not causal ML. For production, replace with causalml/econml.
"""
from random import Random
from typing import Dict


def estimate_xg_alternative(event_context: Dict, alternative_action: str) -> float:
    """
    Estimate xG from an alternative action based on event context.

    Args:
        event_context: dict with keys 'shot_xg', 'location', 'event_type'
        alternative_action: 'pass' | 'shoot' | 'dribble' | 'cross' | 'through_ball'

    Returns:
        float between 0.0 and 1.0
    """
    original_xg = event_context.get('shot_xg', 0.1)
    loc = event_context.get('location')
    if not isinstance(loc, list) or len(loc) < 2:
        loc = [60.0, 40.0]
    try:
        x = float(loc[0])
        y = float(loc[1])
    except (TypeError, ValueError):
        x, y = 60.0, 40.0

    distance_to_goal = ((x - 120) ** 2 + (y - 40) ** 2) ** 0.5
    distance_factor = max(0.1, 1 - distance_to_goal / 100)

    alternatives = {
        'pass': original_xg * 0.7 + 0.05,
        'shoot': original_xg * 1.1,
        'dribble': original_xg * 0.9 + 0.03,
        'cross': original_xg * 0.85 + 0.04,
        'through_ball': original_xg * 1.3 + distance_factor * 0.1,
    }

    base = alternatives.get(alternative_action, original_xg)
    return max(0.0, min(base, 1.0))


def monte_carlo_simulate(
    event_context: Dict,
    alternative_action: str,
    n: int = 1000
) -> Dict:
    """Monte Carlo simulation for alternative action xG distribution."""
    base_xg = estimate_xg_alternative(event_context, alternative_action)

    # Deterministic seed for reproducible analytics across page refreshes
    seed_input = f"{event_context.get('event_id', '')}-{alternative_action}-{event_context.get('shot_xg', 0)}"
    rng = Random(hash(seed_input))

    samples = []
    for _ in range(n):
        noise = rng.gauss(0, 0.03)
        samples.append(max(0.0, min(base_xg + noise, 1.0)))

    samples.sort()
    mean = sum(samples) / len(samples)
    variance = sum((x - mean) ** 2 for x in samples) / len(samples)
    std = variance ** 0.5

    # In StatsBomb model, xG is already P(goal). So probability_goal = mean_xg.
    return {
        'base_xg': round(base_xg, 3),
        'mean_xg': round(mean, 3),
        'std_xg': round(std, 3),
        'percentile_25': round(samples[int(n * 0.25)], 3),
        'percentile_75': round(samples[int(n * 0.75)], 3),
        'probability_goal': round(mean, 3),
        'n_simulations': n,
    }