import React from "react";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const NextImage = React.forwardRef<HTMLImageElement, ImageProps>(function NextImage(
  { alt = "", ...rest },
  ref
) {
  return React.createElement("img", { ref, alt, ...rest });
});

export default NextImage;
