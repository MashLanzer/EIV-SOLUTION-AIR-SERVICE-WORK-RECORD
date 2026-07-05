// Gmail (and Google Workspace via googlemail.com) ignores dots in the local
// part and everything after a "+" - so "j.doe+work@gmail.com" and
// "jdoe@gmail.com" deliver to the same inbox. Two authorized-worker rows
// created from those spellings would look like different people even
// though they're the same Google account. This folds a raw email down to
// the form Gmail actually routes on, for duplicate detection only - the
// address as typed is still what gets stored and matched against sign-in.
export function normalizeEmailForDuplicateCheck(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at === -1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain !== "gmail.com" && domain !== "googlemail.com") return email;

  const withoutAlias = local.split("+")[0];
  const withoutDots = withoutAlias.replaceAll(".", "");
  return `${withoutDots}@gmail.com`;
}
