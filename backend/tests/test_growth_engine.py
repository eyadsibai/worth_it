from worth_it.growth_engine import (
    GrowthConfig,
    MarketSentiment,
    get_market_multiple,
    simulate_growth,
)


def test_get_market_multiple():
    assert get_market_multiple(MarketSentiment.BULL) > get_market_multiple(MarketSentiment.NORMAL)
    assert get_market_multiple(MarketSentiment.NORMAL) > get_market_multiple(MarketSentiment.BEAR)

def test_simulate_growth_basic():
    config = GrowthConfig(
        starting_arr=1000000,
        starting_cash=2000000,
        monthly_burn_rate=100000,
        mom_growth_rate=0.05,
        churn_rate=0.01,
        market_sentiment=MarketSentiment.NORMAL
    )

    df = simulate_growth(12, config)

    assert len(df) == 12
    assert "MRR" in df.columns
    assert "ARR" in df.columns
    assert "Cash" in df.columns
    assert "Valuation" in df.columns
    assert "Runway" in df.columns

    # Check growth
    assert df["ARR"].iloc[-1] > df["ARR"].iloc[0]

    # Check cash burn
    assert df["Cash"].iloc[-1] < df["Cash"].iloc[0]

def test_simulate_growth_runway_calculation():
    config = GrowthConfig(
        starting_arr=0,
        starting_cash=100000,
        monthly_burn_rate=10000,
        mom_growth_rate=0,
        churn_rate=0,
        market_sentiment=MarketSentiment.NORMAL
    )

    df = simulate_growth(5, config)

    # Initial runway should be roughly cash / burn
    # Note: simulate_growth calculates runway based on current cash and burn
    initial_runway = df["Runway"].iloc[0]
    assert 9 <= initial_runway <= 11  # 100k / 10k = 10 months (approx)

def test_simulate_growth_market_sentiment_impact():
    base_config = GrowthConfig(
        starting_arr=1000000,
        starting_cash=2000000,
        monthly_burn_rate=100000,
        mom_growth_rate=0.05,
        churn_rate=0.01,
        market_sentiment=MarketSentiment.NORMAL
    )

    bull_config = GrowthConfig(
        starting_arr=1000000,
        starting_cash=2000000,
        monthly_burn_rate=100000,
        mom_growth_rate=0.05,
        churn_rate=0.01,
        market_sentiment=MarketSentiment.BULL
    )

    df_normal = simulate_growth(12, base_config)
    df_bull = simulate_growth(12, bull_config)

    # Bull market should have higher valuation for same metrics
    assert df_bull["Valuation"].iloc[-1] > df_normal["Valuation"].iloc[-1]
