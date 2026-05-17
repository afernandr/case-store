import { db } from "@/db";
import { notFound } from "next/navigation";
import DesignConfigurator from "./DesignConfigurator";

const Page = async ({ searchParams }: PageProps<"/configure/design">) => {
  const { id } = await searchParams;

  if (!id || typeof id != "string") {
    return notFound();
  }

  const configuration = await db.configuration.findUnique({
    where: { id: id.trim() },
  });

  if (!configuration) {
    return notFound();
  }

  const { imageUrl, width, height } = configuration;

  return (
    <DesignConfigurator
      configId={id}
      imageUrl={imageUrl}
      imageDimensions={{ width, height }}
    />
  );

  return <p>{id}</p>;
};

export default Page;
