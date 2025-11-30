import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App landing", () => {
  it("renders branding and tagline", () => {
    render(<App />);
    const headings = screen.getAllByText(/CodePair/i);
    expect(headings.length).toBeGreaterThan(0);
    expect(
      screen.getByText(/collaborative problem-solving space/i)
    ).toBeInTheDocument();
  });

  it("shows create session button", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /start a codepair session/i })
    ).toBeInTheDocument();
  });
});
