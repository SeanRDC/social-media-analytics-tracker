import { redirect } from "next/navigation";

// Temporary: the landing page arrives in a later task.
export default function Home() {
  redirect("/overview");
}
