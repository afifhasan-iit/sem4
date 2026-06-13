'use client';

import { useState } from "react";

const hooks = {
  useState: {
    category: "State",
    desc: "Lets a component remember a value between renders. Returns the current value and a setter function.",
    analogy: "Like a whiteboard in a classroom — you can read what's written, and erase + rewrite it. Every time you update it, the teacher (React) re-reads the board.",
    uses: ["Toggle a button on/off", "Store form input values", "Track a counter", "Control a modal's open/close state"],
    code: `const [count, setCount] = useState(0);

// Read the value
return <p>{count}</p>;

// Update the value (triggers re-render)
setCount(count + 1);`,
  },
  useReducer: {
    category: "State",
    desc: "Like useState but for complex state logic. You define a reducer function that handles different named actions.",
    analogy: "Like a bank teller. You don't touch the vault directly — you submit a request (deposit/withdraw), and the teller decides how to update the balance.",
    uses: ["Shopping cart with add/remove/clear actions", "Multi-step form state", "Complex game state (health, score, level)", "State with multiple sub-values that update together"],
    code: `const reducer = (state, action) => {
  if (action.type === 'increment')
    return { count: state.count + 1 };
  return state;
};

const [state, dispatch] = useReducer(reducer, { count: 0 });

dispatch({ type: 'increment' });`,
  },
  useContext: {
    category: "Context",
    desc: "Reads a value from a React Context — lets any component access shared data without passing props through every level.",
    analogy: "Like Wi-Fi. Instead of running a cable from router to every device (prop drilling), every component just tunes into the same network.",
    uses: ["Current logged-in user", "Theme (dark/light mode)", "Language/locale", "Shared app-wide settings"],
    code: `const ThemeContext = createContext('light');

// In parent — broadcast the value
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>

// In any child — receive it
const theme = useContext(ThemeContext);`,
  },
  useRef: {
    category: "Ref",
    desc: "Holds a mutable value that does NOT trigger a re-render when changed. Also used to directly reference DOM elements.",
    analogy: "Like a sticky note on your monitor — you can update it any time without interrupting your work. React doesn't 'notice' the change.",
    uses: ["Focus an input programmatically", "Store a timer ID (setInterval)", "Track previous value of state", "Access a DOM element directly"],
    code: `const inputRef = useRef(null);

// Attach to DOM element
<input ref={inputRef} />

// Use it — no re-render triggered
inputRef.current.focus();

// Also works as a mutable box
const timerRef = useRef(null);
timerRef.current = setInterval(tick, 1000);`,
  },
  useImperativeHandle: {
    category: "Ref",
    desc: "Lets a child component expose specific methods to a parent via a ref, instead of exposing the whole DOM node.",
    analogy: "Like a remote control. The TV (child) has many internal functions, but you only expose Play, Pause, and Volume to the user (parent).",
    uses: ["Custom input component exposing .focus()", "A modal exposing .open() / .close()", "A chart exposing .reset()"],
    code: `forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => inputRef.current.value = ''
  }));
  return <input ref={inputRef} />;
});`,
  },
  useEffect: {
    category: "Effect",
    desc: "Runs side effects after render — things that reach outside React like API calls, subscriptions, or DOM manipulation.",
    analogy: "Like setting an alarm after you go to bed. React finishes rendering (you fall asleep), then the alarm fires (the effect runs).",
    uses: ["Fetch data on component mount", "Set up a WebSocket or event listener", "Update document.title", "Clean up a subscription on unmount"],
    code: `useEffect(() => {
  // Runs after every render where userId changed
  fetchUser(userId).then(setUser);

  // Cleanup runs before next effect or unmount
  return () => cancelFetch();
}, [userId]); // dependency array`,
  },
  useLayoutEffect: {
    category: "Effect",
    desc: "Like useEffect but fires synchronously after DOM mutations, before the browser paints. Use sparingly.",
    analogy: "Like a last-minute quality check on a production line — it happens after the product is made but before it ships to the customer.",
    uses: ["Measure DOM element size/position before paint", "Synchronously update DOM to avoid visual flash", "Tooltip positioning"],
    code: `useLayoutEffect(() => {
  // Runs BEFORE browser paints
  const { height } = ref.current.getBoundingClientRect();
  setHeight(height);
}, []);`,
  },
  useInsertionEffect: {
    category: "Effect",
    desc: "Fires before any DOM mutations. Reserved for CSS-in-JS libraries to inject styles before layout is read.",
    analogy: "Like the stage crew setting up props before the lights turn on and the actors take position.",
    uses: ["CSS-in-JS libraries (styled-components, Emotion internals)", "Injecting <style> tags before layout reads"],
    code: `// Mostly used by library authors, not app code
useInsertionEffect(() => {
  const style = document.createElement('style');
  style.textContent = '.btn { color: red }';
  document.head.appendChild(style);
  return () => style.remove();
}, []);`,
  },
  useMemo: {
    category: "Performance",
    desc: "Caches the result of an expensive calculation. Only recalculates when its dependencies change.",
    analogy: "Like a calculator that remembers its last answer. If you type the same equation again, it skips the calculation and shows the saved result.",
    uses: ["Filtering/sorting a large list", "Complex mathematical computations", "Deriving data from props", "Stabilizing object references for useEffect"],
    code: `const sorted = useMemo(() => {
  // Expensive sort — only reruns if 'items' changes
  return [...items].sort((a, b) => a.price - b.price);
}, [items]);`,
  },
  useCallback: {
    category: "Performance",
    desc: "Caches a function definition so it isn't recreated on every render. Useful when passing callbacks to memoized child components.",
    analogy: "Like saving a shortcut on your phone. Instead of searching for the app every time (recreating the function), you tap the saved icon.",
    uses: ["Passing stable callbacks to React.memo children", "Avoiding useEffect re-runs caused by function dependencies", "Event handlers in optimized lists"],
    code: `const handleClick = useCallback(() => {
  doSomething(id);
}, [id]); // only recreated when id changes

// Stable reference — won't re-render MemoChild
<MemoChild onClick={handleClick} />`,
  },
  useTransition: {
    category: "Performance",
    desc: "Marks a state update as non-urgent, keeping the UI responsive while a heavier update happens in the background.",
    analogy: "Like a restaurant that keeps serving drinks (urgent UI) while the main course is being prepared in the background (slow update).",
    uses: ["Search/filter with large lists", "Tab switching that loads new content", "Navigation with heavy render work"],
    code: `const [isPending, startTransition] = useTransition();

startTransition(() => {
  // Low-priority — won't block typing
  setSearchResults(filterItems(query));
});

if (isPending) return <Spinner />;`,
  },
  useDeferredValue: {
    category: "Performance",
    desc: "Defers re-rendering a part of the UI, prioritizing more urgent updates first.",
    analogy: "Like autocomplete — the text field updates instantly as you type, but the dropdown suggestions lag slightly behind on purpose.",
    uses: ["Deferring a slow list re-render while input stays fast", "Showing stale content while new content loads"],
    code: `const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

// Input uses 'query' (instant)
// Slow list uses 'deferredQuery' (deferred)
<input value={query} onChange={e => setQuery(e.target.value)} />
<HeavyList filter={deferredQuery} />`,
  },
  use: {
    category: "Resource",
    desc: "Reads the value of a Promise or Context inside a component, even conditionally. Suspends until the Promise resolves.",
    analogy: "Like ordering food online — the app shows a spinner until the confirmation arrives, then renders the result.",
    uses: ["Reading data from a Promise with Suspense", "Conditionally reading a Context value"],
    code: `// Wrap in Suspense to handle loading
<Suspense fallback={<Spinner />}>
  <UserCard />
</Suspense>

// Inside the component
function UserCard() {
  const user = use(userPromise);
  return <p>{user.name}</p>;
}`,
  },
  useActionState: {
    category: "Form",
    desc: "Manages state that updates in response to a form action. Tracks pending status, result, and error from async submissions.",
    analogy: "Like a shipping tracker — you submit an order, it tracks the status (pending → delivered/failed) and gives you the result.",
    uses: ["Async form submission with loading state", "Server actions in React frameworks", "Login/signup forms"],
    code: `const [state, formAction, isPending] =
  useActionState(submitForm, null);

<form action={formAction}>
  <input name="email" />
  <button disabled={isPending}>
    {isPending ? 'Submitting...' : 'Submit'}
  </button>
</form>`,
  },
  useFormStatus: {
    category: "Form",
    desc: "Returns the pending status of the parent form. Must be used inside a component rendered within the form.",
    analogy: "Like a submit button that checks the mailbox itself — it knows if a letter is currently in transit and disables itself accordingly.",
    uses: ["Disabling a submit button while form is pending", "Showing a spinner inside a submit button component", "Reusable form UI that reacts to submission state"],
    code: `// Must be INSIDE the <form> component
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}`,
  },
  useOptimistic: {
    category: "Form",
    desc: "Shows a temporary optimistic UI state while an async operation is in progress, rolling back if it fails.",
    analogy: "Like a Like button that turns red instantly — you assume success, show the result immediately, and roll back only if the server says no.",
    uses: ["Optimistic like/react button", "Adding a todo that appears immediately before server confirms", "Sending a message that appears instantly in chat"],
    code: `const [optimisticLikes, addLike] =
  useOptimistic(serverLikes, (current) => current + 1);

async function handleLike() {
  addLike();          // instant UI update
  await likePost(id); // actual server call
}`,
  },
  useId: {
    category: "ID / Debug",
    desc: "Generates a unique, stable ID consistent between server and client renders. Primarily for accessibility attributes.",
    analogy: "Like an auto-number in a spreadsheet — each row gets a unique ID automatically, with no manual tracking.",
    uses: ["Linking <label> to <input> via htmlFor", "ARIA attributes like aria-describedby", "Accessible form components"],
    code: `const emailId = useId();

return (
  <>
    <label htmlFor={emailId}>Email</label>
    <input id={emailId} type="email" />
  </>
);`,
  },
  useDebugValue: {
    category: "ID / Debug",
    desc: "Adds a label to a custom hook in React DevTools, making it easier to inspect during development.",
    analogy: "Like putting a sticky label on a circuit board — it doesn't change how it works, it just helps the engineer reading it.",
    uses: ["Labeling custom hooks in DevTools", "Showing formatted debug info (e.g. a formatted date)"],
    code: `function useUser(id) {
  const [user, setUser] = useState(null);

  // Shows "User: Afif" in React DevTools
  useDebugValue(user?.name ?? 'Loading...');

  return user;
}`,
  },
  useSyncExternalStore: {
    category: "ID / Debug",
    desc: "Subscribes to an external store (outside React state) and keeps the component in sync with it safely.",
    analogy: "Like a stock ticker widget — it subscribes to the live feed and re-renders whenever the price changes, without manually pushing updates.",
    uses: ["Subscribing to a Redux/Zustand/Jotai store", "Reading window.innerWidth from a resize event", "Syncing with browser APIs like localStorage"],
    code: `const width = useSyncExternalStore(
  (cb) => {
    window.addEventListener('resize', cb);
    return () => window.removeEventListener('resize', cb);
  },
  () => window.innerWidth
);`,
  },
};

const groups = [
  { label: "State", keys: ["useState", "useReducer"] },
  { label: "Context", keys: ["useContext"] },
  { label: "Ref", keys: ["useRef", "useImperativeHandle"] },
  { label: "Effect", keys: ["useEffect", "useLayoutEffect", "useInsertionEffect"] },
  { label: "Performance", keys: ["useMemo", "useCallback", "useTransition", "useDeferredValue"] },
  { label: "Resource", keys: ["use"] },
  { label: "Form", keys: ["useActionState", "useFormStatus", "useOptimistic"] },
  { label: "ID / Debug", keys: ["useId", "useDebugValue", "useSyncExternalStore"] },
];

const categoryColors = {
  light: {
    State:        { bg: "#EEEDFE", text: "#3C3489" },
    Context:      { bg: "#E1F5EE", text: "#085041" },
    Ref:          { bg: "#FAEEDA", text: "#633806" },
    Effect:       { bg: "#FAECE7", text: "#712B13" },
    Performance:  { bg: "#E6F1FB", text: "#0C447C" },
    Resource:     { bg: "#FBEAF0", text: "#72243E" },
    Form:         { bg: "#EAF3DE", text: "#27500A" },
    "ID / Debug": { bg: "#F1EFE8", text: "#444441" },
  },
  dark: {
    State:        { bg: "#26215C", text: "#CECBF6" },
    Context:      { bg: "#04342C", text: "#9FE1CB" },
    Ref:          { bg: "#412402", text: "#FAC775" },
    Effect:       { bg: "#4A1B0C", text: "#F5C4B3" },
    Performance:  { bg: "#042C53", text: "#B5D4F4" },
    Resource:     { bg: "#4B1528", text: "#F4C0D1" },
    Form:         { bg: "#173404", text: "#C0DD97" },
    "ID / Debug": { bg: "#2C2C2A", text: "#D3D1C7" },
  },
};

export default function ReactHooksNotes() {
  const [activeHook, setActiveHook] = useState("useState");
  const [activeTab, setActiveTab] = useState("overview");
  const [dark, setDark] = useState(false);

  const hook = hooks[activeHook];
  const catColor = categoryColors[dark ? "dark" : "light"][hook.category];

  const t = {
    bg:          dark ? "#0f1117" : "#ffffff",
    sidebarBg:   dark ? "#161b25" : "#f9f9f8",
    border:      dark ? "#2a2d3a" : "#e5e7eb",
    text:        dark ? "#e2e8f0" : "#111827",
    textMuted:   dark ? "#8b95a6" : "#6b7280",
    textSub:     dark ? "#cbd5e1" : "#374151",
    activeFg:    dark ? "#a78bfa" : "#533AB7",
    activeBar:   dark ? "#7C6FE0" : "#7F77DD",
    analogyBg:   dark ? "#1e1b2e" : "#f5f3ff",
    useBg:       dark ? "#161b25" : "#f9f9f8",
    codeBg:      dark ? "#1a1d2e" : "#f9f9f8",
    codeText:    dark ? "#e2e8f0" : "#1f2937",
    sideActive:  dark ? "#1e1b2e" : "#ffffff",
    toggleBg:    dark ? "#312e81" : "#e0e7ff",
    toggleDot:   dark ? "#a78bfa" : "#4f46e5",
  };

  const handleSelect = (key) => {
    setActiveHook(key);
    setActiveTab("overview");
  };

  return (
    <div style={{ fontFamily: "sans-serif", display: "flex", flexDirection: "column", height: "600px", border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", background: t.bg, transition: "background 0.2s, color 0.2s" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg, flexShrink: 0 }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: t.text, fontFamily: "monospace" }}>React Hooks</span>
        <button
          onClick={() => setDark(!dark)}
          aria-label="Toggle dark mode"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: t.toggleBg, border: "none", borderRadius: "20px",
            padding: "4px 10px", cursor: "pointer", transition: "background 0.2s",
          }}
        >
          <span style={{ fontSize: "13px" }}>{dark ? "🌙" : "☀️"}</span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: t.activeFg }}>{dark ? "Dark" : "Light"}</span>
        </button>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: "196px", borderRight: `1px solid ${t.border}`, overflowY: "auto", background: t.sidebarBg, flexShrink: 0 }}>
          {groups.map((g) => (
            <div key={g.label}>
              <div style={{ padding: "10px 12px 4px", fontSize: "11px", fontWeight: 600, color: t.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {g.label}
              </div>
              {g.keys.map((k) => (
                <div
                  key={k}
                  onClick={() => handleSelect(k)}
                  style={{
                    padding: "7px 14px", fontSize: "13px", cursor: "pointer",
                    fontFamily: "monospace",
                    color: activeHook === k ? t.activeFg : t.textMuted,
                    fontWeight: activeHook === k ? 600 : 400,
                    borderLeft: activeHook === k ? `2px solid ${t.activeBar}` : "2px solid transparent",
                    background: activeHook === k ? t.sideActive : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {k}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: t.bg }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${t.border}`, marginBottom: "20px" }}>
            {["overview", "code"].map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 14px", fontSize: "13px", cursor: "pointer",
                  color: activeTab === tab ? t.activeFg : t.textMuted,
                  borderBottom: activeTab === tab ? `2px solid ${t.activeBar}` : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {tab === "code" ? "Code example" : "Overview"}
              </div>
            ))}
          </div>

          {/* Hook name */}
          <div style={{ fontSize: "20px", fontWeight: 600, fontFamily: "monospace", color: t.text, marginBottom: "6px" }}>
            {activeHook}
          </div>

          {/* Badge */}
          <span style={{ display: "inline-block", fontSize: "11px", padding: "2px 10px", borderRadius: "20px", marginBottom: "16px", background: catColor.bg, color: catColor.text, fontWeight: 500 }}>
            {hook.category}
          </span>

          {activeTab === "overview" ? (
            <>
              <p style={{ fontSize: "14px", color: t.textSub, lineHeight: "1.7", marginBottom: "16px" }}>
                {hook.desc}
              </p>

              <div style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Analogy
              </div>
              <div style={{ background: t.analogyBg, borderLeft: `3px solid ${t.activeBar}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: "13px", color: t.textSub, lineHeight: "1.6", marginBottom: "16px" }}>
                {hook.analogy}
              </div>

              <div style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                When to use
              </div>
              <div style={{ background: t.useBg, borderRadius: "8px", padding: "10px 14px" }}>
                {hook.uses.map((u, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "3px 0", fontSize: "13px", color: t.textSub }}>
                    <span style={{ color: t.activeBar, flexShrink: 0 }}>→</span>
                    {u}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <pre style={{ background: t.codeBg, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: t.codeText, overflowX: "auto", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
              {hook.code}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}