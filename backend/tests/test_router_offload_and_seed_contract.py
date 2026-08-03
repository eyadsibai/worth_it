"""Event-loop offload and the cross-transport seed contract.

Two router invariants are pinned here:

* A waterfall POST must not spend its CPU budget on the event loop. The
  per-list caps bound how big one request can get, but a max-size request
  still stalls every other in-flight request on the worker unless the
  synchronous computation is handed to a thread.
* A seed handed back to a caller must replay the exact run they saw, whether
  that run arrived over REST or over the WebSocket. Batching for progress
  updates is an implementation detail and must not be visible in the result.
"""

from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

import pytest
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.api.dependencies import cap_table_service
from worth_it.api.routers import monte_carlo as monte_carlo_router

client = TestClient(app)

BLOCKING_HANDSHAKE_TIMEOUT = 5.0
IDLE_REQUEST_TIMEOUT = 2.0


def _stakeholders(count: int) -> list[dict[str, Any]]:
    """Build `count` valid common stakeholders."""
    return [
        {
            "id": f"holder-{index}",
            "name": f"Holder {index}",
            "type": "employee",
            "shares": 1000,
            "ownership_pct": 100.0 / count,
            "share_class": "common",
        }
        for index in range(count)
    ]


def _waterfall_body(stakeholder_count: int, valuation_count: int) -> dict[str, Any]:
    """Build a waterfall request of the requested dimensions."""
    return {
        "cap_table": {
            "stakeholders": _stakeholders(stakeholder_count),
            "total_shares": 1000 * stakeholder_count,
            "option_pool_pct": 0,
        },
        "preference_tiers": [],
        "exit_valuations": [1_000_000.0 * (index + 1) for index in range(valuation_count)],
    }


def _monte_carlo_payload(num_simulations: int, seed: int | None = None) -> dict[str, Any]:
    """RSU Monte Carlo request whose ROI varies per simulation.

    Simulating ROI as well as the exit valuation keeps every simulation's
    opportunity cost distinct, so two runs share a value only when they share
    a random stream.
    """
    payload: dict[str, Any] = {
        "num_simulations": num_simulations,
        "base_params": {
            "exit_year": 5,
            "current_job_monthly_salary": 15000.0,
            "startup_monthly_salary": 12000.0,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.06,
            "investment_frequency": "Monthly",
            "failure_probability": 0.3,
            "startup_params": {
                "equity_type": "RSU",
                "monthly_salary": 12000.0,
                "total_equity_grant_pct": 2.0,
                "vesting_period": 4,
                "cliff_period": 1,
                "exit_valuation": 50_000_000.0,
                "simulate_dilution": False,
                "dilution_rounds": None,
            },
        },
        "sim_param_configs": {
            "exit_valuation": {"min": 20_000_000.0, "max": 100_000_000.0},
            "annual_roi": {"min": 0.03, "max": 0.10},
        },
    }
    if seed is not None:
        payload["seed"] = seed
    return payload


class TestWaterfallLeavesTheEventLoopAlone:
    """Blocker 7 capped the request size; the CPU cost still has to move off-loop."""

    def test_waterfall_computation_runs_on_a_worker_thread(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The synchronous service call must not execute on the event loop thread."""
        original = cap_table_service.calculate_waterfall
        ran_on_event_loop: list[bool] = []

        def recording(*args: Any, **kwargs: Any) -> Any:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                ran_on_event_loop.append(False)
            else:
                ran_on_event_loop.append(True)
            return original(*args, **kwargs)

        monkeypatch.setattr(cap_table_service, "calculate_waterfall", recording)

        response = client.post("/api/waterfall", json=_waterfall_body(50, 20))

        assert response.status_code == 200
        assert ran_on_event_loop == [False], (
            "calculate_waterfall ran on the event loop thread, so a max-size "
            "request stalls every other request served by this worker"
        )

    def test_other_requests_are_served_while_a_waterfall_is_computing(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A slow waterfall must not freeze unrelated traffic on the same worker."""
        original = cap_table_service.calculate_waterfall
        computation_started = threading.Event()
        release_computation = threading.Event()

        def blocking(*args: Any, **kwargs: Any) -> Any:
            computation_started.set()
            release_computation.wait(timeout=BLOCKING_HANDSHAKE_TIMEOUT)
            return original(*args, **kwargs)

        monkeypatch.setattr(cap_table_service, "calculate_waterfall", blocking)

        # A single shared portal means both requests hit the same event loop,
        # exactly as two concurrent clients would hit one uvicorn worker.
        with TestClient(app) as shared_loop_client:
            waterfall_status: list[int] = []
            health_status: list[int] = []

            def post_waterfall() -> None:
                waterfall_status.append(
                    shared_loop_client.post(
                        "/api/waterfall", json=_waterfall_body(50, 20)
                    ).status_code
                )

            def get_health() -> None:
                health_status.append(shared_loop_client.get("/health").status_code)

            waterfall_thread = threading.Thread(target=post_waterfall)
            waterfall_thread.start()
            try:
                assert computation_started.wait(timeout=BLOCKING_HANDSHAKE_TIMEOUT)

                health_thread = threading.Thread(target=get_health)
                health_thread.start()
                health_thread.join(timeout=IDLE_REQUEST_TIMEOUT)
                served_while_busy = not health_thread.is_alive()
            finally:
                release_computation.set()
                waterfall_thread.join(timeout=BLOCKING_HANDSHAKE_TIMEOUT)

            health_thread.join(timeout=BLOCKING_HANDSHAKE_TIMEOUT)

        assert served_while_busy, (
            "/health could not be served while a waterfall was computing: the "
            "event loop was blocked by the synchronous calculation"
        )
        assert health_status == [200]
        assert waterfall_status == [200]


class TestWebSocketRunLeavesTheEventLoopAlone:
    """Collapsing the batch loop must not drag the simulation back on-loop."""

    def test_simulation_runs_on_a_worker_thread(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """One whole run is more CPU than one batch, so offloading matters more."""
        ran_on_event_loop: list[bool] = []
        original = monte_carlo_router.mc_run_simulation

        def recording(*args: Any, **kwargs: Any) -> Any:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                ran_on_event_loop.append(False)
            else:
                ran_on_event_loop.append(True)
            return original(*args, **kwargs)

        monkeypatch.setattr(monte_carlo_router, "mc_run_simulation", recording)

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(_monte_carlo_payload(num_simulations=300, seed=5)))
            while websocket.receive_json()["type"] == "progress":
                pass

        assert ran_on_event_loop == [False], (
            "the Monte Carlo run executed on the event loop thread, stalling "
            "every other connection this worker is serving"
        )


class TestSeedContractHoldsOnBothTransports:
    """MonteCarloResponse.seed promises replayability; batching must not break it."""

    @staticmethod
    def _run_websocket(payload: dict[str, Any]) -> dict[str, Any]:
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(payload))
            while True:
                message: dict[str, Any] = websocket.receive_json()
                if message["type"] != "progress":
                    return message

    def test_websocket_run_matches_rest_run_for_the_same_seed(self) -> None:
        """The transport must not change a single number of the result."""
        payload = _monte_carlo_payload(num_simulations=300, seed=424242)

        rest = client.post("/api/monte-carlo", json=payload).json()
        streamed = self._run_websocket(payload)

        assert streamed["type"] == "complete"
        assert streamed["seed"] == rest["seed"] == 424242
        assert streamed["net_outcomes"] == rest["net_outcomes"]
        assert streamed["simulated_valuations"] == rest["simulated_valuations"]

    def test_seed_reported_over_websocket_replays_that_run(self) -> None:
        """The generated seed sent in `complete` must reproduce the run it labels."""
        payload = _monte_carlo_payload(num_simulations=300)

        streamed = self._run_websocket(payload)
        assert streamed["type"] == "complete"
        assert isinstance(streamed["seed"], int)

        replay = client.post("/api/monte-carlo", json={**payload, "seed": streamed["seed"]}).json()

        assert replay["net_outcomes"] == streamed["net_outcomes"]
        assert replay["simulated_valuations"] == streamed["simulated_valuations"]

    def test_adjacent_seeds_never_share_a_stretch_of_the_run(self) -> None:
        """Seed S must not replay any slice of seed S+1's run."""
        first = self._run_websocket(_monte_carlo_payload(num_simulations=300, seed=424242))
        second = self._run_websocket(_monte_carlo_payload(num_simulations=300, seed=424243))

        assert first["type"] == second["type"] == "complete"
        assert not set(first["net_outcomes"]) & set(second["net_outcomes"]), (
            "adjacent seeds produced overlapping draws: the batch seed derivation "
            "collides, so seed S batch 1 is seed S+1 batch 0"
        )

    def test_progress_still_reaches_one_hundred_percent(self) -> None:
        """Reproducibility must not cost the client its progress feedback."""
        payload = _monte_carlo_payload(num_simulations=300, seed=11)
        percentages: list[float] = []

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(payload))
            while True:
                message = websocket.receive_json()
                if message["type"] == "progress":
                    assert message["total"] == 300
                    percentages.append(message["percentage"])
                    continue
                assert message["type"] == "complete"
                break

        assert len(percentages) >= 2
        assert percentages == sorted(percentages)
        assert percentages[-1] >= 99.9
