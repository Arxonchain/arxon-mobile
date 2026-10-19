/** Figma assets. Width and height match each SVG root. Do not stretch them. */
export function FigmaImg({
  src,
  width,
  height,
  alt = '',
}: {
  src: string;
  width: number;
  height: number;
  alt?: string;
}) {
  return <img src={src} alt={alt} width={width} height={height} />;
}
