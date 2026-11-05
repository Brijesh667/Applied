/**
 * RegisterForm component
 * Embedded registration form with client validation, 409 error mapping
 * with "Log in instead" switch action, and field focus management.
 */
import React, { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Field } from "../ui/Field.jsx";
import { Input } from "../ui/Input.jsx";
import { PasswordInput } from "../ui/PasswordInput.jsx";
import { Button } from "../ui/Button.jsx";
import { LIMITS } from "../../lib/constants.js";
import { normalizeText } from "../../lib/normalize.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
  onSubmittingChange,
}) {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [_touched, setTouched] = useState({});
  const [serverAlert, setServerAlert] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const validateField = (fieldName, val) => {
    if (fieldName === "name") {
      const normalized = normalizeText(val);
      if (!normalized) {
        return "Name is required.";
      }
      if (normalized.length > LIMITS.name) {
        return `Name cannot exceed ${LIMITS.name} characters.`;
      }
    }
    if (fieldName === "email") {
      const trimmed = val.trim().toLowerCase();
      if (!trimmed) {
        return "Email is required.";
      }
      if (!EMAIL_REGEX.test(trimmed)) {
        return "Enter a valid email address.";
      }
      if (trimmed.length > LIMITS.email) {
        return `Email cannot exceed ${LIMITS.email} characters.`;
      }
    }
    if (fieldName === "password") {
      if (!val) {
        return "Password is required.";
      }
      if (val.length < LIMITS.passwordMin) {
        return `Password must be at least ${LIMITS.passwordMin} characters.`;
      }
      if (val.length > LIMITS.passwordMax) {
        return `Password cannot exceed ${LIMITS.passwordMax} characters.`;
      }
    }
    return "";
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === "name" ? name : field === "email" ? email : password;
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChangeName = (e) => {
    const val = e.target.value;
    setName(val);
    setServerAlert("");
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleChangeEmail = (e) => {
    const val = e.target.value;
    setEmail(val);
    setServerAlert("");
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  const handleChangePassword = (e) => {
    const val = e.target.value;
    setPassword(val);
    setServerAlert("");
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerAlert("");

    const nameErr = validateField("name", name);
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);

    const newErrors = {};
    if (nameErr) newErrors.name = nameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;

    setErrors(newErrors);
    setTouched({ name: true, email: true, password: true });

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.name) {
        nameRef.current?.focus();
      } else if (newErrors.email) {
        emailRef.current?.focus();
      } else if (newErrors.password) {
        passwordRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    onSubmittingChange?.(true);

    try {
      await register({
        name: normalizeText(name),
        email: email.trim().toLowerCase(),
        password, // Sent untouched
      });
      onSuccess?.();
    } catch (err) {
      setIsSubmitting(false);
      onSubmittingChange?.(false);

      if (err?.status === 409) {
        setErrors((prev) => ({
          ...prev,
          email: (
            <span>
              This email is already registered.{" "}
              <button
                type="button"
                onClick={() => onSwitchToLogin?.(email)}
                className="font-semibold underline text-ink hover:text-ink-soft transition-colors ml-1 cursor-pointer"
              >
                Log in instead
              </button>
            </span>
          ),
        }));
        emailRef.current?.focus();
      } else if (err?.status === 400 && err?.fieldErrors) {
        setErrors(err.fieldErrors);
      } else if (err?.status === 429) {
        setServerAlert("Too many attempts. Try again in a few minutes.");
      } else {
        setServerAlert(
          err?.message || "Can't reach the server. Check your connection and try again."
        );
      }
    }
  };

  return (
    <div>
      {serverAlert && (
        <div
          role="alert"
          className="p-3 rounded-[8px] bg-danger-bg text-danger text-[14px] leading-[20px] font-medium mb-5"
        >
          <span>{serverAlert}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          id="register-name"
          label="Name"
          error={errors.name}
          counter={{ current: name.length, max: LIMITS.name }}
          required
        >
          <Input
            ref={nameRef}
            type="text"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={handleChangeName}
            onBlur={() => handleBlur("name")}
            disabled={isSubmitting}
          />
        </Field>

        <Field id="register-email" label="Email" error={errors.email} required>
          <Input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={handleChangeEmail}
            onBlur={() => handleBlur("email")}
            disabled={isSubmitting}
          />
        </Field>

        <Field
          id="register-password"
          label="Password"
          error={errors.password}
          hint="8 to 64 characters"
          required
        >
          <PasswordInput
            ref={passwordRef}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={handleChangePassword}
            onBlur={() => handleBlur("password")}
            disabled={isSubmitting}
          />
        </Field>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={isSubmitting}
          >
            Create account
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-[14px] leading-[20px] text-ink-soft">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitchToLogin?.()}
          className="font-medium text-ink underline hover:text-ink-soft transition-colors cursor-pointer"
        >
          Log in
        </button>
      </div>
    </div>
  );
}

export default RegisterForm;
