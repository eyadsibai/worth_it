from fastapi.testclient import TestClient

from worth_it.api import app

client = TestClient(app)

def test_simulate_growth_endpoint():
    payload = {
        "starting_arr": 1000000,
        "starting_cash": 2000000,
        "monthly_burn_rate": 150000,
        "mom_growth_rate": 5,
        "churn_rate": 1,
        "market_sentiment": "NORMAL",
        "months": 12
    }

    response = client.post("/simulate-growth", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert len(data["data"]) == 12

    first_month = data["data"][0]
    assert "ARR" in first_month
    assert "Valuation" in first_month

def test_simulate_growth_endpoint_validation():
    # Test invalid sentiment
    payload = {
        "starting_arr": 1000000,
        "starting_cash": 2000000,
        "monthly_burn_rate": 150000,
        "mom_growth_rate": 5,
        "churn_rate": 1,
        "market_sentiment": "INVALID",
        "months": 12
    }

    response = client.post("/simulate-growth", json=payload)
    assert response.status_code == 422  # Validation error
