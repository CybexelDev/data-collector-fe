import { forwardRef } from "react";

const FormField = forwardRef(function FormField(
  { id, label, error, rightElement, ...inputProps },
  ref
) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition
            focus-visible:ring-2 focus-visible:ring-blue-900/30 focus-visible:border-blue-900
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500
            ${rightElement ? "pr-11" : ""}
            ${error ? "border-red-400" : "border-slate-300"}`}
          {...inputProps}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightElement}</div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

export default FormField;