import { createAccount } from "../src/controller";

describe("Account Service", () => {
  it("creates a new account", () => {
    const user = { id: "1", name: "Alice" };
    const account = createAccount(user);
    expect(account).toHaveProperty("id");
    expect(account.userId).toBe(user.id);
    expect(account.name).toBe(user.name);
  });
});
