document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("financialForm");
  const recalcButton = document.getElementById("recalculateButton");
  const errorMessage = document.getElementById("errorMessage");
  const simulateDilution = document.getElementById("simulateDilution");
  const dilutionInput = document.getElementById("dilutionInput");

  const projectedNetWorth = document.getElementById("projectedNetWorth");
  const growthLabel = document.getElementById("growthLabel");
  const netOutcome = document.getElementById("netOutcome");
  const npvValue = document.getElementById("npvValue");
  const irrValue = document.getElementById("irrValue");
  const dilutedEquity = document.getElementById("dilutedEquity");
  const dilutionHelper = document.getElementById("dilutionHelper");

  let chartInstance;

  const ctx = document.getElementById("projectionChart");

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

  const formatPercent = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;

  const toggleLoadingState = (isLoading) => {
    const label = isLoading ? "Calculating..." : "Recalculate Journey";
    recalcButton.textContent = label;
    recalcButton.disabled = isLoading;
  };

  const updateDilutionVisibility = () => {
    dilutionInput.hidden = !simulateDilution.checked;
  };

  const updateChart = (labels, currentPath, startupPath) => {
    if (!chartInstance) {
      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Current Path",
              data: currentPath,
              borderColor: "rgba(76, 157, 255, 1)",
              backgroundColor: "rgba(76, 157, 255, 0.15)",
              tension: 0.35,
              borderWidth: 3,
              fill: false,
            },
            {
              label: "Startup Path",
              data: startupPath,
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
              ticks: {
                color: "#9aa7c7",
              },
              grid: {
                color: "rgba(148, 163, 184, 0.08)",
              },
            },
            y: {
              ticks: {
                color: "#9aa7c7",
                callback: (value) => formatCurrency(value),
              },
              grid: {
                color: "rgba(148, 163, 184, 0.08)",
              },
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
      return;
    }

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = currentPath;
    chartInstance.data.datasets[1].data = startupPath;
    chartInstance.update();
  };

  const updateMetrics = (result) => {
    projectedNetWorth.textContent = formatCurrency(result.projected_net_worth);

    if (result.opportunity_cost > 0) {
      const ratio = result.projected_net_worth / result.opportunity_cost;
      const delta = (ratio - 1) * 100;
      const prefix = delta >= 0 ? "+" : "";
      growthLabel.textContent = `${prefix}${delta.toFixed(1)}% vs current path`;
    } else {
      growthLabel.textContent = "Startup path outperforms salary track";
    }

    netOutcome.textContent = formatCurrency(result.net_outcome);
    npvValue.textContent = formatCurrency(result.npv);
    irrValue.textContent = result.irr !== null ? `${result.irr.toFixed(2)}%` : "N/A";
    dilutedEquity.textContent = formatPercent(result.diluted_equity_pct);

    if (result.total_dilution > 0) {
      dilutionHelper.textContent = `Total dilution ${formatPercent(result.total_dilution, 1)}`;
    } else {
      dilutionHelper.textContent = "No dilution applied";
    }
  };

  const parseInput = (inputEl) => {
    const value = parseFloat(inputEl.value);
    return Number.isFinite(value) ? value : 0;
  };

  const submitForm = async () => {
    errorMessage.textContent = "";
    toggleLoadingState(true);

    const payload = {
      current_salary: parseInput(form.currentSalary),
      salary_growth_rate: parseInput(form.salaryGrowth) / 100,
      startup_salary: parseInput(form.startupSalary),
      exit_year: parseInt(form.exitYear.value, 10) || 1,
      annual_roi: parseInput(form.annualRoi) / 100,
      investment_frequency: form.investmentFrequency.value,
      equity_pct: parseInput(form.equityPct) / 100,
      exit_valuation: parseInput(form.exitValuation) * 1_000_000,
      total_vesting_years: parseInt(form.vestingYears.value, 10) || 4,
      cliff_years: parseInt(form.cliffYears.value, 10) || 0,
      simulate_dilution: simulateDilution.checked,
      dilution_pct: simulateDilution.checked ? parseInput(form.dilutionPct) / 100 : null,
    };

    try {
      const response = await fetch("/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Unable to complete the calculation.");
      }

      updateChart(result.years, result.current_path, result.startup_path);
      updateMetrics(result);
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message;
    } finally {
      toggleLoadingState(false);
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitForm();
  });

  recalcButton.addEventListener("click", submitForm);
  simulateDilution.addEventListener("change", () => {
    updateDilutionVisibility();
    if (!simulateDilution.checked) {
      form.dilutionPct.value = "10";
    }
  });

  updateDilutionVisibility();
  submitForm();
});
