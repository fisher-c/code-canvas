import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelector } from "../components/LanguageSelector";

describe("LanguageSelector", () => {
  it("renders language options", () => {
    render(
      <LanguageSelector value="javascript" onChange={() => {}} />
    );

    expect(screen.getByRole("option", { name: /javascript/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /python/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /sql/i })).toBeInTheDocument();
  });

  it("calls onChange when selection changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LanguageSelector value="javascript" onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: /python/i })
    );

    expect(onChange).toHaveBeenCalledWith("python");
  });
});
