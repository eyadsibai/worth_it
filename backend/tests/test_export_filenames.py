"""Download-name contract for the pre-revenue export endpoint.

One company is normally valued under several pre-revenue methods in a single
sitting. If the download name omits the method, the second export overwrites
the first in the browser's downloads folder, so the method belongs in the name
of every format, not just the PDF.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote

import pytest
from fastapi.testclient import TestClient

from worth_it.api import app

client = TestClient(app)


def pre_revenue_body(**overrides: Any) -> dict[str, Any]:
    """Build a valid pre-revenue export payload with optional overrides."""
    body: dict[str, Any] = {
        "company_name": "Acme Inc",
        "method_name": "Berkus Method",
        "format": "json",
        "result": {"valuation": 2_500_000.0},
        "params": {},
    }
    body.update(overrides)
    return body


def disposition(**overrides: Any) -> str:
    """Export a pre-revenue report and return its Content-Disposition header."""
    response = client.post("/api/export/pre-revenue", json=pre_revenue_body(**overrides))

    assert response.status_code == 200
    return response.headers["content-disposition"]


class TestPreRevenueDownloadNames:
    """Every export format names the method it was produced with."""

    @pytest.mark.parametrize("export_format", ["json", "csv", "pdf"])
    def test_method_name_is_part_of_the_download_name(self, export_format: str) -> None:
        header = disposition(format=export_format)

        assert f'filename="Acme_Inc_berkus_method_valuation.{export_format}"' in header

    @pytest.mark.parametrize("export_format", ["json", "csv", "pdf"])
    def test_two_methods_for_one_company_do_not_collide(self, export_format: str) -> None:
        berkus = disposition(format=export_format, method_name="Berkus Method")
        scorecard = disposition(format=export_format, method_name="Scorecard Method")

        assert berkus != scorecard

    def test_non_latin_company_keeps_the_method_in_filename_star(self) -> None:
        header = disposition(company_name="株式会社テスト")

        assert 'filename="report_berkus_method_valuation.json"' in header
        encoded = header.split("filename*=UTF-8''", 1)[1]
        assert unquote(encoded) == "株式会社テスト_berkus method_valuation.json"
