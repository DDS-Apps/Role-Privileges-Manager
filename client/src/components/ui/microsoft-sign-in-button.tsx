import { Loader2 } from "lucide-react";

function MicrosoftLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="21"
      height="21"
      viewBox="0 0 21 21"
      aria-hidden
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function MicrosoftSignInButton({
  onClick,
  disabled,
  loading,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-[41px] w-full items-center justify-center gap-3 rounded-sm border border-[#8c8c8c] bg-white px-4 text-[15px] font-semibold text-[#5e5e5e] shadow-sm transition-colors hover:bg-[#f3f3f3] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#5e5e5e]" />
      ) : (
        <MicrosoftLogo />
      )}
      <span>{loading ? "Signing in with Microsoft…" : "Sign in with Microsoft"}</span>
    </button>
  );
}
