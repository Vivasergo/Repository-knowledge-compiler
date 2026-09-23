export async function saveOrder(database, order) {
  return database.insert("orders", order);
}
