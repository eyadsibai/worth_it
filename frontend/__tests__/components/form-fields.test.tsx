/**
 * Tests for form field helper components
 * Following TDD - tests written first
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import {
  TextInputField,
  CheckboxField,
  NumberInputField,
  SliderField,
} from "@/components/forms/form-fields";

// Test schema
const TestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  agreed: z.boolean(),
  notifications: z.boolean(),
});

type TestFormData = z.infer<typeof TestSchema>;

// Wrapper component for testing form fields
function TestFormWrapper({
  children,
  onSubmit = vi.fn(),
}: {
  children: (form: ReturnType<typeof useForm<TestFormData>>) => React.ReactNode;
  onSubmit?: (data: TestFormData) => void;
}) {
  const form = useForm<TestFormData>({
    resolver: zodResolver(TestSchema) as unknown as undefined,
    defaultValues: {
      name: "",
      email: "",
      agreed: false,
      notifications: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>{children(form)}</form>
    </Form>
  );
}

describe("TextInputField", () => {
  it("renders with label", () => {
    render(
      <TestFormWrapper>
        {(form) => <TextInputField form={form} name="name" label="Full Name" />}
      </TestFormWrapper>
    );

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
  });

  it("renders with placeholder", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <TextInputField form={form} name="name" label="Full Name" placeholder="Enter your name" />
        )}
      </TestFormWrapper>
    );

    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
  });

  it("renders with description", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <TextInputField
            form={form}
            name="name"
            label="Full Name"
            description="Your legal full name"
          />
        )}
      </TestFormWrapper>
    );

    expect(screen.getByText("Your legal full name")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();

    render(
      <TestFormWrapper>
        {(form) => <TextInputField form={form} name="name" label="Full Name" />}
      </TestFormWrapper>
    );

    const input = screen.getByLabelText("Full Name");
    await user.type(input, "John Doe");

    expect(input).toHaveValue("John Doe");
  });

  it("supports different input types", () => {
    render(
      <TestFormWrapper>
        {(form) => <TextInputField form={form} name="email" label="Email" type="email" />}
      </TestFormWrapper>
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });
});

describe("TextInputField with tooltip", () => {
  it("renders tooltip icon when tooltip prop is provided", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <TextInputField
            form={form}
            name="name"
            label="Full Name"
            tooltip="Enter your legal full name as it appears on official documents"
          />
        )}
      </TestFormWrapper>
    );

    // The tooltip icon should be rendered
    const helpButton = screen.getByRole("button", { name: /help for full name/i });
    expect(helpButton).toBeInTheDocument();
  });

  it("does not render tooltip icon when tooltip prop is not provided", () => {
    render(
      <TestFormWrapper>
        {(form) => <TextInputField form={form} name="name" label="Full Name" />}
      </TestFormWrapper>
    );

    // The tooltip icon should not be rendered
    const helpButton = screen.queryByRole("button", { name: /help for full name/i });
    expect(helpButton).not.toBeInTheDocument();
  });
});

describe("CheckboxField", () => {
  it("renders with label", () => {
    render(
      <TestFormWrapper>
        {(form) => <CheckboxField form={form} name="agreed" label="I agree to terms" />}
      </TestFormWrapper>
    );

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("I agree to terms")).toBeInTheDocument();
  });

  it("renders with description", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <CheckboxField
            form={form}
            name="agreed"
            label="I agree to terms"
            description="By checking, you accept our terms of service"
          />
        )}
      </TestFormWrapper>
    );

    expect(screen.getByText("By checking, you accept our terms of service")).toBeInTheDocument();
  });

  it("is unchecked by default when defaultValue is false", () => {
    render(
      <TestFormWrapper>
        {(form) => <CheckboxField form={form} name="agreed" label="I agree to terms" />}
      </TestFormWrapper>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("is checked when defaultValue is true", () => {
    render(
      <TestFormWrapper>
        {(form) => <CheckboxField form={form} name="notifications" label="Enable notifications" />}
      </TestFormWrapper>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("toggles when clicked", async () => {
    const user = userEvent.setup();

    render(
      <TestFormWrapper>
        {(form) => <CheckboxField form={form} name="agreed" label="I agree to terms" />}
      </TestFormWrapper>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});

describe("NumberInputField", () => {
  // Use a different schema for number tests
  const NumberTestSchema = z.object({
    amount: z.number().min(0),
  });

  type NumberTestFormData = z.infer<typeof NumberTestSchema>;

  function NumberTestWrapper({
    children,
    defaultValue = 0,
  }: {
    children: (form: ReturnType<typeof useForm<NumberTestFormData>>) => React.ReactNode;
    defaultValue?: number;
  }) {
    const form = useForm<NumberTestFormData>({
      resolver: zodResolver(NumberTestSchema) as unknown as undefined,
      defaultValues: { amount: defaultValue },
    });

    return (
      <Form {...form}>
        <form>{children(form)}</form>
      </Form>
    );
  }

  it("renders with label and prefix", () => {
    render(
      <NumberTestWrapper>
        {(form) => <NumberInputField form={form} name="amount" label="Amount" prefix="$" />}
      </NumberTestWrapper>
    );

    // Use role-based query since shadcn FormControl wraps input in div
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("displays formatted value when not focused", () => {
    render(
      <NumberTestWrapper defaultValue={50000}>
        {(form) => (
          <NumberInputField form={form} name="amount" label="Amount" formatDisplay={true} />
        )}
      </NumberTestWrapper>
    );

    // When not focused with formatDisplay, type is "text" so we use textbox role
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("50,000");
  });

  it("parses shorthand K notation", async () => {
    const user = userEvent.setup();

    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField form={form} name="amount" label="Amount" formatDisplay={true} />
        )}
      </NumberTestWrapper>
    );

    // Initial render shows "0" as text
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "50K");
    await user.tab(); // blur to trigger parsing

    // After blur, should show formatted value
    const formattedInput = screen.getByRole("textbox");
    expect(formattedInput).toHaveValue("50,000");
  });

  it("parses shorthand M notation", async () => {
    const user = userEvent.setup();

    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField form={form} name="amount" label="Amount" formatDisplay={true} />
        )}
      </NumberTestWrapper>
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "1.5M");
    await user.tab();

    const formattedInput = screen.getByRole("textbox");
    expect(formattedInput).toHaveValue("1,500,000");
  });
});

describe("NumberInputField with hint and example props", () => {
  const NumberTestSchema = z.object({
    salary: z.number().min(0),
  });

  type NumberTestFormData = z.infer<typeof NumberTestSchema>;

  function NumberTestWrapper({
    children,
    defaultValue = 0,
  }: {
    children: (form: ReturnType<typeof useForm<NumberTestFormData>>) => React.ReactNode;
    defaultValue?: number;
  }) {
    const form = useForm<NumberTestFormData>({
      resolver: zodResolver(NumberTestSchema) as unknown as undefined,
      defaultValues: { salary: defaultValue },
    });

    return (
      <Form {...form}>
        <form>{children(form)}</form>
      </Form>
    );
  }

  it("renders hint text below the input", () => {
    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField
            form={form}
            name="salary"
            label="Monthly Salary"
            hint="Tech average: SAR 8K-15K"
          />
        )}
      </NumberTestWrapper>
    );

    expect(screen.getByText("Tech average: SAR 8K-15K")).toBeInTheDocument();
  });

  it("renders hint with muted styling", () => {
    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField
            form={form}
            name="salary"
            label="Monthly Salary"
            hint="Tech average: SAR 8K-15K"
          />
        )}
      </NumberTestWrapper>
    );

    const hint = screen.getByText("Tech average: SAR 8K-15K");
    expect(hint).toHaveClass("text-muted-foreground");
  });

  it("uses exampleValue as placeholder when provided", () => {
    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField
            form={form}
            name="salary"
            label="Monthly Salary"
            exampleValue={10000}
            formatDisplay={true}
          />
        )}
      </NumberTestWrapper>
    );

    // The placeholder should show the formatted example value
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "e.g. 10,000");
  });

  it("placeholder prop takes precedence over exampleValue", () => {
    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField
            form={form}
            name="salary"
            label="Monthly Salary"
            placeholder="Enter salary"
            exampleValue={10000}
          />
        )}
      </NumberTestWrapper>
    );

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("placeholder", "Enter salary");
  });

  it("renders both hint and description when both provided", () => {
    render(
      <NumberTestWrapper>
        {(form) => (
          <NumberInputField
            form={form}
            name="salary"
            label="Monthly Salary"
            description="Your gross monthly salary"
            hint="Tech average: SAR 8K-15K"
          />
        )}
      </NumberTestWrapper>
    );

    expect(screen.getByText("Your gross monthly salary")).toBeInTheDocument();
    expect(screen.getByText("Tech average: SAR 8K-15K")).toBeInTheDocument();
  });

  it("does not render hint when not provided", () => {
    render(
      <NumberTestWrapper>
        {(form) => <NumberInputField form={form} name="salary" label="Monthly Salary" />}
      </NumberTestWrapper>
    );

    // Should not have any hint element
    const hints = screen.queryByText(/average/i);
    expect(hints).not.toBeInTheDocument();
  });
});

describe("SliderField", () => {
  // Use a different schema for slider tests
  const SliderTestSchema = z.object({
    years: z.number().min(1).max(10),
    percentage: z.number().min(0).max(100),
  });

  type SliderTestFormData = z.infer<typeof SliderTestSchema>;

  function SliderTestWrapper({
    children,
    defaultValues = { years: 5, percentage: 50 },
  }: {
    children: (form: ReturnType<typeof useForm<SliderTestFormData>>) => React.ReactNode;
    defaultValues?: SliderTestFormData;
  }) {
    const form = useForm<SliderTestFormData>({
      resolver: zodResolver(SliderTestSchema) as unknown as undefined,
      defaultValues,
    });

    return (
      <Form {...form}>
        <form>{children(form)}</form>
      </Form>
    );
  }

  it("renders with label and current value display", () => {
    render(
      <SliderTestWrapper>
        {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
      </SliderTestWrapper>
    );

    expect(screen.getByText("Years")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    // Default value should be displayed
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("has aria-valuetext with raw value when formatValue is not provided", () => {
    render(
      <SliderTestWrapper>
        {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
      </SliderTestWrapper>
    );

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "5");
  });

  it("has aria-valuetext with formatted value when formatValue is provided", () => {
    render(
      <SliderTestWrapper>
        {(form) => (
          <SliderField
            form={form}
            name="years"
            label="Years"
            min={1}
            max={10}
            formatValue={(value) => `${value} years`}
          />
        )}
      </SliderTestWrapper>
    );

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "5 years");
    // The displayed value should also be formatted
    expect(screen.getByText("5 years")).toBeInTheDocument();
  });

  it("has aria-valuetext with percentage format", () => {
    render(
      <SliderTestWrapper>
        {(form) => (
          <SliderField
            form={form}
            name="percentage"
            label="Growth Rate"
            min={0}
            max={100}
            formatValue={(value) => `${value}%`}
          />
        )}
      </SliderTestWrapper>
    );

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "50%");
  });

  it("renders with description", () => {
    render(
      <SliderTestWrapper>
        {(form) => (
          <SliderField
            form={form}
            name="years"
            label="Years"
            description="Number of years until exit"
            min={1}
            max={10}
          />
        )}
      </SliderTestWrapper>
    );

    expect(screen.getByText("Number of years until exit")).toBeInTheDocument();
  });

  it("renders with tooltip", () => {
    render(
      <SliderTestWrapper>
        {(form) => (
          <SliderField
            form={form}
            name="years"
            label="Years"
            tooltip="The expected timeline for company exit"
            min={1}
            max={10}
          />
        )}
      </SliderTestWrapper>
    );

    // The tooltip icon should be rendered
    const helpButton = screen.getByRole("button", { name: /help for years/i });
    expect(helpButton).toBeInTheDocument();
  });
});
