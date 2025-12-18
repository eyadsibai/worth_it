import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Spotlight, type SpotlightStep } from "@/components/walkthrough/spotlight";

// Mock scrollIntoView since JSDOM doesn't support it
Element.prototype.scrollIntoView = vi.fn();

const mockSteps: SpotlightStep[] = [
  {
    target: "#test-target",
    title: "Step 1",
    description: "First step description",
    position: "bottom",
  },
  {
    target: "#test-target-2",
    title: "Step 2",
    description: "Second step description",
    position: "top",
  },
  {
    target: "#test-target-3",
    title: "Step 3",
    description: "Third step description",
    action: {
      label: "Do Something",
      onClick: vi.fn(),
    },
  },
];

describe("Spotlight", () => {
  const mockOnNext = vi.fn();
  const mockOnPrev = vi.fn();
  const mockOnSkip = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a target element for the spotlight
    const target = document.createElement("div");
    target.id = "test-target";
    target.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));
    document.body.appendChild(target);
  });

  afterEach(() => {
    const target = document.getElementById("test-target");
    if (target) {
      document.body.removeChild(target);
    }
  });

  const renderSpotlight = (props: Partial<Parameters<typeof Spotlight>[0]> = {}) => {
    return render(
      <Spotlight
        steps={mockSteps}
        currentStep={0}
        onNext={mockOnNext}
        onPrev={mockOnPrev}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        isOpen={true}
        {...props}
      />
    );
  };

  it("renders nothing when isOpen is false", () => {
    renderSpotlight({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the spotlight dialog when isOpen is true", () => {
    renderSpotlight();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays the step title and description", () => {
    renderSpotlight();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("First step description")).toBeInTheDocument();
  });

  it("shows step progress", () => {
    renderSpotlight();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("calls onNext when Next button is clicked", () => {
    renderSpotlight();
    fireEvent.click(screen.getByText("Next"));
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it("calls onSkip when close button is clicked", () => {
    renderSpotlight();
    fireEvent.click(screen.getByLabelText("Close tutorial"));
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it("does not show Back button on first step", () => {
    renderSpotlight({ currentStep: 0 });
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
  });

  it("shows Back button on subsequent steps", () => {
    renderSpotlight({ currentStep: 1 });
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("calls onPrev when Back button is clicked", () => {
    renderSpotlight({ currentStep: 1 });
    fireEvent.click(screen.getByText("Back"));
    expect(mockOnPrev).toHaveBeenCalledTimes(1);
  });

  it("shows Finish button on last step", () => {
    renderSpotlight({ currentStep: 2 });
    expect(screen.getByText("Finish")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("calls onComplete when Finish button is clicked", () => {
    renderSpotlight({ currentStep: 2 });
    fireEvent.click(screen.getByText("Finish"));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard navigation - Escape to skip", () => {
    renderSpotlight();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard navigation - ArrowRight to next", () => {
    renderSpotlight();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard navigation - Enter to next", () => {
    renderSpotlight();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard navigation - ArrowLeft to prev (not on first step)", () => {
    renderSpotlight({ currentStep: 1 });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(mockOnPrev).toHaveBeenCalledTimes(1);
  });

  it("does not go back on first step with ArrowLeft", () => {
    renderSpotlight({ currentStep: 0 });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(mockOnPrev).not.toHaveBeenCalled();
  });

  it("calls onComplete on last step with Enter", () => {
    renderSpotlight({ currentStep: 2 });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it("renders action button when step has action", () => {
    renderSpotlight({ currentStep: 2 });
    expect(screen.getByText("Do Something")).toBeInTheDocument();
  });

  it("calls action onClick when action button is clicked", () => {
    renderSpotlight({ currentStep: 2 });
    fireEvent.click(screen.getByText("Do Something"));
    expect(mockSteps[2].action?.onClick).toHaveBeenCalled();
  });
});
