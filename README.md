# Worth It – Financial Journey Sandbox

This project compares the financial trajectory of your current job against a startup offer. It exposes a FastAPI backend that serves a bespoke dashboard built with vanilla HTML, CSS, and JavaScript.

## Getting Started

Install the dependencies and run the API using Uvicorn:

```bash
uv pip install -e .
uv run uvicorn app:app --reload
```

The dashboard is available at [http://localhost:8000](http://localhost:8000).

## Project Structure

```
calculations.py      # Core financial calculations
app.py               # FastAPI app and REST endpoints
static/              # Front-end assets (CSS + JavaScript)
templates/           # Jinja2 templates for the dashboard shell
```

Unit tests focus on the calculation engine:

```bash
uv run pytest
```
