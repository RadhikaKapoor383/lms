import { RefObject, useEffect, useRef, useState } from "react";

// True once the element has scrolled into view (stays true afterwards).
export function useInView<T extends Element>(threshold = 0.3): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState<boolean>(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}
