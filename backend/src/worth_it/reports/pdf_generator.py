"""PDF report generator using ReportLab."""

from __future__ import annotations

import io
from typing import TYPE_CHECKING

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

if TYPE_CHECKING:
    from reportlab.platypus import Flowable

    from .models import ValuationReportData

# Brand colors matching frontend
BRAND_PRIMARY = colors.HexColor("#1A3D2E")  # Deep forest green
BRAND_SECONDARY = colors.HexColor("#2D5A45")  # Lighter green


def generate_pdf_report(report_data: ValuationReportData) -> bytes:
    """Generate a PDF report from valuation data.

    Args:
        report_data: Complete report data structure

    Returns:
        PDF file contents as bytes
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    # Build document content
    story: list[Flowable] = []
    styles = _create_styles()

    # Title section
    story.append(Paragraph(report_data.title, styles["Title"]))
    story.append(Spacer(1, 12))

    # Report metadata
    meta_data = [
        ["Company:", report_data.company_name],
        ["Date:", report_data.report_date],
        ["Prepared By:", report_data.prepared_by],
        ["Method:", report_data.valuation_method],
    ]

    if report_data.industry:
        meta_data.append(["Industry:", report_data.industry])

    if report_data.monte_carlo_enabled:
        meta_data.append(["Monte Carlo:", "Enabled"])

    meta_table = Table(meta_data, colWidths=[1.5 * inch, 4 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TEXTCOLOR", (0, 0), (0, -1), BRAND_PRIMARY),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 24))

    # Sections
    for section in report_data.sections:
        story.append(Paragraph(section.title, styles["Heading1"]))
        story.append(Spacer(1, 6))

        if section.content:
            story.append(Paragraph(section.content, styles["BodyText"]))
            story.append(Spacer(1, 12))

        # Section metrics as table
        if section.metrics:
            metric_data = [["Metric", "Value", "Description"]]
            for metric in section.metrics:
                metric_data.append([metric.name, metric.formatted_value, metric.description])

            metric_table = Table(
                metric_data,
                colWidths=[1.5 * inch, 1.5 * inch, 3.5 * inch],
            )
            metric_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ]
                )
            )
            story.append(metric_table)
            story.append(Spacer(1, 18))

    # Assumptions
    if report_data.assumptions:
        story.append(Paragraph("Key Assumptions", styles["Heading2"]))
        story.append(Spacer(1, 6))
        for assumption in report_data.assumptions:
            bullet = f"• {assumption}"
            story.append(Paragraph(bullet, styles["BodyText"]))
        story.append(Spacer(1, 18))

    # Disclaimers
    if report_data.disclaimers:
        story.append(Paragraph("Disclaimers", styles["Heading2"]))
        story.append(Spacer(1, 6))
        for disclaimer in report_data.disclaimers:
            story.append(Paragraph(disclaimer, styles["Disclaimer"]))
        story.append(Spacer(1, 12))

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def _create_styles() -> dict[str, ParagraphStyle]:
    """Create custom paragraph styles for the report."""
    base_styles = getSampleStyleSheet()

    styles = {
        "Title": ParagraphStyle(
            "CustomTitle",
            parent=base_styles["Title"],
            fontSize=24,
            textColor=BRAND_PRIMARY,
            spaceAfter=12,
        ),
        "Heading1": ParagraphStyle(
            "CustomHeading1",
            parent=base_styles["Heading1"],
            fontSize=14,
            textColor=BRAND_PRIMARY,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "Heading2": ParagraphStyle(
            "CustomHeading2",
            parent=base_styles["Heading2"],
            fontSize=12,
            textColor=BRAND_SECONDARY,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "BodyText": ParagraphStyle(
            "CustomBody",
            parent=base_styles["BodyText"],
            fontSize=10,
            leading=14,
        ),
        "Disclaimer": ParagraphStyle(
            "Disclaimer",
            parent=base_styles["BodyText"],
            fontSize=8,
            textColor=colors.grey,
            fontName="Helvetica-Oblique",
        ),
    }

    return styles
