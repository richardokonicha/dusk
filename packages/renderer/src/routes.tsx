import { createBrowserRouter } from "react-router-dom";
import App from "./App";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { WorkspaceListPage } = await import("./pages/WorkspaceListPage");
          return { Component: WorkspaceListPage };
        },
      },
      {
        path: "workspace/:workspaceId",
        lazy: async () => {
          const { WorkspacePage } = await import("./pages/WorkspacePage");
          return { Component: WorkspacePage };
        },
      },
      {
        path: "workspace/:workspaceId/conversation/:conversationId",
        lazy: async () => {
          const { ChatPage } = await import("./pages/ChatPage");
          return { Component: ChatPage };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const { SettingsPage } = await import("./pages/SettingsPage");
          return { Component: SettingsPage };
        },
      },
    ],
  },
]);
