import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App landing", () => {
  it("renders branding and tagline", () => {
    render(<App />);
    const headings = screen.getAllByText(/CodeCanvas/i);
    expect(headings.length).toBeGreaterThan(0);
    expect(
      screen.getByText(/real-time collaboration suite for developers/i)
    ).toBeInTheDocument();
  });

  it("shows create session button", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /start a session/i })
    ).toBeInTheDocument();
  });
});
