"""Export endpoints for valuation reports."""

from __future__ import annotations

import asyncio
import csv
import dataclasses
import json
import re
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO, StringIO
from typing import TYPE_CHECKING, Any
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from worth_it.config import settings
from worth_it.models import (
    FirstChicagoExportRequest,
    NegotiationRangeRequest,
    PreRevenueExportRequest,
)
from worth_it.reports import (
    NegotiationRange,
    build_first_chicago_report,
    build_pre_revenue_report,
    calculate_negotiation_range,
    generate_pdf_report,
)

from ..dependencies import limiter

if TYPE_CHECKING:
    from worth_it.reports import ValuationReportData

router = APIRouter(prefix="/api/export", tags=["export"])

# The timeout bounds how long a *request* waits, not how long ReportLab runs:
# a synchronous C-level render cannot be interrupted from outside. Bounding the
# work itself therefore needs a separate, explicit ceiling on how many renders
# may be in flight at once.
PDF_GENERATION_TIMEOUT_SECONDS = 20.0
MAX_CONCURRENT_PDF_RENDERS = 4

MAX_FILENAME_LENGTH = 80
_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9._-]+")

# A fixed-size pool is the ceiling: an abandoned render keeps its worker until
# it finishes, so timing out cannot hand the next request a brand-new OS thread.
_pdf_render_pool = ThreadPoolExecutor(
    max_workers=MAX_CONCURRENT_PDF_RENDERS,
    thread_name_prefix="pdf-render",
)


def _report_to_dict(report: Any) -> dict[str, Any]:
    """Convert a ValuationReportData to a JSON-serializable dict.

    Args:
        report: ValuationReportData instance

    Returns:
        Dictionary with all report fields for JSON export
    """
    return {
        "title": report.title,
        "company_name": report.company_name,
        "report_date": report.report_date,
        "prepared_by": report.prepared_by,
        "valuation_method": report.valuation_method,
        "sections": [
            {
                "title": s.title,
                "content": s.content,
                "metrics": [
                    {
                        "name": m.name,
                        "value": m.value,
                        "formatted_value": m.formatted_value,
                        "description": m.description,
                    }
                    for m in s.metrics
                ],
                "charts": [dataclasses.asdict(c) for c in s.charts],
            }
            for s in report.sections
        ],
        "assumptions": report.assumptions,
        "disclaimers": report.disclaimers,
        "industry": report.industry,
        "monte_carlo_enabled": report.monte_carlo_enabled,
    }


def _content_disposition(ascii_filename: str, download_name: str) -> str:
    """Build a Content-Disposition value that is both safe and i18n-complete.

    RFC 6266 pairs an ASCII-only ``filename`` fallback with a percent-encoded
    ``filename*``. Percent-encoding is what makes the second form safe: quotes,
    CR, LF, NUL and every other control character become ``%XX`` and can no
    longer terminate the value or start a new header.

    Args:
        ascii_filename: Already-sanitized ASCII name (see ``_safe_filename``)
        download_name: The name the user actually typed, in full Unicode

    Returns:
        A single-valued, printable-ASCII header value
    """
    header = f'attachment; filename="{ascii_filename}"'
    if not download_name.isascii():
        header += f"; filename*=UTF-8''{quote(download_name, safe='')}"
    return header


def _create_file_response(
    content: bytes | str,
    filename: str,
    media_type: str,
    download_name: str | None = None,
) -> StreamingResponse:
    """Create a streaming file response for downloads.

    Args:
        content: File content (bytes or string)
        filename: ASCII-safe name used as the header fallback
        media_type: MIME type for the response
        download_name: Optional Unicode name offered via RFC 6266 filename*

    Returns:
        StreamingResponse with download headers
    """
    if isinstance(content, str):
        content = content.encode("utf-8")
    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": _content_disposition(filename, download_name or filename)},
    )


def _safe_filename(name: str) -> str:
    """Reduce a name to an ASCII token that cannot break out of a header.

    Args:
        name: Original name

    Returns:
        Sanitized filename-safe string, never empty
    """
    collapsed = _UNSAFE_FILENAME_CHARS.sub("_", name).strip("._-")
    return collapsed[:MAX_FILENAME_LENGTH] or "report"


async def _render_pdf(report_data: ValuationReportData) -> bytes:
    """Render a report to PDF on a bounded pool under a wall-clock budget.

    Two separate limits apply. The timeout frees the *caller* — a synchronous
    ReportLab render cannot be interrupted, so the worker may still be running
    when the request gives up. The fixed-size pool is what bounds the *work*:
    at most ``MAX_CONCURRENT_PDF_RENDERS`` renders execute at once, and a
    render abandoned by a timeout holds its worker until it finishes instead of
    letting the next request spawn a fresh thread.
    """
    future = _pdf_render_pool.submit(generate_pdf_report, report_data)
    try:
        return await asyncio.wait_for(
            asyncio.wrap_future(future),
            timeout=PDF_GENERATION_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        # Only succeeds while the render is still queued, which is precisely
        # when the work is still worth skipping.
        future.cancel()
        raise HTTPException(
            status_code=504,
            detail="PDF generation timed out. Try exporting JSON or CSV instead.",
        ) from exc


@router.post("/first-chicago")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def export_first_chicago(
    request: Request,
    body: FirstChicagoExportRequest,
) -> StreamingResponse:
    """Export First Chicago valuation in various formats.

    Supports PDF, JSON, and CSV export formats.
    """
    safe_name = _safe_filename(body.company_name)

    def build() -> ValuationReportData:
        # The builder receives verbatim text; only the Paragraph boundary escapes.
        return build_first_chicago_report(
            company_name=body.company_name,
            result=body.result.model_dump(),
            params=body.params.model_dump(exclude_none=True),
            industry=body.industry,
            monte_carlo_result=(
                body.monte_carlo_result.model_dump()
                if body.monte_carlo_result is not None
                else None
            ),
        )

    if body.format == "pdf":
        pdf_bytes = await _render_pdf(build())
        return _create_file_response(
            pdf_bytes,
            f"{safe_name}_valuation.pdf",
            "application/pdf",
            f"{body.company_name}_valuation.pdf",
        )

    elif body.format == "json":
        return _create_file_response(
            json.dumps(_report_to_dict(build()), indent=2),
            f"{safe_name}_valuation.json",
            "application/json",
            f"{body.company_name}_valuation.json",
        )

    # csv, and nothing else: `format` is a Literal, so Pydantic has already
    # answered every other value with the standard 400 envelope before this
    # handler runs. A trailing "unsupported format" arm could only ever answer
    # in a shape no client parses, and no test could reach it to notice.
    else:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", body.company_name])
        writer.writerow(["Method", "First Chicago"])
        writer.writerow(["Present Value", body.result.present_value])
        writer.writerow(["Weighted Value", body.result.weighted_value])
        for name, value in body.result.scenario_values.items():
            writer.writerow([f"{name} Exit Value", value])
        return _create_file_response(
            output.getvalue(),
            f"{safe_name}_valuation.csv",
            "text/csv",
            f"{body.company_name}_valuation.csv",
        )


@router.post("/pre-revenue")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def export_pre_revenue(
    request: Request,
    body: PreRevenueExportRequest,
) -> StreamingResponse:
    """Export pre-revenue valuation in various formats.

    Supports PDF, JSON, and CSV export formats.
    """
    safe_name = _safe_filename(body.company_name)
    method_slug = _safe_filename(body.method_name.lower())

    def build() -> ValuationReportData:
        # The builder receives verbatim text; only the Paragraph boundary escapes.
        return build_pre_revenue_report(
            company_name=body.company_name,
            method_name=body.method_name,
            result=body.result.model_dump(exclude_none=True),
            params=body.params.model_dump(exclude_none=True),
            industry=body.industry,
        )

    if body.format == "pdf":
        pdf_bytes = await _render_pdf(build())
        return _create_file_response(
            pdf_bytes,
            f"{safe_name}_{method_slug}_valuation.pdf",
            "application/pdf",
            f"{body.company_name}_{body.method_name.lower()}_valuation.pdf",
        )

    elif body.format == "json":
        return _create_file_response(
            json.dumps(_report_to_dict(build()), indent=2),
            f"{safe_name}_{method_slug}_valuation.json",
            "application/json",
            f"{body.company_name}_{body.method_name.lower()}_valuation.json",
        )

    # csv, and nothing else: see the note on the First Chicago export above.
    else:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", body.company_name])
        writer.writerow(["Method", body.method_name])
        writer.writerow(["Valuation", body.result.valuation])
        for factor in body.result.factors or []:
            writer.writerow([factor.name, factor.value])
        return _create_file_response(
            output.getvalue(),
            f"{safe_name}_{method_slug}_valuation.csv",
            "text/csv",
            f"{body.company_name}_{body.method_name.lower()}_valuation.csv",
        )


@router.post("/negotiation-range")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_negotiation(
    request: Request,
    body: NegotiationRangeRequest,
) -> dict[str, float]:
    """Calculate negotiation range for term sheet discussions.

    Returns floor (walk-away), conservative, target, aggressive, and ceiling valuations.
    When Monte Carlo percentiles are provided, uses those for data-driven ranges.
    Otherwise, uses standard variance multipliers (0.7x - 1.5x of base valuation).
    """
    result: NegotiationRange = calculate_negotiation_range(
        valuation=body.valuation,
        monte_carlo_percentiles=body.monte_carlo_percentiles,
    )
    return dataclasses.asdict(result)
