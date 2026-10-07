import { StallMenu } from "@/components/buyer/StallMenu";

export default async function StallMenuPage(
  props: PageProps<"/menu/[stallSlug]">,
) {
  const { stallSlug } = await props.params;
  return <StallMenu stallSlug={stallSlug} />;
}
