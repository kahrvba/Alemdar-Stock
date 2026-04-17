type Semver = {
  major: number;
  minor: number;
  patch: number;
};

function parseSemver(input: string): Semver | null {
  const match = input.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatSemver(value: Semver) {
  return `${value.major}.${value.minor}.${value.patch}`;
}

export function incrementPatch(version: string) {
  const parsed = parseSemver(version);
  if (!parsed) return "1.0.1";

  return formatSemver({
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch + 1,
  });
}

export function normalizeBaseVersion(version: string) {
  const parsed = parseSemver(version);
  if (!parsed) return "1.0.0";
  return formatSemver(parsed);
}
