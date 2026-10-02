import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loaderScreens, type LoaderView } from "../routes";
import LoaderScreen from "../LoaderScreen";

export function generateStaticParams() { return Object.keys(loaderScreens).map(view => ({ view })); }
export async function generateMetadata({ params }: { params: Promise<{ view: string }> }): Promise<Metadata> {
  const { view } = await params;
  const screen = loaderScreens[view as LoaderView];
  return { title: `${screen?.title ?? "Loader"} | Waypoint Flow` };
}
export default async function Page({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!Object.hasOwn(loaderScreens, view)) notFound();
  return <LoaderScreen key={view} view={view as LoaderView} />;
}
