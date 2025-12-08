import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionPage } from "../pages/SessionPage";

vi.mock("@/hooks/useSocket", () => ({
  useSocket: () => ({
    isConnected: false,
    emitCodeUpdate: vi.fn(),
    emitCodeOutput: vi.fn(),
    emitCursorUpdate: vi.fn(),
    emitDraw: vi.fn(),
    emitClear: vi.fn(),
    remoteCursors: {},
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

vi.mock("@/lib/api", () => {
  const baseDoc = {
    content: "// code",
    version: 1,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: null,
  };

  class ApiError extends Error {
    status?: number;
    constructor(message?: string, status?: number) {
      super(message);
      this.status = status;
    }
  }

  const session = {
    sessionId: "TEST123",
    title: null,
    createdAt: "2024-01-01T00:00:00Z",
    lastActiveAt: "2024-01-01T00:00:00Z",
    activeParticipants: 0,
    participants: [],
    codeByLanguage: {
      javascript: { language: "javascript", ...baseDoc },
      python: { language: "python", ...baseDoc },
      sql: { language: "sql", ...baseDoc },
    },
  };

  return {
    ApiError,
    createSession: vi.fn(async () => session),
    getSession: vi.fn(async () => session),
    getCodeSnapshot: vi.fn(async () => ({
      sessionId: session.sessionId,
      codeByLanguage: session.codeByLanguage,
    })),
    joinSession: vi.fn(async () => ({
      sessionId: session.sessionId,
      participantId: "p1",
      activeParticipants: 1,
      participants: [],
    })),
    leaveSession: vi.fn(async () => {}),
    saveCode: vi.fn(async () => ({
      language: "javascript",
      ...baseDoc,
    })),
  };
});

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

    const runButton = await screen.findByRole("button", { name: /run/i });
    await waitFor(() => expect(runButton).not.toBeDisabled());
    await user.click(runButton);

    const { executeJavaScript } = await import("@/lib/codeExecution");
    expect(executeJavaScript).toHaveBeenCalled();
  });
});
