import { useNavigate } from "react-router-dom";
import { getDirectOtherParticipant, pickStable } from "../../utils/chat";

function GroupAvatars({ users, seed }) {
  const picked = pickStable(
    (users || []).filter((u) => u?.avatarUrl),
    seed,
    2
  );

  if (picked.length === 0) {
    return <div className="h-11 w-11 shrink-0 rounded-2xl bg-gray-300 dark:bg-white/10" />;
  }

  if (picked.length === 1) {
    return (
      <img
        src={picked[0].avatarUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-2xl object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="relative h-11 w-11 shrink-0">
      <img
        src={picked[0].avatarUrl}
        alt=""
        className="absolute left-0 top-0 h-8 w-8 rounded-xl object-cover ring-2 ring-white dark:ring-black"
        referrerPolicy="no-referrer"
      />
      <img
        src={picked[1].avatarUrl}
        alt=""
        className="absolute bottom-0 right-0 h-8 w-8 rounded-xl object-cover ring-2 ring-white dark:ring-black"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function ConversationAvatar({ conv, meId }) {
  const navigate = useNavigate();
  const participants = Array.isArray(conv?.participants) ? conv.participants : [];

  if (conv?.type === "group") {
    return <GroupAvatars users={participants} seed={Number(conv?.id) || 0} />;
  }

  if (conv?.type === "direct") {
    const other = getDirectOtherParticipant(participants, meId);
    if (other?.avatarUrl) {
      return (
        <img
          src={other.avatarUrl}
          alt=""
          className="h-11 w-11 shrink-0 cursor-pointer rounded-full object-cover transition hover:opacity-80"
          referrerPolicy="no-referrer"
          onClick={() => other?.id && navigate(`/profile/${other.id}`)}
        />
      );
    }
    return (
      <div
        className="h-11 w-11 shrink-0 cursor-pointer rounded-full bg-gray-300 transition hover:opacity-80 dark:bg-white/10"
        onClick={() => other?.id && navigate(`/profile/${other.id}`)}
      />
    );
  }

  const me = participants[0] ?? null;
  if (me?.avatarUrl) {
    return (
      <img
        src={me.avatarUrl}
        alt=""
        className="h-11 w-11 shrink-0 cursor-pointer rounded-full object-cover transition hover:opacity-80"
        referrerPolicy="no-referrer"
        onClick={() => me?.id && navigate(`/profile/${me.id}`)}
      />
    );
  }
  return (
    <div
      className="h-11 w-11 shrink-0 cursor-pointer rounded-full bg-gray-300 transition hover:opacity-80 dark:bg-white/10"
      onClick={() => me?.id && navigate(`/profile/${me.id}`)}
    />
  );
}

