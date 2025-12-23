# AGENT.md - AI Agent Guide for "Worth It?" Project

## Project Overview

**"Worth It?"** is a Streamlit-based financial comparison tool that helps professionals evaluate startup job offers against their current job. It calculates opportunity costs, equity valuations, and runs Monte Carlo simulations to quantify financial trade-offs.

**Tech Stack**: Python 3.10+, Streamlit, NumPy, Pandas, SciPy, Plotly

---

## Repository Structure

```
worth_it/
├── app.py                  # Streamlit UI (1059 lines) - User interface & input handling
├── calculations.py         # Core financial logic (781 lines) - All calculations
├── test_calculations.py    # Unit tests (758 lines) - Pytest test suite
├── pyproject.toml         # Dependencies (uv package manager)
├── .python-version        # Python version: 3.10
└── README.md              # Project documentation (currently empty)
```

---

## Getting Started

### Prerequisites

This project uses **`uv`** for Python package management. Do NOT use `pip` or `python` directly.

**Install uv** (if not already installed):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Setup & Running

**1. Install dependencies:**

```bash
uv sync
```

**2. Run the application:**

```bash
uv run streamlit run app.py
```

**3. Run tests:**

```bash
uv run pytest test_calculations.py -v
```

**Important Commands:**

- ✅ **Use**: `uv run pytest` - Runs tests with proper environment
- ✅ **Use**: `uv run streamlit` - Runs Streamlit app with proper environment
- ✅ **Use**: `uv sync` - Installs/updates dependencies
- ❌ **Don't use**: `python -m pytest` - May use wrong Python/packages
- ❌ **Don't use**: `pip install` - Bypasses uv's environment management
- ❌ **Don't use**: `streamlit run` directly - May miss dependencies

---

## Architecture Overview

### Separation of Concerns

The codebase follows a **clean separation** between UI and business logic:

1. **app.py** - Streamlit UI layer
   - Collects user inputs via sidebar widgets
   - Displays results with charts and metrics
   - Contains NO calculation logic (delegates to calculations.py)

2. **calculations.py** - Pure calculation engine
   - UI-agnostic (can be imported and used elsewhere)
   - All financial calculations live here
   - Fully testable without Streamlit

3. **test_calculations.py** - Test suite
   - Comprehensive unit tests for all calculations
   - Uses pytest fixtures for common test data
   - Currently 22 tests, all passing

---

## Key Concepts

### 1. Financial Analysis Flow

```
User Inputs → Monthly Data Grid → Opportunity Cost → Startup Scenario → Metrics (NPV/IRR)
```

**Step-by-step**:

1. **Monthly Data Grid**: Creates month-by-month salary comparison
2. **Opportunity Cost**: Calculates future value of salary difference if invested
3. **Startup Scenario**: Calculates equity value at exit (with dilution, vesting, sales)
4. **Financial Metrics**: Computes NPV, IRR, Net Outcome

### 2. Equity Types

The tool supports two equity compensation types:

#### A. RSUs (Restricted Stock Units)

- Direct equity percentage (e.g., 5%)
- Subject to dilution from funding rounds
- Can model secondary equity sales
- Valued based on company valuation

#### B. Stock Options

- Number of options + strike price
- Profit = (Exit Price - Strike Price) × Vested Options
- Exercise costs can be modeled (early vs. at exit)

### 3. Dilution & Secondary Sales

**Dilution Rounds**: Users can model multiple funding rounds that dilute equity

- Can specify dilution % directly OR calculate from valuation
- Each round has: year, dilution %, optional new salary

**Secondary Sales**: Users can sell vested equity during funding rounds

- Percentage of vested equity at time of sale
- Cash from sale is invested (grows with opportunity cost returns)
- Remaining equity is reduced for final payout
- **Critical**: Sales are percentage of REMAINING equity (after previous sales)

### 4. Monte Carlo Simulations

Two simulation modes:

#### Vectorized (Fast)

- Used when exit year is FIXED
- All calculations done with NumPy arrays (parallelized)
- Variables: valuation, ROI, salary growth, dilution

#### Iterative (Slower)

- Used when exit year is SIMULATED
- Runs full calculation for each simulation
- Necessary because exit year affects vesting, dilution timing, etc.

---

## Critical Code Sections

### 1. Opportunity Cost Calculation

**File**: `calculations.py:63-204`

**Purpose**: Calculates future value of foregone salary if invested at current job

**Key Points**:

- Cash from equity sales is tracked SEPARATELY from opportunity cost
- Equity sale cash is startup-side wealth, NOT foregone BigCorp earnings
- Exercise costs reduce the investable surplus

**Important**:

```python
# Cash from sales is added to final payout, NOT subtracted from opportunity cost
results_df["Cash From Sale (FV)"] = cash_from_sale_future_values
```

### 2. Startup Scenario Calculation

**File**: `calculations.py:217-381`

**Purpose**: Calculates final equity value considering vesting, dilution, and sales

**Key Formula** (RSUs):

```
Final Payout = (Initial Equity % × Cumulative Dilution × Vested % × Remaining Equity Factor)
               × Exit Valuation
               + Cash From Sales (FV)
```

**Critical**:

- `remaining_equity_factor` accounts for sold equity: `(1 - sale_1%) × (1 - sale_2%) × ...`
- Sales after exit year are IGNORED
- Cash from sales is added at the END

### 3. Vectorized Monte Carlo

**File**: `calculations.py:522-683`

**Purpose**: Fast Monte Carlo when exit year is fixed

**Recently Fixed Bugs** (see commit 7953ad4):

- ✅ Now handles equity sales correctly (remaining_equity_factor + cash from sales)
- ✅ Now handles option exercise costs
- ✅ Properly calculates future value of sale proceeds

**Important Code**:

```python
# Lines 604-661: Equity sales handling
# Lines 556-577: Exercise costs handling
```

### 4. Iterative Monte Carlo

**File**: `calculations.py:686-795`

**Purpose**: Monte Carlo when exit year varies

**Recently Fixed Bug** (commit 7953ad4):

- ✅ Now passes `startup_params` and `options_params` to `calculate_annual_opportunity_cost`
- ✅ Now passes `dilution_rounds` to `create_monthly_data_grid`

**Critical**: Must create `sim_startup_params` BEFORE calling `calculate_annual_opportunity_cost`

---

## Testing Strategy

### Test Organization

Tests are organized by functionality:

- **Core Functions** (7 tests): Basic building blocks
- **RSU Scenarios** (3 tests): RSU calculations with/without dilution
- **Stock Options** (1 test): Options valuation
- **Advanced Features** (7 tests): Salary increases, equity sales, multiple sales
- **Monte Carlo** (6 tests): Vectorized, iterative, with equity sales, stock options & exercise costs, year 0 handling, and exercise cost impact

### Running Tests

```bash
uv run pytest test_calculations.py -v        # Run all tests
uv run pytest test_calculations.py::test_name  # Run specific test
uv run pytest test_calculations.py -k "monte_carlo"  # Run matching tests
```

### Adding New Tests

1. Use fixtures for common test data (`monte_carlo_base_params`, `sample_monthly_df`)
2. Test edge cases (cliff before vesting, sales after exit, zero dilution)
3. Verify numerical accuracy with `pytest.approx()`
4. Test that NaN/Inf are handled gracefully

---

## Common Patterns & Conventions

### 1. Parameter Passing

The codebase uses deeply nested dictionaries for parameters:

```python
startup_params = {
    "equity_type": EquityType.RSU,
    "total_vesting_years": 4,
    "cliff_years": 1,
    "exit_year": 5,
    "rsu_params": {
        "equity_pct": 0.05,
        "target_exit_valuation": 20_000_000,
        "simulate_dilution": True,
        "dilution_rounds": [...]
    },
    "options_params": {...}
}
```

**When to pass what**:

- `calculate_annual_opportunity_cost()` needs `startup_params` for equity sales, `options_params` for exercise costs
- `calculate_startup_scenario()` needs full `startup_params`
- Monte Carlo functions need `base_params` (includes all above)

### 2. Equity Sales Calculation Pattern

**Standard pattern** (used in 3 places):

```python
# 1. Calculate vested percentage at sale time
vested_pct_at_sale = np.clip((sale_year / total_vesting_years), 0, 1)
if sale_year < cliff_years:
    vested_pct_at_sale = 0

# 2. Calculate cumulative dilution & sold equity BEFORE this sale
cumulative_dilution_factor = 1.0
cumulative_sold_factor = 1.0
for prev_r in sorted_rounds:
    if prev_r["year"] < sale_year:
        cumulative_dilution_factor *= 1 - prev_r.get("dilution", 0)
        if "percent_to_sell" in prev_r:
            cumulative_sold_factor *= (1 - prev_r["percent_to_sell"])

# 3. Calculate equity at sale
equity_at_sale = initial_equity_pct * cumulative_dilution_factor * cumulative_sold_factor

# 4. Calculate cash from sale
cash_from_sale = vested_pct_at_sale * equity_at_sale * valuation * percent_to_sell
```

### 3. Investment Frequency Handling

The code supports two investment frequencies:

```python
if investment_frequency == "Monthly":
    monthly_roi = annual_to_monthly_roi(annual_roi)
    # Compound monthly
else:  # Annually
    # Compound annually
```

**Both paths must be updated together** when modifying opportunity cost calculations.

### 4. NumPy Broadcasting

Monte Carlo uses NumPy broadcasting heavily:

```python
# Shape: (num_simulations, total_months)
current_salaries = base_salary * ((1 + growth_rates[:, np.newaxis]) ** year_indices)
```

**Be careful**: Ensure array shapes align correctly, especially when adding equity sales or exercise costs.

---

## Common Pitfalls & Gotchas

### 1. ⚠️ Equity Sales vs. Opportunity Cost

**WRONG**:

```python
# DO NOT subtract cash from sales from opportunity cost
opportunity_cost -= cash_from_sales  # ❌
```

**RIGHT**:

```python
# Track separately and add to final payout
results_df["Cash From Sale (FV)"] = cash_from_sales_fv
final_payout += cash_from_sales_fv  # ✅
```

**Why**: Cash from equity sales is startup wealth, not foregone BigCorp earnings.

### 2. ⚠️ Sequential Sales Calculation

**WRONG**:

```python
# Each sale is NOT independent
for sale in sales:
    cash += initial_equity * valuation * sale_pct  # ❌
```

**RIGHT**:

```python
# Each sale is a percentage of REMAINING equity
cumulative_sold_factor = 1.0
for sale in sales:
    equity_at_sale = initial_equity * dilution_factor * cumulative_sold_factor
    cash += equity_at_sale * valuation * sale_pct
    cumulative_sold_factor *= (1 - sale_pct)  # ✅
```

### 3. ⚠️ Exit Year Boundary

**Sales after exit year must be ignored**:

```python
if r["year"] <= exit_year:  # ✅ Include sales AT exit year
    # Process sale
```

### 4. ⚠️ Cliff Vesting

**Vesting is ZERO before cliff**:

```python
vested_pct = np.where(
    years >= cliff_years,  # ✅ Cliff check first
    np.clip(years / total_vesting_years, 0, 1),
    0  # Zero if before cliff
)
```

### 5. ⚠️ Monte Carlo Parameter Passing

**WRONG** (old bug):

```python
opportunity_cost_df = calculate_annual_opportunity_cost(
    monthly_df, roi, frequency  # ❌ Missing startup_params!
)
```

**RIGHT**:

```python
opportunity_cost_df = calculate_annual_opportunity_cost(
    monthly_df, roi, frequency,
    options_params=...,      # ✅ For exercise costs
    startup_params=...       # ✅ For equity sales
)
```

---

## Making Changes Safely

### 1. Before You Start

1. **Read the existing tests** - They document expected behavior
2. **Run tests to establish baseline**: `uv run pytest test_calculations.py -v`
3. **Understand the data flow** - Trace through the calculation chain

### 2. Development Workflow

```bash
# 1. Make changes to calculations.py or app.py
# 2. Run tests
uv run pytest test_calculations.py -v

# 3. If tests fail, debug
uv run pytest test_calculations.py::test_name -v -s

# 4. If you changed behavior, update/add tests
# 5. Re-run all tests
uv run pytest test_calculations.py -v
```

### 3. When to Add Tests

**Always add tests when**:

- Adding a new calculation feature
- Fixing a bug (test should fail before fix, pass after)
- Changing calculation logic

**Test should cover**:

- Happy path (normal inputs)
- Edge cases (zero values, cliff boundaries, sales after exit)
- Different equity types (RSUs vs Options)
- Both investment frequencies (Monthly vs Annually)

### 4. Git Workflow

```bash
# Make sure you're on the right branch
git status

# Stage changes
git add calculations.py test_calculations.py

# Commit with descriptive message
git commit -m "Fix: Brief description

- Bullet point details
- What was wrong
- What is now correct
- Tests added/updated"

# Push to branch (always use -u for first push)
git push -u origin <branch-name>
```

---

## Areas for Future Improvement

### 1. Code Quality

#### A. Type Hints

**Current**: Minimal type hints (`Dict[str, Any]` everywhere)
**Improvement**: Use Pydantic models or TypedDict for better type safety

```python
# Instead of:
def calculate_startup_scenario(params: Dict[str, Any]) -> Dict[str, Any]:
    ...

# Use:
class StartupParams(BaseModel):
    equity_type: EquityType
    total_vesting_years: int
    cliff_years: int
    rsu_params: RSUParams
    options_params: OptionsParams

def calculate_startup_scenario(params: StartupParams) -> StartupResults:
    ...
```

#### B. Reduce Code Duplication

**Issue**: Equity sales calculation is duplicated in 3 places:

1. `calculate_annual_opportunity_cost()` (lines 93-126)
2. `calculate_startup_scenario()` (lines 294-309)
3. `run_monte_carlo_simulation_vectorized()` (lines 604-654)

**Improvement**: Extract to a shared function

```python
def calculate_equity_sales(
    initial_equity_pct: float,
    vested_pct: float,
    dilution_rounds: List[Dict],
    exit_year: int,
    roi: float,
    investment_frequency: str
) -> Tuple[float, float]:
    """Returns (remaining_equity_factor, cash_from_sales_fv)"""
    ...
```

#### C. Magic Numbers

**Issue**: Hard-coded values scattered throughout

```python
gamma = 4.0  # What is this? Why 4.0?
```

**Improvement**: Use named constants

```python
PERT_GAMMA = 4.0  # PERT distribution shape parameter (standard value)
```

### 2. Testing

#### A. Test Coverage

**Current**: ~85% coverage (estimated)
**Missing**:

- Sensitivity analysis edge cases
- Error handling (invalid inputs)
- Very large simulation counts (performance)

**Add tests for**:

```python
def test_invalid_inputs():
    """Test that invalid inputs raise appropriate errors"""
    with pytest.raises(ValueError):
        calculate_dilution_from_valuation(-100, 1000)

def test_extreme_values():
    """Test behavior with extreme but valid inputs"""
    # Very high ROI, very high dilution, etc.

def test_monthly_vs_annual_consistency():
    """Verify monthly and annual investment frequencies give similar results"""
```

#### B. Property-Based Testing

**Current**: Fixed test cases only
**Improvement**: Use Hypothesis for property-based testing

```python
from hypothesis import given, strategies as st

@given(
    equity_pct=st.floats(min_value=0.01, max_value=0.5),
    dilution=st.floats(min_value=0, max_value=0.9),
    valuation=st.floats(min_value=1e6, max_value=1e9)
)
def test_final_payout_never_negative(equity_pct, dilution, valuation):
    """Final payout should never be negative regardless of inputs"""
    result = calculate_startup_scenario(...)
    assert result["final_payout_value"] >= 0
```

### 3. Performance

#### A. Monte Carlo Optimization

**Current**: Iterative mode is very slow for large simulations
**Improvement**:

1. Vectorize more of the iterative calculation
2. Use Numba JIT compilation for hot loops
3. Add progress indicators for long-running simulations

```python
from numba import jit

@jit(nopython=True)
def calculate_opportunity_costs_vectorized(salaries, roi, months):
    """JIT-compiled vectorized calculation"""
    ...
```

#### B. Caching

**Improvement**: Cache repeated calculations (e.g., PERT distributions)

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_pert_samples(min_val, max_val, mode, size):
    """Cache PERT samples for repeated configs"""
    ...
```

### 4. Features

#### A. Tax Modeling

**Missing**: No tax calculations (AMT for options, capital gains, income tax)
**Impact**: Results can be significantly off without tax considerations

**Improvement**:

```python
class TaxParams:
    income_tax_rate: float
    capital_gains_rate: float
    amt_rate: float  # Alternative Minimum Tax

def calculate_after_tax_outcome(..., tax_params: TaxParams):
    ...
```

#### B. Vesting Acceleration

**Missing**: No modeling of acceleration clauses (single/double trigger)
**Common in acquisitions**: Equity vests faster on acquisition

#### C. Risk-Adjusted Returns

**Missing**: No explicit risk adjustment (only via failure probability)
**Improvement**: Allow users to specify risk-free rate for Sharpe ratio calculation

#### D. Comparison Mode

**Missing**: Can't compare multiple offers side-by-side
**Improvement**: Allow saving multiple scenarios and comparing them

### 5. UI/UX

#### A. Input Validation

**Current**: Minimal validation, easy to enter nonsensical values
**Improvement**: Add validation with helpful error messages

```python
if cliff_years > total_vesting_years:
    st.error("⚠️ Cliff period cannot exceed total vesting period!")
    st.stop()

if equity_pct > 0.5:
    st.warning("⚠️ Equity grant over 50% is unusual. Double-check your input.")
```

#### B. Guided Tour

**Missing**: New users may not understand inputs
**Improvement**: Add interactive tutorial/walkthrough

#### C. Save/Load Scenarios

**Missing**: Can't save configurations
**Improvement**: Export/import scenarios as JSON

```python
if st.button("Save Scenario"):
    scenario_json = json.dumps(get_all_params(), indent=2)
    st.download_button("Download", scenario_json, "scenario.json")
```

### 6. Documentation

#### A. README.md

**Current**: Empty
**Needed**:

- Project description
- Installation instructions
- Usage guide with screenshots
- Example scenarios

#### B. Docstring Improvements

**Current**: Basic docstrings
**Improvement**: Add examples and parameter descriptions

```python
def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR).

    Parameters
    ----------
    monthly_surpluses : pd.Series
        Month-by-month difference between current job and startup salaries.
        Positive values mean current job pays more (you're sacrificing income).
    final_payout_value : float
        The final equity payout at exit (in SAR).

    Returns
    -------
    float
        Annualized IRR as a percentage (e.g., 15.5 for 15.5%).
        Returns np.nan if IRR cannot be calculated (no sign changes in cash flows).

    Examples
    --------
    >>> surpluses = pd.Series([2000] * 60)  # 5 years of 2000 SAR/month sacrifice
    >>> payout = 2_000_000  # 2M SAR exit
    >>> irr = calculate_irr(surpluses, payout)
    >>> print(f"IRR: {irr:.1f}%")
    IRR: 23.5%

    Notes
    -----
    Uses numpy-financial's IRR function, which requires both positive and
    negative cash flows. If all cash flows have the same sign, returns np.nan.
    """
    ...
```

---

## Debugging Tips

### 1. Monte Carlo Issues

**Symptom**: Tests fail with NaN or Inf values

**Debug**:

```python
# Add assertions to catch early
assert not np.any(np.isnan(final_opportunity_cost)), "NaN in opportunity cost"
assert not np.any(np.isinf(final_payout_value)), "Inf in payout value"

# Print intermediate values
print(f"ROI range: {sim_params['roi'].min():.4f} to {sim_params['roi'].max():.4f}")
print(f"Valuation range: {sim_params['valuation'].min():,.0f} to {sim_params['valuation'].max():,.0f}")
```

### 2. Array Shape Mismatches

**Symptom**: `ValueError: operands could not be broadcast together`

**Debug**:

```python
# Print shapes before operations
print(f"investable_surpluses shape: {investable_surpluses.shape}")
print(f"exercise_costs shape: {exercise_costs.shape}")
print(f"roi shape: {sim_params['roi'].shape}")

# Ensure correct broadcasting
assert investable_surpluses.shape[0] == num_simulations
assert investable_surpluses.shape[1] == total_months
```

### 3. Test Failures

**Symptom**: `AssertionError: assert X == pytest.approx(Y)`

**Debug**:

```python
# Print actual vs expected
print(f"Expected: {expected:.10f}")
print(f"Actual:   {actual:.10f}")
print(f"Diff:     {abs(expected - actual):.10f}")

# Check intermediate calculations
print(f"Vested equity: {vested_equity_pct}")
print(f"Dilution factor: {cumulative_dilution}")
print(f"Remaining factor: {remaining_equity_factor}")
```

### 4. Streamlit Issues

**Symptom**: App crashes or shows wrong values

**Debug**:

```python
# Add debug expander
with st.expander("🐛 Debug Info"):
    st.write("startup_params:", startup_params)
    st.write("monthly_df shape:", monthly_df.shape)
    st.write("opportunity_cost_df:", opportunity_cost_df)
```

---

## Quick Reference

### Key Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `create_monthly_data_grid()` | Month-by-month salary comparison | `calculations.py:22` |
| `calculate_annual_opportunity_cost()` | Future value of foregone salary | `calculations.py:64` |
| `calculate_startup_scenario()` | Final equity value with dilution/sales | `calculations.py:229` |
| `calculate_irr()` | Internal Rate of Return | `calculations.py:384` |
| `calculate_npv()` | Net Present Value | `calculations.py:406` |
| `run_monte_carlo_simulation()` | Main MC dispatcher | `calculations.py:450` |
| `run_monte_carlo_simulation_vectorized()` | Fast MC (fixed exit year) | `calculations.py:522` |
| `run_monte_carlo_simulation_iterative()` | Slow MC (variable exit year) | `calculations.py:686` |
| `run_sensitivity_analysis()` | Variable impact analysis | `calculations.py:798` |

### Important Constants

```python
# app.py
EquityType.RSU = "Equity (RSUs)"
EquityType.STOCK_OPTIONS = "Stock Options"

# calculations.py
PERT_GAMMA = 4.0  # Used in PERT distribution
```

### Test Fixtures

```python
@pytest.fixture
def monte_carlo_base_params():
    """Standard params for Monte Carlo tests"""
    # See test_calculations.py:36

@pytest.fixture
def sample_monthly_df():
    """5-year monthly data grid"""
    # See test_calculations.py:16

@pytest.fixture
def sample_opportunity_cost_df():
    """Opportunity cost for 4 years"""
    # See test_calculations.py:27
```

---

## Questions to Ask When Reviewing Code

1. **Does it handle both RSUs and Stock Options?**
2. **Does it work for both Monthly and Annual investment frequencies?**
3. **Does it ignore equity sales after exit year?**
4. **Does it properly account for the cliff period?**
5. **Does it track cash from sales separately from opportunity cost?**
6. **For Monte Carlo changes: does it work for both vectorized AND iterative modes?**
7. **Are array shapes compatible (for NumPy operations)?**
8. **Are there tests covering the new behavior?**
9. **Does it handle edge cases (zero values, equal min/max, etc.)?**
10. **Is the calculation documented with comments explaining the "why"?**

---

## Additional Resources

- **NumPy Broadcasting**: <https://numpy.org/doc/stable/user/basics.broadcasting.html>
- **PERT Distribution**: <https://en.wikipedia.org/wiki/PERT_distribution>
- **IRR Calculation**: <https://numpy.org/numpy-financial/latest/irr.html>
- **Monte Carlo Methods**: <https://en.wikipedia.org/wiki/Monte_Carlo_method>
- **Streamlit Docs**: <https://docs.streamlit.io>

---

## Contact & Support

**Original Author**: Eyad Sibai (<https://linkedin.com/in/eyadsibai>)

**Recent Major Fixes**:

- **Commit 1097421** (2025-01-07): Fixed critical exercise cost logic bug where exercise costs were INCREASING outcomes instead of decreasing them
  - Exercise costs now properly tracked and subtracted from final outcomes
  - Added comprehensive test `test_exercise_costs_reduce_net_outcomes()`
  - Fixed in both vectorized and iterative Monte Carlo paths
- **Commit 7953ad4**: Fixed Monte Carlo equity sales handling, option exercise costs, and iterative MC parameter passing
- **Commit 80063b3**: Fixed year 0 support and improved equity sale vesting clarity
- **Commit a7daad5**: Added comprehensive AGENT.md documentation

---

*Last Updated*: 2025-01-07 (after commit 1097421)
*Version*: 0.1.0
*Python*: 3.10+
*Package Manager*: uv

---

## Final Notes for AI Agents

1. **ALWAYS use `uv` commands** - Never use `python`, `pip`, or direct command execution
   - ✅ `uv run pytest` - NOT `python -m pytest`
   - ✅ `uv run streamlit` - NOT `streamlit run`
   - ✅ `uv sync` - NOT `pip install`
2. **Always run tests before and after changes**: `uv run pytest test_calculations.py -v`
3. **The separation between calculations.py and app.py is sacred** - don't add calculations to app.py
4. **Cash from equity sales is startup wealth, not opportunity cost** - this is counterintuitive but critical
5. **Sequential equity sales are percentages of REMAINING equity** - not independent
6. **Read the recent commit messages** - they often explain subtle bugs and fixes
7. **When in doubt, add a test** - tests are the specification
8. **NumPy vectorization is tricky** - verify shapes carefully when modifying Monte Carlo code

Good luck! 🚀
