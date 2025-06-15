export function createAccount(user: { id: string, name: string }) {
  return { id: "acc-" + user.id, userId: user.id, name: user.name };
}
