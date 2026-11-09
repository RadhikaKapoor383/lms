// A rubber stamp for something that is finished. It "lands" once with a short
// thud (no motion for people who prefer less). The ink look comes from the
// #ink-rough filter that AppWrapper puts on the page once.
export default function CompletedStamp({ size = "sm", date }: { size?: "sm" | "md"; date?: string }) {
  const big = size === "md";
  return (
    <span
      className={`inline-block animate-stamp select-none border-double border-clay text-center font-bold uppercase text-clay [filter:url(#ink-rough)] dark:border-[#E58A72] dark:text-[#E58A72] ${
        big ? "rounded-md border-[3px] px-4 py-1.5 text-lg tracking-[0.2em]" : "rounded border-[3px] px-2.5 py-0.5 text-[11px] tracking-[0.18em]"
      }`}
    >
      Completed
      {date && <span className="block text-[9px] font-semibold tracking-[0.3em]">{date}</span>}
    </span>
  );
}
