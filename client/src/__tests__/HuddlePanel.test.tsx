import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SessionPage } from "../pages/SessionPage";

vi.mock("@/hooks/useSocket", () => ({
  useSocket: () => ({
    isConnected: true,
    connectedUsers: 2,
    emitCodeUpdate: vi.fn(),
    error: null,
  }),
}));

vi.mock("@/hooks/usePyodide", () => ({
  usePyodide: () => ({
    runPython: vi.fn(async () => ({ output: "py-out", error: null })),
    isLoading: false,
  }),
}));

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: () => <div data-testid="monaco-editor" />,
}));

describe("Huddle panel flow", () => {
  it("shows Join huddle button and reveals panel on click", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/session/ROOM1"]}>
        <Routes>
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </MemoryRouter>
    );

    const joinButton = screen.getByRole("button", { name: /join huddle/i });
    await user.click(joinButton);

    expect(
      screen.getByText(/team huddle placeholder/i)
    ).toBeInTheDocument();
  });
});
