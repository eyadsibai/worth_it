/**
 * Integration tests for form validation and UI interactions
 * 
 * These tests verify that:
 * 1. Forms validate input correctly
 * 2. Form state changes propagate properly
 * 3. Complex interactions work without breaking
 * 4. No infinite loops occur during user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalSettingsFormComponent } from '@/components/forms/global-settings-form';
import { CurrentJobFormComponent } from '@/components/forms/current-job-form';
import { RSUFormComponent } from '@/components/forms/rsu-form';

// Mock the deep compare hook
jest.mock('@/lib/use-deep-compare', () => ({
  useDeepCompareEffect: (effect: React.EffectCallback, deps: React.DependencyList | undefined) => {
    React.useEffect(effect, deps);
  },
}));

describe('Form Integration Tests', () => {
  describe('GlobalSettingsFormComponent', () => {
    it('should call onChange when form values are valid', async () => {
      const onChangeMock = jest.fn();
      
      render(
        <GlobalSettingsFormComponent 
          onChange={onChangeMock}
          defaultValues={{ exit_year: 5 }}
        />
      );

      // Wait for form to initialize and validate
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith({
          exit_year: 5
        });
      });
    });

    it('should handle slider input changes', async () => {
      const user = userEvent.setup();
      const onChangeMock = jest.fn();
      
      render(
        <GlobalSettingsFormComponent 
          onChange={onChangeMock}
          defaultValues={{ exit_year: 5 }}
        />
      );

      // Find and interact with the slider
      const slider = screen.getByRole('slider');
      
      await act(async () => {
        await user.click(slider);
        // Simulate changing the value
        fireEvent.change(slider, { target: { value: '10' } });
      });

      // Should call onChange with new value
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({
            exit_year: expect.any(Number)
          })
        );
      });
    });
  });

  describe('CurrentJobFormComponent', () => {
    it('should validate required fields and call onChange when valid', async () => {
      const onChangeMock = jest.fn();
      
      render(
        <CurrentJobFormComponent 
          onChange={onChangeMock}
          defaultValues={{
            monthly_salary: 10000,
            annual_salary_growth_rate: 3,
            assumed_annual_roi: 5.4,
            investment_frequency: "Monthly"
          }}
        />
      );

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith({
          monthly_salary: 10000,
          annual_salary_growth_rate: 3,
          assumed_annual_roi: 5.4,
          investment_frequency: "Monthly"
        });
      });
    });

    it('should handle input field changes', async () => {
      const user = userEvent.setup();
      const onChangeMock = jest.fn();
      
      render(
        <CurrentJobFormComponent 
          onChange={onChangeMock}
          defaultValues={{
            monthly_salary: 0,
            annual_salary_growth_rate: 3,
            assumed_annual_roi: 5.4,
            investment_frequency: "Monthly"
          }}
        />
      );

      // Find salary input and change it
      const salaryInput = screen.getByDisplayValue('0');
      
      await act(async () => {
        await user.clear(salaryInput);
        await user.type(salaryInput, '15000');
      });

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({
            monthly_salary: 15000
          })
        );
      });
    });
  });

  describe('RSUFormComponent', () => {
    it('should handle basic RSU form validation', async () => {
      const onChangeMock = jest.fn();
      
      render(
        <RSUFormComponent 
          onChange={onChangeMock}
          defaultValues={{
            equity_type: "RSU",
            monthly_salary: 8000,
            total_equity_grant_pct: 0.5,
            vesting_period: 4,
            cliff_period: 1,
            exit_valuation: 100000000,
            simulate_dilution: false,
            dilution_rounds: []
          }}
        />
      );

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({
            equity_type: "RSU",
            monthly_salary: 8000,
            total_equity_grant_pct: 0.5,
            vesting_period: 4,
            cliff_period: 1,
            exit_valuation: 100000000,
            simulate_dilution: false
          })
        );
      });
    });

    it('should handle dilution simulation toggle', async () => {
      const user = userEvent.setup();
      const onChangeMock = jest.fn();
      
      render(
        <RSUFormComponent 
          onChange={onChangeMock}
          defaultValues={{
            equity_type: "RSU",
            monthly_salary: 8000,
            total_equity_grant_pct: 0.5,
            vesting_period: 4,
            cliff_period: 1,
            exit_valuation: 100000000,
            simulate_dilution: false,
            dilution_rounds: []
          }}
        />
      );

      // Find and click the dilution checkbox
      const dilutionCheckbox = screen.getByRole('checkbox');
      
      await act(async () => {
        await user.click(dilutionCheckbox);
      });

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({
            simulate_dilution: true
          })
        );
      });
    });

    it('should handle complex form updates without infinite loops', async () => {
      const user = userEvent.setup();
      let renderCount = 0;
      
      const TestWrapper = () => {
        renderCount++;
        const [formData, setFormData] = React.useState(null);
        
        const handleChange = React.useCallback((data: any) => {
          setFormData(data);
        }, []);
        
        return (
          <RSUFormComponent 
            onChange={handleChange}
            defaultValues={{
              equity_type: "RSU",
              monthly_salary: 8000,
              total_equity_grant_pct: 0.5,
              vesting_period: 4,
              cliff_period: 1,
              exit_valuation: 100000000,
              simulate_dilution: false,
              dilution_rounds: []
            }}
          />
        );
      };

      render(<TestWrapper />);

      // Perform multiple interactions
      const salaryInput = screen.getAllByDisplayValue('8000')[0];
      
      await act(async () => {
        await user.clear(salaryInput);
        await user.type(salaryInput, '9000');
      });

      // Should not cause excessive re-renders
      await waitFor(() => {
        expect(renderCount).toBeLessThan(20);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle form errors gracefully', async () => {
      const onChangeMock = jest.fn();
      
      // Test with invalid default values
      const { container } = render(
        <CurrentJobFormComponent 
          onChange={onChangeMock}
          defaultValues={{
            monthly_salary: -1000, // Invalid value
            annual_salary_growth_rate: 3,
            assumed_annual_roi: 5.4,
            investment_frequency: "Monthly"
          }}
        />
      );

      // Form should still render without throwing
      expect(container).toBeInTheDocument();
    });

    it('should handle missing onChange prop gracefully', async () => {
      const { container } = render(
        <GlobalSettingsFormComponent 
          defaultValues={{ exit_year: 5 }}
          // No onChange prop
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not call onChange excessively', async () => {
      const onChangeMock = jest.fn();
      
      const { rerender } = render(
        <GlobalSettingsFormComponent 
          onChange={onChangeMock}
          defaultValues={{ exit_year: 5 }}
        />
      );

      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(
          <GlobalSettingsFormComponent 
            onChange={onChangeMock}
            defaultValues={{ exit_year: 5 }}
          />
        );
      }

      // Should not call onChange excessively
      await waitFor(() => {
        expect(onChangeMock.mock.calls.length).toBeLessThan(10);
      });
    });
  });
});