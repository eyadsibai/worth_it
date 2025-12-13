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
import { TextInputField, CheckboxField } from "@/components/forms/form-fields";

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
        {(form) => (
          <TextInputField form={form} name="name" label="Full Name" />
        )}
      </TestFormWrapper>
    );

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
  });

  it("renders with placeholder", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <TextInputField
            form={form}
            name="name"
            label="Full Name"
            placeholder="Enter your name"
          />
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
        {(form) => (
          <TextInputField form={form} name="name" label="Full Name" />
        )}
      </TestFormWrapper>
    );

    const input = screen.getByLabelText("Full Name");
    await user.type(input, "John Doe");

    expect(input).toHaveValue("John Doe");
  });

  it("supports different input types", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <TextInputField form={form} name="email" label="Email" type="email" />
        )}
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
        {(form) => (
          <TextInputField form={form} name="name" label="Full Name" />
        )}
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
        {(form) => (
          <CheckboxField form={form} name="agreed" label="I agree to terms" />
        )}
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

    expect(
      screen.getByText("By checking, you accept our terms of service")
    ).toBeInTheDocument();
  });

  it("is unchecked by default when defaultValue is false", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <CheckboxField form={form} name="agreed" label="I agree to terms" />
        )}
      </TestFormWrapper>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("is checked when defaultValue is true", () => {
    render(
      <TestFormWrapper>
        {(form) => (
          <CheckboxField
            form={form}
            name="notifications"
            label="Enable notifications"
          />
        )}
      </TestFormWrapper>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("toggles when clicked", async () => {
    const user = userEvent.setup();

    render(
      <TestFormWrapper>
        {(form) => (
          <CheckboxField form={form} name="agreed" label="I agree to terms" />
        )}
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
