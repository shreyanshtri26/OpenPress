export default function Image({
  src,
  alt = '',
  width,
  height,
  placeholder = undefined,
  blurDataURL = undefined,
  layout = undefined,
  objectFit = undefined,
  priority = undefined,
  sizes = undefined,
  fill = undefined,
  style = undefined,
  ...rest
}) {
  const mergedStyle = {
    ...(objectFit ? { objectFit } : {}),
    ...(fill ? { width: '100%', height: '100%' } : {}),
    ...style,
  };

  return (
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      style={mergedStyle}
      {...rest}
    />
  );
}
