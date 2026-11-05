/**
 * LoginForm component
 * Embedded login form with field validation, server error mapping,
 * password toggle, and switch-to-register callback.
 */
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Field } from "../ui/Field.jsx";
import { Input } from "../ui/Input.jsx";
import { PasswordInput } from "../ui/PasswordInput.jsx";
import { Button } from "../ui/Button.jsx";
import { LIMITS } from "../../lib/constants.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  initialEmail = "",
  onSuccess,
  onSwitchToRegister,
  onSubmittingChange,
}) {
  const { login } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [_touched, setTouched] = useState({});
  const [serverAlert, setServerAlert] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const validateField = (fieldName, val) => {
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
    }
    return "";
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === "email" ? email : password;
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
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

    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);

    const newErrors = {};
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;

    setErrors(newErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.email) {
        emailRef.current?.focus();
      } else if (newErrors.password) {
        passwordRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    onSubmittingChange?.(true);

    try {
      await login({
        email: email.trim().toLowerCase(),
        password, // Never trim or normalize
      });
      onSuccess?.();
    } catch (err) {
      setIsSubmitting(false);
      onSubmittingChange?.(false);

      if (err?.status === 401) {
        setServerAlert("Invalid email or password.");
        setPassword("");
        setTimeout(() => {
          passwordRef.current?.focus();
        }, 0);
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
        <Field id="login-email" label="Email" error={errors.email} required>
          <Input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={handleChangeEmail}
            onBlur={() => handleBlur("email")}
            disabled={isSubmitting}
          />
        </Field>

        <Field
          id="login-password"
          label="Password"
          error={errors.password}
          required
        >
          <PasswordInput
            ref={passwordRef}
            name="password"
            autoComplete="current-password"
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
            Log in
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-[14px] leading-[20px] text-ink-soft">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-medium text-ink underline hover:text-ink-soft transition-colors cursor-pointer"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}

export default LoginForm;
