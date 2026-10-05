import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Navbar } from "./Navbar";

describe("Navbar Component", () => {
  it("renders brand name and pilot area badge", () => {
    render(
      <Navbar
        currentTab="forecast"
        onTabChange={vi.fn()}
        lang="en"
        onLangToggle={vi.fn()}
        isSnapshot={false}
      />
    );
    expect(screen.getByText("Pragyan")).toBeInTheDocument();
    expect(screen.getByText(/Panchayat-Level Forecast/i)).toBeInTheDocument();
  });

  it("handles tab switching and language toggle clicks", () => {
    const onTabChange = vi.fn();
    const onLangToggle = vi.fn();
    render(
      <Navbar
        currentTab="forecast"
        onTabChange={onTabChange}
        lang="en"
        onLangToggle={onLangToggle}
        isSnapshot={false}
      />
    );

    const evidenceTabBtn = screen.getByRole("tab", { name: /Evidence/i });
    fireEvent.click(evidenceTabBtn);
    expect(onTabChange).toHaveBeenCalledWith("evidence");

    const langToggleBtn = screen.getByRole("button", { name: /Toggle language/i });
    fireEvent.click(langToggleBtn);
    expect(onLangToggle).toHaveBeenCalled();
  });

  it("renders snapshot notice when in offline snapshot mode", () => {
    render(
      <Navbar
        currentTab="forecast"
        onTabChange={vi.fn()}
        lang="en"
        onLangToggle={vi.fn()}
        isSnapshot={true}
      />
    );
    expect(screen.getByText(/Demo Snapshot Mode/i)).toBeInTheDocument();
  });
});
