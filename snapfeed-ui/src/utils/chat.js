export function fullName(u) {
  if (!u) return "";
  const f = String(u.firstName ?? "").trim();
  const l = String(u.lastName ?? "").trim();
  const full = `${f} ${l}`.trim();
  return full || String(u.username ?? "").trim();
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickStable(items, seed, n) {
  const arr = Array.isArray(items) ? [...items] : [];
  if (arr.length <= n) return arr;
  const rnd = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

export function getDirectOtherParticipant(participants, meId) {
  const users = Array.isArray(participants) ? participants : [];
  if (!meId) return users[0] ?? null;
  return users.find((u) => u?.id && u.id !== meId) ?? users[0] ?? null;
}

export function buildConversationName(conv, meId) {
  const participants = Array.isArray(conv?.participants) ? conv.participants : [];

  if (conv?.type === "self") {
    return fullName(participants[0]);
  }

  if (conv?.type === "direct") {
    return fullName(getDirectOtherParticipant(participants, meId));
  }

  if (conv?.type === "group") {
    const title = String(conv?.title ?? "").trim();
    if (title) return title;

    const picked = pickStable(
      participants.filter(Boolean).map(fullName).filter(Boolean),
      Number(conv?.id) || 0,
      3
    );
    const suffix = participants.length > picked.length ? "…" : "";
    return picked.join(", ") + (suffix ? ` ${suffix}` : "");
  }

  return "Tin nhắn";
}

