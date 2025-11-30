import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionPage } from "../pages/SessionPage";

vi.mock("@/hooks/useSocket", () => ({
  useSocket: () => ({
    isConnected: false,
    connectedUsers: 1,
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

vi.mock("@/lib/codeExecution", () => ({
  executeJavaScript: vi.fn(() => ({ output: "js-out", error: null })),
}));

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: () => <div data-testid="monaco-editor" />,
}));

describe("SessionPage", () => {
  const renderWithRouter = (sessionId = "TEST123") =>
    render(
      <MemoryRouter initialEntries={[`/session/${sessionId}`]}>
        <Routes>
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </MemoryRouter>
    );

  it("renders editor and Run button", () => {
    renderWithRouter();
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
  });

  it("shows the session ID", () => {
    renderWithRouter("ROOM42");
    expect(screen.getByText(/ROOM42/i)).toBeInTheDocument();
  });

  it("calls run handler when Run is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const runButton = screen.getByRole("button", { name: /run/i });
    await user.click(runButton);

    const { executeJavaScript } = await import("@/lib/codeExecution");
    expect(executeJavaScript).toHaveBeenCalled();
  });
});
