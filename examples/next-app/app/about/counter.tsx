"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      Clicked {count} {count === 1 ? "time" : "times"}
    </button>
  );
}
