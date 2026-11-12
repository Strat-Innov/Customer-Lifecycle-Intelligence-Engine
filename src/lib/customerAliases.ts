/**
 * Display aliases ("Customer 1", "Customer 2", ...) that hide real customer
 * names on screen. Aliases are a lookup kept beside the data: imported names
 * are never changed, and a customer keeps the same number for good, even if
 * the import that introduced them is removed and later re-imported.
 */
export type CustomerAliases = Record<string, number>;

/** Same matching rule imports use for customers: case-insensitive, trimmed. */
export function aliasKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Returns aliases with a new number for every name that doesn't have one yet, in the order given. */
export function assignAliases(aliases: CustomerAliases, names: string[]): CustomerAliases {
  let next = Math.max(0, ...Object.values(aliases)) + 1;
  let result = aliases;
  for (const name of names) {
    const key = aliasKey(name);
    if (key in result) continue;
    if (result === aliases) result = { ...aliases };
    result[key] = next++;
  }
  return result;
}

export function aliasLabel(aliases: CustomerAliases, name: string): string {
  const n = aliases[aliasKey(name)];
  return n === undefined ? "Customer" : `Customer ${n}`;
}
