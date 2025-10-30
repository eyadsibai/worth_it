const formatCurrency = (value) => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absValue >= 1_000_000_000) {
    return `${sign}SAR ${(absValue / 1_000_000_000).toFixed(2)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}SAR ${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}SAR ${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}SAR ${absValue.toFixed(0)}`;
};

const formatPercent = (value, digits = 2) => `${(value * 100).toFixed(digits)}%`;

const parseNumber = (value, fallback = 0) => {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseInteger = (value, fallback = 0) => {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : fallback;
};

const basePlotLayout = {
  margin: { l: 45, r: 20, t: 32, b: 45 },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "#f4f7ff", family: "Inter, sans-serif" },
  xaxis: {
    gridcolor: "rgba(148, 163, 184, 0.18)",
    zerolinecolor: "rgba(148, 163, 184, 0.18)",
  },
  yaxis: {
    gridcolor: "rgba(148, 163, 184, 0.18)",
    zerolinecolor: "rgba(148, 163, 184, 0.18)",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const scenarioForm = document.getElementById("scenarioForm");
  const recalcButton = document.getElementById("recalculateButton");
  const calculateButton = document.getElementById("calculateButton");
  const simulateButton = document.getElementById("simulateButton");
  const errorMessage = document.getElementById("errorMessage");

  const equityTypeSelect = document.getElementById("equityType");
  const simulateDilutionCheckbox = document.getElementById("simulateDilution");
  const dilutionConfig = document.getElementById("dilutionConfig");
  const dilutionList = document.getElementById("dilutionRounds");
  const addDilutionRoundButton = document.getElementById("addDilutionRound");

  const optionsFields = document.getElementById("optionsFields");
  const rsuFields = document.getElementById("rsuFields");
  const exerciseStrategy = document.getElementById("exerciseStrategy");
  const exerciseYearGroup = document.getElementById("exerciseYearGroup");

  const enableSimulation = document.getElementById("enableSimulation");
  const simulationConfig = document.getElementById("simulationConfig");
  const simulateValuation = document.getElementById("simulateValuation");
  const simulateRoi = document.getElementById("simulateRoi");
  const simulateSalaryGrowth = document.getElementById("simulateSalaryGrowth");
  const simulateExitYear = document.getElementById("simulateExitYear");
  const simulateDilutionTotal = document.getElementById("simulateDilutionTotal");
  const simulateDilutionWrapper = document.getElementById("simulateDilutionWrapper");

  const valuationConfig = document.getElementById("valuationConfig");
  const valuationMinLabel = document.getElementById("valuationMinLabel");
  const valuationModeLabel = document.getElementById("valuationModeLabel");
  const valuationMaxLabel = document.getElementById("valuationMaxLabel");
  const valuationMinInput = document.getElementById("valuationMin");
  const valuationModeInput = document.getElementById("valuationMode");
  const valuationMaxInput = document.getElementById("valuationMax");
  const valuationRangeFields = document.getElementById("valuationRangeFields");
  const useYearlyValuation = document.getElementById("useYearlyValuation");
  const valuationYearlyConfig = document.getElementById("valuationYearlyConfig");
  const addValuationYearButton = document.getElementById("addValuationYear");

  const roiConfig = document.getElementById("roiConfig");
  const salaryConfig = document.getElementById("salaryConfig");
  const exitYearConfig = document.getElementById("exitYearConfig");
  const dilutionTotalConfig = document.getElementById("dilutionTotalConfig");

  const projectedNetWorth = document.getElementById("projectedNetWorth");
  const growthLabel = document.getElementById("growthLabel");
  const payoutLabel = document.getElementById("payoutLabel");
  const payoutValue = document.getElementById("payoutValue");
  const opportunityCostValue = document.getElementById("opportunityCostValue");
  const netOutcomeValue = document.getElementById("netOutcome");
  const npvValue = document.getElementById("npvValue");
  const irrValue = document.getElementById("irrValue");
  const dilutedEquityValue = document.getElementById("dilutedEquity");
  const dilutionHelper = document.getElementById("dilutionHelper");
  const decisionBanner = document.getElementById("decisionBanner");
  const principalColumn = document.getElementById("principalColumn");
  const vestedColumn = document.getElementById("vestedColumn");
  const breakevenColumn = document.getElementById("breakevenColumn");
  const dilutionColumn = document.getElementById("dilutionColumn");
  const breakdownTableBody = document.querySelector("#breakdownTable tbody");
  const simulationPanel = document.getElementById("simulationPanel");
  const probabilityPositive = document.getElementById("probabilityPositive");
  const meanOutcome = document.getElementById("meanOutcome");
  const medianOutcome = document.getElementById("medianOutcome");
  const stdOutcome = document.getElementById("stdOutcome");
  const simulationStats = document.getElementById("simulationStats");
  const sensitivityCard = document.getElementById("sensitivityCard");

  const ctx = document.getElementById("projectionChart").getContext("2d");
  let projectionChart;
  let lastSimulationConfig = { includeValuation: false };

  const initialiseChart = () => {
    projectionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Current path",
            data: [],
            borderColor: "rgba(76, 157, 255, 1)",
            backgroundColor: "rgba(76, 157, 255, 0.15)",
            tension: 0.35,
            borderWidth: 3,
            fill: false,
          },
          {
            label: "Startup path",
            data: [],
            borderColor: "rgba(67, 217, 163, 1)",
            backgroundColor: "rgba(67, 217, 163, 0.15)",
            tension: 0.35,
            borderWidth: 3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#9aa7c7" },
            grid: { color: "rgba(148, 163, 184, 0.12)" },
          },
          y: {
            ticks: {
              color: "#9aa7c7",
              callback: (value) => formatCurrency(value),
            },
            grid: { color: "rgba(148, 163, 184, 0.12)" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 41, 0.9)",
            borderColor: "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
            },
          },
        },
      },
    });
  };

  const setCalculatingState = (isLoading) => {
    calculateButton.disabled = isLoading;
    recalcButton.disabled = isLoading;
    calculateButton.textContent = isLoading ? "Calculating..." : "Calculate scenario";
  };

  const setSimulatingState = (isLoading) => {
    simulateButton.disabled = isLoading;
    simulateButton.textContent = isLoading ? "Running simulation..." : "Run Monte Carlo";
  };

  const updateEquityFields = () => {
    const equityType = equityTypeSelect.value;
    const isRSU = equityType === "Equity (RSUs)";
    rsuFields.classList.toggle("hidden", !isRSU);
    dilutionConfig.classList.toggle("hidden", !isRSU || !simulateDilutionCheckbox.checked);
    optionsFields.classList.toggle("hidden", isRSU);
    simulateDilutionWrapper.classList.toggle("hidden", !isRSU);
    if (!isRSU) {
      simulateDilutionTotal.checked = false;
      dilutionTotalConfig.classList.add("hidden");
    }

    const valuationUnits = isRSU ? "SAR millions" : "SAR";
    valuationMinLabel.textContent = `Min (${valuationUnits})`;
    valuationModeLabel.textContent = `Most likely (${valuationUnits})`;
    valuationMaxLabel.textContent = `Max (${valuationUnits})`;
    const valuationStep = isRSU ? "1" : "0.5";
    valuationMinInput.step = valuationStep;
    valuationModeInput.step = valuationStep;
    valuationMaxInput.step = valuationStep;

    if (isRSU) {
      if (dilutionList.childElementCount === 0) {
        addDilutionRound({ year: 2, dilution: 20 });
      }
    } else {
      dilutionList.innerHTML = "";
    }
  };

  const updateSimulationVisibility = () => {
    simulationConfig.classList.toggle("hidden", !enableSimulation.checked);
  };

  const updateSimulationFieldVisibility = () => {
    valuationConfig.classList.toggle("hidden", !simulateValuation.checked);
    roiConfig.classList.toggle("hidden", !simulateRoi.checked);
    salaryConfig.classList.toggle("hidden", !simulateSalaryGrowth.checked);
    exitYearConfig.classList.toggle("hidden", !simulateExitYear.checked);
    dilutionTotalConfig.classList.toggle("hidden", !simulateDilutionTotal.checked);

    if (!simulateExitYear.checked) {
      useYearlyValuation.checked = false;
      valuationYearlyConfig.classList.add("hidden");
      addValuationYearButton.classList.add("hidden");
      valuationRangeFields.classList.remove("hidden");
    }

    const equityType = equityTypeSelect.value;
    if (equityType !== "Equity (RSUs)") {
      simulateDilutionTotal.checked = false;
      dilutionTotalConfig.classList.add("hidden");
    }
  };

  const updateDilutionVisibility = () => {
    const shouldShow = simulateDilutionCheckbox.checked && equityTypeSelect.value === "Equity (RSUs)";
    dilutionConfig.classList.toggle("hidden", !shouldShow);
  };

  const toggleExerciseYear = () => {
    const requiresYear = exerciseStrategy.value === "Exercise After Vesting";
    exerciseYearGroup.classList.toggle("hidden", !requiresYear);
  };

  const createInput = (labelText, inputElement) => {
    const wrapper = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = labelText;
    wrapper.appendChild(span);
    wrapper.appendChild(inputElement);
    return wrapper;
  };

  const addDilutionRound = (defaults = { year: "", dilution: "" }) => {
    const container = document.createElement("div");
    container.className = "repeatable-item";

    const yearInput = document.createElement("input");
    yearInput.type = "number";
    yearInput.min = "1";
    yearInput.max = "40";
    yearInput.value = defaults.year;
    yearInput.className = "dilution-year";

    const dilutionInput = document.createElement("input");
    dilutionInput.type = "number";
    dilutionInput.min = "0";
    dilutionInput.max = "90";
    dilutionInput.step = "0.1";
    dilutionInput.value = defaults.dilution;
    dilutionInput.className = "dilution-percentage";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      dilutionList.removeChild(container);
    });

    container.appendChild(createInput("Round year", yearInput));
    container.appendChild(createInput("Dilution (%)", dilutionInput));
    container.appendChild(removeButton);
    dilutionList.appendChild(container);
  };

  const addValuationYearRow = (defaults = { year: "", min: "", mode: "", max: "" }) => {
    const container = document.createElement("div");
    container.className = "repeatable-item";

    const yearInput = document.createElement("input");
    yearInput.type = "number";
    yearInput.min = "1";
    yearInput.max = "40";
    yearInput.value = defaults.year;
    yearInput.className = "valuation-year";

    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.min = "0";
    minInput.step = equityTypeSelect.value === "Equity (RSUs)" ? "1" : "0.5";
    minInput.value = defaults.min;
    minInput.className = "valuation-min";

    const modeInput = document.createElement("input");
    modeInput.type = "number";
    modeInput.min = "0";
    modeInput.step = equityTypeSelect.value === "Equity (RSUs)" ? "1" : "0.5";
    modeInput.value = defaults.mode;
    modeInput.className = "valuation-mode";

    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.min = "0";
    maxInput.step = equityTypeSelect.value === "Equity (RSUs)" ? "1" : "0.5";
    maxInput.value = defaults.max;
    maxInput.className = "valuation-max";

    const units = equityTypeSelect.value === "Equity (RSUs)" ? "SAR millions" : "SAR";

    container.appendChild(createInput("Exit year", yearInput));
    container.appendChild(createInput(`Min (${units})`, minInput));
    container.appendChild(createInput(`Mode (${units})`, modeInput));
    container.appendChild(createInput(`Max (${units})`, maxInput));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      valuationYearlyConfig.removeChild(container);
    });

    container.appendChild(removeButton);
    valuationYearlyConfig.appendChild(container);
  };

  const gatherDilutionRounds = () => {
    const rounds = [];
    const items = dilutionList.querySelectorAll(".repeatable-item");
    items.forEach((item) => {
      const year = parseInteger(item.querySelector(".dilution-year").value);
      const dilution = parseNumber(item.querySelector(".dilution-percentage").value) / 100;
      if (year > 0 && dilution >= 0) {
        rounds.push({ year, dilution });
      }
    });
    return rounds;
  };

  const gatherYearlyValuations = () => {
    const configs = {};
    const rows = valuationYearlyConfig.querySelectorAll(".repeatable-item");
    rows.forEach((row) => {
      const year = parseInteger(row.querySelector(".valuation-year").value);
      const minVal = parseNumber(row.querySelector(".valuation-min").value);
      const modeVal = parseNumber(row.querySelector(".valuation-mode").value);
      const maxVal = parseNumber(row.querySelector(".valuation-max").value);
      if (year > 0) {
        configs[year] = { min_val: minVal, mode: modeVal, max_val: maxVal };
      }
    });
    return configs;
  };

  const safeReadResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (error) {
        console.warn("Failed to parse JSON response", error);
      }
    }
    try {
      return await response.text();
    } catch (error) {
      console.warn("Failed to read response body", error);
      return "";
    }
  };

  const extractErrorMessage = (body, fallback) => {
    if (!body) {
      return fallback;
    }
    if (typeof body === "string") {
      return body.trim() || fallback;
    }
    if (typeof body === "object" && body.detail) {
      if (Array.isArray(body.detail)) {
        const message = body.detail
          .map((entry) => (typeof entry?.msg === "string" ? entry.msg : ""))
          .filter(Boolean)
          .join(". ");
        return message || fallback;
      }
      if (typeof body.detail === "string") {
        return body.detail;
      }
    }
    return fallback;
  };

  const collectBaseInputs = (includeFailureProbability = false) => {
    const currentSalary = parseNumber(document.getElementById("currentSalary").value);
    const salaryGrowth = parseNumber(document.getElementById("salaryGrowth").value) / 100;
    const annualRoi = parseNumber(document.getElementById("annualRoi").value) / 100;
    const startupSalary = parseNumber(document.getElementById("startupSalary").value);
    const exitYear = parseInteger(document.getElementById("exitYear").value);
    const totalVestingYears = parseInteger(document.getElementById("vestingYears").value);
    const cliffYears = parseInteger(document.getElementById("cliffYears").value);
    const investmentFrequency = document.getElementById("investmentFrequency").value;
    const equityType = equityTypeSelect.value;

    if (currentSalary <= 0 || startupSalary <= 0) {
      throw new Error("Salary values must be greater than zero.");
    }

    if (exitYear < 1) {
      throw new Error("Exit year must be at least 1.");
    }

    if (cliffYears > totalVestingYears) {
      throw new Error("Cliff years cannot exceed total vesting years.");
    }

    let rsuParams = null;
    let optionsParams = null;

    if (equityType === "Equity (RSUs)") {
      const equityPct = parseNumber(document.getElementById("equityPct").value) / 100;
      const exitValuation = parseNumber(document.getElementById("exitValuation").value) * 1_000_000;
      const simulateDilution = simulateDilutionCheckbox.checked;
      const dilutionRounds = simulateDilution ? gatherDilutionRounds() : [];

      if (equityPct <= 0) {
        throw new Error("Equity grant must be greater than zero.");
      }
      if (exitValuation <= 0) {
        throw new Error("Provide a positive exit valuation for the startup scenario.");
      }

      rsuParams = {
        equity_pct: equityPct,
        target_exit_valuation: exitValuation,
        simulate_dilution: simulateDilution,
        dilution_rounds: dilutionRounds,
      };
    } else {
      const numOptions = parseInteger(document.getElementById("numOptions").value);
      const strikePrice = parseNumber(document.getElementById("strikePrice").value);
      const exitPrice = parseNumber(document.getElementById("exitPrice").value);
      const strategy = exerciseStrategy.value;
      const exerciseYearValue = parseInteger(document.getElementById("exerciseYear").value);

      if (numOptions <= 0) {
        throw new Error("Number of options must be greater than zero.");
      }

      optionsParams = {
        num_options: numOptions,
        strike_price: strikePrice,
        target_exit_price_per_share: exitPrice,
        exercise_strategy: strategy,
        exercise_year: strategy === "Exercise After Vesting" ? exerciseYearValue : null,
      };

      if (strategy === "Exercise After Vesting" && exerciseYearValue > exitYear) {
        throw new Error("Exercise year cannot be after the exit year.");
      }
    }

    const payload = {
      current_salary: currentSalary,
      startup_salary: startupSalary,
      salary_growth_rate: salaryGrowth,
      annual_roi: annualRoi,
      exit_year: exitYear,
      investment_frequency: investmentFrequency,
      equity_type: equityType,
      total_vesting_years: totalVestingYears,
      cliff_years: cliffYears,
      rsu_params: rsuParams,
      options_params: optionsParams,
      failure_probability: 0,
    };

    if (includeFailureProbability) {
      const failureProbability = parseNumber(document.getElementById("failureProbability").value) / 100;
      payload.failure_probability = Math.min(Math.max(failureProbability, 0), 1);
    }

    return payload;
  };

  const buildSimulationConfig = (equityType) => {
    const config = {};

    if (simulateValuation.checked) {
      if (useYearlyValuation.checked) {
        const yearlyConfigs = gatherYearlyValuations();
        const entries = Object.entries(yearlyConfigs);
        if (entries.length === 0) {
          throw new Error("Add at least one valuation range when using year-dependent valuations.");
        }
        const multiplier = equityType === "Equity (RSUs)" ? 1_000_000 : 1;
        const normalised = {};
        entries.forEach(([year, values]) => {
          normalised[year] = {
            min_val: values.min_val * multiplier,
            mode: values.mode * multiplier,
            max_val: values.max_val * multiplier,
          };
        });
        config.yearly_valuation = normalised;
      } else {
        const multiplier = equityType === "Equity (RSUs)" ? 1_000_000 : 1;
        const minVal = parseNumber(document.getElementById("valuationMin").value) * multiplier;
        const modeVal = parseNumber(document.getElementById("valuationMode").value) * multiplier;
        const maxVal = parseNumber(document.getElementById("valuationMax").value) * multiplier;
        config.valuation = { min_val: minVal, mode: modeVal, max_val: maxVal };
      }
    }

    if (simulateRoi.checked) {
      const mean = parseNumber(document.getElementById("roiMean").value) / 100;
      const stdDev = parseNumber(document.getElementById("roiStd").value) / 100;
      config.roi = { mean, std_dev: stdDev };
    }

    if (simulateSalaryGrowth.checked) {
      const minVal = parseNumber(document.getElementById("salaryMin").value) / 100;
      const modeVal = parseNumber(document.getElementById("salaryMode").value) / 100;
      const maxVal = parseNumber(document.getElementById("salaryMax").value) / 100;
      config.salary_growth = { min_val: minVal, mode: modeVal, max_val: maxVal };
    }

    if (simulateExitYear.checked) {
      const minYear = parseInteger(document.getElementById("exitYearMin").value);
      const modeYear = parseInteger(document.getElementById("exitYearMode").value);
      const maxYear = parseInteger(document.getElementById("exitYearMax").value);
      config.exit_year = { min_val: minYear, mode: modeYear, max_val: maxYear };
    }

    if (simulateDilutionTotal.checked && equityType === "Equity (RSUs)") {
      const minVal = parseNumber(document.getElementById("dilutionMin").value) / 100;
      const modeVal = parseNumber(document.getElementById("dilutionMode").value) / 100;
      const maxVal = parseNumber(document.getElementById("dilutionMax").value) / 100;
      config.dilution = { min_val: minVal, mode: modeVal, max_val: maxVal };
    }

    return config;
  };

  const updateBreakdownTable = (result) => {
    breakdownTableBody.innerHTML = "";
    const hasDilutionColumn = result.yearly_breakdown.some(
      (row) => row.cumulative_dilution !== undefined,
    );

    result.yearly_breakdown.forEach((row) => {
      const principal = Number.isFinite(row.principal) ? row.principal : 0;
      const opportunity = Number.isFinite(row.opportunity_cost)
        ? row.opportunity_cost
        : 0;
      const investmentReturns = Number.isFinite(row.investment_returns)
        ? row.investment_returns
        : 0;
      const vestedPct = Number.isFinite(row.vested_equity_pct)
        ? row.vested_equity_pct
        : 0;
      const breakevenValue = Number.isFinite(row.breakeven_value)
        ? formatCurrency(row.breakeven_value)
        : "N/A";
      const dilutionText =
        row.cumulative_dilution !== undefined
          ? `${(row.cumulative_dilution * 100).toFixed(2)}%`
          : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${formatCurrency(principal)}</td>
        <td>${formatCurrency(opportunity)}</td>
        <td>${formatCurrency(investmentReturns)}</td>
        <td>${vestedPct.toFixed(2)}%</td>
        <td>${breakevenValue}</td>
        <td class="dilution-cell">${dilutionText}</td>
      `;
      breakdownTableBody.appendChild(tr);
    });
    dilutionColumn.classList.toggle("hidden", !hasDilutionColumn);
    breakdownTableBody.querySelectorAll(".dilution-cell").forEach((cell) => {
      cell.classList.toggle("hidden", !hasDilutionColumn);
    });
  };

  const updateProjection = (result) => {
    const labels = result.years.map((year) => `Year ${year}`);
    projectionChart.data.labels = labels;
    projectionChart.data.datasets[0].data = result.current_path;
    projectionChart.data.datasets[1].data = result.startup_path;
    projectionChart.update();
  };

  const updateOverview = (result) => {
    payoutLabel.textContent = result.payout_label;
    projectedNetWorth.textContent = formatCurrency(result.projected_net_worth);
    payoutValue.textContent = formatCurrency(result.projected_net_worth);
    opportunityCostValue.textContent = formatCurrency(result.opportunity_cost);
    netOutcomeValue.textContent = formatCurrency(result.net_outcome);
    npvValue.textContent = formatCurrency(result.npv);
    const irrNumber = Number.isFinite(result.irr) ? result.irr : null;
    irrValue.textContent = irrNumber === null ? "N/A" : `${irrNumber.toFixed(2)}%`;
    dilutedEquityValue.textContent = formatPercent(result.diluted_equity_pct, 2);

    if (result.total_dilution > 0) {
      dilutionHelper.textContent = `Total dilution ${formatPercent(result.total_dilution, 1)}`;
    } else {
      dilutionHelper.textContent = "No dilution applied";
    }

    if (result.opportunity_cost > 0) {
      const ratio = result.projected_net_worth / result.opportunity_cost;
      const delta = (ratio - 1) * 100;
      const prefix = delta >= 0 ? "+" : "";
      growthLabel.textContent = `${prefix}${delta.toFixed(1)}% vs current path`;
    } else {
      growthLabel.textContent = "Startup path outperforms salary track";
    }

    if (result.is_clear_win) {
      decisionBanner.textContent = "🎉 Clear salary win – even without equity the startup salary exceeds your current trajectory.";
      decisionBanner.hidden = false;
    } else {
      decisionBanner.hidden = true;
    }

    principalColumn.textContent = result.principal_label;
    vestedColumn.textContent = result.payout_label.includes("Options")
      ? "Vested options (%)"
      : "Vested equity (%)";
    breakevenColumn.textContent = result.breakeven_label;

    updateBreakdownTable(result);
    updateProjection(result);
  };

  const renderPlot = (containerId, data, layout = {}) => {
    if (!window.Plotly) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    Plotly.react(container, data, { ...basePlotLayout, ...layout }, {
      displayModeBar: false,
      responsive: true,
    });
  };

  const renderSimulation = (summary) => {
    simulationPanel.classList.remove("hidden");
    probabilityPositive.textContent = formatPercent(summary.probability_positive, 1);
    meanOutcome.textContent = formatCurrency(summary.mean_outcome);
    medianOutcome.textContent = formatCurrency(summary.median_outcome);
    stdOutcome.textContent = formatCurrency(summary.std_dev);

    const netOutcomes = summary.net_outcomes;

    renderPlot(
      "histogramChart",
      [
        {
          x: netOutcomes,
          type: "histogram",
          nbinsx: 80,
          marker: { color: "#4c9dff" },
          opacity: 0.85,
        },
      ],
      {
        title: "",
        xaxis: { title: "Net outcome (SAR)" },
        yaxis: { title: "Frequency" },
      },
    );

    renderPlot(
      "densityChart",
      [
        {
          x: netOutcomes,
          type: "histogram",
          histnorm: "probability density",
          nbinsx: 80,
          marker: { color: "#43d9a3" },
          opacity: 0.85,
        },
      ],
      {
        title: "",
        xaxis: { title: "Net outcome (SAR)" },
        yaxis: { title: "Density" },
      },
    );

    renderPlot(
      "boxChart",
      [
        {
          y: netOutcomes,
          type: "box",
          name: "Net outcome",
          marker: { color: "#4c9dff" },
        },
      ],
      {
        title: "",
        yaxis: { title: "Net outcome (SAR)" },
        xaxis: { visible: false },
      },
    );

    const sorted = [...netOutcomes].sort((a, b) => a - b);
    const ecdfY = sorted.map((_, idx) => (idx + 1) / sorted.length);
    renderPlot(
      "ecdfChart",
      [
        {
          x: sorted,
          y: ecdfY,
          mode: "lines",
          line: { color: "#4c9dff", width: 3 },
          fill: "tozeroy",
          fillcolor: "rgba(76, 157, 255, 0.18)",
        },
      ],
      {
        xaxis: { title: "Net outcome (SAR)" },
        yaxis: { title: "Cumulative probability", range: [0, 1] },
      },
    );

    const scatterContainer = document.getElementById("scatterChart");
    if (summary.simulated_valuations.length > 0 && lastSimulationConfig.includeValuation) {
      scatterContainer.innerHTML = "";
      renderPlot(
        "scatterChart",
        [
          {
            x: summary.simulated_valuations,
            y: netOutcomes,
            mode: "markers",
            marker: { color: "#43d9a3", opacity: 0.35 },
          },
        ],
        {
          xaxis: {
            title: lastSimulationConfig.equityType === "Equity (RSUs)" ? "Exit valuation (SAR)" : "Exit price per share (SAR)",
          },
          yaxis: { title: "Net outcome (SAR)" },
        },
      );
    } else {
      if (window.Plotly) {
        Plotly.purge(scatterContainer);
      }
      scatterContainer.innerHTML = "<p class='muted'>Enable exit valuation simulation to see this plot.</p>";
    }

    simulationStats.innerHTML = "";
    const rows = [
      ["Min", summary.stats.min],
      ["5th percentile", summary.stats.p5],
      ["25th percentile", summary.stats.p25],
      ["Median", summary.stats.p50],
      ["75th percentile", summary.stats.p75],
      ["95th percentile", summary.stats.p95],
      ["Max", summary.stats.max],
    ];
    const statsHeader = document.createElement("tr");
    statsHeader.innerHTML = "<th>Metric</th><th>Value</th>";
    simulationStats.appendChild(statsHeader);
    rows.forEach(([label, value]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${label}</td><td>${formatCurrency(value)}</td>`;
      simulationStats.appendChild(tr);
    });

    if (summary.sensitivity.length > 0) {
      sensitivityCard.classList.remove("hidden");
      const variables = summary.sensitivity.map((item) => item.Variable);
      const impacts = summary.sensitivity.map((item) => item.Impact);
      renderPlot(
        "sensitivityChart",
        [
          {
            x: impacts,
            y: variables,
            orientation: "h",
            type: "bar",
            marker: { color: "#4c9dff" },
          },
        ],
        {
          xaxis: { title: "Impact on net outcome (SAR)" },
          margin: { l: 120, r: 20, t: 10, b: 40 },
        },
      );
    } else {
      sensitivityCard.classList.add("hidden");
    }
  };

  const submitCalculation = async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    try {
      const payload = collectBaseInputs(false);
      setCalculatingState(true);
      const response = await fetch("/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await safeReadResponse(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(body, "Unable to complete the calculation."));
      }
      if (!body || typeof body !== "object") {
        throw new Error("Unexpected response from the calculation service.");
      }
      updateOverview(body);
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message;
    } finally {
      setCalculatingState(false);
    }
  };

  const runSimulation = async () => {
    errorMessage.textContent = "";
    if (!enableSimulation.checked) {
      errorMessage.textContent = "Enable the Monte Carlo toggle to configure the simulation.";
      return;
    }

    try {
      const inputs = collectBaseInputs(true);
      const simulationParams = buildSimulationConfig(inputs.equity_type);
      const keys = Object.keys(simulationParams);
      if (keys.length === 0) {
        throw new Error("Select at least one variable to simulate.");
      }
      const numSimulations = Math.min(
        Math.max(parseInteger(document.getElementById("numSimulations").value, 1000), 100),
        20000,
      );
      setSimulatingState(true);
      lastSimulationConfig = {
        includeValuation: Boolean(simulationParams.valuation || simulationParams.yearly_valuation),
        equityType: inputs.equity_type,
      };
      const response = await fetch("/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, num_simulations: numSimulations, simulation_params: simulationParams }),
      });
      const body = await safeReadResponse(response);
      if (!response.ok) {
        throw new Error(extractErrorMessage(body, "Simulation failed. Please review your inputs."));
      }
      if (!body || typeof body !== "object") {
        throw new Error("Unexpected response from the simulation service.");
      }
      renderSimulation(body);
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message;
    } finally {
      setSimulatingState(false);
    }
  };

  recalcButton.addEventListener("click", () => scenarioForm.requestSubmit());
  scenarioForm.addEventListener("submit", submitCalculation);
  simulateButton.addEventListener("click", runSimulation);

  equityTypeSelect.addEventListener("change", () => {
    updateEquityFields();
    updateSimulationFieldVisibility();
  });

  simulateDilutionCheckbox.addEventListener("change", updateDilutionVisibility);
  exerciseStrategy.addEventListener("change", toggleExerciseYear);
  enableSimulation.addEventListener("change", updateSimulationVisibility);

  simulateValuation.addEventListener("change", updateSimulationFieldVisibility);
  simulateRoi.addEventListener("change", updateSimulationFieldVisibility);
  simulateSalaryGrowth.addEventListener("change", updateSimulationFieldVisibility);
  simulateExitYear.addEventListener("change", updateSimulationFieldVisibility);
  simulateDilutionTotal.addEventListener("change", updateSimulationFieldVisibility);

  useYearlyValuation.addEventListener("change", () => {
    const usingYearly = useYearlyValuation.checked;
    valuationYearlyConfig.classList.toggle("hidden", !usingYearly);
    addValuationYearButton.classList.toggle("hidden", !usingYearly);
    valuationRangeFields.classList.toggle("hidden", usingYearly);
    if (usingYearly && valuationYearlyConfig.childElementCount === 0) {
      addValuationYearRow({ year: parseInteger(document.getElementById("exitYear").value), min: 10, mode: 25, max: 50 });
    }
  });

  addDilutionRoundButton.addEventListener("click", () => addDilutionRound({ year: "", dilution: "" }));
  addValuationYearButton.addEventListener("click", () => addValuationYearRow());

  initialiseChart();
  updateEquityFields();
  updateDilutionVisibility();
  toggleExerciseYear();
  updateSimulationVisibility();
  updateSimulationFieldVisibility();
  scenarioForm.requestSubmit();
});
