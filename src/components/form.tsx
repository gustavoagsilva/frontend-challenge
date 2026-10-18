import { useId, type ComponentProps } from "react";
export function Field({
  label,
  error,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
        {...props}
      />
      {error && (
        <span id={id + "-error"} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function Message({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return error ? (
    <p className="form-message error" role="alert">
      {error}
    </p>
  ) : success ? (
    <p className="form-message" role="status">
      {success}
    </p>
  ) : null;
}
