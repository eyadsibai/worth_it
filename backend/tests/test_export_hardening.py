"""Hardening tests for the valuation export endpoints.

The export router renders caller-supplied company metadata through ReportLab,
whose Paragraph parser understands a mini-HTML dialect: an ``<img src="http://...">``
tag becomes a server-side fetch. These tests pin the validation, escaping,
header safety, off-loop execution and rate limiting of that surface.
"""

from __future__ import annotations

import asyncio
import base64
import contextlib
import re
import socket
import threading
import time
import zlib
from typing import Any
from urllib.parse import unquote

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.api.dependencies import limiter
from worth_it.api.routers import export as export_router
from worth_it.config import settings
from worth_it.models import ExportRequest
from worth_it.reports import build_first_chicago_report, generate_pdf_report
from worth_it.reports.pdf_generator import escape_paragraph_markup

client = TestClient(app)

# Port 9 (discard) on loopback: reachable without DNS, refuses immediately.
HOSTILE_IMG_MARKUP = '<img src="http://127.0.0.1:9/pwn.png"/>'

# Only a deadlock breaker: the concurrency tests wait on signals, not on time.
DRAIN_TIMEOUT_SECONDS = 10.0

FIRST_CHICAGO_RESULT: dict[str, Any] = {
    "weighted_value": 23_750_000.0,
    "present_value": 7_782_387.0,
    "scenario_values": {"Best": 50_000_000.0, "Base": 20_000_000.0, "Worst": 5_000_000.0},
    "scenario_present_values": {"Best": 16_384_000.0, "Base": 6_553_600.0, "Worst": 1_638_400.0},
}
FIRST_CHICAGO_PARAMS: dict[str, Any] = {"discount_rate": 0.25}


def first_chicago_body(**overrides: Any) -> dict[str, Any]:
    """Build a valid First Chicago export payload with optional overrides."""
    body: dict[str, Any] = {
        "company_name": "Acme Inc",
        "format": "pdf",
        "result": dict(FIRST_CHICAGO_RESULT),
        "params": dict(FIRST_CHICAGO_PARAMS),
    }
    body.update(overrides)
    return body


def pre_revenue_body(**overrides: Any) -> dict[str, Any]:
    """Build a valid pre-revenue export payload with optional overrides."""
    body: dict[str, Any] = {
        "company_name": "Acme Inc",
        "method_name": "Berkus Method",
        "format": "pdf",
        "result": {"valuation": 2_500_000.0},
        "params": {},
    }
    body.update(overrides)
    return body


def waterfall_body(**overrides: Any) -> dict[str, Any]:
    """Build a valid waterfall payload with optional overrides."""
    body: dict[str, Any] = {
        "cap_table": {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 7_000_000,
                    "ownership_pct": 70.0,
                    "share_class": "common",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        },
        "preference_tiers": [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000.0,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "stakeholder_ids": ["founder-1"],
            }
        ],
        "exit_valuations": [10_000_000.0],
    }
    body.update(overrides)
    return body


def pdf_drawn_text(pdf_bytes: bytes) -> str:
    """Concatenate every literal string drawn into the PDF content streams.

    ReportLab emits page text as PDF literal strings; reading them back is the
    only way to see what a reader actually shows. Its content streams carry
    ``/Filter [/ASCII85Decode /FlateDecode]`` and close with ``~>endstream``
    (no separating newline), so both layers have to be undone in that order.
    """
    chunks: list[bytes] = []
    for match in re.finditer(rb"[^d]stream\r?\n(.*?)endstream", pdf_bytes, re.S):
        data = match.group(1).strip(b"\r\n")
        if data.endswith(b"~>"):
            data = base64.a85decode(data[:-2], adobe=False, ignorechars=b" \t\r\n\v\f")
        with contextlib.suppress(zlib.error):
            data = zlib.decompress(data)
        chunks.append(data)
    assert chunks, "no PDF content streams were recovered"
    blob = b"\n".join(chunks).decode("latin-1")
    return "".join(re.findall(r"\((?:\\.|[^\\()])*\)", blob))


@pytest.fixture
def outbound_connections(monkeypatch: pytest.MonkeyPatch) -> list[Any]:
    """Record and refuse every outbound socket connection attempt."""
    attempted: list[Any] = []

    def blocked(self: socket.socket, address: Any) -> None:
        attempted.append(address)
        raise OSError("outbound network access is blocked in tests")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    return attempted


class TestServerSideRequestForgery:
    """ReportLab markup in caller-supplied text must never reach the parser."""

    def test_company_name_with_image_markup_triggers_no_fetch(
        self, outbound_connections: list[Any]
    ) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name=f"Acme {HOSTILE_IMG_MARKUP}"),
        )

        assert outbound_connections == []
        assert response.status_code == 400

    def test_method_name_with_image_markup_triggers_no_fetch(
        self, outbound_connections: list[Any]
    ) -> None:
        response = client.post(
            "/api/export/pre-revenue",
            json=pre_revenue_body(method_name=f"Berkus {HOSTILE_IMG_MARKUP}"),
        )

        assert outbound_connections == []
        assert response.status_code == 400

    def test_generator_renders_hostile_markup_inert(self, outbound_connections: list[Any]) -> None:
        """Escaping belongs to the generator: raw text must reach it and stay inert.

        Callers hand the builder verbatim text; only the Paragraph boundary escapes.
        """
        hostile = f"Acme {HOSTILE_IMG_MARKUP}"

        report = build_first_chicago_report(
            company_name=hostile,
            result=dict(FIRST_CHICAGO_RESULT),
            params=dict(FIRST_CHICAGO_PARAMS),
            industry=hostile,
        )
        pdf_bytes = generate_pdf_report(report)

        assert outbound_connections == []
        assert pdf_bytes[:4] == b"%PDF"

    def test_escape_neutralizes_markup_delimiters(self) -> None:
        escaped = escape_paragraph_markup('<img src="x"/> & <b>')

        assert "<" not in escaped
        assert ">" not in escaped
        assert "&amp;" in escaped


class TestCompanyNameValidation:
    """company_name is attacker-controlled and must be bounded and charset-limited."""

    def test_overlong_company_name_is_rejected(self) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name="A" * 5000, format="json"),
        )

        assert response.status_code == 400

    @pytest.mark.parametrize(
        "hostile",
        [
            'Acme" filename="evil.pdf',
            "Acme\r\nX-Injected: yes",
            "Acme\n",
            "Acme\x00Co",
            "Acme<script>",
        ],
    )
    def test_header_breaking_company_names_are_rejected(self, hostile: str) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name=hostile, format="json"),
        )

        assert response.status_code == 400

    def test_ordinary_company_names_still_work(self) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name="O'Neill, Smith & Co. (Holdings)", format="json"),
        )

        assert response.status_code == 200

    def test_format_defaults_to_json(self) -> None:
        assert ExportRequest(company_name="Acme Inc").format == "json"


class TestFilenameSanitisation:
    """The download filename lands verbatim in a response header."""

    @pytest.mark.parametrize(
        "hostile",
        [
            'Acme" filename="evil',
            "Acme\r\nX-Injected: yes",
            "Acme\x00Co",
            "Acme/../../etc/passwd",
        ],
    )
    def test_safe_filename_strips_header_breaking_characters(self, hostile: str) -> None:
        result = export_router._safe_filename(hostile)

        assert '"' not in result
        assert "\r" not in result
        assert "\n" not in result
        assert result.isprintable()
        assert result.isascii()
        assert result != ""

    def test_safe_filename_never_returns_empty(self) -> None:
        assert export_router._safe_filename("***") != ""

    def test_content_disposition_header_stays_single_valued(self) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name="Acme Inc", format="json"),
        )

        assert response.status_code == 200
        disposition = response.headers["content-disposition"]
        assert disposition.count('"') == 2
        assert "\n" not in disposition


class TestPayloadBounds:
    """result/params must be typed and bounded rather than free-form dicts."""

    def test_unbounded_scenario_map_is_rejected(self) -> None:
        result = dict(FIRST_CHICAGO_RESULT)
        result["scenario_values"] = {f"Scenario {i}": float(i) for i in range(500)}

        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(result=result, format="json"),
        )

        assert response.status_code == 400

    def test_non_numeric_discount_rate_is_rejected(self) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(params={"discount_rate": HOSTILE_IMG_MARKUP}, format="json"),
        )

        assert response.status_code == 400

    def test_non_numeric_present_value_is_rejected(self) -> None:
        result = dict(FIRST_CHICAGO_RESULT)
        result["present_value"] = "not a number"

        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(result=result, format="json"),
        )

        assert response.status_code == 400

    def test_unbounded_percentile_map_is_rejected(self) -> None:
        response = client.post(
            "/api/export/negotiation-range",
            json={
                "valuation": 10_000_000.0,
                "monte_carlo_percentiles": {f"p{i}": float(i) for i in range(200)},
            },
        )

        assert response.status_code == 400

    def test_ordinary_percentile_map_still_works(self) -> None:
        response = client.post(
            "/api/export/negotiation-range",
            json={
                "valuation": 10_000_000.0,
                "monte_carlo_percentiles": {
                    "p10": 6_000_000.0,
                    "p25": 8_000_000.0,
                    "p50": 10_000_000.0,
                    "p75": 13_000_000.0,
                    "p90": 18_000_000.0,
                },
            },
        )

        assert response.status_code == 200
        assert response.json()["target"] == 10_000_000.0


class TestTypedResultRoundTrip:
    """Typing result/params must not change what the report renders."""

    def test_pre_revenue_csv_lists_factors(self) -> None:
        response = client.post(
            "/api/export/pre-revenue",
            json=pre_revenue_body(
                format="csv",
                result={
                    "valuation": 2_500_000.0,
                    "factors": [{"name": "Sound Idea", "value": 500_000.0}],
                },
            ),
        )

        assert response.status_code == 200
        content = response.content.decode("utf-8")
        assert "Sound Idea" in content
        assert "Berkus Method" in content

    def test_pre_revenue_json_omits_factor_section_when_absent(self) -> None:
        response = client.post(
            "/api/export/pre-revenue",
            json=pre_revenue_body(format="json", result={"valuation": 2_500_000.0}),
        )

        assert response.status_code == 200
        titles = [section["title"] for section in response.json()["sections"]]
        assert "Factor Breakdown" not in titles

    def test_first_chicago_json_keeps_company_name_unescaped(self) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name="Smith & Co", format="json"),
        )

        assert response.status_code == 200
        assert response.json()["company_name"] == "Smith & Co"


class TestPdfGenerationIsolation:
    """ReportLab is synchronous and CPU-bound; it must not run on the event loop."""

    def test_pdf_generation_runs_off_the_event_loop(self, monkeypatch: pytest.MonkeyPatch) -> None:
        observed: dict[str, bool] = {}

        def fake_generate(report_data: Any) -> bytes:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                observed["off_loop"] = True
            else:
                observed["off_loop"] = False
            return b"%PDF-1.4 stub"

        monkeypatch.setattr(export_router, "generate_pdf_report", fake_generate)

        response = client.post("/api/export/first-chicago", json=first_chicago_body())

        assert response.status_code == 200
        assert observed["off_loop"] is True

    def test_slow_pdf_generation_times_out(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The request gives up on the render; it does not wait for it.

        The render blocks on a signal rather than a sleep, so the elapsed bound
        is not a duration a loaded runner has to beat. A sleep the same length as
        the bound leaves the round trip, the pool dispatch and the event loop
        sharing whatever is left of it, and that is a flake, not a regression.
        """
        finish_render = threading.Event()

        def slow_generate(report_data: Any) -> bytes:
            finish_render.wait(timeout=DRAIN_TIMEOUT_SECONDS)
            return b"%PDF-1.4 stub"

        monkeypatch.setattr(export_router, "PDF_GENERATION_TIMEOUT_SECONDS", 0.05)
        monkeypatch.setattr(export_router, "generate_pdf_report", slow_generate)

        started = time.monotonic()
        try:
            response = client.post("/api/export/first-chicago", json=first_chicago_body())
            elapsed = time.monotonic() - started
        finally:
            # Release the abandoned worker back to the pool for the next test.
            finish_render.set()

        assert response.status_code == 504
        # Half the render's own ceiling: a request that waited for the render
        # cannot land here, and no amount of unrelated overhead reaches it.
        assert elapsed < DRAIN_TIMEOUT_SECONDS / 2


class TestScenarioMapConsistency:
    """The report indexes scenario_present_values by scenario name.

    A payload whose two scenario maps disagree is bad input, so it must be
    refused at the boundary rather than raising KeyError inside the builder.
    """

    @staticmethod
    def _result(**overrides: Any) -> dict[str, Any]:
        result = dict(FIRST_CHICAGO_RESULT)
        result.update(overrides)
        return result

    @pytest.mark.parametrize("export_format", ["json", "pdf"])
    def test_missing_scenario_present_values_are_rejected(self, export_format: str) -> None:
        result = self._result(
            scenario_values={"Base": 1.0},
            scenario_present_values={},
        )

        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(result=result, format=export_format),
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    @pytest.mark.parametrize("export_format", ["json", "pdf"])
    def test_partially_missing_scenario_present_values_are_rejected(
        self, export_format: str
    ) -> None:
        result = self._result(
            scenario_values={"Best": 5.0, "Base": 1.0},
            scenario_present_values={"Best": 4.0},
        )

        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(result=result, format=export_format),
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_unknown_scenario_present_value_is_rejected(self) -> None:
        result = self._result(
            scenario_values={"Base": 1.0},
            scenario_present_values={"Base": 1.0, "Ghost": 2.0},
        )

        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(result=result, format="json"),
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    @pytest.mark.parametrize("export_format", ["json", "pdf"])
    def test_agreeing_scenario_maps_still_export(self, export_format: str) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(format=export_format),
        )

        assert response.status_code == 200

    def test_omitting_both_scenario_maps_still_exports(self) -> None:
        result = self._result(scenario_values={}, scenario_present_values={})

        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(result=result, format="json"),
        )

        assert response.status_code == 200

    def test_builder_tolerates_a_missing_present_value(self) -> None:
        """Defence in depth: the builder must not raise on an incomplete map."""
        report = build_first_chicago_report(
            company_name="Acme Inc",
            result={
                "weighted_value": 1.0,
                "present_value": 1.0,
                "scenario_values": {"Base": 20_000_000.0},
                "scenario_present_values": {},
            },
            params=dict(FIRST_CHICAGO_PARAMS),
        )

        scenarios = next(s for s in report.sections if s.title == "Scenario Analysis")
        assert [m.name for m in scenarios.metrics] == ["Base Scenario"]


class TestPdfTextFidelity:
    """An ordinary business name must render once, the same way, in every layer."""

    def test_ampersand_name_is_not_entity_escaped_in_the_pdf(self) -> None:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name="Smith & Co", industry="Fin & Tech", format="pdf"),
        )

        assert response.status_code == 200
        text = pdf_drawn_text(response.content)
        assert "amp;" not in text, text[:2000]
        assert text.count("Smith & Co") >= 2, text[:2000]
        assert "Fin & Tech" in text, text[:2000]

    def test_pre_revenue_method_name_is_not_entity_escaped(self) -> None:
        response = client.post(
            "/api/export/pre-revenue",
            json=pre_revenue_body(company_name="Smith & Co", method_name="Risk & Factor"),
        )

        assert response.status_code == 200
        text = pdf_drawn_text(response.content)
        assert "amp;" not in text, text[:2000]
        assert "Risk & Factor" in text, text[:2000]


class TestPdfRenderConcurrency:
    """The wall-clock timeout bounds the request, not the work.

    Abandoned ReportLab threads keep burning CPU, so the render itself needs an
    explicit ceiling or sustained timeouts grow the thread count without bound.
    """

    RENDER_BURST = 12

    @staticmethod
    def _report() -> Any:
        return build_first_chicago_report(
            company_name="Acme Inc",
            result=dict(FIRST_CHICAGO_RESULT),
            params=dict(FIRST_CHICAGO_PARAMS),
        )

    @staticmethod
    def _drain_render_pool() -> None:
        """Block until every render already queued on the pool has finished.

        One barrier task per worker slot, submitted last: the pool dispatches
        FIFO and a worker parked in the barrier cannot take further work, so the
        barrier can only trip once every slot is free of the renders ahead of
        it. That is a completion signal — a sleep is only a guess that happens
        to be long enough, and it stops being one on a loaded machine.
        """
        slots = export_router.MAX_CONCURRENT_PDF_RENDERS
        barrier = threading.Barrier(slots + 1)  # every worker slot, plus this thread
        for _ in range(slots):
            export_router._pdf_render_pool.submit(barrier.wait, timeout=DRAIN_TIMEOUT_SECONDS)
        try:
            barrier.wait(timeout=DRAIN_TIMEOUT_SECONDS)
        except threading.BrokenBarrierError:
            pytest.fail("abandoned renders never drained")

    def test_concurrent_renders_are_capped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        lock = threading.Lock()
        live = 0
        peak = 0

        def counting_generate(report_data: Any) -> bytes:
            nonlocal live, peak
            with lock:
                live += 1
                peak = max(peak, live)
            time.sleep(0.05)
            with lock:
                live -= 1
            return b"%PDF-1.4 stub"

        monkeypatch.setattr(export_router, "generate_pdf_report", counting_generate)
        report = self._report()

        async def render_burst() -> None:
            await asyncio.gather(
                *(export_router._render_pdf(report) for _ in range(self.RENDER_BURST))
            )

        asyncio.run(render_burst())

        assert peak <= export_router.MAX_CONCURRENT_PDF_RENDERS, f"{peak} concurrent renders"

    def test_abandoned_renders_do_not_spawn_a_thread_per_request(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        lock = threading.Lock()
        workers: set[int] = set()
        finish_render = threading.Event()

        def slow_generate(report_data: Any) -> bytes:
            with lock:
                workers.add(threading.get_ident())
            # Outlive the request timeout, then end on the test's signal rather
            # than a duration the drain below would have to out-guess. The cap
            # keeps a regression from hanging the suite.
            finish_render.wait(timeout=DRAIN_TIMEOUT_SECONDS)
            return b"%PDF-1.4 stub"

        monkeypatch.setattr(export_router, "PDF_GENERATION_TIMEOUT_SECONDS", 0.05)
        monkeypatch.setattr(export_router, "generate_pdf_report", slow_generate)
        report = self._report()

        async def render_burst() -> list[Any]:
            return await asyncio.gather(
                *(export_router._render_pdf(report) for _ in range(self.RENDER_BURST)),
                return_exceptions=True,
            )

        outcomes = asyncio.run(render_burst())

        assert all(isinstance(outcome, HTTPException) for outcome in outcomes)

        finish_render.set()
        self._drain_render_pool()

        with lock:
            spawned = len(workers)
        assert spawned <= export_router.MAX_CONCURRENT_PDF_RENDERS, (
            f"{spawned} threads for {self.RENDER_BURST} timeouts"
        )


class TestCapTableTextBounds:
    """Stakeholder and preference-tier text is validated before any cell guard runs."""

    OVERLONG = "A" * 10_000

    def test_ordinary_cap_table_still_works(self) -> None:
        response = client.post("/api/waterfall", json=waterfall_body())

        assert response.status_code == 200

    def test_overlong_stakeholder_name_is_rejected(self) -> None:
        body = waterfall_body()
        body["cap_table"]["stakeholders"][0]["name"] = self.OVERLONG

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400

    def test_overlong_stakeholder_id_is_rejected(self) -> None:
        body = waterfall_body()
        body["cap_table"]["stakeholders"][0]["id"] = self.OVERLONG

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400

    def test_overlong_preference_tier_name_is_rejected(self) -> None:
        body = waterfall_body()
        body["preference_tiers"][0]["name"] = self.OVERLONG

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400

    def test_overlong_preference_tier_id_is_rejected(self) -> None:
        body = waterfall_body()
        body["preference_tiers"][0]["id"] = self.OVERLONG

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400

    def test_overlong_tier_stakeholder_reference_is_rejected(self) -> None:
        body = waterfall_body()
        body["preference_tiers"][0]["stakeholder_ids"] = [self.OVERLONG]

        response = client.post("/api/waterfall", json=body)

        assert response.status_code == 400


class TestUnicodeDownloadName:
    """A wholly non-Latin name must survive the download name, safely."""

    JAPANESE = "株式会社テスト"
    ARABIC = "شركة الاختبار"

    def _disposition(self, company_name: str) -> str:
        response = client.post(
            "/api/export/first-chicago",
            json=first_chicago_body(company_name=company_name, format="json"),
        )
        assert response.status_code == 200
        return response.headers["content-disposition"]

    def test_non_latin_name_survives_as_rfc6266_filename_star(self) -> None:
        disposition = self._disposition(self.JAPANESE)

        assert 'filename="report_valuation.json"' in disposition
        assert "filename*=UTF-8''" in disposition
        encoded = disposition.split("filename*=UTF-8''", 1)[1]
        assert unquote(encoded) == f"{self.JAPANESE}_valuation.json"

    def test_distinct_non_latin_names_do_not_collide(self) -> None:
        assert self._disposition(self.JAPANESE) != self._disposition(self.ARABIC)

    def test_ascii_name_needs_no_filename_star(self) -> None:
        disposition = self._disposition("Acme Inc")

        assert 'filename="Acme_Inc_valuation.json"' in disposition
        assert "\n" not in disposition

    @pytest.mark.parametrize(
        "hostile",
        [
            'Acme" filename="evil',
            "Acme\r\nX-Injected: yes",
            "Acme\n",
            "Acme\x00Co",
            "Acme\x7f\x1bCo",
            "Acme/../../etc/passwd",
        ],
    )
    def test_content_disposition_cannot_be_injected(self, hostile: str) -> None:
        header = export_router._content_disposition(
            f"{export_router._safe_filename(hostile)}.pdf",
            f"{hostile}.pdf",
        )

        assert header.count('"') == 2
        assert header.isascii()
        assert header.isprintable()
        assert "\r" not in header
        assert "\n" not in header
        assert "\x00" not in header
        assert header.startswith("attachment; filename=")


class TestExportRateLimiting:
    """The export router is the most expensive surface and must be throttled."""

    @pytest.fixture
    def enabled_limiter(self, monkeypatch: pytest.MonkeyPatch):
        limiter.reset()
        monkeypatch.setattr(limiter, "enabled", True)
        yield limiter
        limiter.reset()

    def test_first_chicago_export_is_rate_limited(self, enabled_limiter) -> None:
        body = first_chicago_body(format="json")

        statuses = [
            client.post("/api/export/first-chicago", json=body).status_code
            for _ in range(settings.RATE_LIMIT_PER_MINUTE + 1)
        ]

        assert 429 in statuses

    def test_pre_revenue_export_is_rate_limited(self, enabled_limiter) -> None:
        body = pre_revenue_body(format="json")

        statuses = [
            client.post("/api/export/pre-revenue", json=body).status_code
            for _ in range(settings.RATE_LIMIT_PER_MINUTE + 1)
        ]

        assert 429 in statuses

    def test_negotiation_range_is_rate_limited(self, enabled_limiter) -> None:
        body = {"valuation": 10_000_000.0}

        statuses = [
            client.post("/api/export/negotiation-range", json=body).status_code
            for _ in range(settings.RATE_LIMIT_PER_MINUTE + 1)
        ]

        assert 429 in statuses
