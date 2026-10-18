import React from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

const NextLink = React.forwardRef<HTMLAnchorElement, LinkProps>(function NextLink(
  { href, children, ...rest },
  ref
) {
  return React.createElement("a", { ref, href, ...rest }, children);
});

export default NextLink;
export { NextLink };
