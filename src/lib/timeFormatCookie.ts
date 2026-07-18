// Device-level 12/24-hour time-format preference. Kept in its own import-free
// module so both the server resolver (getUse24Hour) and the client settings
// control can share the cookie name without pulling Prisma into the bundle.
// Values: "12" or "24"; absent means "follow the company setting".
export const TIME_FORMAT_COOKIE = "time-format";
