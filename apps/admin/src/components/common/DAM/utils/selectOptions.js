// Marks the currently selected option in a DevExtreme SelectBox dataSource as
// disabled.
export const withSelectedDisabled = (options = [], selectedValue) =>
  options.map((option) => ({
    ...option,
    disabled: option.value === selectedValue,
  }));

export default withSelectedDisabled;