import { setupServer } from 'msw/node';

/**
 * MSW is only used by tests in this scaffold. The browser build talks to the
 * real Go API; tests register handlers with `server.use(...)` as needed.
 */
export const server = setupServer();
