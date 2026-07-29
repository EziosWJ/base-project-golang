import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/field";
import { isApiError } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";
import type { LoginErrors } from "@/types";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const stateFrom =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname;
  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  let from = stateFrom ?? queryRedirect ?? "/dashboard";

  if (from.includes("://") || from.startsWith("//")) {
    from = "/dashboard";
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: LoginErrors = {};

    if (!username.trim()) {
      nextErrors.username = "请输入用户名";
    }
    if (!password) {
      nextErrors.password = "请输入密码";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setSubmitting(true);
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      setErrors({
        account: isApiError(error)
          ? error.message
          : "登录失败，请稍后重试",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-[420px] rounded-admin border border-border bg-surface p-6 shadow-admin">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <LockKeyhole className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-semibold leading-8">
            React Admin
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            后台管理系统基础模板
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field
            label="用户名"
            htmlFor="username"
            required
            error={errors.username}
          >
            <div className="relative">
              <UserRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                aria-hidden
              />
              <Input
                id="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrors({});
                }}
                className="pl-9"
                autoComplete="username"
              />
            </div>
          </Field>

          <Field
            label="密码"
            htmlFor="password"
            required
            error={errors.password}
          >
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors({});
              }}
              autoComplete="current-password"
            />
          </Field>

          <div className="flex items-center justify-end">
            <span className="text-xs text-text-tertiary">后端账号登录</span>
          </div>

          {errors.account && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-error">
              {errors.account}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "登录中..." : "登录"}
          </Button>
        </form>
      </section>
    </main>
  );
}
