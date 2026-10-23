import React from "react";
import { DateBox } from "@/components/ui/kit/date-box";

/**
 * Date (or date + time) picker built on the native input via the free DateBox kit.
 *
 * @param {{
 *   value?: any,
 *   onValueChanged?: (e: { value: Date | null }) => void,
 *   suggestedTime?: any,
 *   placeholder?: string,
 *   showTimeHeader?: boolean,          // true: date + time input; false: date only
 *   className?: string,
 *   disablePastDates?: boolean,
 *   min?: any,
 *   max?: any,
 *   disabledDates?: (args: { date: Date, view: string }) => boolean,
 *   resolveValue?: (candidate: Date, source: 'date' | 'time') => Date | null,
 *   type?: 'date' | 'datetime',
 *   [key: string]: any
 * }} props
 */
const CustomCalendar = ({
  value,
  onValueChanged,
  placeholder = "Select date",
  showTimeHeader = true,
  className = "",
  disablePastDates = true,
  min: minProp = undefined,
  max,
  disabledDates,
  resolveValue,
  type,
}) => {
  const [notice, setNotice] = React.useState("");
  const inputType = type === "datetime" || (type !== "date" && showTimeHeader) ? "datetime" : "date";

  const startOfToday = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const handleValueChanged = (e) => {
    const candidate = e.value;
    if (!candidate) {
      setNotice("");
      onValueChanged?.({ value: null });
      return;
    }
    if (typeof disabledDates === "function" && disabledDates({ date: candidate, view: "month" })) {
      setNotice("That date is not available");
      return;
    }
    const resolved = resolveValue ? resolveValue(candidate, inputType === "datetime" ? "time" : "date") : candidate;
    if (!resolved) {
      setNotice("That time is not available");
      return;
    }
    setNotice("");
    onValueChanged?.({ value: resolved });
  };

  return (
    <div className={`custom-date-box ${className}`}>
      <DateBox
        type={inputType}
        value={value}
        onValueChanged={handleValueChanged}
        placeholder={placeholder}
        min={minProp || (disablePastDates ? startOfToday : undefined)}
        max={max}
      />
      {notice && <p className="mt-1 text-xs text-red-600">{notice}</p>}
    </div>
  );
};

export default CustomCalendar;
