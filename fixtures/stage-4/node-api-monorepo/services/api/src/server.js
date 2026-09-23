import { saveOrder } from "./store.js";
export async function route(request) {
  const token = request.headers.authorization;
  if (!token) return { status: 401 };
  const order = await request.json();
  await saveOrder(request.database, order);
  return request.fetch("https://example.invalid/events", {
    method: "POST",
    body: JSON.stringify(order),
  });
}
