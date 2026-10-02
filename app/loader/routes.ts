export const loaderScreens = {
  "loading-queue": { node: "719:1651", title: "Loads", toolbar: "DOCK LOADER", time: "03:13" },
  "load-plan": { node: "719:1839", title: "VEH012", toolbar: "LOAD PLAN", time: "03:13" },
  "report-shortfall": { node: "719:2025", title: "Report a shortfall", toolbar: "VEH012 · STOP 2", time: "03:14" },
  "review-plan-changes": { node: "719:2179", title: "Plan changed", toolbar: "PLAN CHANGED", time: "03:13" },
  "departure-review": { node: "719:2346", title: "Loading complete", toolbar: "READY TO DEPART", time: "03:29" },
  "loading-history": { node: "719:2490", title: "History", toolbar: "DOCK LOADER", time: "04:05" },
  "trip-status": { node: "719:2716", title: "Waiting for dispatch", toolbar: "TRIP STATUS", time: "03:16" },
  "partial-load-approved": { node: "719:2856", title: "Partial load approved", toolbar: "TRIP STATUS", time: "03:27" },
  "plan-v3-acknowledged": { node: "719:2996", title: "Loads", toolbar: "DOCK LOADER", time: "03:15" },
} as const;
export type LoaderView = keyof typeof loaderScreens;
export const loaderHref = (view: LoaderView) => `/loader/${view}`;
