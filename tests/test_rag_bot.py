from unittest.mock import Mock

import pytest

from app.services.rag_bot import QueryAnalyzer, VectorStore


@pytest.mark.parametrize(
    ("query", "first_team", "second_team", "scorer"),
    [
        (
            "Which players scored goals for Germany against Scotland?",
            "Germany",
            "Scotland",
            "Jamal Musiala",
        ),
        (
            "Who scored goals for Switzerland against Hungary?",
            "Switzerland",
            "Hungary",
            "Kwadwo Duah",
        ),
        (
            "Who scored goals for Spain against Croatia?",
            "Spain",
            "Croatia",
            "Álvaro Morata",
        ),
    ],
)
def test_goal_search_retrieves_only_goal_events_for_match(
    query, first_team, second_team, scorer
):
    collection = Mock()
    collection.get.return_value = {
        "documents": [
            f"{scorer} ({first_team}) Shot | Hasil: Goal",
            f"{first_team} Shot | Hasil: Saved",
        ],
        "metadatas": [{"player": scorer}, {"player": "Another Player"}],
    }
    store = VectorStore.__new__(VectorStore)
    store.analyzer = QueryAnalyzer()
    store.collection = collection

    results = store.search(query)

    assert [item["player"] for item in results] == [scorer]
    where = collection.get.call_args.kwargs["where"]
    assert {
        "$or": [
            {
                "$and": [
                    {"home_team": {"$eq": first_team}},
                    {"away_team": {"$eq": second_team}},
                ]
            },
            {
                "$and": [
                    {"home_team": {"$eq": second_team}},
                    {"away_team": {"$eq": first_team}},
                ]
            },
        ]
    } in where["$and"]
    assert {"team": {"$eq": first_team}} in where["$and"]
    assert {"event_type": {"$eq": "Shot"}} in where["$and"]


def test_goal_search_without_team_returns_no_context():
    collection = Mock()
    store = VectorStore.__new__(VectorStore)
    store.analyzer = QueryAnalyzer()
    store.collection = collection

    assert store.search("Who scored goals for Brazil in the Euro 2024 final?") == []
    collection.get.assert_not_called()
