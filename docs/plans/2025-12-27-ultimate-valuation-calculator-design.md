# Ultimate Startup Valuation Calculator - Design Document

**Date:** 2025-12-27
**Status:** Approved
**Author:** Claude + User Collaboration

---

## Executive Summary

Transform the existing 3-method valuation calculator into the **ultimate, comprehensive startup valuation toolkit** covering 15+ valuation methods across all company stages, with guided wizards, Monte Carlo simulation layers, built-in industry benchmarks, and multiple export formats.

**Primary Audience:** Founders (with support for Investors and Advisors)
**Key Differentiator:** First Chicago Method + Monte Carlo uncertainty on ALL methods + Negotiation toolkit

---

## 1. Valuation Methods Library

### 1.1 Pre-Revenue / Idea Stage

| Method | Description | Key Inputs |
|--------|-------------|------------|
| **Berkus Method** | Assigns $0-500K per risk factor | Team, prototype, partnerships, market, sales |
| **Scorecard Method** | Compares to average regional angel deal | Team, opportunity, product, competitive, marketing, funding need |
| **Risk Factor Summation** | Starts at baseline, adjusts for 12 risk categories | Management, stage, legislation, manufacturing, sales, funding, competition, technology, litigation, international, reputation, exit |
| **Payne Method** | Backward from founder dilution targets | Target raise, acceptable dilution, stage |
| **Cost-to-Duplicate** | What it would cost to rebuild from scratch | Development costs, IP value, team replacement cost |

### 1.2 Early Stage (Seed / Series A)

| Method | Description | Key Inputs |
|--------|-------------|------------|
| **First Chicago Method** ⭐ | Multi-scenario with probabilities | Success/survival/failure outcomes, probability weights, exit timeline |
| **Venture Capital Method** | Backward from target exit and returns | Exit value, target multiple/IRR, dilution, exit probability |
| **Comparable Transactions** | Recent deals at similar stage/sector | Sector, stage, geography, deal date range |
| **Scorecard + Comparables Hybrid** | Enhanced scorecard with market data | Scorecard factors + comparable deal multiples |

### 1.3 Growth Stage (Series B+)

| Method | Description | Key Inputs |
|--------|-------------|------------|
| **Revenue Multiples** | ARR × industry multiple | Annual revenue, growth rate, industry, stage |
| **DCF (Discounted Cash Flow)** | Intrinsic value from projected cash flows | Projected cash flows, discount rate, terminal growth |
| **Precedent Transactions** | M&A comps in sector | Sector, deal size range, date range |
| **LBO Analysis** | What a PE buyer would pay | EBITDA, leverage ratios, target IRR |

### 1.4 Advanced / State-of-the-Art

| Method | Description | Key Inputs |
|--------|-------------|------------|
| **Real Options** | Values optionality and pivot potential | Base case NPV, volatility, option parameters |
| **AI-Enhanced Comps** | Pattern matching to similar companies | Company profile (future API integration) |

### 1.5 Monte Carlo Simulation Layer

Monte Carlo is NOT a standalone method but an **enhancement layer** applicable to ANY method:

- Any numeric input can be converted to a distribution (uniform, normal, triangular)
- Runs 10,000 simulations per method
- Outputs: P10, P50 (median), P90, histogram, confidence intervals
- Cross-method Monte Carlo: overlapping probability curves

**Example transformation:**
```
Single Value Input:        Monte Carlo Input:
Revenue Multiple: 8x  →    Revenue Multiple: 6x - 12x (normal, σ=1.5)
Exit Probability: 30% →    Exit Probability: 15% - 45% (triangular, mode=30%)
```

---

## 2. User Experience & Navigation

### 2.1 Three-Mode Interface

#### Mode 1: Guided Wizard (Default)

```
Step 1: Stage Selection
┌─────────────────────────────────────────────────────────┐
│  What stage is your startup?                            │
│                                                         │
│  ○ Pre-revenue / Idea                                   │
│  ○ Seed (some revenue or strong traction)               │
│  ○ Series A (proven product-market fit)                 │
│  ○ Series B+ (scaling)                                  │
│  ○ Late Stage / Pre-IPO                                 │
└─────────────────────────────────────────────────────────┘

Step 2: Data Availability
┌─────────────────────────────────────────────────────────┐
│  What data do you have? (check all that apply)          │
│                                                         │
│  ☐ Annual revenue / ARR                                 │
│  ☐ Financial projections (3-5 years)                    │
│  ☐ Comparable company data                              │
│  ☐ Recent funding round terms                           │
│  ☐ Exit comparables in your sector                      │
└─────────────────────────────────────────────────────────┘

Step 3: Goal Selection
┌─────────────────────────────────────────────────────────┐
│  What's your primary goal?                              │
│                                                         │
│  ○ Preparing for fundraising                            │
│  ○ Evaluating an acquisition offer                      │
│  ○ Internal planning / equity allocation                │
│  ○ Investor due diligence                               │
└─────────────────────────────────────────────────────────┘

→ Output: Recommended 2-4 methods with pre-filled smart defaults
```

#### Mode 2: Category Explorer

Horizontal tabs with method cards:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Pre-Revenue  │ Early Stage  │ Growth Stage │ Late Stage   │ Advanced     │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Berkus Method   │  │ Scorecard       │  │ Risk Factor     │
│                 │  │                 │  │ Summation       │
│ Best for: Idea  │  │ Best for: Angel │  │                 │
│ stage with team │  │ round prep      │  │ Best for: Risk  │
│ and prototype   │  │                 │  │ assessment      │
│                 │  │                 │  │                 │
│ [Calculate →]   │  │ [Calculate →]   │  │ [Calculate →]   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### Mode 3: Power Dashboard

```
┌──────────────────────────────────────┬──────────────────────────────────┐
│ UNIFIED INPUTS                       │ LIVE RESULTS                     │
│                                      │                                  │
│ Company Stage: [Seed ▾]              │ ┌──────────────────────────────┐ │
│ Sector: [SaaS B2B ▾]                 │ │ VALUATION RANGE              │ │
│ Annual Revenue: [$500,000]           │ │ $4.2M ────●──────── $12.8M   │ │
│ Growth Rate: [80%]                   │ │      Weighted Avg: $7.4M     │ │
│ Exit Timeline: [5 years]             │ └──────────────────────────────┘ │
│ Target Exit: [$100M]                 │                                  │
│                                      │ ┌──────────────────────────────┐ │
│ ☑ Revenue Multiple  [🎲 Monte Carlo] │ │ Revenue Multiple    ████ $8M │ │
│ ☑ First Chicago     [🎲 Monte Carlo] │ │ First Chicago    ██████ $12M │ │
│ ☑ VC Method         [🎲 Monte Carlo] │ │ VC Method          ███ $6.5M │ │
│ ☐ DCF                                │ │ Scorecard         ████ $5.2M │ │
│ ☑ Scorecard                          │ └──────────────────────────────┘ │
│                                      │                                  │
│ [Calculate All]                      │ Confidence: ████████░░ 78%       │
└──────────────────────────────────────┴──────────────────────────────────┘
```

### 2.2 Persona Switcher

Top-right dropdown affecting terminology and emphasis:

| Persona | Emphasis | Language |
|---------|----------|----------|
| 🎯 Founder | Negotiation range, confidence building | "Your company is worth..." |
| 💼 Investor | Risk-adjusted returns, portfolio fit | "This deal offers..." |
| 📊 Advisor | Methodology rigor, multiple perspectives | "Analysis suggests..." |

---

## 3. Built-in Intelligence & Benchmarks

### 3.1 Industry Benchmark Database

```json
{
  "saas_b2b": {
    "seed": {
      "revenue_multiple_range": [10, 20],
      "typical_dilution": [0.15, 0.25],
      "median_deal_size": [2000000, 4000000],
      "median_arr_at_raise": [100000, 500000]
    },
    "series_a": {
      "revenue_multiple_range": [8, 15],
      "typical_dilution": [0.20, 0.30],
      "median_deal_size": [8000000, 15000000],
      "median_arr_at_raise": [1000000, 3000000]
    }
  },
  "fintech": { ... },
  "consumer": { ... },
  "biotech": { ... },
  "hardware": { ... }
}
```

**Sectors covered (15+):**
SaaS B2B, SaaS B2C, Fintech, Consumer, E-commerce, Marketplace, Biotech/Pharma, Medtech, Hardware, Climate/Cleantech, AI/ML, Crypto/Web3, Gaming, Media, Enterprise Software

### 3.2 Smart Validation & Warnings

```typescript
interface ValidationResult {
  level: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

// Examples:
{ level: 'warning',
  message: 'Your 25x multiple is above the 90th percentile for SaaS Seed deals',
  suggestion: 'Consider if exceptional growth (>100% YoY) justifies premium' }

{ level: 'info',
  message: 'Companies with 100%+ growth typically command 1.5-2x premium multiples' }

{ level: 'error',
  message: 'Exit probability cannot exceed 100%' }
```

### 3.3 Method Recommendations Engine

```python
def recommend_methods(stage: str, data_available: list[str], goal: str) -> list[str]:
    """
    Returns ranked list of applicable methods based on context.
    """
    recommendations = []

    if stage == "pre_revenue":
        recommendations = ["berkus", "scorecard", "risk_factor"]
        if "team_info" in data_available:
            recommendations.insert(0, "berkus")  # Prioritize Berkus

    elif stage == "seed":
        recommendations = ["first_chicago", "scorecard_hybrid", "vc_method"]
        if "revenue" in data_available:
            recommendations.insert(0, "revenue_multiple")

    # ... etc

    return recommendations[:4]  # Return top 4
```

---

## 4. Outputs & Deliverables

### 4.1 Live Results Dashboard

Components:
- `ValuationRangeBar` - Visual min/max/weighted average
- `ConfidenceMeter` - Aggregated score with breakdown
- `MethodComparisonChart` - Horizontal bar chart
- `KeyAssumptionsSummary` - One-liner per method
- `MonteCarloDistribution` - Histogram when simulations enabled

### 4.2 Comprehensive Report (Export)

```
VALUATION REPORT
================

1. EXECUTIVE SUMMARY
   - Recommended valuation: $7.2M - $12.8M
   - Weighted average: $9.4M
   - Confidence level: High (82%)
   - Primary drivers: Strong growth (85% YoY), SaaS metrics

2. METHODOLOGY DEEP-DIVE

   2.1 First Chicago Method
       ├── Success scenario (40%): $25M exit → $12.5M valuation
       ├── Survival scenario (45%): $8M exit → $4M valuation
       └── Failure scenario (15%): $0 exit → $0 valuation
       Result: $7.8M weighted average

   2.2 Revenue Multiple
       ├── ARR: $1.2M
       ├── Multiple: 8x (industry median: 7x, premium for growth)
       └── Growth adjustment: 1.2x
       Result: $11.5M

   2.3 [Additional methods...]

3. MARKET CONTEXT
   - Comparable deals: [List of 5-10 similar raises]
   - Industry benchmarks: [How you compare]
   - Market conditions: [Current environment]

4. APPENDIX
   - Monte Carlo distributions
   - Full input assumptions
   - Data sources
```

### 4.3 Negotiation Toolkit

```
YOUR NEGOTIATION POSITION
=========================

FLOOR (Defend vigorously below this):     $6.5M
├── Justification: DCF with conservative assumptions
└── Counter if challenged: "Even with 50% discount to projections..."

TARGET (Anchor here):                      $10M
├── Justification: Revenue multiple at sector median
└── Talking point: "Comparable companies raised at 8-12x..."

CEILING (Aspirational):                    $15M
├── Justification: First Chicago success-weighted
└── Use when: Strong competitive dynamics, multiple term sheets

COUNTER-ARGUMENT CARDS:
┌────────────────────────────────────────────────────────────────┐
│ If they say: "Your multiple is too high"                       │
│ Respond with: "Our 85% growth rate is 2x sector median,        │
│               which historically commands 1.5x premium"         │
├────────────────────────────────────────────────────────────────┤
│ If they say: "We see risk in your market"                      │
│ Respond with: "Our First Chicago model already discounts for   │
│               35% failure probability - built into our ask"    │
└────────────────────────────────────────────────────────────────┘

COMPARABLE DEALS:
• CompanyA (2024): $8M Seed at $1M ARR = 8x multiple
• CompanyB (2024): $12M Seed at $800K ARR, 120% growth = 15x
• CompanyC (2023): $6M Seed at $600K ARR = 10x multiple
```

### 4.4 Export Formats

| Format | Use Case |
|--------|----------|
| PDF | Formal reports, investor meetings |
| DOCX | Editable documents, customization |
| Google Docs | Collaborative editing, sharing |
| CSV | Raw data, spreadsheet analysis |
| JSON | API integration, programmatic use |

---

## 5. Technical Architecture

### 5.1 Frontend Structure

```
/app/valuation/
├── page.tsx                    # Main entry with mode switcher
├── wizard/
│   ├── page.tsx               # Guided wizard flow
│   └── components/
│       ├── stage-step.tsx
│       ├── data-step.tsx
│       └── goal-step.tsx
├── explorer/
│   └── page.tsx               # Category-based exploration
├── dashboard/
│   └── page.tsx               # Power-user unified view
└── layout.tsx                  # Shared layout with persona switcher

/components/valuation/
├── methods/
│   ├── pre-revenue/
│   │   ├── berkus-form.tsx
│   │   ├── scorecard-form.tsx
│   │   ├── risk-factor-form.tsx
│   │   ├── payne-form.tsx
│   │   └── cost-to-duplicate-form.tsx
│   ├── early-stage/
│   │   ├── first-chicago-form.tsx
│   │   ├── vc-method-form.tsx
│   │   ├── comparable-transactions-form.tsx
│   │   └── scorecard-hybrid-form.tsx
│   ├── growth-stage/
│   │   ├── revenue-multiple-form.tsx
│   │   ├── dcf-form.tsx
│   │   ├── precedent-transactions-form.tsx
│   │   └── lbo-form.tsx
│   └── advanced/
│       └── real-options-form.tsx
├── shared/
│   ├── monte-carlo-toggle.tsx
│   ├── range-input.tsx
│   ├── benchmark-indicator.tsx
│   ├── persona-switcher.tsx
│   ├── method-card.tsx
│   └── validation-message.tsx
├── outputs/
│   ├── valuation-summary.tsx
│   ├── method-comparison-chart.tsx
│   ├── monte-carlo-histogram.tsx
│   ├── negotiation-toolkit.tsx
│   ├── report-generator.tsx
│   └── export-buttons.tsx
└── wizard/
    ├── wizard-container.tsx
    ├── step-indicator.tsx
    └── recommendation-card.tsx
```

### 5.2 Backend Structure

```
/calculations/valuation/
├── __init__.py
├── pre_revenue/
│   ├── __init__.py
│   ├── berkus.py
│   ├── scorecard.py
│   ├── risk_factor.py
│   ├── payne.py
│   └── cost_to_duplicate.py
├── early_stage/
│   ├── __init__.py
│   ├── first_chicago.py
│   ├── vc_method.py
│   ├── comparable_transactions.py
│   └── scorecard_hybrid.py
├── growth_stage/
│   ├── __init__.py
│   ├── revenue_multiple.py
│   ├── dcf.py
│   ├── precedent_transactions.py
│   └── lbo.py
├── advanced/
│   ├── __init__.py
│   └── real_options.py
├── monte_carlo.py          # Simulation engine for any method
├── benchmarks/
│   ├── __init__.py
│   ├── data/
│   │   ├── saas_b2b.json
│   │   ├── fintech.json
│   │   └── ... (15+ sectors)
│   ├── loader.py
│   └── validator.py
├── comparison.py            # Cross-method analysis
├── recommendations.py       # Method recommendation engine
└── insights.py              # Insight generation

/api/routers/valuation.py    # Extended endpoints
```

### 5.3 API Endpoints

```python
# Individual method endpoints
POST /api/valuation/berkus
POST /api/valuation/scorecard
POST /api/valuation/risk-factor
POST /api/valuation/payne
POST /api/valuation/cost-to-duplicate
POST /api/valuation/first-chicago
POST /api/valuation/vc-method
POST /api/valuation/comparable-transactions
POST /api/valuation/revenue-multiple
POST /api/valuation/dcf
POST /api/valuation/precedent-transactions
POST /api/valuation/lbo
POST /api/valuation/real-options

# Monte Carlo wrapper (applies to any method)
POST /api/valuation/{method}/monte-carlo

# Comparison and analysis
POST /api/valuation/compare
POST /api/valuation/recommend

# Benchmarks
GET /api/valuation/benchmarks/{sector}/{stage}
GET /api/valuation/benchmarks/sectors

# Export
POST /api/valuation/export/pdf
POST /api/valuation/export/docx
POST /api/valuation/export/csv
```

### 5.4 Data Models

```python
# Shared base for all methods
class ValuationInput(BaseModel):
    sector: str | None = None
    stage: str | None = None
    monte_carlo_enabled: bool = False
    monte_carlo_iterations: int = 10000

class ValuationResult(BaseModel):
    method: str
    valuation: float
    confidence: float
    inputs: dict
    notes: str
    monte_carlo: MonteCarloResult | None = None

class MonteCarloResult(BaseModel):
    p10: float
    p50: float
    p90: float
    mean: float
    std_dev: float
    histogram: list[HistogramBin]

# First Chicago specific
class FirstChicagoInput(ValuationInput):
    success_exit_value: float
    success_probability: float
    survival_exit_value: float
    survival_probability: float
    failure_probability: float
    exit_year: int
    discount_rate: float

# ... (models for each method)
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Refactor existing 3 methods into new architecture
- [ ] Add First Chicago Method
- [ ] Create unified input component system
- [ ] Build method comparison chart

### Phase 2: Pre-Revenue Methods (Week 3)
- [ ] Implement Berkus, Scorecard, Risk Factor, Payne, Cost-to-Duplicate
- [ ] Add pre-revenue category tab
- [ ] Create smart defaults for pre-revenue

### Phase 3: Monte Carlo Layer (Week 4)
- [ ] Build range input component
- [ ] Implement Monte Carlo simulation engine
- [ ] Add histogram visualization
- [ ] Enable per-method toggle

### Phase 4: Benchmarks & Intelligence (Week 5)
- [ ] Load industry benchmark data
- [ ] Build validation engine
- [ ] Create recommendation engine
- [ ] Add contextual warnings

### Phase 5: Wizard & UX (Week 6)
- [ ] Build 3-step wizard flow
- [ ] Implement category explorer view
- [ ] Create power dashboard
- [ ] Add persona switcher

### Phase 6: Outputs & Polish (Week 7)
- [ ] Build negotiation toolkit
- [ ] Implement PDF/DOCX export
- [ ] Add comprehensive report generator
- [ ] Final UX polish and testing

---

## 7. Success Metrics

- **Completeness:** All 15 methods implemented and tested
- **Accuracy:** Valuations within 10% of manual calculations
- **Performance:** Results in <2s for single method, <10s for Monte Carlo
- **Usability:** Wizard completion rate >80%
- **Adoption:** >50% of users try multiple methods

---

## 8. Future Enhancements (Post-MVP)

- API integrations (PitchBook, Crunchbase)
- User accounts and saved valuations
- Team collaboration features
- Historical tracking (valuation over time)
- AI-powered narrative generation
- Mobile-optimized experience

---

*Document approved for implementation on 2025-12-27*
