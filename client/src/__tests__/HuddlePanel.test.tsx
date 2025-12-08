import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SessionPage } from "../pages/SessionPage";

vi.mock("@/hooks/useSocket", () => ({
  useSocket: () => ({
    isConnected: true,
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

vi.mock("@/lib/api", () => {
  const baseDoc = {
    content: "// code",
    version: 1,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: null,
  };
  const session = {
    sessionId: "ROOM1",
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

  class ApiError extends Error {
    status?: number;
    constructor(message?: string, status?: number) {
      super(message);
      this.status = status;
    }
  }

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
      screen.getByText(/connect with your team using voice and video/i)
    ).toBeInTheDocument();
  });
});
