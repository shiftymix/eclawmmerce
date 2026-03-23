import Image from "next/image";

export default function PixelLogo({
  size = 32,
}: {
  size?: number;
}) {
  return (
    <Image
      src="/crab-logo.png"
      alt="Council of eCLAWmmerce"
      width={size}
      height={size}
      className="image-pixelated"
      priority
    />
  );
}
