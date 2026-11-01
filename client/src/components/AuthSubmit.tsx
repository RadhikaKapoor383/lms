interface AuthSubmitProps {
  loading: boolean;
  idleLabel: string;
  loadingLabel: string;
}

export default function AuthSubmit({ loading, idleLabel, loadingLabel }: AuthSubmitProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-mustard px-6 py-3 font-medium text-ink transition hover:-translate-y-0.5 hover:bg-mustard-dark hover:shadow-lg disabled:translate-y-0 disabled:opacity-60 disabled:hover:shadow-none"
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {loading ? loadingLabel : idleLabel}
    </button>
  );
}
