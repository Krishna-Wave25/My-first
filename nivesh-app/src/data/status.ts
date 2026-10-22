// Where a piece of market data came from. Kept in its own file so it is trivially testable.
export type Status = "live" | "sample" | "partial"; // partial = live, but some symbols failed to load
export type Result<T> = { data: T; status: Status };
export const worstStatus = (...s: Status[]): Status => (s.includes("sample") ? "sample" : s.includes("partial") ? "partial" : "live");
