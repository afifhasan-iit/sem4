'use client';

import { useState } from "react";

const hooks = {
  useState: {
    category: "State",
    mechanism: "Declares a variable that React tracks. You get back the current value and a setter function. Calling the setter does two things at once: it stores the new value AND tells React to re-render the component so the UI reflects it. A plain variable would either reset on every re-render or wouldn't trigger a re-render when changed — useState solves both.",
    variants: [
      { label: "Primitive default value (most common)", code: `const [count, setCount] = useState(0);\nconst [name, setName] = useState("");\nconst [isOpen, setIsOpen] = useState(false);` },
      { label: "No argument — starts as undefined", code: `const [user, setUser] = useState();\n// user is undefined until setUser(...) is called` },
      { label: "Object or array initial value", code: `const [form, setForm] = useState({ email: "", password: "" });\nconst [items, setItems] = useState([]);` },
      { label: "Lazy initialization with a function", code: `const [data, setData] = useState(() => {\n  return JSON.parse(localStorage.getItem("savedData")); // expensive\n});`, note: "React runs this function only once, on the first render. If you wrote useState(JSON.parse(...)) directly, that parse would run on every render even though the result is thrown away after the first." },
    ],
    pitfalls: [
      { title: "Stale value with rapid updates", text: "setCount(count + 1) called three times in a row adds only 1, because 'count' is frozen from that render. Use the updater function form instead — setCount(prev => prev + 1) — which always receives the latest value." },
      { title: "Mutating objects/arrays in place", text: "React checks 'did state change' by reference. form.email = 'x'; setForm(form) won't re-render because the reference is unchanged. Always create a new object/array: setForm({ ...form, email: 'x' })." },
    ],
    typescript: {
      text: "TypeScript infers the type from the initial value. useState(0) → number forever, useState('') → string forever — no annotation needed. Problems arise when the initial value doesn't represent every type the state will ever hold.",
      examples: [
        { code: `const [user, setUser] = useState(null);\n// inferred as 'null' — setUser({...}) errors`, note: "Fix: useState<User | null>(null)" },
        { code: `const [items, setItems] = useState([]);\n// inferred as never[] — setItems(["a"]) errors`, note: "Fix: useState<string[]>([])" },
        { code: `const [status, setStatus] =\n  useState<"loading" | "success" | "error">("loading");`, note: "Needed when the initial value is one option out of a union of possible states." },
      ],
    },
    uses: ["Toggle a button on/off", "Store form input values", "Track a counter", "Control a modal's open/close state"],
  },

  useReducer: {
    category: "State",
    mechanism: "Like useState, but instead of many separate setX calls scattered around, all update logic lives in one function called the reducer: (state, action) => newState. You call dispatch({ type: '...' }) to describe WHAT happened, and the reducer decides HOW the state changes. This keeps related state-transition logic in one place instead of spread across event handlers.",
    variants: [
      { label: "Basic setup", code: `function reducer(state, action) {\n  switch (action.type) {\n    case 'increment': return { count: state.count + 1 };\n    case 'decrement': return { count: state.count - 1 };\n    case 'reset': return { count: 0 };\n    default: return state;\n  }\n}\n\nconst [state, dispatch] = useReducer(reducer, { count: 0 });\n\ndispatch({ type: 'increment' });` },
      { label: "Lazy initialization (3rd argument)", code: `function init(initialCount) {\n  return { count: initialCount * 2 }; // some computation\n}\n\nconst [state, dispatch] = useReducer(reducer, 5, init);\n// state starts as { count: 10 }`, note: "Same idea as useState's lazy initializer — the init function runs only once, useful when computing the initial state is expensive or depends on a prop." },
      { label: "Passing extra data with an action", code: `dispatch({ type: 'add_item', payload: { id: 3, name: 'Apple' } });\n\n// in reducer:\ncase 'add_item': return { ...state, items: [...state.items, action.payload] };` },
    ],
    pitfalls: [
      { title: "Reducer must be pure", text: "No API calls, no mutations, no Math.random(), no setting other state inside the reducer. Given the same state + action, it must always return the same result. Side effects (like fetching) belong in useEffect, triggered by the new state." },
      { title: "Returning a new object, not mutating", text: "case 'increment': state.count++; return state; — won't trigger a re-render, same reference-equality issue as useState with objects. Always return a new object: return { ...state, count: state.count + 1 }." },
    ],
    typescript: {
      text: "Type the action as a discriminated union (each variant has a distinct 'type' string), which lets TypeScript narrow action.payload correctly inside each switch case.",
      examples: [
        { code: `type Action =\n  | { type: 'increment' }\n  | { type: 'add_item'; payload: Item };\n\nfunction reducer(state: State, action: Action): State {\n  switch (action.type) {\n    case 'add_item': return { ...state, items: [...state.items, action.payload] };\n    // action.payload is only accessible in this branch\n  }\n}` },
      ],
    },
    uses: ["Shopping cart with add/remove/clear actions", "Multi-step form state", "Complex game state (health, score, level)", "State with multiple sub-values that update together"],
  },

  useContext: {
    category: "Context",
    mechanism: "Normally, to get data from a top-level component to a deeply nested one, you pass it down as props through every component in between ('prop drilling'), even ones that don't need it. Context lets you skip that: a Provider component near the top broadcasts a value, and ANY descendant — no matter how deep — can call useContext to read it directly. When the Provider's value changes, every component reading it re-renders.",
    variants: [
      { label: "Create, provide, consume", code: `const ThemeContext = createContext('light'); // 'light' = default if no Provider above\n\n// Somewhere high in the tree:\n<ThemeContext.Provider value="dark">\n  <App />\n</ThemeContext.Provider>\n\n// In ANY descendant, however deep:\nconst theme = useContext(ThemeContext);` },
      { label: "Context value that updates (state + context combined)", code: `const UserContext = createContext(null);\n\nfunction App() {\n  const [user, setUser] = useState(null);\n  return (\n    <UserContext.Provider value={{ user, setUser }}>\n      <Profile />\n    </UserContext.Provider>\n  );\n}\n\n// In Profile (any depth):\nconst { user, setUser } = useContext(UserContext);` },
    ],
    pitfalls: [
      { title: "New object every render re-renders all consumers", text: "value={{ user, setUser }} creates a brand-new object on every render of the Provider, so every component using useContext re-renders even if user/setUser didn't actually change. Wrap it: const value = useMemo(() => ({ user, setUser }), [user])." },
      { title: "Forgetting the Provider", text: "If a component calls useContext(ThemeContext) but there's no <ThemeContext.Provider> above it, it silently gets the default value passed to createContext — no error, which can be confusing to debug." },
    ],
    uses: ["Current logged-in user", "Theme (dark/light mode)", "Language/locale", "Shared app-wide settings"],
  },

  useRef: {
    category: "Ref",
    mechanism: "Creates a 'box' (an object with a single .current property) that persists across re-renders, but changing .current does NOT trigger a re-render — React doesn't 'watch' it the way it watches state. It has two main jobs: (1) holding a direct reference to a real DOM element, and (2) acting as a general mutable variable for values you need to keep around but don't need to show on screen.",
    variants: [
      { label: "Referencing a DOM element", code: `const inputRef = useRef(null);\n\n<input ref={inputRef} />\n\n// later, e.g. in a click handler:\ninputRef.current.focus();` },
      { label: "Mutable value that isn't rendered", code: `const renderCount = useRef(0);\nrenderCount.current += 1; // updating doesn't cause a re-render\n\nconst timerRef = useRef(null);\ntimerRef.current = setInterval(tick, 1000);\nclearInterval(timerRef.current);` },
      { label: "Storing the previous value of a prop/state", code: `const prevValue = useRef();\n\nuseEffect(() => {\n  prevValue.current = value; // runs AFTER render, so this is "previous" next time\n}, [value]);\n\n// prevValue.current holds last render's 'value'` },
    ],
    pitfalls: [
      { title: "Reading/writing .current during render", text: "Refs are meant for things outside the render flow (event handlers, effects). Reading or writing ref.current directly in the component body makes your component unpredictable, since refs don't follow React's render rules." },
      { title: "Expecting the UI to update", text: "If you need the screen to change when a value changes, that value belongs in useState, not useRef. useRef changes are invisible to React's rendering." },
    ],
    typescript: {
      text: "For DOM refs, pass the element type as a generic and initialize with null — TypeScript then knows .current may be null until the element mounts.",
      examples: [
        { code: `const inputRef = useRef<HTMLInputElement>(null);\n\n// usage requires a null-check (or use optional chaining)\ninputRef.current?.focus();` },
        { code: `// For a mutable value (not a DOM node), give it directly:\nconst countRef = useRef<number>(0);` },
      ],
    },
    uses: ["Focus an input programmatically", "Store a timer ID (setInterval)", "Track previous value of state", "Access a DOM element directly"],
  },

  useImperativeHandle: {
    category: "Ref",
    mechanism: "Normally, attaching a ref to a custom component gives the parent access to the whole underlying DOM node (via forwardRef). useImperativeHandle lets the child instead expose a CUSTOM, limited set of methods — the parent gets only what the child chooses to share, not the entire DOM node.",
    variants: [
      { label: "Exposing a focus() and clear() method", code: `const FancyInput = forwardRef((props, ref) => {\n  const inputRef = useRef(null);\n\n  useImperativeHandle(ref, () => ({\n    focus: () => inputRef.current.focus(),\n    clear: () => { inputRef.current.value = ''; },\n  }));\n\n  return <input ref={inputRef} {...props} />;\n});\n\n// Parent:\nconst fancyRef = useRef(null);\n<FancyInput ref={fancyRef} />\nfancyRef.current.focus(); // only focus/clear are accessible, not the raw <input>` },
    ],
    pitfalls: [
      { title: "Overuse breaks the declarative model", text: "This pattern is an escape hatch for imperative APIs (focus, scroll, play/pause, open/close a modal). If you find yourself reaching for it to sync data between parent and child, that's usually a sign the data should just be passed as props/state instead." },
    ],
    uses: ["Custom input component exposing .focus()", "A modal exposing .open() / .close()", "A chart exposing .reset()"],
  },

  useEffect: {
    category: "Effect",
    mechanism: "Runs code AFTER the component renders and the screen updates — for things that reach 'outside' React: fetching data, subscribing to events, manually touching the DOM, setting timers. The dependency array (the second argument) controls WHEN it re-runs, and the function it returns is a cleanup function that runs before the effect runs again (or when the component unmounts).",
    variants: [
      { label: "No dependency array — runs after EVERY render", code: `useEffect(() => {\n  console.log('ran after every render');\n});` },
      { label: "Empty array [] — runs once, on mount only", code: `useEffect(() => {\n  console.log('ran once, on mount');\n}, []);` },
      { label: "With dependencies — runs on mount + whenever they change", code: `useEffect(() => {\n  fetchUser(userId).then(setUser);\n}, [userId]); // re-runs only when userId changes` },
      { label: "Cleanup function", code: `useEffect(() => {\n  const id = setInterval(tick, 1000);\n  return () => clearInterval(id); // runs before next effect, or on unmount\n}, []);` },
    ],
    pitfalls: [
      { title: "Missing dependencies → stale closures", text: "If your effect uses a variable but you don't list it in the dependency array, the effect 'remembers' the value from when it was first created, not the current one. ESLint's exhaustive-deps rule catches most of these." },
      { title: "Infinite loops", text: "If the effect sets a piece of state that is also in its own dependency array (and that state always changes to a new reference, e.g. a new object/array each time), it re-runs forever. Make sure the update either stabilizes or is conditional." },
      { title: "Using it for things derivable during render", text: "If a value can be calculated directly from props/state (e.g. fullName = firstName + ' ' + lastName), don't put it in useEffect + setState — just compute it directly in the render, or use useMemo if it's expensive." },
    ],
    uses: ["Fetch data on component mount", "Set up a WebSocket or event listener", "Update document.title", "Clean up a subscription on unmount"],
  },

  useLayoutEffect: {
    category: "Effect",
    mechanism: "Identical API to useEffect, but the timing is different: useLayoutEffect runs synchronously AFTER the DOM is updated but BEFORE the browser paints the screen to the user. useEffect runs after the paint. This matters when you need to measure or adjust the DOM before the user sees it — otherwise they'd see a flash of the 'wrong' layout for a frame.",
    variants: [
      { label: "Measuring an element before paint", code: `const ref = useRef(null);\nconst [height, setHeight] = useState(0);\n\nuseLayoutEffect(() => {\n  const rect = ref.current.getBoundingClientRect();\n  setHeight(rect.height); // applied before the browser paints — no visible flicker\n}, []);` },
    ],
    pitfalls: [
      { title: "Blocks painting — use sparingly", text: "Because it runs before paint, heavy work here delays the screen update. Only reach for it when useEffect causes a visible flicker (e.g. positioning a tooltip based on measured size). For anything else, useEffect is the right default." },
    ],
    uses: ["Measure DOM element size/position before paint", "Synchronously update DOM to avoid visual flash", "Tooltip positioning"],
  },

  useInsertionEffect: {
    category: "Effect",
    mechanism: "The earliest of the three effect hooks — runs before useLayoutEffect, before React makes any DOM changes. It exists almost exclusively for CSS-in-JS library authors who need to inject <style> tags into the document BEFORE layout is read by useLayoutEffect, avoiding incorrect style calculations.",
    variants: [
      { label: "Injecting styles (library-author use case)", code: `useInsertionEffect(() => {\n  const style = document.createElement('style');\n  style.textContent = '.btn { color: red }';\n  document.head.appendChild(style);\n  return () => style.remove();\n}, []);` },
    ],
    pitfalls: [
      { title: "Not for application code", text: "If you're not building a styling library, you almost certainly don't need this hook. useEffect or useLayoutEffect cover essentially all app-level needs." },
    ],
    uses: ["CSS-in-JS libraries (styled-components, Emotion internals)", "Injecting <style> tags before layout reads"],
  },

  useMemo: {
    category: "Performance",
    mechanism: "Caches the RESULT of a calculation between renders. You give it a function and a dependency array; React only re-runs the function (recomputing the value) when one of the dependencies changes. On renders where the dependencies haven't changed, it just hands back the previously cached result instead of recalculating.",
    variants: [
      { label: "Caching an expensive computation", code: `const sorted = useMemo(() => {\n  return [...items].sort((a, b) => a.price - b.price); // expensive on large arrays\n}, [items]); // only re-sorts when 'items' changes` },
      { label: "Stabilizing an object reference (for context or effects)", code: `const value = useMemo(() => ({ user, setUser }), [user]);\n// 'value' keeps the same reference across renders unless 'user' changes,\n// preventing unnecessary re-renders of context consumers` },
    ],
    pitfalls: [
      { title: "Premature optimization", text: "useMemo itself has a small cost (storing and comparing dependencies). For cheap calculations (basic arithmetic, simple string ops), wrapping them in useMemo can make things slightly SLOWER, not faster. Reserve it for genuinely expensive operations or for stabilizing references." },
      { title: "Not a guarantee", text: "React may, in rare cases (like with certain memory-optimization features), discard the cached value and recompute anyway. Treat useMemo as a performance hint, not as something your logic should depend on for correctness." },
    ],
    uses: ["Filtering/sorting a large list", "Complex mathematical computations", "Deriving data from props", "Stabilizing object references for useEffect"],
  },

  useCallback: {
    category: "Performance",
    mechanism: "The function equivalent of useMemo — instead of caching a computed VALUE, it caches a FUNCTION DEFINITION itself. Normally, every render creates a brand-new function (even if the code inside is identical), which is a new reference each time. useCallback keeps returning the SAME function reference across renders as long as its dependencies haven't changed. In fact, useCallback(fn, deps) is exactly equivalent to useMemo(() => fn, deps).",
    variants: [
      { label: "Stable callback passed to a memoized child", code: `const handleClick = useCallback(() => {\n  doSomething(id);\n}, [id]); // same function reference unless 'id' changes\n\n<MemoChild onClick={handleClick} />\n// MemoChild (wrapped in React.memo) won't re-render just because\n// a NEW handleClick function was created on the parent's re-render` },
    ],
    pitfalls: [
      { title: "Useless without React.memo (or a dependency elsewhere)", text: "useCallback only matters if the function is passed somewhere that cares about reference equality — typically a child wrapped in React.memo, or a dependency array of useEffect/useMemo. If the child isn't memoized, a new function reference every render makes no practical difference, and useCallback adds overhead for nothing." },
    ],
    uses: ["Passing stable callbacks to React.memo children", "Avoiding useEffect re-runs caused by function dependencies", "Event handlers in optimized lists"],
  },

  useTransition: {
    category: "Performance",
    mechanism: "Lets you mark a state update as 'non-urgent.' React will try to keep the screen responsive to urgent updates (like typing in an input) by rendering the non-urgent update in the background, and can interrupt/delay it if something more urgent comes in. You get back isPending (true while the background update is happening) and startTransition, the function you wrap the non-urgent update in.",
    variants: [
      { label: "Keeping an input responsive while filtering a big list", code: `const [query, setQuery] = useState('');\nconst [results, setResults] = useState([]);\nconst [isPending, startTransition] = useTransition();\n\nfunction handleChange(e) {\n  setQuery(e.target.value); // urgent — input updates instantly\n  startTransition(() => {\n    setResults(filterBigList(e.target.value)); // low-priority\n  });\n}\n\nreturn (\n  <>\n    <input value={query} onChange={handleChange} />\n    {isPending ? <Spinner /> : <List items={results} />}\n  </>\n);` },
    ],
    pitfalls: [
      { title: "Not for things that must be instant", text: "Anything the user expects to see immediately (the text they just typed, a checkbox toggling) should NOT be wrapped in startTransition — only the expensive, derived work that can afford to lag slightly behind." },
    ],
    uses: ["Search/filter with large lists", "Tab switching that loads new content", "Navigation with heavy render work"],
  },

  useDeferredValue: {
    category: "Performance",
    mechanism: "Takes a value and gives you back a 'lagged' copy of it. The original value updates immediately (so the input stays responsive); the deferred copy lags behind during heavy renders, letting React prioritize the urgent update first and catch the deferred value up afterward. It's essentially useTransition's idea but applied to a VALUE instead of wrapping a state update.",
    variants: [
      { label: "Fast input, deferred heavy list", code: `const [query, setQuery] = useState('');\nconst deferredQuery = useDeferredValue(query);\n\n<input value={query} onChange={e => setQuery(e.target.value)} />\n{/* HeavyList re-renders with deferredQuery, which can lag slightly behind 'query' */}\n<HeavyList filter={deferredQuery} />` },
    ],
    pitfalls: [
      { title: "useTransition vs useDeferredValue", text: "Use useTransition when YOU control the state update that's slow (you can wrap it in startTransition). Use useDeferredValue when you only have access to the VALUE (e.g. it's a prop from a parent you don't control) and want a lagged version of it." },
    ],
    uses: ["Deferring a slow list re-render while input stays fast", "Showing stale content while new content loads"],
  },

  use: {
    category: "Resource",
    mechanism: "Reads the value out of a Promise or a Context — but unlike other hooks, it can be called conditionally (inside if statements, loops, after early returns). When given a Promise that hasn't resolved yet, it 'suspends' the component (pauses rendering), and the nearest <Suspense> boundary shows its fallback until the Promise resolves.",
    variants: [
      { label: "Reading a Promise with Suspense", code: `<Suspense fallback={<Spinner />}>\n  <UserCard userPromise={fetchUser(id)} />\n</Suspense>\n\nfunction UserCard({ userPromise }) {\n  const user = use(userPromise); // suspends until resolved\n  return <p>{user.name}</p>;\n}` },
      { label: "Conditionally reading context (not allowed with useContext)", code: `function Banner({ show }) {\n  if (!show) return null;\n  const theme = use(ThemeContext); // OK — use() can be called after a conditional return\n  return <div className={theme}>...</div>;\n}` },
    ],
    pitfalls: [
      { title: "Don't create the Promise during render", text: "Calling fetchUser(id) directly inside the component body creates a NEW promise every render, causing infinite re-fetching/suspending. The promise should come from a cache, a parent component, or a stable source (e.g. created once via useMemo or passed down from a Server Component)." },
    ],
    uses: ["Reading data from a Promise with Suspense", "Conditionally reading a Context value"],
  },

  useActionState: {
    category: "Form",
    mechanism: "Designed for form submissions that involve async work. You give it an action function (which receives the previous state and form data, and returns the new state), and it gives back the current state, a wrapped action to pass to <form action={...}>, and an isPending flag — all without you manually wiring up useState + try/catch + loading flags yourself.",
    variants: [
      { label: "Basic async form submission", code: `async function submitForm(previousState, formData) {\n  const email = formData.get('email');\n  const result = await saveEmail(email);\n  if (result.error) return { error: result.error };\n  return { success: true };\n}\n\nconst [state, formAction, isPending] = useActionState(submitForm, null);\n\n\u003cform action={formAction}\u003e\n  \u003cinput name="email" /\u003e\n  \u003cbutton disabled={isPending}\u003e\n    {isPending ? 'Submitting...' : 'Submit'}\n  \u003c/button\u003e\n  {state?.error && \u003cp\u003e{state.error}\u003c/p\u003e}\n\u003c/form\u003e` },
    ],
    pitfalls: [
      { title: "The action receives (prevState, formData), not just formData", text: "It's easy to forget the first argument — your action function signature must be (previousState, formData) => newState, even if you don't use previousState." },
    ],
    uses: ["Async form submission with loading state", "Server actions in React frameworks", "Login/signup forms"],
  },

  useFormStatus: {
    category: "Form",
    mechanism: "Lets a component know the submission status of the nearest parent <form> WITHOUT being passed any props. It must be called from a component that is RENDERED INSIDE that <form> (not the form itself) — it reads the status from context-like 'ambient' form state.",
    variants: [
      { label: "A reusable submit button that knows its form's status", code: `// Must be a component rendered INSIDE \u003cform\u003e, e.g.:\nfunction SubmitButton() {\n  const { pending } = useFormStatus();\n  return (\n    \u003cbutton disabled={pending}\u003e\n      {pending ? 'Saving...' : 'Save'}\n    \u003c/button\u003e\n  );\n}\n\n// Usage:\n\u003cform action={formAction}\u003e\n  \u003cinput name="title" /\u003e\n  \u003cSubmitButton /\u003e {/* automatically disables while submitting */}\n\u003c/form\u003e` },
    ],
    pitfalls: [
      { title: "Doesn't work in the form component itself", text: "Calling useFormStatus() in the SAME component that renders <form> always returns pending: false — it only reflects the status of a PARENT form, intended for shared/child components like a generic SubmitButton." },
    ],
    uses: ["Disabling a submit button while form is pending", "Showing a spinner inside a submit button component", "Reusable form UI that reacts to submission state"],
  },

  useOptimistic: {
    category: "Form",
    mechanism: "Lets you show the RESULT of an action immediately, before the server has actually confirmed it — then automatically reverts to the real value if the action fails. You give it the current 'real' state and an update function; it returns an 'optimistic' version of the state to render while the real update is in flight.",
    variants: [
      { label: "Optimistic like button", code: `const [likes, setLikes] = useState(serverLikes);\nconst [optimisticLikes, addOptimisticLike] = useOptimistic(\n  likes,\n  (currentLikes) => currentLikes + 1\n);\n\nasync function handleLike() {\n  addOptimisticLike();      // UI shows +1 immediately\n  const newLikes = await likePost(id); // actual server call\n  setLikes(newLikes);       // sync real state once confirmed\n}\n\nreturn <span>{optimisticLikes} likes</span>;` },
    ],
    pitfalls: [
      { title: "Still need to update the real state", text: "useOptimistic doesn't replace your actual state — it's a temporary overlay on top of it. Once the async action finishes, you still need to update the underlying state (e.g. with setLikes) to match the real result, or it'll snap back to the old value." },
    ],
    uses: ["Optimistic like/react button", "Adding a todo that appears immediately before server confirms", "Sending a message that appears instantly in chat"],
  },

  useId: {
    category: "ID / Debug",
    mechanism: "Generates a unique ID string that stays the SAME across re-renders and is consistent between server-rendered HTML and the client (avoiding mismatches). Its main purpose is linking form elements together for accessibility, e.g. connecting a <label> to its <input> via matching id/htmlFor.",
    variants: [
      { label: "Linking a label to an input", code: `function EmailField() {\n  const emailId = useId();\n  return (\n    <>\n      <label htmlFor={emailId}>Email</label>\n      <input id={emailId} type="email" />\n    </>\n  );\n}\n// emailId is something like ":r1:" — guaranteed unique across the whole app` },
      { label: "Multiple related IDs with a prefix", code: `const id = useId();\n\n<label htmlFor={\`\${id}-name\`}>Name</label>\n<input id={\`\${id}-name\`} />\n<label htmlFor={\`\${id}-email\`}>Email</label>\n<input id={\`\${id}-email\`} />` },
    ],
    pitfalls: [
      { title: "Never use it for list keys", text: "useId generates ONE id per hook call, fixed for the component instance — it's not meant to be called inside a loop to generate keys for a list. List keys should come from your data (e.g. item.id)." },
    ],
    uses: ["Linking <label> to <input> via htmlFor", "ARIA attributes like aria-describedby", "Accessible form components"],
  },

  useDebugValue: {
    category: "ID / Debug",
    mechanism: "Purely a development-tool aid — it adds a label/value to a CUSTOM HOOK (a hook you wrote yourself) so that when you inspect a component using React DevTools, you see something meaningful instead of just the hook's raw internal state. It has zero effect on your app's actual behavior.",
    variants: [
      { label: "Labeling a custom hook's state in DevTools", code: `function useUser(id) {\n  const [user, setUser] = useState(null);\n\n  useDebugValue(user?.name ?? 'Loading...');\n  // In DevTools, this custom hook now shows: "User: Afif" (or "Loading...")\n  // instead of just the raw { user: {...} } object\n\n  return user;\n}` },
      { label: "With a formatting function (only runs when DevTools is open)", code: `useDebugValue(date, (d) => d.toLocaleDateString());\n// the formatting function only runs when DevTools is actually inspecting it,\n// avoiding wasted work in normal usage` },
    ],
    pitfalls: [
      { title: "Only useful inside custom hooks", text: "useDebugValue has no effect if called directly inside a regular component — it's specifically meant to improve the DevTools display of hooks YOU define and reuse elsewhere." },
    ],
    uses: ["Labeling custom hooks in DevTools", "Showing formatted debug info (e.g. a formatted date)"],
  },

  useSyncExternalStore: {
    category: "ID / Debug",
    mechanism: "The 'correct' way to subscribe a component to data that lives OUTSIDE React (browser APIs, third-party state libraries) and have the component re-render whenever that external data changes — while avoiding subtle bugs that a naive useState + useEffect subscription can have (e.g. inconsistent values during concurrent rendering). You give it a subscribe function and a getSnapshot function.",
    variants: [
      { label: "Subscribing to window width", code: `function useWindowWidth() {\n  return useSyncExternalStore(\n    (callback) => {\n      window.addEventListener('resize', callback);\n      return () => window.removeEventListener('resize', callback); // unsubscribe\n    },\n    () => window.innerWidth // getSnapshot — current value\n  );\n}\n\n// usage: const width = useWindowWidth();` },
      { label: "Subscribing to an external store (Redux-like)", code: `const state = useSyncExternalStore(\n  store.subscribe,      // function the store calls when it changes\n  store.getSnapshot     // function returning the current state\n);` },
    ],
    pitfalls: [
      { title: "Don't reach for this for your own component state", text: "If the data lives in React (useState/useReducer/Context), you don't need this hook at all. It's specifically for syncing with stores/APIs that exist OUTSIDE React's own state system." },
    ],
    uses: ["Subscribing to a Redux/Zustand/Jotai store", "Reading window.innerWidth from a resize event", "Syncing with browser APIs like localStorage"],
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
  const [dark, setDark] = useState(true);

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
    mechBg:      dark ? "#1e1b2e" : "#f5f3ff",
    useBg:       dark ? "#161b25" : "#f9f9f8",
    codeBg:      dark ? "#1a1d2e" : "#f9f9f8",
    codeText:    dark ? "#e2e8f0" : "#1f2937",
    sideActive:  dark ? "#1e1b2e" : "#ffffff",
    toggleBg:    dark ? "#312e81" : "#e0e7ff",
    pitfallBg:   dark ? "#3a1c1c" : "#fef2f2",
    pitfallText: dark ? "#fca5a5" : "#991b1b",
    pitfallBar:  dark ? "#dc2626" : "#ef4444",
    tsBg:        dark ? "#1a2e3a" : "#eff6ff",
    tsBar:       dark ? "#3b82f6" : "#3b82f6",
  };

  const handleSelect = (key) => {
    setActiveHook(key);
    setActiveTab("overview");
  };

  const sectionLabelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    color: t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "8px",
    marginTop: "20px",
  };

  const codeBlockStyle: React.CSSProperties = {
    background: t.codeBg,
    border: `1px solid ${t.border}`,
    borderRadius: "8px",
    padding: "12px 14px",
    fontFamily: "monospace",
    fontSize: "12px",
    color: t.codeText,
    overflowX: "auto",
    lineHeight: "1.7",
    whiteSpace: "pre",
    margin: "6px 0 0 0",
  };

  return (
    <div style={{ fontFamily: "sans-serif", display: "flex", flexDirection: "column", height: "640px", border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", background: t.bg, transition: "background 0.2s, color 0.2s" }}>

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
                {tab === "code" ? "When to use" : "Overview"}
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
              {/* Mechanism */}
              <div style={{ background: t.mechBg, borderLeft: `3px solid ${t.activeBar}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: "13px", color: t.textSub, lineHeight: "1.7" }}>
                {hook.mechanism}
              </div>

              {/* Variants */}
              <div style={sectionLabelStyle}>Different ways to use it</div>
              {hook.variants.map((v, i) => (
                <div key={i} style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "13px", color: t.textSub, fontWeight: 500, marginBottom: "2px" }}>{v.label}</div>
                  <pre style={codeBlockStyle}>{v.code}</pre>
                  {v.note && (
                    <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", lineHeight: "1.6" }}>
                      {v.note}
                    </div>
                  )}
                </div>
              ))}

              {/* Pitfalls */}
              <div style={sectionLabelStyle}>Common pitfalls</div>
              {hook.pitfalls.map((p, i) => (
                <div key={i} style={{ background: t.pitfallBg, borderLeft: `3px solid ${t.pitfallBar}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: t.pitfallText, marginBottom: "4px" }}>{p.title}</div>
                  <div style={{ fontSize: "13px", color: t.textSub, lineHeight: "1.6" }}>{p.text}</div>
                </div>
              ))}

              {/* TypeScript */}
              {hook.typescript && (
                <>
                  <div style={sectionLabelStyle}>TypeScript</div>
                  <div style={{ background: t.tsBg, borderLeft: `3px solid ${t.tsBar}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: "13px", color: t.textSub, lineHeight: "1.6", marginBottom: "10px" }}>
                    {hook.typescript.text}
                  </div>
                  {hook.typescript.examples.map((ex, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      <pre style={codeBlockStyle}>{ex.code}</pre>
                      {ex.note && (
                        <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", lineHeight: "1.6" }}>
                          {ex.note}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <div style={{ background: t.useBg, borderRadius: "8px", padding: "10px 14px" }}>
              {hook.uses.map((u, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "5px 0", fontSize: "13px", color: t.textSub }}>
                  <span style={{ color: t.activeBar, flexShrink: 0 }}>→</span>
                  {u}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}