"""Request-size bounds, waterfall refusals, and Monte Carlo seed plumbing.

Waterfall cost is the product of stakeholder count and exit valuation count, so
each list needs its own cap plus a combined guard. A request that clears the
bounds can still be arithmetically impossible, and the caller has to be told
which field made it so. Monte Carlo runs need an explicit seed so a result can
be reproduced and shared.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.models import MAX_EXIT_VALUATIONS, MAX_STAKEHOLDERS, MAX_WATERFALL_CELLS

client = TestClient(app)

WaterfallBody = Callable[[int, int], dict[str, Any]]


class TestWaterfallRequestBounds:
    """A single unauthenticated POST must not be able to buy minutes of CPU.

    Two rejection paths, two status codes, deliberately. A per-list cap is
    expressible in the schema, so Pydantic rejects it and the app's
    `RequestValidationError` handler normalizes it to 400 with field details -
    the shape every other invalid request in this API gets. The product of two
    individually-legal list lengths is not expressible in a schema, so the
    handler checks it before dispatching any work and answers with the
    unprocessable-entity code plus the arithmetic needed to shrink the request.
    """

    def test_exit_valuations_beyond_the_cap_are_rejected(
        self, waterfall_body: WaterfallBody
    ) -> None:
        body = waterfall_body(1, MAX_EXIT_VALUATIONS + 1)

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_exit_valuations_at_the_cap_are_accepted(self, waterfall_body: WaterfallBody) -> None:
        body = waterfall_body(1, MAX_EXIT_VALUATIONS)

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 200

    def test_stakeholders_beyond_the_cap_are_rejected(self, waterfall_body: WaterfallBody) -> None:
        body = waterfall_body(MAX_STAKEHOLDERS + 1, 1)

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_combined_product_guard_rejects_pathological_requests(
        self, waterfall_body: WaterfallBody
    ) -> None:
        body = waterfall_body(MAX_STAKEHOLDERS, MAX_EXIT_VALUATIONS)
        cells = MAX_STAKEHOLDERS * MAX_EXIT_VALUATIONS
        assert cells > MAX_WATERFALL_CELLS

        response = client.post("/api/waterfall", json=body)

        # Not 400 like the per-list caps above: no schema can express the
        # product, so this is the handler's own pre-dispatch guard rather than a
        # Pydantic field error, and it carries the numbers instead of a field path.
        assert response.status_code == 422
        detail = json.dumps(response.json())
        assert str(MAX_WATERFALL_CELLS) in detail
        assert str(MAX_STAKEHOLDERS) in detail

    def test_realistic_frontend_sweep_still_works(self, waterfall_body: WaterfallBody) -> None:
        body = waterfall_body(50, 20)

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 200
        assert len(response.json()["distributions_by_valuation"]) == 20


class TestWaterfallRefusalsNameTheInputToFix:
    """The engine's invariant messages are the only clue the caller gets.

    A distribution that does not add up to the exit is always a cap table the
    user can correct, so the correction has to survive the trip to the client
    instead of being flattened into "calculation failed".
    """

    def test_an_over_subscribed_cap_table_reports_the_field_to_correct(
        self, waterfall_body: WaterfallBody
    ) -> None:
        body = waterfall_body(2, 1)
        # Two holders of 1,000 shares each against a 1,000-share cap table: the
        # engine would hand out 200% of the exit, so it refuses to report at all.
        body["cap_table"]["total_shares"] = 1000

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400
        error = response.json()["error"]
        assert error["code"] == "CALCULATION_ERROR"
        assert "total_shares" in error["message"]
        assert "exceeds exit valuation" in error["message"]


class TestMonteCarloSeedPlumbing:
    """The same seed through the API must reproduce the same simulation."""

    def test_same_seed_reproduces_results(self, monte_carlo_request_rsu: dict) -> None:
        body = {**monte_carlo_request_rsu, "seed": 1234}

        first = client.post("/api/monte-carlo", json=body).json()
        second = client.post("/api/monte-carlo", json=body).json()

        assert first["net_outcomes"] == second["net_outcomes"]
        assert first["simulated_valuations"] == second["simulated_valuations"]
        assert first["seed"] == 1234

    def test_different_seeds_produce_different_results(self, monte_carlo_request_rsu: dict) -> None:
        first = client.post("/api/monte-carlo", json={**monte_carlo_request_rsu, "seed": 1}).json()
        second = client.post("/api/monte-carlo", json={**monte_carlo_request_rsu, "seed": 2}).json()

        assert first["net_outcomes"] != second["net_outcomes"]

    def test_response_reports_a_replayable_seed_when_none_supplied(
        self, monte_carlo_request_rsu: dict
    ) -> None:
        original = client.post("/api/monte-carlo", json=monte_carlo_request_rsu).json()

        assert isinstance(original["seed"], int)

        replay = client.post(
            "/api/monte-carlo", json={**monte_carlo_request_rsu, "seed": original["seed"]}
        ).json()

        assert replay["net_outcomes"] == original["net_outcomes"]

    def test_sensitivity_analysis_seed_is_reproducible(self, sensitivity_request_rsu: dict) -> None:
        body = {**sensitivity_request_rsu, "seed": 99}

        first = client.post("/api/sensitivity-analysis", json=body).json()
        second = client.post("/api/sensitivity-analysis", json=body).json()

        assert first["data"] == second["data"]
        assert first["seed"] == 99

    def test_negative_seed_is_rejected(self, monte_carlo_request_rsu: dict) -> None:
        response = client.post("/api/monte-carlo", json={**monte_carlo_request_rsu, "seed": -1})

        assert response.status_code == 400


class TestWebSocketSeedPlumbing:
    """Batched progress runs must be reproducible without repeating a batch."""

    @pytest.fixture
    def batched_request(self, monte_carlo_request_rsu: dict) -> dict:
        return {**monte_carlo_request_rsu, "num_simulations": 400}

    def _run(self, payload: dict) -> dict[str, Any]:
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(payload))
            while True:
                message: dict[str, Any] = websocket.receive_json()
                if message["type"] != "progress":
                    return message

    def test_same_seed_reproduces_websocket_results(self, batched_request: dict) -> None:
        payload = {**batched_request, "seed": 7}

        first = self._run(payload)
        second = self._run(payload)

        assert first["type"] == "complete"
        assert first["net_outcomes"] == second["net_outcomes"]
        assert first["seed"] == 7

    def test_batches_are_not_byte_identical(self, batched_request: dict) -> None:
        result = self._run({**batched_request, "seed": 7})
        outcomes = result["net_outcomes"]

        assert len(outcomes) == 400
        assert outcomes[:100] != outcomes[100:200]
