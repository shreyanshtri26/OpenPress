import React from "react";
import { triggerHaptic } from "../../utils/appleMotion";

const CustomButton = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  variant = "black", // default style
  disableHover = false, // disable hover manually
  className = "",
  ...rest
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    triggerHaptic('selection');
    onClick?.(e);
  };

  const baseStyles =
    "apple-pressable select-none rounded-md px-3.5 py-2 text-sm font-medium border transition-all duration-150 active:scale-[0.97] disabled:opacity-50";

  // define normal + hover states for each variant
  const variants = {
    black: {
      base: "bg-black text-white border-black",
      hover: "hover:bg-white hover:text-black hover:border-black",
    },
    white: {
      base: "bg-white text-black border-black",
      hover: "hover:bg-black hover:text-white hover:border-black",
    },
  };

  const selectedVariant = variants[variant] ?? variants.black;
  const hoverStyles = disableHover ? "" : selectedVariant.hover;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${baseStyles} 
        ${selectedVariant.base} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : hoverStyles} 
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
};

export default CustomButton;
