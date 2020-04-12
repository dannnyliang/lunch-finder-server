import { createTestServer } from "./createTestServer";

export const testUtils = createTestServer();

beforeEach(async () => {
  await testUtils.connect();
});

afterEach(async () => {
  await testUtils.tearDown();
});
